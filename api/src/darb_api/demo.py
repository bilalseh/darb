"""Seed data for "Try the demo": a learner three weeks into learning Spanish for a trip.

Dates are relative to the moment the demo starts, so the account always looks three weeks in.
Later phases add the placement result, plan, lessons and quiz history to this seed.
"""

from datetime import datetime, timedelta

from darb_api.auth import AuthenticatedUser
from darb_api.repository import NewSkill
from darb_api.schemas import (
    LearningStyle,
    OnboardingAnswers,
    Profile,
    SelfRatedLevel,
    SkillReason,
    SkillStatus,
    Weekday,
)

DEMO_HISTORY = timedelta(weeks=3)
DEMO_TRIP_IN = timedelta(weeks=9)


def new_profile(user: AuthenticatedUser, now: datetime) -> Profile:
    """The profile created on first sign-in. Anonymous users only come from the demo button."""
    return Profile(
        uid=user.uid,
        display_name=user.name,
        email=user.email,
        is_demo=user.is_anonymous,
        created_at=now - DEMO_HISTORY if user.is_anonymous else now,
    )


def demo_skills(now: datetime) -> list[NewSkill]:
    return [
        NewSkill(
            answers=OnboardingAnswers(
                skill="Spanish",
                reason=SkillReason.TRAVEL,
                level=SelfRatedLevel.ELEMENTARY,
                hours_per_week=4,
                preferred_days=[Weekday.MON, Weekday.WED, Weekday.SAT],
                learning_style=LearningStyle.MIXED,
                target_date=(now + DEMO_TRIP_IN).date(),
            ),
            status=SkillStatus.ONBOARDED,
            created_at=now - DEMO_HISTORY,
        )
    ]
