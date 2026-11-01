# Aelionix Academy

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/sagelord01/Aelionix_academy/blob/main/notebooks/Aelionix_Tutor_Train_and_Serve.ipynb)

A production-oriented Python learning platform built with Next.js App Router. It combines a structured curriculum, an adaptive starting-point check, a real code-execution workspace, spaced review, evidence-based mastery, and two deliberately different AI tutor modes.

Everything the interface reports comes from persisted records or a live provider response. There are no simulated progress numbers, fabricated execution output, invented testimonials, or pre-filled mastery states. When an integration is missing, the UI says so and explains which environment variable is required.

## What is included

- **Public site** — landing page generated from the real curriculum source, plus privacy and terms pages.
- **Auth** — email/password sign-up, sign-in, email confirmation callback, password reset, optional Google OAuth, session refresh, and protected routes.
- **Onboarding** — goal, experience, time budget, and learning preferences stored on the learner profile.
- **Adaptive assessment** — 12 seeded questions, 10-question target, difficulty stepping, unseen-concept preference, and a practical coding question only after enough early evidence. Answers are graded server-side and correctness is not revealed until completion.
- **Curriculum** — 12 Python lessons and 21 exercises, with prerequisites and concept mappings.
- **Lesson workspace** — lesson notes, exercise prompt, starter code, CodeMirror Python editor, local draft persistence, real runs, and graded submissions with hidden tests.
- **Two tutor modes** — Independent Coding Coach (hint-first, withholds solutions) and AI Coding Partner (collaborative explanation and concrete examples). Each mode has its own prompt and its own persisted conversation.
- **Exploration** — browser-only scratchpad for free experimentation, with optional persisted session summaries and tutor discussion.
- **Practice and review** — concept practice and an SM-2-inspired review queue. Review answer keys stay server-side.
- **Progress** — real counts, per-concept mastery with an explicit rule set, assessment history, recent code attempts, activity chart, and recent recall.
- **Settings** — editable profile, integration status, account details, legal links, and password-confirmed account deletion.
- **Route states** — loading, error, not-found, and global error boundaries with truthful setup messaging.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.4 (App Router, JavaScript/JSX only) |
| UI | React 19, CSS Modules, centralized design tokens, lucide icons |
| Editor | CodeMirror 6 via `@uiw/react-codemirror` |
| Data and auth | Supabase Postgres, Supabase Auth, Row Level Security |
| AI | Provider-independent server layer; Groq adapter plus any OpenAI-compatible chat endpoint |
| Execution | Isolated Judge0 CE service through a server-side adapter |
| Validation | Zod |
| Tests | Vitest |

No TypeScript or TSX is used in application code. No learner code is evaluated inside the Next.js process: it is sent to the external execution service, and hidden tests are appended there server-side.

## Requirements

- Node.js 20.9 or newer (Next.js 16 requirement)
- A Supabase project
- A Groq API key and a model available to that account, or another OpenAI-compatible provider
- A Judge0 CE endpoint (hosted or self-hosted)

Live auth, database writes, AI responses, and code execution cannot work without these services configured. The app builds and renders setup states without them.

## Quick start

```bash
npm install
cp .env.example .env.local
# fill in .env.local using the sections below

npm run dev
```

Open `http://localhost:3000`.

Other scripts:

```bash
npm run lint
npm test
npm run build
npm start
npm run seed:generate
```

`npm run seed:generate` rebuilds `supabase/seed.sql` from `data/curriculum/python.js` with deterministic identifiers. Edit the curriculum, regenerate the seed, and reapply it rather than editing generated SQL by hand.

## Environment variables

All variables live in `.env.local` for local development. Server-only values must never be prefixed with `NEXT_PUBLIC_`.

### App

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_URL` | Recommended | Canonical origin used for auth redirects. Defaults to `http://localhost:3000`. Must match the deployed origin in production. |

### Supabase

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key used with RLS for user-scoped reads and writes. |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes for full functionality | Server-only key used to read hidden test keys, write validated progress, count usage, and delete accounts. Bypasses RLS, so it is never imported into client code. |
| `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH` | Optional | Set to `true` only after enabling the Google provider in Supabase. The button stays hidden otherwise. |

