# 6. Authentication and demo accounts

- Status: Accepted
- Date: 2026-11-09

## Context

Reviewers should see a working account within seconds, without signing up. Real users sign in with
Google. Every account must behave the same way, and no user may see another user's data.

## Decision

- **Google sign-in** uses Firebase Auth's popup flow on the default `firebaseapp.com` auth domain.
  Popups keep working in browsers that block third-party storage, and no OAuth redirect URIs need
  to be maintained per domain.
- **"Try the demo"** signs in anonymously. Anonymous users exist only through this button, so the
  API treats every anonymous user as a demo user.
- **Provisioning on first contact:** `POST /api/me` returns the profile and creates it on first
  call. For a demo user, it writes the profile and the demo seed in one atomic batch of
  create-only writes, so concurrent calls seed exactly once and an account is never half-seeded.
  Seed dates are relative to the moment of sign-in, so the demo always looks three weeks in.
- **One demo account per visitor**, owned by that visitor's anonymous user. Nothing is shared
  between visitors, and the same security rules apply.
- **The browser holds only public configuration.** Firebase web config ships in the bundle by
  design; the API verifies an ID token on every request, and Firestore rules allow reading only
  your own data.
- **Post-sign-in redirects** accept only same-site paths, which prevents open redirects.

## Consequences

- Each demo click creates a new anonymous user. They cost nothing; deleting old ones arrives in
  phase 8 together with "delete account", which needs the same code.
- The seed grows as features land (placement result, plan, lessons, quiz history).
- Preview channels can run the demo, but Google sign-in works only on authorized domains.
