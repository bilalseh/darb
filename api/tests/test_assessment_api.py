from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient

from darb_api.ai.client import AiClient
from darb_api.ai.fake import FakeProvider
from darb_api.config import Settings
from darb_api.main import create_app
from darb_api.schemas import OnboardingAnswers, Skill, SkillStatus
from tests.conftest import AS_ADA, NOW
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository, ScriptedProvider
from tests.test_skills import answers

BASE = "/api/skills/skill-1/assessment"


@pytest.fixture
def skill_repository(repository: InMemoryUserRepository) -> InMemoryUserRepository:
    repository.skills["user-ada"] = [
        Skill(
            id="skill-1",
            answers=OnboardingAnswers.model_validate(answers()),
            status=SkillStatus.ONBOARDED,
            created_at=NOW,
        )
    ]
    return repository


def make_client(
    settings: Settings, verifier: FakeTokenVerifier, repo: InMemoryUserRepository, ai: AiClient
) -> TestClient:
    return TestClient(create_app(settings, verifier, repo, clock=lambda: NOW, ai=ai))


@pytest.fixture
def client(
    settings: Settings, verifier: FakeTokenVerifier, skill_repository: InMemoryUserRepository
) -> Iterator[TestClient]:
    with make_client(settings, verifier, skill_repository, AiClient([FakeProvider()])) as c:
        yield c


def reply_for(question: dict[str, Any]) -> dict[str, Any]:
    body: dict[str, Any] = {"questionId": question["id"]}
    if question["kind"] == "multiple_choice":
        body["choice"] = 0
    elif question["kind"] == "short_answer":
        body["text"] = "Practise a little every day with a clear goal."
    else:
        body["confidence"] = 4
    return body


def test_runs_a_whole_assessment(
    client: TestClient, skill_repository: InMemoryUserRepository
) -> None:
    progress = client.post(BASE, headers=AS_ADA).json()
    assert progress["answered"] == 0
    assert progress["question"]["id"] == "q1"

    while not progress["finished"]:
        response = client.post(
            f"{BASE}/answers", json=reply_for(progress["question"]), headers=AS_ADA
        )
        assert response.status_code == 200, response.text
        progress = response.json()

    result = client.post(f"{BASE}/complete", headers=AS_ADA).json()

    assert result["level"] in {"beginner", "elementary", "intermediate", "advanced"}
    assert {s["name"] for s in result["subskills"]} == {"Foundations", "Technique", "Application"}
    [skill] = skill_repository.skills["user-ada"]
    assert skill.status is SkillStatus.ASSESSED
    assert skill.placement is not None
    assert skill_repository.assessments == {}  # the answer key is discarded
    assert skill_repository.usage[("user-ada", "2026-11-09")] == 2


def test_never_sends_answers_to_the_browser(client: TestClient) -> None:
    body = client.post(BASE, headers=AS_ADA).text

    assert "correctOption" not in body
    assert "referenceAnswer" not in body


def test_resuming_does_not_call_the_ai_again(
    client: TestClient, skill_repository: InMemoryUserRepository
) -> None:
    first = client.post(BASE, headers=AS_ADA).json()
    second = client.post(BASE, headers=AS_ADA).json()

    assert first == second
    assert skill_repository.usage[("user-ada", "2026-11-09")] == 1


def test_answers_must_follow_the_current_question(client: TestClient) -> None:
    client.post(BASE, headers=AS_ADA)

    response = client.post(
        f"{BASE}/answers", json={"questionId": "q5", "choice": 0}, headers=AS_ADA
    )

    assert response.status_code == 409


def test_answers_must_fit_the_question(client: TestClient) -> None:
    client.post(BASE, headers=AS_ADA)

    response = client.post(
        f"{BASE}/answers", json={"questionId": "q1", "text": "?"}, headers=AS_ADA
    )

    assert response.status_code == 422


def test_cannot_complete_early(client: TestClient) -> None:
    client.post(BASE, headers=AS_ADA)

    assert client.post(f"{BASE}/complete", headers=AS_ADA).status_code == 409


def test_unknown_skill_is_not_found(client: TestClient) -> None:
    assert client.post("/api/skills/nope/assessment", headers=AS_ADA).status_code == 404


def test_reports_an_unavailable_ai(
    settings: Settings, verifier: FakeTokenVerifier, skill_repository: InMemoryUserRepository
) -> None:
    broken = AiClient([ScriptedProvider("a", ["not json", "still not json"])])
    with make_client(settings, verifier, skill_repository, broken) as client:
        response = client.post(BASE, headers=AS_ADA)

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "ai_unavailable"
    assert skill_repository.assessments == {}


def test_enforces_the_daily_ai_limit(
    verifier: FakeTokenVerifier, skill_repository: InMemoryUserRepository
) -> None:
    settings = Settings(
        environment="test", firebase_project_id="demo-darb", ai_daily_limit_per_user=0
    )
    with make_client(settings, verifier, skill_repository, AiClient([FakeProvider()])) as client:
        response = client.post(BASE, headers=AS_ADA)

    assert response.status_code == 429
    assert response.json()["detail"] == {
        "code": "ai_limit_reached",
        "scope": "user",
        "resetsAt": "2026-11-10T00:00:00+00:00",
    }
