from collections.abc import Iterator
from datetime import date

import pytest
from fastapi.testclient import TestClient

from darb_api.ai.client import AiClient
from darb_api.ai.fake import FakeProvider
from darb_api.config import Settings
from darb_api.domain.lessons import is_trusted, safe_resources, searchable, streaks
from darb_api.main import create_app
from darb_api.schemas.lesson import ResourceKind, ResourceLink
from tests.conftest import AS_DEMO, NOW
from tests.fakes import FakeTokenVerifier, InMemoryUserRepository


@pytest.mark.parametrize(
    ("url", "trusted"),
    [
        ("https://en.wikipedia.org/wiki/Spanish_language", True),
        ("https://www.khanacademy.org/math", True),
        ("http://en.wikipedia.org/wiki/Spanish", False),  # not https
        ("https://wikipedia.org.evil.example/wiki", False),  # look-alike host
        ("https://user:pw@www.youtube.com/watch", False),  # credentials in the URL
        ("https://made-up-site.example/spanish", False),
        ("javascript:alert(1)", False),
    ],
)
def test_only_trusted_https_links_are_kept(url: str, trusted: bool) -> None:
    assert is_trusted(url) is trusted


def test_untrusted_links_fall_back_to_searches() -> None:
    made_up = ResourceLink(
        title="Invented", url="https://invented.example/x", kind=ResourceKind.ARTICLE
    )

    links = safe_resources([made_up], "Spanish greetings")

    assert [link.url for link in links] == [
        "https://en.wikipedia.org/w/index.php?search=Spanish+greetings",
        "https://www.youtube.com/results?search_query=Spanish+greetings",
    ]


def test_youtube_videos_become_searches_for_their_title() -> None:
    # A real report: the AI linked a famous music video as a cooking lesson.
    invented = ResourceLink(
        title="How to control stove heat - YouTube",
        url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        kind=ResourceKind.VIDEO,
    )

    [link] = safe_resources([invented], "Cooking")

    assert link.url == "https://www.youtube.com/results?search_query=How+to+control+stove+heat"
    assert link.title == invented.title


def test_long_arabic_titles_still_fit_the_url_limit() -> None:
    video = ResourceLink(
        title="كيفية ضبط حرارة الموقد في الطهي خطوة بخطوة للمبتدئين في المطبخ المنزلي - YouTube",
        url="https://m.youtube.com/watch?v=abc",
        kind=ResourceKind.VIDEO,
    )

    link = searchable(video)

    assert link.url.startswith("https://www.youtube.com/results?search_query=")
    assert len(link.url) <= 300
    ResourceLink.model_validate(link.model_dump())  # still a valid stored link


@pytest.mark.parametrize(
    ("days", "today", "expected"),
    [
        ([], date(2026, 11, 9), (0, 0)),
        ([date(2026, 11, 8), date(2026, 11, 7)], date(2026, 11, 9), (2, 2)),  # through yesterday
        ([date(2026, 11, 9), date(2026, 11, 8)], date(2026, 11, 9), (2, 2)),
        ([date(2026, 11, 6), date(2026, 11, 9)], date(2026, 11, 9), (1, 1)),  # broken streak
        ([date(2026, 10, 1), date(2026, 10, 2), date(2026, 10, 3)], date(2026, 11, 9), (0, 3)),
    ],
)
def test_streaks(days: list[date], today: date, expected: tuple[int, int]) -> None:
    assert streaks(days, today) == expected


@pytest.fixture
def demo_client(
    settings: Settings, verifier: FakeTokenVerifier, repository: InMemoryUserRepository
) -> Iterator[TestClient]:
    app = create_app(
        settings, verifier, repository, clock=lambda: NOW, ai=AiClient([FakeProvider()])
    )
    with TestClient(app) as client:
        client.post("/api/me", headers=AS_DEMO)  # seeds the demo account
        yield client


def lesson_url(repository: InMemoryUserRepository, lesson_id: str, action: str) -> str:
    [skill] = repository.skills["user-demo"]
    return f"/api/skills/{skill.id}/lessons/{lesson_id}/{action}"


def test_lesson_content_is_written_once_with_safe_links(
    demo_client: TestClient, repository: InMemoryUserRepository
) -> None:
    first = demo_client.post(lesson_url(repository, "w4-l1", "content"), headers=AS_DEMO).json()
    second = demo_client.post(lesson_url(repository, "w4-l1", "content"), headers=AS_DEMO).json()

    assert first == second
    assert [r["url"] for r in first["resources"]] == ["https://en.wikipedia.org/wiki/Learning"]
    assert repository.usage[("user-demo", "2026-11-09")] == 1


def test_completing_a_lesson_is_counted_once(
    demo_client: TestClient, repository: InMemoryUserRepository
) -> None:
    url = lesson_url(repository, "w4-l1", "complete")
    for _ in range(2):
        response = demo_client.post(url, json={"completedOn": "2026-11-09"}, headers=AS_DEMO)
        assert response.status_code == 200

    lesson = response.json()["weeks"][3]["lessons"][0]
    assert lesson["status"] == "done"
    assert repository.activity[("user-demo", "2026-11-09")].lessons == 1


def test_completion_must_be_dated_today(
    demo_client: TestClient, repository: InMemoryUserRepository
) -> None:
    url = lesson_url(repository, "w4-l1", "complete")

    response = demo_client.post(url, json={"completedOn": "2026-10-01"}, headers=AS_DEMO)

    assert response.status_code == 422


def test_the_tutor_keeps_the_conversation(
    demo_client: TestClient, repository: InMemoryUserRepository
) -> None:
    demo_client.post(lesson_url(repository, "w4-l1", "content"), headers=AS_DEMO)

    content = demo_client.post(
        lesson_url(repository, "w4-l1", "tutor"),
        json={"message": "How do I start?"},
        headers=AS_DEMO,
    ).json()

    assert [m["role"] for m in content["tutor"]] == ["learner", "tutor"]
    assert content["tutor"][0]["text"] == "How do I start?"


def test_the_tutor_needs_the_lesson_opened_first(
    demo_client: TestClient, repository: InMemoryUserRepository
) -> None:
    response = demo_client.post(
        lesson_url(repository, "w5-l1", "tutor"), json={"message": "Hi"}, headers=AS_DEMO
    )

    assert response.status_code == 409


def test_stats_show_the_demo_streak(demo_client: TestClient) -> None:
    stats = demo_client.get("/api/stats", params={"today": "2026-11-09"}, headers=AS_DEMO).json()

    assert stats["streak"] == 3
    assert stats["activeToday"] is False
    assert stats["lessonsDone"] == 7
    assert stats["minutesStudied"] == 560  # 240 + 240 + 80


def test_lessons_written_earlier_are_corrected_when_read(
    demo_client: TestClient, repository: InMemoryUserRepository
) -> None:
    url = lesson_url(repository, "w4-l1", "content")
    demo_client.post(url, headers=AS_DEMO)
    key = next(iter(repository.lessons))
    video = ResourceLink(
        title="Stove heat",
        url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        kind=ResourceKind.VIDEO,
    )
    repository.lessons[key] = repository.lessons[key].model_copy(update={"resources": [video]})

    [link] = demo_client.post(url, headers=AS_DEMO).json()["resources"]

    assert link["url"] == "https://www.youtube.com/results?search_query=Stove+heat"
