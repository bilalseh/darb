"""Seed data for "Try the demo": a learner three weeks into learning Spanish for a trip.

Dates are relative to the moment the demo starts, so the account always looks three weeks in.
Later phases add the plan, lessons and quiz history to this seed.
"""

from datetime import datetime, timedelta

from darb_api.auth import AuthenticatedUser
from darb_api.repository import NewSkill
from darb_api.schemas import (
    LearningStyle,
    OnboardingAnswers,
    PlacementLevel,
    PlacementResult,
    Profile,
    SelfRatedLevel,
    SkillReason,
    SkillStatus,
    SubskillScore,
    Weekday,
)

DEMO_HISTORY = timedelta(weeks=3)
DEMO_TRIP_IN = timedelta(weeks=9)
DEMO_SUBSKILLS = {"Vocabulary": 58, "Grammar": 44, "Listening": 52, "Speaking": 36}


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
            status=SkillStatus.ASSESSED,
            created_at=now - DEMO_HISTORY,
            placement=PlacementResult(
                level=PlacementLevel.ELEMENTARY,
                summary=(
                    "You already recognise plenty of everyday words and can follow slow, clear "
                    "speech. Speaking and verb tenses are where practice will pay off fastest."
                ),
                subskills=[SubskillScore(name=n, score=s) for n, s in DEMO_SUBSKILLS.items()],
                completed_at=now - DEMO_HISTORY + timedelta(hours=1),
            ),
        )
    ]
