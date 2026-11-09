# 7. Stripe test-mode billing without the SDK

Date: 2026-11-09

## Context

The spec asks for Free and Pro plans with a pricing page and Stripe checkout in test mode only,
clearly labeled as a demo. The product must never be able to take real money, and the app must
keep working on deployments without Stripe keys.

## Decision

- The API talks to Stripe's REST API with the existing `httpx` client: three calls (create a
  Checkout Session, read a session, cancel a subscription). Webhook signatures are checked with
  HMAC-SHA256 in a small pure module, with a 5-minute replay window.
- **Test mode is enforced in code:** settings refuse any key that is not `sk_test_` or
  `rk_test_`, so a live key stops the API from starting.
- Checkout uses inline `price_data` (Pro, 5 USD a month), so no product setup is needed in the
  Stripe dashboard.
- An upgrade is confirmed two ways. The browser returns with the session ID and the API reads that
  session from Stripe, accepting it only if it is paid, complete and was opened by the same user.
  Stripe's signed `checkout.session.completed` webhook does the same independently, and
  `customer.subscription.deleted` downgrades. Either path alone is enough.
- The Stripe customer and subscription IDs live in a server-only `billing/{uid}` document; the
  profile only carries `tier`. Deleting an account cancels its subscription first.
- Without keys, `GET /billing` says checkout is unavailable and the pricing page explains it.

## Consequences

- One less dependency and no SDK version drift; the trade-off is owning three request shapes.
- Demo accounts can try the whole checkout with Stripe's test card, which is the point of a
  portfolio demo; their subscriptions are cancelled when the demo account is cleaned up.
