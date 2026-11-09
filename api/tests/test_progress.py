from collections.abc import Iterator
from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from darb_api.ai.client import AiClient
from darb_api.ai.fake import FakeProvider
from darb_api.config import Settings
from darb_api.demo_plan import demo_plan
from darb_api.domain.badges import Badge, earned_badges
from darb_api.main import create_app
from tests.conftest import AS_DEMO, NOW
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository

PLAN = demo_plan(datetime(2026, 11, 9, tzinfo=UTC))


def test_badges_follow_what_was_actually_done() -> None:
    assert earned_badges([], 0, 0, 0) == []
    assert earned_badges([PLAN], 7, 1, 7) == [
        Badge.FIRST_LESSON,
        Badge.FIRST_WEEK,
        Badge.FIRST_QUIZ,
        Badge.STREAK_7,
    ]
    assert Badge.STREAK_30 in earned_badges([PLAN], 7, 1, 30)


@pytest.fixture
def client(
    settings: Settings, verifier: FakeTokenVerifier, repository: InMemoryUserRepository
) -> Iterator[TestClient]:
    app = create_app(
        settings, verifier, repository, clock=lambda: NOW, ai=AiClient([FakeProvider()])
    )
    with TestClient(app) as test_client:
        test_client.post("/api/me", headers=AS_DEMO)
        yield test_client


def test_progress_summarises_the_demo(client: TestClient) -> None:
    progress = client.get("/api/progress", params={"today": "2026-11-09"}, headers=AS_DEMO).json()

    assert progress["stats"]["streak"] == 3
    assert progress["badges"] == ["first_lesson", "first_week", "first_quiz"]
    [quiz] = progress["quizzes"]
    assert quiz == {
        "skillId": quiz["skillId"],
        "skill": "Spanish",
        "title": "Survival Spanish",
        "score": 62,
        "completedAt": "2026-11-01T12:00:00Z",
    }
    [skill] = progress["skills"]
    assert skill["level"] == "elementary"
    assert skill["lessonsDone"] == 7
    assert skill["lessonsTotal"] == 24
    assert [s["name"] for s in skill["startingSubskills"]] == [
        "Vocabulary",
        "Grammar",
        "Listening",
        "Speaking",
    ]
