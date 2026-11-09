from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from darb_api.ai.client import AiClient
from darb_api.ai.fake import FakeProvider
from darb_api.config import Settings
from darb_api.demo import demo_skills
from darb_api.main import create_app
from darb_api.schemas import (
    OnboardingAnswers,
    PlacementLevel,
    PlacementResult,
    Skill,
    SkillStatus,
    SubskillScore,
)
from tests.conftest import AS_ADA, AS_DEMO, NOW
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository
from tests.test_skills import answers

PLACEMENT = PlacementResult(
    level=PlacementLevel.BEGINNER,
    summary="A good start; build the basics first.",
    subskills=[SubskillScore(name="Basics", score=30)],
    completed_at=NOW,
)


@pytest.fixture
def client(
    settings: Settings, verifier: FakeTokenVerifier, repository: InMemoryUserRepository
) -> Iterator[TestClient]:
    repository.skills["user-ada"] = [
        Skill(
            id="skill-1",
            answers=OnboardingAnswers.model_validate(answers(targetDate=None)),
            status=SkillStatus.ASSESSED,
            created_at=NOW,
            placement=PLACEMENT,
        )
    ]
    app = create_app(
        settings, verifier, repository, clock=lambda: NOW, ai=AiClient([FakeProvider()])
    )
    with TestClient(app) as test_client:
        yield test_client


def test_creates_a_dated_plan_that_fits_the_week(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    response = client.post("/api/skills/skill-1/plan", headers=AS_ADA)

    assert response.status_code == 201
    plan = response.json()
    assert len(plan["weeks"]) == 8
    assert plan["weeks"][0]["startDate"] == "2026-11-09"
    lessons = plan["weeks"][1]["lessons"]
    # Preferred days are Tuesday and Thursday (see tests/test_skills.answers).
    assert {lesson["scheduledDate"] for lesson in lessons} <= {"2026-11-17", "2026-11-19"}
    assert repository.plans[("user-ada", "skill-1")].skill_id == "skill-1"


def test_a_skill_gets_one_plan(client: TestClient) -> None:
    client.post("/api/skills/skill-1/plan", headers=AS_ADA)

    assert client.post("/api/skills/skill-1/plan", headers=AS_ADA).status_code == 409


def test_a_plan_needs_a_placement_result(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    repository.skills["user-ada"][0] = repository.skills["user-ada"][0].model_copy(
        update={"placement": None, "status": SkillStatus.ONBOARDED}
    )

    assert client.post("/api/skills/skill-1/plan", headers=AS_ADA).status_code == 409


def test_moves_a_lesson(client: TestClient) -> None:
    client.post("/api/skills/skill-1/plan", headers=AS_ADA)

    response = client.patch(
        "/api/skills/skill-1/plan/lessons/w2-l1",
        json={"scheduledDate": "2026-11-21"},
        headers=AS_ADA,
    )

    assert response.status_code == 200
    moved = response.json()["weeks"][1]["lessons"][0]
    assert moved["id"] == "w2-l1"
    assert moved["scheduledDate"] == "2026-11-21"


def test_rejects_moving_a_lesson_into_the_past(client: TestClient) -> None:
    client.post("/api/skills/skill-1/plan", headers=AS_ADA)

    response = client.patch(
        "/api/skills/skill-1/plan/lessons/w2-l1",
        json={"scheduledDate": "2026-11-01"},
        headers=AS_ADA,
    )

    assert response.status_code == 422


def test_regenerates_a_week_harder(client: TestClient) -> None:
    client.post("/api/skills/skill-1/plan", headers=AS_ADA)

    response = client.post(
        "/api/skills/skill-1/plan/weeks/1/regenerate", json={"adjust": "harder"}, headers=AS_ADA
    )

    assert response.status_code == 200
    assert response.json()["difficulty"] == 1
    assert response.json()["weeks"][1]["goal"].startswith("Build steady progress")


def test_past_weeks_cannot_be_regenerated(
    settings: Settings, verifier: FakeTokenVerifier, repository: InMemoryUserRepository
) -> None:
    [seed] = demo_skills(NOW)
    repository.skills["user-demo"] = []
    import asyncio

    stored = asyncio.run(repository.add_skill("user-demo", seed))
    app = create_app(
        settings, verifier, repository, clock=lambda: NOW, ai=AiClient([FakeProvider()])
    )
    with TestClient(app) as client:
        response = client.post(
            f"/api/skills/{stored.id}/plan/weeks/0/regenerate",
            json={"adjust": "same"},
            headers=AS_DEMO,
        )

    assert response.status_code == 409


def test_the_demo_seed_includes_a_plan_in_progress() -> None:
    [seed] = demo_skills(datetime(2026, 11, 9, tzinfo=UTC))

    assert seed.plan is not None
    done = [
        lesson for week in seed.plan.weeks for lesson in week.lessons if lesson.status == "done"
    ]
    assert len(done) == 7
