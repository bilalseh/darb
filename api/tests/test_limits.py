from collections.abc import Iterator
from datetime import date

import pytest
from fastapi.testclient import TestClient

from darb_api.ai.client import AiClient
from darb_api.ai.types import FailureKind, ProviderError
from darb_api.config import Settings
from darb_api.domain.usage import can_add_skill, skill_allowance
from darb_api.main import create_app
from darb_api.prompts import render
from darb_api.schemas import Tier
from tests.conftest import AS_ADA, AS_DEMO, NOW
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository, ScriptedProvider

ANSWERS = {
    "skill": "Chess",
    "reason": "hobby",
    "level": "beginner",
    "hoursPerWeek": 3,
    "preferredDays": ["mon", "thu"],
    "learningStyle": "practice",
    "targetDate": None,
}


@pytest.fixture
def provider() -> ScriptedProvider:
    return ScriptedProvider("down", [])


@pytest.fixture
def client(
    settings: Settings,
    verifier: FakeTokenVerifier,
    repository: InMemoryUserRepository,
    provider: ScriptedProvider,
) -> Iterator[TestClient]:
    ai = AiClient([provider])
    app = create_app(settings, verifier, repository, clock=lambda: NOW, ai=ai)
    with TestClient(app) as test_client:
        test_client.post("/api/me", headers=AS_ADA)
        test_client.post("/api/me", headers=AS_DEMO)
        yield test_client


def test_skill_allowance_by_plan() -> None:
    assert skill_allowance(is_pro=False, is_demo=False) == 1
    assert skill_allowance(is_pro=False, is_demo=True) == 3
    assert skill_allowance(is_pro=True, is_demo=False) is None
    assert can_add_skill(5, None)
    assert not can_add_skill(1, 1)


def test_free_accounts_have_one_skill(client: TestClient) -> None:
    first = client.post("/api/skills", json=ANSWERS, headers=AS_ADA)
    second = client.post("/api/skills", json=ANSWERS, headers=AS_ADA)

    assert first.status_code == 201
    assert second.status_code == 402
    assert second.json()["detail"] == {"code": "skill_limit_reached", "limit": 1}


def test_pro_accounts_have_unlimited_skills(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    repository.profiles["user-ada"] = repository.profiles["user-ada"].model_copy(
        update={"tier": Tier.PRO}
    )
    statuses = {client.post("/api/skills", json=ANSWERS, headers=AS_ADA).status_code for _ in "abc"}

    assert statuses == {201}
    assert client.get("/api/me/usage", headers=AS_ADA).json()["skillLimit"] is None


def test_demo_accounts_can_try_a_few_more_skills(client: TestClient) -> None:
    codes = [client.post("/api/skills", json=ANSWERS, headers=AS_DEMO).status_code for _ in "abc"]

    assert codes == [201, 201, 402]  # the seeded Spanish skill is the first of three


def test_a_failed_ai_call_is_not_counted(
    client: TestClient, repository: InMemoryUserRepository, provider: ScriptedProvider
) -> None:
    provider._replies = [ProviderError("down", FailureKind.TRANSIENT, "boom")]
    [skill] = repository.skills["user-demo"]

    response = client.post(f"/api/skills/{skill.id}/lessons/w4-l1/content", headers=AS_DEMO)

    assert response.status_code == 503
    assert client.get("/api/me/usage", headers=AS_DEMO).json()["used"] == 0
    assert repository.usage[("user-demo", date(2026, 11, 9).isoformat())] == 0


def test_the_ai_writes_in_the_chosen_language(
    client: TestClient, repository: InMemoryUserRepository, provider: ScriptedProvider
) -> None:
    preferences = {"language": "ar", "checkinReminders": True, "reviewReminders": False}
    saved = client.put("/api/me/preferences", json=preferences, headers=AS_DEMO).json()
    [skill] = repository.skills["user-demo"]

    client.post(f"/api/skills/{skill.id}/lessons/w4-l1/content", headers=AS_DEMO)

    assert saved["preferences"] == preferences
    assert "Modern Standard Arabic" in provider.requests[0].system


def test_prompts_default_to_english() -> None:
    prompt = render(
        "tutor",
        skill="s",
        level="l",
        title="t",
        objective="o",
        explanation="e",
        history="h",
        message="m",
    )

    assert prompt.system.endswith(
        "Write every text meant for the learner in English. Keep JSON keys, enum values and "
        "anything the schema fixes exactly as specified."
    )


def test_unknown_preferences_are_rejected(client: TestClient) -> None:
    response = client.put("/api/me/preferences", json={"language": "fr"}, headers=AS_ADA)

    assert response.status_code == 422
