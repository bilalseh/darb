"""Lesson rules: which resource links are safe to show, and how streaks are counted."""

from collections.abc import Iterable, Sequence
from datetime import date, timedelta
from urllib.parse import quote_plus, urlsplit

from darb_api.schemas.lesson import ResourceKind, ResourceLink

# AI models invent URLs, so only links to these well-known free learning sites are shown.
TRUSTED_SITES = (
    "wikipedia.org",
    "wikibooks.org",
    "khanacademy.org",
    "developer.mozilla.org",
    "freecodecamp.org",
    "youtube.com",
    "bbc.co.uk",
    "ted.com",
    "open.edu",
    "ocw.mit.edu",
    "docs.python.org",
    "w3schools.com",
    "gcfglobal.org",
    "duolingo.com",
)
TIME_ZONE_ALLOWANCE = timedelta(days=1)


def is_trusted(url: str) -> bool:
    try:
        parts = urlsplit(url)
    except ValueError:
        return False
    host = (parts.hostname or "").lower()
    if parts.scheme != "https" or parts.username or parts.password or not host:
        return False
    return any(host == site or host.endswith(f".{site}") for site in TRUSTED_SITES)


def fallback_resources(topic: str) -> list[ResourceLink]:
    query = quote_plus(topic)
    return [
        ResourceLink(
            title=f"Wikipedia: {topic}"[:100],
            url=f"https://en.wikipedia.org/w/index.php?search={query}",
            kind=ResourceKind.REFERENCE,
        ),
        ResourceLink(
            title=f"Videos about {topic}"[:100],
            url=f"https://www.youtube.com/results?search_query={query}",
            kind=ResourceKind.VIDEO,
        ),
    ]


def safe_resources(resources: Sequence[ResourceLink], topic: str) -> list[ResourceLink]:
    """Keep trusted links (no duplicates); if none survive, offer searches for the topic."""
    kept: list[ResourceLink] = []
    for resource in resources:
        if is_trusted(resource.url) and resource.url not in {r.url for r in kept}:
            kept.append(resource)
    return kept or fallback_resources(topic)


def completion_date_problem(completed_on: date, server_today: date) -> str | None:
    if abs((completed_on - server_today).days) > TIME_ZONE_ALLOWANCE.days:
        return "The completion date must be today"
    return None


def streaks(active_days: Iterable[date], today: date) -> tuple[int, int]:
    """(current streak, longest streak). The current streak may end yesterday: today is not over."""
    days = sorted(set(active_days))
    longest = run = 0
    previous: date | None = None
    for day in days:
        run = run + 1 if previous and day - previous == timedelta(days=1) else 1
        longest = max(longest, run)
        previous = day
    active = set(days)
    end = today if today in active else today - timedelta(days=1)
    current = 0
    while end in active:
        current += 1
        end -= timedelta(days=1)
    return current, longest
