from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from darb_api.ai.client import AiClient
from darb_api.ai.fake import FakeProvider
from darb_api.config import Settings
from darb_api.main import create_app
from tests.conftest import AS_ADA, AS_DEMO, NOW
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository


@pytest.fixture
def client(
    settings: Settings, verifier: FakeTokenVerifier, repository: InMemoryUserRepository
) -> Iterator[TestClient]:
    app = create_app(
        settings, verifier, repository, clock=lambda: NOW, ai=AiClient([FakeProvider()])
    )
    with TestClient(app) as test_client:
        test_client.post("/api/me", headers=AS_DEMO)
        test_client.post("/api/me", headers=AS_ADA)
        yield test_client


def test_usage_shows_todays_ai_requests(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    [skill] = repository.skills["user-demo"]
    client.post(f"/api/skills/{skill.id}/lessons/w4-l1/content", headers=AS_DEMO)

    usage = client.get("/api/me/usage", headers=AS_DEMO).json()

    assert usage == {
        "used": 1,
        "limit": 20,
        "resetsAt": "2026-11-10T00:00:00Z",
        "tier": "free",
        "skills": 1,
        "skillLimit": 3,
    }


def test_deleting_the_account_erases_only_that_users_data(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    response = client.delete("/api/me", headers=AS_DEMO)

    assert response.status_code == 204
    assert "user-demo" not in repository.profiles
    assert "user-demo" not in repository.skills
    assert all(uid != "user-demo" for uid, _ in repository.plans)
    assert all(uid != "user-demo" for uid, _ in repository.reviews)
    assert all(uid != "user-demo" for uid, _ in repository.activity)
    assert "user-ada" in repository.profiles
