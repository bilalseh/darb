from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from darb_api.ai.client import AiClient
from darb_api.ai.fake import FakeProvider
from darb_api.config import Settings
from darb_api.domain.translation import batches, count_problems, numbered, plan_texts
from darb_api.main import create_app
from darb_api.schemas import Language
from tests.conftest import AS_DEMO, NOW
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository, ScriptedProvider

DAY = ("user-demo", "2026-11-09")


@pytest.fixture
def demo_client(
    settings: Settings, verifier: FakeTokenVerifier, repository: InMemoryUserRepository
) -> Iterator[TestClient]:
    app = create_app(
        settings, verifier, repository, clock=lambda: NOW, ai=AiClient([FakeProvider()])
    )
    with TestClient(app) as client:
        client.post("/api/me", headers=AS_DEMO)  # seeds the demo account, written in English
        yield client


def skill_url(repository: InMemoryUserRepository) -> str:
    [skill] = repository.skills["user-demo"]
    return f"/api/skills/{skill.id}"


def test_a_plan_is_translated_once_and_then_served_from_storage(
    demo_client: TestClient, repository: InMemoryUserRepository
) -> None:
    url = f"{skill_url(repository)}/plan/translation"

    first = demo_client.post(url, json={"language": "ar"}, headers=AS_DEMO).json()
    second = demo_client.post(url, json={"language": "ar"}, headers=AS_DEMO).json()

    assert first == second
    assert first["texts"]["Survival Spanish"] == "بالعربية: Survival Spanish"
    assert len(first["texts"]) > 40  # more than one batch, still one counted request
    assert repository.usage[DAY] == 1


def test_texts_already_in_the_language_are_left_out(
    demo_client: TestClient, repository: InMemoryUserRepository
) -> None:
    url = f"{skill_url(repository)}/plan/translation"

    response = demo_client.post(url, json={"language": "en"}, headers=AS_DEMO)

    assert response.json() == {"language": "en", "texts": {}}
    assert DAY not in repository.usage


def test_lesson_content_and_tutor_replies_are_translated(
    demo_client: TestClient, repository: InMemoryUserRepository
) -> None:
    lesson = f"{skill_url(repository)}/lessons/w4-l1"
    demo_client.post(f"{lesson}/content", headers=AS_DEMO)
    demo_client.post(f"{lesson}/tutor", json={"message": "How do I start?"}, headers=AS_DEMO)

    texts = demo_client.post(
        f"{lesson}/translation", json={"language": "ar"}, headers=AS_DEMO
    ).json()["texts"]

    assert "How do I start?" not in texts  # the learner's own words stay as written
    assert texts["Wikipedia overview"] == "بالعربية: Wikipedia overview"
    assert any(source.startswith("Good question!") for source in texts)


def test_a_lesson_must_be_opened_before_it_is_translated(
    demo_client: TestClient, repository: InMemoryUserRepository
) -> None:
    url = f"{skill_url(repository)}/lessons/w4-l1/translation"

    assert demo_client.post(url, json={"language": "ar"}, headers=AS_DEMO).status_code == 404


def test_a_failed_translation_is_refunded(
    settings: Settings, verifier: FakeTokenVerifier, repository: InMemoryUserRepository
) -> None:
    # Always one translation, whatever the batch size: never usable.
    ai = AiClient([ScriptedProvider("broken", ['{"texts": ["only one"]}'] * 20)])
    app = create_app(settings, verifier, repository, clock=lambda: NOW, ai=ai)
    with TestClient(app) as client:
        client.post("/api/me", headers=AS_DEMO)
        response = client.post(
            f"{skill_url(repository)}/plan/translation", json={"language": "ar"}, headers=AS_DEMO
        )

    assert response.status_code == 503
    assert repository.usage.get(DAY, 0) == 0


def test_plan_texts_follow_each_part_language() -> None:
    from darb_api.demo_plan import demo_plan

    plan = demo_plan(NOW)
    week = plan.weeks[0].model_copy(update={"language": Language.AR})
    mixed = plan.model_copy(update={"weeks": [week, *plan.weeks[1:]]})

    assert plan.weeks[0].goal in plan_texts(plan, Language.AR)
    assert plan.weeks[0].goal not in plan_texts(mixed, Language.AR)
    assert plan.weeks[0].lessons[0].title in plan_texts(mixed, Language.AR)


def test_batching_and_numbering() -> None:
    assert batches(["a", "b", "c"], 2) == [["a", "b"], ["c"]]
    assert numbered(["one\ntwo", 'say "hi"']) == '1. "one\\ntwo"\n2. "say \\"hi\\""'
    assert count_problems(["x"], 2)
    assert count_problems(["x", " "], 2)
    assert not count_problems(["x", "y"], 2)
