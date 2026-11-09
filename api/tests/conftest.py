from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from darb_api.auth import AuthenticatedUser
from darb_api.config import Settings
from darb_api.main import create_app
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository

NOW = datetime(2026, 11, 9, 12, 0, tzinfo=UTC)
ADA = AuthenticatedUser(uid="user-ada", is_anonymous=False, email="ada@example.com", name="Ada")
DEMO = AuthenticatedUser(uid="user-demo", is_anonymous=True, email=None)
AS_ADA = {"Authorization": "Bearer ada-token"}
AS_DEMO = {"Authorization": "Bearer demo-token"}


@pytest.fixture
def settings() -> Settings:
    return Settings(environment="test", app_version="test-sha", firebase_project_id="demo-darb")


@pytest.fixture
def verifier() -> FakeTokenVerifier:
    return FakeTokenVerifier({"ada-token": ADA, "demo-token": DEMO})


@pytest.fixture
def repository() -> InMemoryUserRepository:
    return InMemoryUserRepository()


@pytest.fixture
def client(
    settings: Settings, verifier: FakeTokenVerifier, repository: InMemoryUserRepository
) -> Iterator[TestClient]:
    app = create_app(settings, verifier, repository, clock=lambda: NOW)
    with TestClient(app) as test_client:
        yield test_client
