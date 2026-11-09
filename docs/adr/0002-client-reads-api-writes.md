# 2. Clients read their own data; every write goes through the API

- Status: Accepted
- Date: 2026-11-09

## Context

Firestore can be used directly from the browser, guarded by security rules, or only through the
API. Some data must never be writable by the user: the plan tier (Free or Pro), AI usage counters,
AI-generated content, and quiz results that decide the user's level.

## Decision

- The browser reads only its own data (`users/{uid}/**`) directly from Firestore, enforced by
  security rules.
- Every write goes through the API, which verifies the Firebase ID token, validates input with
  Pydantic, applies the domain rules, and writes with the Admin SDK. Security rules deny all
  client writes.
- Domain logic (scheduling, spaced repetition, streaks, levels, usage limits) is written once, as
  pure Python in the API. The frontend displays results and does not re-implement rules.

## Consequences

- A user cannot grant themselves Pro or reset their AI quota from the browser's devtools.
- There is one validation point for every write.
- Writes need a round trip to the API, so the UI uses optimistic updates (TanStack Query) to stay
  responsive.
- Reads stay fast and can use real-time listeners without going through the API.
