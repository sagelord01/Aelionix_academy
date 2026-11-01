# Training traces

`python_traces.jsonl` and `splits/` are **generated**. Never edit them by hand —
the next `npm run traces:build` overwrites them.

| Path | Status |
| --- | --- |
| `scenarios/python-tutor-scenarios.mjs` | authored source of truth |
| `python_traces.jsonl` | generated, one JSON object per line |
| `splits/train.jsonl`, `splits/eval.jsonl` | generated |
| `raw/archive/` | obsolete v1 output, reference only |

```bash
npm run traces:build      # regenerate from scenarios
npm run traces:validate   # must print "All checks passed."
```

The archive contains the v1 traces: invented system prompt, no context block,
prose instead of JSON, and advice telling the learner to fix an authoring
issue they do not own. Training on it reproduces that bug. Read
`docs/tutor-finetune-runbook.md` before changing anything here.
