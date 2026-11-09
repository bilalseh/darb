from datetime import timedelta

from fastapi.testclient import TestClient

from tests.conftest import AS_ADA, AS_DEMO, NOW
from tests.fakes import InMemoryUserRepository


def test_creates_a_profile_on_first_sign_in(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    response = client.post("/api/me", headers=AS_ADA)

    assert response.status_code == 200
    assert response.json() == {
        "uid": "user-ada",
        "displayName": "Ada",
        "email": "ada@example.com",
        "isDemo": False,
        "createdAt": "2026-11-09T12:00:00Z",
        "tier": "free",
        "preferences": {"language": "en", "checkinReminders": True, "reviewReminders": True},
    }
    assert repository.skills == {}


def test_is_idempotent(client: TestClient, repository: InMemoryUserRepository) -> None:
    first = client.post("/api/me", headers=AS_ADA).json()
    second = client.post("/api/me", headers=AS_ADA).json()

    assert first == second
    assert len(repository.profiles) == 1


def test_seeds_demo_users(client: TestClient, repository: InMemoryUserRepository) -> None:
    profile = client.post("/api/me", headers=AS_DEMO).json()

    assert profile["isDemo"] is True
    assert profile["createdAt"] == "2026-10-19T12:00:00Z"  # three weeks before NOW
    [skill] = repository.skills["user-demo"]
    assert skill.answers.skill == "Spanish"
    assert skill.answers.target_date == (NOW + timedelta(weeks=9)).date()


def test_seeds_demo_users_only_once(client: TestClient, repository: InMemoryUserRepository) -> None:
    client.post("/api/me", headers=AS_DEMO)
    client.post("/api/me", headers=AS_DEMO)

    assert len(repository.skills["user-demo"]) == 1


def test_requires_a_token(client: TestClient) -> None:
    assert client.post("/api/me").status_code == 401


def test_demo_history_follows_the_learners_calendar_day(
    client: TestClient, repository: InMemoryUserRepository
) -> None:
    # NOW is 12:00 UTC on 9 November; east of UTC it can already be the 10th.
    client.post("/api/me", json={"today": "2026-11-10"}, headers=AS_DEMO)

    days = sorted(day for (uid, day) in repository.activity if uid == "user-demo")
    assert days[-1] == "2026-11-09"  # yesterday for the learner, so the streak is live


def test_far_off_dates_are_ignored(client: TestClient, repository: InMemoryUserRepository) -> None:
    client.post("/api/me", json={"today": "2027-01-01"}, headers=AS_DEMO)

    days = sorted(day for (uid, day) in repository.activity if uid == "user-demo")
    assert days[-1] == "2026-11-08"
