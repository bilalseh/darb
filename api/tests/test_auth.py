from typing import Any

import pytest
from fastapi.testclient import TestClient
from firebase_admin import auth as firebase_auth

from darb_api import auth
from darb_api.auth import AuthenticatedUser, CurrentUser, InvalidTokenError, user_from_claims
from darb_api.config import Settings
from darb_api.main import create_app
from tests.conftest import FakeTokenVerifier


@pytest.fixture
def protected_client(settings: Settings, verifier: FakeTokenVerifier) -> TestClient:
    app = create_app(settings, verifier)

    @app.get("/api/test/me")
    def me(user: CurrentUser) -> dict[str, object]:
        return {"uid": user.uid, "is_anonymous": user.is_anonymous}

    return TestClient(app)


class TestCurrentUserDependency:
    def test_rejects_a_missing_header(self, protected_client: TestClient) -> None:
        response = protected_client.get("/api/test/me")

        assert response.status_code == 401
        assert response.headers["WWW-Authenticate"] == "Bearer"

    def test_rejects_a_non_bearer_scheme(self, protected_client: TestClient) -> None:
        response = protected_client.get("/api/test/me", headers={"Authorization": "Basic YTpi"})

        assert response.status_code == 401

    def test_rejects_an_invalid_token(self, protected_client: TestClient) -> None:
        response = protected_client.get("/api/test/me", headers={"Authorization": "Bearer forged"})

        assert response.status_code == 401
        assert response.json() == {"detail": "Missing or invalid ID token"}

    def test_accepts_a_valid_token(self, protected_client: TestClient) -> None:
        response = protected_client.get(
            "/api/test/me", headers={"Authorization": "Bearer demo-token"}
        )

        assert response.status_code == 200
        assert response.json() == {"uid": "user-demo", "is_anonymous": True}


class TestUserFromClaims:
    def test_maps_a_google_user(self) -> None:
        claims = {
            "uid": "u1",
            "email": "ada@example.com",
            "firebase": {"sign_in_provider": "google.com"},
        }

        assert user_from_claims(claims) == AuthenticatedUser(
            uid="u1", is_anonymous=False, email="ada@example.com"
        )

    def test_flags_anonymous_sign_in(self) -> None:
        claims = {"uid": "u2", "firebase": {"sign_in_provider": "anonymous"}}

        assert user_from_claims(claims).is_anonymous is True

    def test_ignores_a_non_string_email(self) -> None:
        assert user_from_claims({"uid": "u3", "email": 42}).email is None


class TestFirebaseTokenVerifier:
    @pytest.fixture
    def verifier(self) -> auth.FirebaseTokenVerifier:
        return auth.FirebaseTokenVerifier("demo-darb")

    @pytest.mark.parametrize(
        "error",
        [ValueError("malformed"), firebase_auth.InvalidIdTokenError("bad signature")],
    )
    def test_wraps_sdk_errors(
        self,
        verifier: auth.FirebaseTokenVerifier,
        monkeypatch: pytest.MonkeyPatch,
        error: Exception,
    ) -> None:
        def raise_error(*_args: Any, **_kwargs: Any) -> None:
            raise error

        monkeypatch.setattr(firebase_auth, "verify_id_token", raise_error)

        with pytest.raises(InvalidTokenError):
            verifier.verify("token")

    def test_returns_the_user_for_valid_claims(
        self, verifier: auth.FirebaseTokenVerifier, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        monkeypatch.setattr(
            firebase_auth,
            "verify_id_token",
            lambda *_args, **_kwargs: {"uid": "u4", "firebase": {"sign_in_provider": "google.com"}},
        )

        assert verifier.verify("token").uid == "u4"
