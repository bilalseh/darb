# 1. Monorepo layout and tooling

- Status: Accepted
- Date: 2026-11-09

## Context

Darb has a React frontend, a Python API, shared API types and Firebase configuration. They
change together: an API model change has to update the frontend types in the same commit.

## Decision

- One repository. pnpm workspaces hold the TypeScript packages (`web`, `shared`, `firebase`);
  uv manages the Python API in `api`. No Turborepo or Nx: with three small packages, a task
  runner adds configuration without saving real time.
- TypeScript is pinned to 6.0.x. TypeScript 7 is released, but typescript-eslint 8 supports only
  versions below 6.1. Revisit when typescript-eslint supports TypeScript 7.
- ESLint is pinned to 9.x, because eslint-plugin-jsx-a11y does not support ESLint 10 yet and
  accessibility linting matters more here than the newest ESLint.
- Strict by default: TypeScript `strict` plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`, typescript-eslint `strict-type-checked`, `mypy --strict`, and a
  broad ruff rule set.
- LF line endings everywhere (`.gitattributes`), so generated files are byte-identical on
  Windows and on Linux CI.

## Consequences

- `pnpm install` plus `uv sync` sets up the whole repository.
- Two version pins to revisit as the ecosystem catches up.