With the service role key missing, the app still supports browsing, drafts, and user-owned reads, but exercise runs/submissions, server-graded assessment completion, and progress recording report a setup error instead of pretending to succeed.

### AI tutor

| Variable | Required | Purpose |
| --- | --- | --- |
| `AI_PROVIDER` | Yes | `groq` (default) or `openai-compatible`. |
| `GROQ_API_KEY` | For Groq | Server-only Groq key. |
| `GROQ_MODEL` | For Groq | A model ID currently available in your Groq account. |
| `GROQ_BASE_URL` | Optional | Defaults to `https://api.groq.com/openai/v1`. |
| `AI_API_KEY` | For `openai-compatible` | Provider key. |
| `AI_MODEL` | For `openai-compatible` | Model ID. |
| `AI_BASE_URL` | For `openai-compatible` | Base URL including the version segment, for example `https://provider.example/v1`. |
| `AI_SUPPORTS_JSON_MODE` | Optional | Defaults to true. Set to `false` only for providers that reject `response_format: { type: "json_object" }`. |
| `AI_REQUEST_TIMEOUT_MS` | Optional | Request timeout, default 45000. |

The tutor layer requests a structured response, validates it with a parser, and returns a truthful failure state if the provider times out, rejects the key, rate-limits, or returns an unusable payload. The learner's message is stored before the provider call; a failed call can therefore leave a saved user message without an assistant reply.

### Code execution

| Variable | Required | Purpose |
| --- | --- | --- |
| `CODE_EXECUTION_PROVIDER` | Yes | Only `judge0` is supported. |
| `CODE_EXECUTION_API_URL` | Yes | Judge0 CE base URL. |
| `CODE_EXECUTION_API_KEY` | Depends on deployment | Sent using the configured header. |
| `CODE_EXECUTION_AUTH_HEADER` | Optional | Defaults to `X-Auth-Token`. Use `X-RapidAPI-Key` for RapidAPI-hosted Judge0; the adapter also sends `X-RapidAPI-Host`. |
| `CODE_EXECUTION_PYTHON_LANGUAGE_ID` | Optional | Defaults to `71` (Python 3). Confirm the ID on your Judge0 instance. |
| `CODE_EXECUTION_TIMEOUT_MS` | Optional | Polling deadline, default 20000. |

The adapter submits code, polls until completion or the deadline, and normalizes status, stdout, stderr, duration, and test results. It enforces a CPU limit of 5 seconds, wall limit of 10 seconds, and 128 MB memory in the submission payload.

## Supabase setup

1. Create a project at `https://supabase.com/dashboard`.
2. Copy the project URL, anon key, and service role key into `.env.local`.
3. Apply the schema and seed. Choose one path:

   **Supabase CLI**

   ```bash
   supabase link --project-ref <project-ref>
   supabase db push
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

   **SQL editor**

   Run `supabase/migrations/0001_initial_schema.sql`, then `supabase/seed.sql`, in that order. The seed is idempotent for the generated content and can be reapplied after regenerating it.

4. In **Authentication → URL Configuration**, set the Site URL to your app origin and add redirect URLs:

   - `http://localhost:3000/auth/callback`
   - `http://localhost:3000/auth/reset-password` (used through the callback's `next` parameter)
   - The production equivalents

5. Choose whether email confirmation is required. If it is enabled, confirmation links return through `/auth/callback?next=/onboarding`.
6. Optional Google sign-in: enable the Google provider in Supabase, add the callback URL, then set `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true`.

The migration creates profiles, curriculum content, exercises and hidden tests, assessment definitions and answer keys, attempts, mastery, lesson and exercise progress, drafts, code attempts, tutor conversations and messages, exploration sessions, review cards and keys, review attempts, learning events, AI usage, and usage events. It installs 29 RLS policies, triggers for profile creation and `updated_at`, and revokes anon/authenticated access to hidden tables.

### Security model

- User-owned rows are protected by RLS and scoped to `auth.uid()`.
- Server routes re-check the authenticated user before privileged writes.
- `exercise_tests`, `assessment_question_keys`, `review_card_keys`, and `usage_events` have no anon or authenticated policies and have grants revoked. Only the service role can read them.
- Answer keys and hidden test definitions never reach the browser. The execution adapter returns only parsed, sanitized test names and pass/fail results.
- Expensive routes (`ai`, `execution`, `assessment`, `review`, `explore`) are rate-limited with an in-memory sliding window plus a shared `usage_events` count.
- Account deletion requires the current password before the service role removes the auth user; related data is removed by foreign-key cascade.
- Security headers are set in `next.config.mjs`; the `X-Powered-By` header is disabled.

## AI tutor setup

The tutor is not hard-wired to one vendor. `lib/ai/provider.js` calls an OpenAI-style chat-completions endpoint, and `lib/ai/context.js` builds a bounded context from the current lesson, exercise, code, and recent messages. Prompts live in `data/prompts/tutor.js` and are versioned:

- `coach.v1` — hint-first. It asks the learner to reason, withholds complete solutions, and escalates hints gradually.
- `partner.v1` — collaborative. It may explain directly and give concrete examples while still requiring the learner to understand the submitted code.

The two modes use separate conversations, so switching modes never blends their histories. The server persists messages and records AI usage; the client only appends a message pair after a successful response.

To add another provider, implement the small adapter contract in `lib/ai/provider.js` and add its configuration branch in `lib/config/env.js`. UI code does not need to change.

## AI Tutor Fine-Tuning & Colab Sandbox

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/sagelord01/Aelionix_academy/blob/main/notebooks/Aelionix_Tutor_Train_and_Serve.ipynb)

