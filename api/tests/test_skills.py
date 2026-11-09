from typing import Any

import pytest
from fastapi.testclient import TestClient

from tests.conftest import AS_ADA
from tests.fakes import InMemoryUserRepository


def answers(**overrides: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "skill": "  Guitar ",
        "reason": "hobby",
        "level": "beginner",
        "hoursPerWeek": 3,
        "preferredDays": ["thu", "tue"],
        "learningStyle": "practice",
        "targetDate": "2027-03-01",
    }
    body.update(overrides)
    return body


def test_creates_a_skill(client: TestClient, repository: InMemoryUserRepository) -> None:
    response = client.post("/api/skills", json=answers(), headers=AS_ADA)

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "onboarded"
    assert body["createdAt"] == "2026-11-09T12:00:00Z"
    assert body["answers"]["skill"] == "Guitar"
    assert body["answers"]["preferredDays"] == ["tue", "thu"]
    assert [skill.id for skill in repository.skills["user-ada"]] == [body["id"]]


def test_target_date_is_optional(client: TestClient) -> None:
    body = answers()
    del body["targetDate"]

    response = client.post("/api/skills", json=body, headers=AS_ADA)

    assert response.status_code == 201
    assert response.json()["answers"]["targetDate"] is None


@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"skill": "x"}, "skill"),
        ({"skill": "x" * 81}, "skill"),
        ({"reason": "fame"}, "reason"),
        ({"hoursPerWeek": 0}, "hoursPerWeek"),
        ({"hoursPerWeek": 41}, "hoursPerWeek"),
        ({"preferredDays": []}, "preferredDays"),
        ({"preferredDays": ["mon", "mon"]}, "preferredDays"),
        ({"learningStyle": "osmosis"}, "learningStyle"),
        ({"targetDate": "2026-11-01"}, "targetDate"),
        ({"targetDate": "2032-01-01"}, "targetDate"),
        ({"plan": "pro"}, "plan"),
    ],
)
def test_rejects_invalid_answers(
    client: TestClient,
    repository: InMemoryUserRepository,
    overrides: dict[str, Any],
    field: str,
) -> None:
    response = client.post("/api/skills", json=answers(**overrides), headers=AS_ADA)

    assert response.status_code == 422
    assert any(error["loc"][-1] == field for error in response.json()["detail"])
    assert repository.skills == {}


def test_requires_a_token(client: TestClient) -> None:
    assert client.post("/api/skills", json=answers()).status_code == 401
