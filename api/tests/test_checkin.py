from collections.abc import Iterator
from datetime import UTC, date, datetime

import pytest
from fastapi.testclient import TestClient

from darb_api.ai.client import AiClient
from darb_api.ai.fake import FakeProvider
from darb_api.config import Settings
from darb_api.demo_plan import DEMO_DAYS, demo_plan
from darb_api.domain.reschedule import checkin_week, reschedule_missed
from darb_api.main import create_app
from darb_api.schemas.plan import LessonStatus
from tests.conftest import AS_DEMO, NOW
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository

MONDAY = date(2026, 11, 9)
PLAN = demo_plan(datetime(2026, 11, 9, 12, tzinfo=UTC))


def test_missed_lessons_move_to_the_lightest_upcoming_preferred_days() -> None:
    plan, moves = reschedule_missed(PLAN, MONDAY, DEMO_DAYS)

    # Week 3 left two lessons undone (Nov 4 and Nov 7). Every upcoming preferred day already
    # holds one 80-minute lesson, so the earliest days win: catching up soon keeps momentum.
    assert [(m.from_date, m.to_date) for m in moves] == [
        (date(2026, 11, 4), date(2026, 11, 9)),
        (date(2026, 11, 7), date(2026, 11, 11)),
    ]
    assert plan.last_reschedule is not None
    assert plan.last_reschedule.on == MONDAY
    missed = [
        lesson
        for week in plan.weeks
        for lesson in week.lessons
        if lesson.status is LessonStatus.TODO and lesson.scheduled_date < MONDAY
    ]
    assert missed == []


def test_nothing_moves_when_nothing_was_missed() -> None:
    plan, _ = reschedule_missed(PLAN, MONDAY, DEMO_DAYS)

    again, moves = reschedule_missed(plan, MONDAY, DEMO_DAYS)

    assert moves == []
    assert again == plan


@pytest.mark.parametrize(
    ("today", "checked_in", "expected"),
    [
        (MONDAY, [], 2),  # last week was skipped
        (MONDAY, [0, 1, 2], None),  # this week has only just started
        (date(2026, 11, 12), [0, 1, 2], 3),  # from Thursday on
        (date(2026, 11, 12), [0, 1, 2, 3], None),  # already done
    ],
)
def test_when_a_checkin_is_due(today: date, checked_in: list[int], expected: int | None) -> None:
    plan = PLAN.model_copy(update={"checked_in_weeks": checked_in})

    assert checkin_week(plan, today) == expected


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


def demo_plan_of(repository: InMemoryUserRepository):  # type: ignore[no-untyped-def]
    [skill] = repository.skills["user-demo"]
    return skill.id, repository.plans[("user-demo", skill.id)]


def test_sync_reschedules_missed_lessons(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    response = client.post("/api/plans/sync", json={"today": "2026-11-09"}, headers=AS_DEMO)

    [skill] = repository.skills["user-demo"]
    assert response.json() == {
        "rescheduledLessons": 2,
        "checkinsDue": [{"skillId": skill.id, "weekIndex": 2}],
    }
    _, plan = demo_plan_of(repository)
    assert plan.last_reschedule is not None
    assert len(plan.last_reschedule.moves) == 2


def test_a_checkin_rewrites_next_week_and_explains_why(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    skill_id, _ = demo_plan_of(repository)

    response = client.post(
        f"/api/skills/{skill_id}/checkin",
        json={
            "wentWell": "Ordering food",
            "hard": "Speaking quickly",
            "feeling": "too_hard",
            "today": "2026-11-09",
        },
        headers=AS_DEMO,
    )

    assert response.status_code == 200
    checkin = response.json()
    assert checkin["weekIndex"] == 2
    assert checkin["adjustedWeekIndex"] == 3
    assert "speaking" in checkin["explanation"].lower()
    _, plan = demo_plan_of(repository)
    assert plan.checked_in_weeks == [2]
    assert plan.difficulty == -1
    assert repository.checkins["user-demo"][0].hard == "Speaking quickly"


def test_a_second_checkin_for_the_same_week_is_refused(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    skill_id, _ = demo_plan_of(repository)
    body = {"wentWell": "", "hard": "", "feeling": "just_right", "today": "2026-11-09"}
    client.post(f"/api/skills/{skill_id}/checkin", json=body, headers=AS_DEMO)

    response = client.post(f"/api/skills/{skill_id}/checkin", json=body, headers=AS_DEMO)

    assert response.status_code == 409