Aelionix Academy includes a complete, 100% zero-cost workflow to fine-tune `Qwen/Qwen2.5-Coder-7B-Instruct` on the curriculum's pedagogical traces and live-test the model without requiring a local GPU:

- **1-Click Open in Colab**: Click the badge above (or open [`notebooks/Aelionix_Tutor_Train_and_Serve.ipynb`](notebooks/Aelionix_Tutor_Train_and_Serve.ipynb) in Google Colab).
- **Zero Full-Repo Cloning**: Step 3 in the notebook only downloads the required dataset splits (`data/traces/splits/train.jsonl` and `eval.jsonl`, ~190 KB total)—it does not clone the web application or download heavy frontend/node dependencies.
- **4-Bit QLoRA Fine-Tuning**: Trains the tutor adapter on a free Tesla T4 GPU in ~8–12 minutes with loss calculated strictly on tutor responses.
- **Instant Cloudflare Tunnel**: Step 5 spins up an OpenAI-compatible FastAPI server and exposes a public HTTPS tunnel.
- **Live Local App Testing**: Paste the generated tunnel URL into your local `.env.local`:
  ```bash
  AI_PROVIDER=openai-compatible
  AI_BASE_URL=https://<subdomain>.trycloudflare.com/v1
  AI_MODEL=aelionix-tutor
  AI_API_KEY=colab-tunnel
  AI_SUPPORTS_JSON_MODE=true
  ```
- **Phase 2 Production Rollout**: Step 6 pushes the adapter weights (~100 MB) to Hugging Face Model Hub, ready for serverless hosting on Together AI ($5 free credits = 25,000+ live requests with $0 idle cost).

## Execution setup

Point `CODE_EXECUTION_API_URL` at a Judge0 CE instance. For a self-hosted instance, ensure this app's server can reach it and that the instance has the Python 3 language enabled.

Important properties:

- Learner code is sent as text to Judge0. The Next.js process never calls `eval`, `exec`, a shell, or a child process on it.
- On submission, the server appends the exercise's hidden tests to the source before sending it to Judge0. The response is parsed and reduced to sanitized results.
- Runs and submissions require both a configured Judge0 endpoint and the Supabase service role key, because attempts and progress must be recorded with trusted writes.
- If Judge0 is unavailable, the UI reports the provider failure and preserves the learner's code. Nothing is marked complete.

## Rate limits

Defaults are per user, per rolling hour:

| Operation | Limit |
| --- | --- |
| Tutor messages | 30 |
| Code runs | 30 |
| Assessment answers | 80 |
| Review answers | 80 |
| Exploration sessions | 20 |

Limits are best-effort, not atomic. The in-memory window protects a single process instantly; the database count shares state across instances but uses a read-then-insert pattern. A high-concurrency production deployment should replace this with an atomic database function or a dedicated limiter.

