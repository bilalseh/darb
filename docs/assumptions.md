# Working assumptions

Decisions made without the product owner, so the build could continue. Each is easy to revisit;
anything that changes architecture also has an ADR.

## Phase 3: AI placement assessment

- **Models are configurable** through environment variables. Defaults: Gemini `gemini-flash-latest`
  (Google's alias for its newest Flash model) and Groq `openai/gpt-oss-120b`. Both support JSON
  output in a given schema.
- **Without API keys the AI is unavailable, not broken.** Users then see a friendly "AI is resting"
  message. Local development and E2E tests use a deterministic `fake` provider, so no key is ever
  needed to run the app or the tests.
- **"Adaptive" means adaptive length and order.** One AI call writes a bank of 6 to 10 questions
  across five difficulty levels. The server presents them from easy to hard and stops early once
  the learner misses two questions in a row. One AI call per quiz keeps the free quota usable.
- **Question kinds:** multiple choice (graded by the server), short answer (graded by the AI in one
  batch call at the end), and "rate your confidence" statements (count as self-assessment).
- **Answer keys never reach the browser.** Questions are served one at a time without answers; the
  full quiz is stored in a top-level `assessmentKeys` collection that clients cannot read.
- **Level** is computed by pure domain code from per-sub-skill scores: Beginner below 35,
  Elementary below 55, Intermediate below 75, Advanced from 75. The AI writes only the explanation.
- **AI usage limits start now** to protect the shared free quota: 20 AI requests per user per day
  (the Free plan figure from the spec) and a global cap of 500 per day across all users. Pro limits,
  the usage meter UI and pricing arrive in phase 8. These are **soft** daily limits: the counts use
  atomic increments instead of a transaction, because every user shares the one global counter and
  a transaction there would make concurrent requests fail. Simultaneous requests can overshoot a
  limit by a request or two; no request is ever lost from the count.
- **The demo seed** gains a finished placement result for Spanish, so reviewers see the radar
  chart immediately.
