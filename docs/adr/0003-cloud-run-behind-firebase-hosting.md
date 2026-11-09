# 3. Host the API on Cloud Run behind Firebase Hosting

- Status: Accepted
- Date: 2026-11-09

## Context

The API runs FastAPI in Docker. It has to answer quickly for a visitor who clicks "Try the demo",
and it has to cost nothing at portfolio traffic. Options considered:

| Option                   | Why not                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| Hugging Face Spaces      | Sleeps after 48 hours idle with a slow wake; needs a long-lived service-account key.      |
| Render (free)            | Sleeps after 15 minutes idle and takes 30 to 60 seconds to wake.                          |
| Cloud Functions (Python) | Flask-style handlers; FastAPI would need a third-party wrapper. Runs on Cloud Run anyway. |

## Decision

- Cloud Run in `us-east1`, next to Firestore, deployed from the same Dockerfile used locally, and
  scaled to zero when idle.
- Firebase Hosting rewrites `/api/**` to the Cloud Run service, so the app and the API share one
  origin and no CORS configuration is needed.
- The API runs as a dedicated service account that can only use Firestore. No key files exist.
- GitHub Actions deploys through Workload Identity Federation: short-lived credentials, issued only
  to workflows in this repository.
- Spending guardrails: at most 2 instances, CPU billed only while handling requests, per-user rate
  limits in the API, a budget alert, and a cleanup policy for old container images.

## Consequences

- Requires the Blaze plan (a card on file). Budget alerts send emails but do not stop spending,
  which is why the instance cap and rate limits exist.
- Cold starts of a few seconds after idle periods.
- Firebase Hosting rewrites time out after 60 seconds, so long AI generations are split into
  smaller calls or streamed.
- The Firestore free quota still applies on Blaze.
