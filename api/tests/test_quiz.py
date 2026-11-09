from collections.abc import Iterator
from datetime import date

import pytest
from fastapi.testclient import TestClient

from darb_api.ai.client import AiClient
from darb_api.ai.fake import FakeProvider
from darb_api.config import Settings
from darb_api.domain.review import next_review, score
from darb_api.main import create_app
from tests.conftest import AS_DEMO, NOW
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository

TODAY = date(2026, 11, 9)


@pytest.mark.parametrize(
    ("box", "correct", "expected"),
    [
        (0, True, (1, date(2026, 11, 12))),
        (3, True, (4, date(2026, 12, 9))),
        (4, True, (4, date(2026, 12, 9))),  # the top box stays the top box
        (3, False, (0, date(2026, 11, 10))),
    ],
)
def test_leitner_boxes(box: int, correct: bool, expected: tuple[int, date]) -> None:
    assert next_review(box, correct, TODAY) == expected


def test_score_is_a_percentage() -> None:
    assert score([0, 1, 2, 0], [0, 1, 0, 1]) == 50


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


def quiz_url(repository: InMemoryUserRepository, action: str = "") -> str:
    [skill] = repository.skills["user-demo"]
    return f"/api/skills/{skill.id}/modules/0/quiz{action}"


def test_the_demo_has_review_cards_due_today(
    repository: InMemoryUserRepository, client: TestClient
) -> None:
    due = [item for (uid, _), item in repository.reviews.items() if uid == "user-demo"]
    assert len(due) == 3
    assert all(item.due_on == TODAY and item.skill_id for item in due)


def test_a_quiz_hides_its_answers_until_submitted(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    response = client.post(quiz_url(repository), headers=AS_DEMO)

    assert response.status_code == 200
    assert len(response.json()["questions"]) == 5
    assert "correctOption" not in response.text
    assert client.post(quiz_url(repository), headers=AS_DEMO).json() == response.json()


def test_submitting_grades_and_queues_missed_questions(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    client.post(quiz_url(repository), headers=AS_DEMO)

    result = client.post(
        quiz_url(repository, "/submit"), json={"answers": [0, 0, 0, 1, 2]}, headers=AS_DEMO
    ).json()

    assert result["score"] == 60
    assert result["addedToReview"] == 2
    assert [r["correct"] for r in result["results"]] == [True, True, True, False, False]
    new_cards = [i for (_, rid), i in repository.reviews.items() if not rid.startswith("demo")]
    assert len(new_cards) == 2
    assert all(card.due_on == date(2026, 11, 10) for card in new_cards)
    assert repository.quizzes == {}


def test_a_submission_must_answer_every_question(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    client.post(quiz_url(repository), headers=AS_DEMO)

    response = client.post(quiz_url(repository, "/submit"), json={"answers": [0]}, headers=AS_DEMO)

    assert response.status_code == 409


def test_answering_a_review_card_moves_it_and_counts_for_the_streak(client: TestClient) -> None:
    outcome = client.post(
        "/api/reviews/demo-review-2/answer",
        json={"choice": 1, "answeredOn": "2026-11-09"},
        headers=AS_DEMO,
    ).json()

    assert outcome["correct"] is True
    assert outcome["item"]["box"] == 1
    assert outcome["item"]["dueOn"] == "2026-11-12"
    stats = client.get("/api/stats", params={"today": "2026-11-09"}, headers=AS_DEMO).json()
    assert stats["activeToday"] is True
    assert stats["streak"] == 4