## Mastery rules

Mastery is derived from evidence, never from lesson completion alone:

- No evidence → **Not assessed**
- One evidence item → **Insufficient evidence**
- At least 70% accuracy and one practical success → **Demonstrated**
- At least four evidence items, 85% accuracy, and two practical successes → **Ready for a challenge**
- Otherwise → **Developing**

Practical successes count only when the practical attempt was also correct. The rules are implemented in `lib/progress/mastery.js` and shown to learners on the progress page.

## Review scheduling

Review cards use a transparent SM-2-inspired schedule: correct recalls lengthen the interval, incorrect recalls reset it, and every attempt is persisted. The implementation is in `lib/review/schedule.js`; it is intentionally simple and inspectable rather than a full SM-2 implementation.

## Visual background

The interface uses the official React Bits **Aero Shards** WebGPU effect, mounted once in the root layout (`components/backgrounds/AeroShardsBackground.js`) so it survives client navigation and never creates duplicate canvases. It uses the app's violet, lavender, and indigo palette and is deliberately dimmed behind a scrim so it does not compete with copy, forms, or editors.

- The effect chunk (and `vgpu`) is imported at runtime only when `navigator.gpu` exists. Browsers that do not expose WebGPU keep the always-painted static gradient and never download the effect code.
- The background is a fixed, `pointer-events: none` layer at `z-index: 0`; page content sits at `z-index: 1`, so clicks, scrolling, text selection, and form input are unaffected.
- Shard count, resolution, glow, markers, and mouse response scale down by viewport area, device cores/memory, and pointer type. Focus routes (lessons, editor, assessment, review) use a calmer opacity.
- `prefers-reduced-motion` disables travel, mouse response, and the clock: one static frame is painted and repainted only when the viewport or settings change. CSS transitions are suppressed too, and rendering pauses while the tab is hidden.
- If WebGPU initialization fails, the canvas unmounts and the static gradient remains.

## Project structure

```
app/
  (public)/            landing, privacy, terms
  (auth)/              login, signup, forgot password, reset password
  onboarding/          profile setup
  (app)/               dashboard, assessment, learn, explore, practice, review,
                       progress, settings
  api/                 tutor, code run/status, assessment, review, explore
  auth/callback/       Supabase auth callback
components/            UI primitives, shell, editor, tutor, forms
  backgrounds/         Aero Shards WebGPU background and static fallback
data/
  curriculum/python.js curriculum source of truth
  prompts/tutor.js     versioned tutor prompts
lib/
  ai/                  provider, context, response parsing, service
  assessment/          adaptive engine, grading, orchestration
  config/              environment inspection
  data/                user-scoped queries
  execution/           harness, Judge0 adapter, normalization, service
  progress/            mastery, evidence recording
  review/              scheduling, service
  security/            rate limits, API helpers
  supabase/            browser-free server and admin clients
  validation/          Zod schemas
supabase/
  migrations/          schema, RLS, grants, triggers
  seed.sql             generated content seed
tests/                 Vitest coverage for pure logic
proxy.js               Next 16 session refresh and route protection
```

## Testing

```bash
npm test
```

The suite covers execution normalization and harness parsing, review scheduling, mastery, curriculum helpers, adaptive assessment selection and grading, tutor response parsing and context building, rate limiting, auth path safety, and validation schemas. Tests exercise pure modules only; modules that import `server-only` are not loaded in the test environment.

`npm run lint` and `npm run build` verify the application end to end.

## Known limitations

- Without Supabase, Groq (or another AI provider), and Judge0 credentials, live authentication, database operations, tutoring, and execution cannot be exercised. The UI reports these as setup states rather than simulating them.
- Rate limiting is best-effort and non-atomic, as described above.
- Judge0 execution is synchronous from the request's perspective. A submission that exceeds the polling deadline returns a `processing` status and can be checked through the status endpoint.
- Exploration scratchpads are stored in browser `localStorage`; they are not synced across devices. Exploration sessions and tutor messages are persisted.
- The curriculum is Python-only. The schema supports multiple tracks, but only the seeded Python track exists.
- The public site intentionally contains no testimonials, learner counts, outcomes, or pricing claims because none are measured.
