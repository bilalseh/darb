# Darb (درب)

Learn any skill with a personal AI plan that adapts week by week.

> Status: phase 4 of 10 (plans, calendar, editing). Live: https://darb-learn.web.app

## Repository layout

| Path        | What it holds                                                                          |
| ----------- | -------------------------------------------------------------------------------------- |
| `web/`      | React 19 + TypeScript + Vite frontend                                                  |
| `api/`      | FastAPI backend (Python 3.12), deployed to Cloud Run                                   |
| `shared/`   | JSON Schema, TypeScript types and Zod schemas generated from the API's Pydantic models |
| `firebase/` | Firestore security rules, indexes and rules tests                                      |
| `e2e/`      | Playwright end-to-end tests                                                            |
| `infra/`    | One-time Google Cloud setup script                                                     |
| `docs/adr/` | Architecture decision records                                                          |

## Prerequisites

Node 22.12+, pnpm 10, [uv](https://docs.astral.sh/uv/), Docker, and Java 21+ (for the Firebase
emulators).

## Local development

Everything runs offline against the Firebase emulators (project `demo-darb`); no cloud account is
needed.

```sh
pnpm install
cp api/.env.example api/.env
pnpm emulators   # Auth on :9099, Firestore on :8180, emulator UI on :4000
pnpm dev:api     # http://127.0.0.1:8000/api/health
pnpm dev:web     # http://localhost:5173, proxies /api to the API
```

## Checks

```sh
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:emulator  # Firestore rules and the API's Firestore layer, against the emulator
pnpm test:e2e       # Playwright: demo sign-in and onboarding, desktop and phone
pnpm gen:schemas    # regenerate shared types and Zod schemas after changing an API model
cd api && uv run ruff check . && uv run mypy && uv run pytest
```

Before the first E2E run: `pnpm --filter @darb/e2e exec playwright install chromium`.

## Deployment

Pushes to `main` deploy after CI passes: the API to Cloud Run, then the frontend, Firestore rules
and indexes to Firebase. Pull requests get a Hosting preview URL. One-time cloud setup is in
[`infra/gcp-setup.sh`](infra/gcp-setup.sh).

AI keys (Gemini, with Groq as fallback) live in Secret Manager: run
[`infra/set-ai-keys.sh`](infra/set-ai-keys.sh) and set the `AI_SECRETS` repository variable it
prints. Without keys the app still runs; AI features say the AI is resting. Locally and in tests,
`AI_PROVIDERS=fake` gives deterministic AI output with no key.

## How AI output is validated

Every AI reply is parsed into a Pydantic model and checked against its rules (for example: every
quiz question uses a listed sub-skill, multiple choice answers point at a real option). An invalid
reply gets one repair attempt that quotes the exact validation errors; if that fails, the next
provider is tried. Output that never validates is not shown. Answer keys stay on the server.

## Decisions

See [`docs/adr/`](docs/adr/) and [`docs/assumptions.md`](docs/assumptions.md).
