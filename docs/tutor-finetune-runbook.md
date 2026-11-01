# Tutor Fine-Tune Runbook

Operational recipe for the Aelionix Academy tutor adapter. Follow it top to
bottom; each step exists because skipping it broke something before.

- Base model: `Qwen/Qwen2.5-Coder-7B-Instruct`
- Method: QLoRA (4-bit NF4 + LoRA r=16 on q/k/v/o)
- Output: an adapter repo on HF Hub, loaded by the app through
  `AI_PROVIDER` / `AI_BASE_URL` / `AI_MODEL` / `AI_API_KEY`
- Contract: every reply must parse through `lib/ai/response.js` as
  `parseStatus: "structured"`. Prose is a failed run.

---

## 0. The one rule that matters

**Traces are rendered, not imagined.**

Every training example is authored as a scenario, then pushed through the
application's own `buildTutorContext()` and `buildChatMessages()`. The model
only ever sees the system prompt and context block that production sends. If
you hand-write a system prompt into a trace, you are training a different
assistant than the one you ship.

v1 failed for exactly this reason. The three root causes were:

| v1 mistake | Consequence |
| --- | --- |
| Invented system prompt | Model learned tone, not the app's contract |
| No context block | Model never saw lesson/exercise/execution data |
| Prose replies instead of JSON | Model never learned the response schema |

That is why the earlier run produced only format bleed. Do not repeat it.

---

## 1. Author scenarios

Source of truth: `data/traces/scenarios/python-tutor-scenarios.mjs`.

Each scenario declares `split` (`train` / `eval`), `mode` (`coach` /
`partner`), a real `lesson_slug` and `exercise_slug` from
`data/curriculum/python.js`, the learner's `question` and `code`, the
`execution` result from Judge0, and the ideal `target` reply.

### Writing target replies

- Guidance goes in `message` as questions. Directives belong in
  `suggestedNextStep`, which is a single concrete action.
- Never write the full solution. Hint level 1–2 unless the learner has
  already tried the obvious thing.
- Never invent execution output. If `execution` is null, say the output is
  unknown and ask for it.
- `exercise_concepts` is authored content. Never tell a learner to edit a
  table — that is an authoring gap, not their fault. Unmapped exercises pass
  but award no mastery, and the exact warning string must be quoted correctly.
- Keep `message` under ~1400 characters. Verbosity bleeds into every reply.

### Personality and banter

The personality is **in the examples**, never in the system prompt. "Be funny"
in a system prompt produces a model that jokes constantly; a handful of good
contrast examples produces one that jokes at the right moment.

Rules, in priority order:

1. Banter only on **surface slips**: typos, misspelled method names, missing
   colons, `=` vs `==`, lowercase `true`, "just paste it for me".
2. **Never** banter on a real logic bug — early `return`, off-by-one, mutable
   default arguments, infinite loops, broken recursion. Drop the jokes and get
   grounded.
3. Tease the mistake, never the person. Never agree that the learner is
   stupid, even when they say it about themselves first.
4. A playful reply is still a teaching reply. It must name the fix and point
   at the evidence. Banter never replaces diagnosis.
5. Keep playful replies **short**. Long jokes read as canned.

Approved phrasing, for calibration:

> "ah you left Python hanging, add that colon real quick"

Never:

> "you're dumb for forgetting this again"

Mark banter scenarios with `banter: true`, `persona`, and a non-neutral `mood`.
The validator enforces the pairing and runs an insult tripwire.

### Split hygiene

- `eval` scenarios must not duplicate a `train` failure mode. Same exercise
  with a *different* bug is acceptable; the same bug is leakage.
- Keep at least one **boundary** eval: a real logic bug with a playful
  learner, where the correct answer stays serious. This measures whether the
  banter stayed in its lane.
- Banter share of the training split should stay under ~40%. Above that the
  model starts joking about real bugs. Currently 4/14 (29%).

Aim for 25–40 scenarios total before judging quality. Below ~20 the model
memorises phrasing instead of behaviour.

---

## 2. Build and validate

```bash
npm run traces:build       # scenarios -> data/traces/python_traces.jsonl + splits/
npm run traces:validate    # schema, prompt fidelity, leakage, tone tripwires
npm run bench:eval-prompts # benchmarks/eval_app_inputs.json -> eval_prompts.json
```

`traces:validate` must print **All checks passed.** with no warnings. It
fails the build on:

- a system prompt that is not byte-identical to `COACH_SYSTEM_PROMPT` or
  `PARTNER_SYSTEM_PROMPT`
- missing or invented context sections
- the retired bad advice ("ensure your exercise is properly mapped")
- insults in any target
- banter metadata that disagrees with `trace_type`
- train/eval leakage
- a banter share above 40%

It also prints the widest example in tokens. **`MAX_LENGTH` must exceed it.**
Current widest is ~1464 tokens, training runs at 2048.

Check the rendered shape before spending GPU time:

```bash
npm run traces:validate   # widest ~1464 -> max_length >= 1536
wc -l data/traces/splits/train.jsonl data/traces/splits/eval.jsonl
```

---

## 3. Re-baseline the base model

Never compare against an old baseline captured with a different prompt shape.
`benchmarks/baseline_results.json` predates the app-faithful prompts and is
**not** a valid comparison point.

```bash
MAX_NEW_TOKENS=512 RESULTS_FILE=baseline_results_v2.json \
  python benchmarks/run_model_baseline.py
```

