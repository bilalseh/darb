"""Calls made by Google Cloud itself (the daily demo cleanup), not by users.

Cloud Scheduler signs each call with a Google ID token for a service account; the API accepts
it only for the configured audience and that one account.
"""

from typing import Protocol

import firebase_admin
from firebase_admin import auth as firebase_auth
from google.auth.exceptions import GoogleAuthError
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2 import id_token


class ServiceTokenVerifier(Protocol):
    def email_of(self, token: str, audience: str) -> str | None:
        """The verified service account email of a Google ID token, or None if invalid."""
        ...


class AccountDeleter(Protocol):
    def delete(self, uids: list[str]) -> int:
        """Delete sign-in accounts; returns how many could not be deleted."""
        ...


class GoogleServiceTokenVerifier:
    def email_of(self, token: str, audience: str) -> str | None:
        try:
            claims = id_token.verify_oauth2_token(  # type: ignore[no-untyped-call]
                token, GoogleRequest(), audience
            )
        except (ValueError, GoogleAuthError):
            return None
        email = claims.get("email")
        return email if isinstance(email, str) and claims.get("email_verified") else None


class FirebaseAccountDeleter:
    """Needs the Firebase Authentication Admin role on the API's service account."""

    def delete(self, uids: list[str]) -> int:
        if not uids:
            return 0
        result = firebase_auth.delete_users(uids, app=firebase_admin.get_app())
        return int(result.failure_count)
