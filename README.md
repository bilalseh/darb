# Darb (درب)

Learn any skill with a personal AI plan that adapts week by week.

> Status: phase 1 of 10 (foundation). Live: https://darb-learn.web.app

## Repository layout

| Path        | What it holds                                                              |
| ----------- | -------------------------------------------------------------------------- |
| `web/`      | React 19 + TypeScript + Vite frontend                                      |
| `api/`      | FastAPI backend (Python 3.12), deployed to Cloud Run                       |
| `shared/`   | JSON Schemas and TypeScript types generated from the API's Pydantic models |
| `firebase/` | Firestore security rules, indexes and rules tests                          |
| `infra/`    | One-time Google Cloud setup script                                         |
| `docs/adr/` | Architecture decision records                                              |

## Prerequisites

Node 22.12+, pnpm 10, [uv](https://docs.astral.sh/uv/), Docker, and Java 21+ (for the Firestore
emulator).

## Local development

```sh
pnpm install
cp api/.env.example api/.env
pnpm dev:api   # http://127.0.0.1:8000/api/health
pnpm dev:web   # http://localhost:5173, proxies /api to the API
```

## Checks

```sh
pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm test:rules     # Firestore rules against the emulator
pnpm gen:schemas    # regenerate shared types after changing an API model
cd api && uv run ruff check . && uv run mypy && uv run pytest
```

## Deployment

Pushes to `main` deploy after CI passes: the API to Cloud Run, then the frontend, Firestore rules
and indexes to Firebase. Pull requests get a Hosting preview URL. One-time cloud setup is in
[`infra/gcp-setup.sh`](infra/gcp-setup.sh).

## Decisions

See [`docs/adr/`](docs/adr/).