The runner reports the structured-vs-fallback rate and the held-out rate. On
the base model, expect a lot of `fallback_text` — that is the problem the
adapter is supposed to fix, and it is the headline number.

Benchmark cases live in `benchmarks/python_tutor_eval.json` (7 cases) and are
labelled:

- `held_out` — genuine generalisation. This is the only number that counts.
- `seen_in_training` — regression only. It must not get worse; improvement
  here proves nothing.

`tone_typo_missing_colon` is the tone probe. On a good adapter it is playful
and brief while still naming the colon.

---

## 4. Train

```bash
HF_REPO_ID=<you>/aelionix-tutor-qlora python scripts/fine_tune_tutor.py
```

Defaults: 3 epochs, lr 2e-4, batch 1 × grad-accum 4, fp16, `max_length=2048`,
LoRA r=16 / alpha 32 / dropout 0.05.

Why not `trl.SFTTrainer`: its chunked log-prob kernel crashes on T4 with a
bf16 gemm failure. `transformers.Trainer` with fp16 works on a free T4.

Loss is masked to the assistant turn only. Without masking the model spends
its capacity reproducing the long system prompt and context block.

**Reading the run:** `eval_loss` on 5 examples is a smoke test, not a metric —
it will look noisy. Judge the adapter on step 5, not on the loss curve. A
train loss that barely moves (v1: 1.838 → 1.834) means the data is too
repetitive or the prompt dominates the sequence.

Colab pitfalls already hit and fixed:

- `evaluation_strategy` → `eval_strategy`
- `warmup_ratio` / `warmup_steps` are not accepted by this version
- `SFTTrainer(tokenizer=)` → `processing_class=`
- `max_seq_length` → `max_length`
- BF16 gemm unsupported on T4 — use fp16

---

## 5. Evaluate the adapter

```bash
ADAPTER_PATH=data/models/aelionix-tutor-qlora MAX_NEW_TOKENS=512 \
  RESULTS_FILE=baseline_results_tuned.json \
  python benchmarks/run_model_baseline.py
```

Then compare on four axes, in this order:

1. **Structured rate**, especially `held_out`. Must be near 100%.
2. **Held-out pedagogy** — does it still ask instead of dictating, still avoid
   the full solution, still quote `exercise_concepts` correctly?
3. **Tone calibration** — `tone_typo_missing_colon` playful, and the two
   boundary evals (infinite loop, self-deprecation + early `return`) serious.
4. **Regression** on `seen_in_training` — must not get worse.

Treat format bleed as a diagnosis, not a verdict: look at which traces share
the broken behaviour and fix the data before touching hyperparameters.

---

## 6. Ship it

Serve the base model with the adapter, and point the app at it:

```bash
AI_PROVIDER=openai-compatible
AI_BASE_URL=http://localhost:11434/v1   # Ollama / vLLM / Together
AI_MODEL=aelionix-tutor
AI_API_KEY=...
```

Then confirm in the app that a real tutoring turn returns
`parseStatus: "structured"` and not `fallback_text`. Check `lib/ai/provider.js`
sends `jsonMode` and that the served model honours the same chat template it
was trained with — a mismatched template silently degrades quality.

Hosting reality check:

- No free always-on GPU exists. Vercel/Netlify cannot host a 7B model.
- Best free always-on option: Oracle Cloud Free Tier ARM, ~2–5 tok/s on 7B Q4.
- For real users: Together AI / Fireworks / vLLM on a paid GPU.
- Demo only: HF Spaces + ZeroGPU.

---

## 7. Known failure modes

| Symptom | Cause | Fix |
| --- | --- | --- |
| Prose replies, `fallback_text` everywhere | trained on prose, or system prompt mismatch | rebuild traces through `buildTutorContext` |
| Correct shape, no real tutoring | prompt tokens dominate the loss | verify assistant-only masking |
| Jokes on logic bugs | banter share too high, or no serious contrast | cut banter traces, add boundary eval |
| Robotic, no personality | banter only in the system prompt | move it into examples |
| Repeats the same joke | too few banter variants | vary phrasing, keep each short |
| Truncated replies | `MAX_LENGTH` below the widest trace | raise to 2048 |
| Tells learner to fix `exercise_concepts` | trained on the v1 raw trace | never rebuild from `raw/archive/` |
| Loss barely moves | dataset too uniform | widen scenarios, not epochs |

---

## 8. Related files

| Path | Role |
| --- | --- |
| `data/traces/scenarios/python-tutor-scenarios.mjs` | authored source of truth |
| `scripts/lib/app-messages.mjs` | renders through the real app builders |
| `scripts/build-training-traces.mjs` | scenarios → JSONL + splits + metadata |
| `scripts/validate-training-traces.mjs` | the gate; must pass clean |
| `scripts/build-eval-prompts.mjs` | benchmark inputs → rendered prompts |
| `scripts/fine_tune_tutor.py` | QLoRA trainer |
| `benchmarks/run_model_baseline.py` | eval runner (`ADAPTER_PATH`, `RESULTS_FILE`) |
| `lib/ai/response.js` | the parse contract |
| `data/traces/raw/archive/` | obsolete v1 output — reference only, never train on it |

---

## 9. Housekeeping

- `supabase/migrations/0002_exercise_concepts.sql` must not be applied to the
  shared Supabase project without explicit authorization.
- Do not add `"type": "module"` to `package.json`; `data/` relies on Node's
  module detection warnings being suppressed by the npm scripts instead.
- Keep `data/models/` and `*.safetensors` out of git.
