from datetime import timedelta

from darb_api.demo import demo_skills, new_profile
from darb_api.domain.onboarding import target_date_problem
from tests.conftest import ADA, DEMO, NOW


def test_demo_profile_starts_three_weeks_ago() -> None:
    profile = new_profile(DEMO, NOW)

    assert profile.is_demo is True
    assert profile.created_at == NOW - timedelta(weeks=3)


def test_regular_profile_starts_now() -> None:
    profile = new_profile(ADA, NOW)

    assert profile.is_demo is False
    assert profile.created_at == NOW
    assert profile.display_name == "Ada"


def test_demo_skills_stay_relative_to_now() -> None:
    later = NOW + timedelta(days=200)

    [skill] = demo_skills(later)

    assert skill.created_at == later - timedelta(weeks=3)
    assert target_date_problem(skill.answers.target_date, later.date()) is None
