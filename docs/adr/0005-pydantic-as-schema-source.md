# 5. Pydantic models are the single source of truth for API types

- Status: Accepted
- Date: 2026-11-09

## Context

The frontend and the API must agree on every request, response and AI output shape. Writing the
types twice lets them drift apart silently.

## Decision

- API models and AI output models are Pydantic models in `api/src/darb_api/schemas/`, registered
  in `PUBLIC_MODELS`.
- `pnpm gen:schemas` exports them to JSON Schema (`shared/schemas/`) and generates TypeScript
  types from those (`shared/src/generated/`). The web app imports them from `@darb/shared`.
- Generated files are committed. CI regenerates them and fails if anything changed.

## Consequences

- A backend model change that is not reflected in the frontend fails CI instead of failing at
  runtime.
- The same JSON Schemas are what the AI providers receive for structured output (phase 3).
