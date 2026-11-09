# 4. Gemini as the main AI provider, Groq as the fallback

- Status: Accepted (implemented in phase 3)
- Date: 2026-11-09

## Context

The AI must run on free tiers. Gemini's free tier has been reduced several times since late 2025,
Google no longer publishes per-model free limits, and every visitor of the public demo shares the
same project quota. Relying on one free provider makes it a single point of failure.

## Decision

- A small provider interface in the API, with two adapters: Gemini (main) and Groq (fallback).
- The API switches to Groq when Gemini returns a quota error (HTTP 429), a server error, or times
  out. After a daily-quota error, Gemini is skipped until its quota resets, instead of being retried
  on every request.
- Both providers are asked for JSON matching the same schema. Every response goes through the same
  Pydantic validation and repair step, so the UI never sees invalid output or which provider
  answered.
- The Gemini API key lives in a separate Google Cloud project with billing disabled, so it stays on
  the free tier even though the main project is on Blaze.
- The usage meter counts a user's AI requests regardless of which provider served them.

## Consequences

- Roughly double the free capacity, and the app keeps working if one provider is down.
- Prompts may need small per-provider adjustments; versioned templates keep those explicit.
- Gemini's free tier may use prompts to improve Google's products, so the app shows a privacy note
  and the tutor chat does not ask for personal details.
