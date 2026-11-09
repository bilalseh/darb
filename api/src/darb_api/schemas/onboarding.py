from datetime import date
from enum import StrEnum
from typing import Annotated

from pydantic import Field, StringConstraints, field_validator

from darb_api.schemas.base import ApiModel


class SkillReason(StrEnum):
    CAREER = "career"
    HOBBY = "hobby"
    TRAVEL = "travel"
    EXAM = "exam"
    SCHOOL = "school"
    PERSONAL = "personal"


class SelfRatedLevel(StrEnum):
    NONE = "none"
    BEGINNER = "beginner"
    ELEMENTARY = "elementary"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class LearningStyle(StrEnum):
    READING = "reading"
    VIDEO = "video"
    PRACTICE = "practice"
    MIXED = "mixed"


class Weekday(StrEnum):
    MON = "mon"
    TUE = "tue"
    WED = "wed"
    THU = "thu"
    FRI = "fri"
    SAT = "sat"
    SUN = "sun"


SkillName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=80)]


class OnboardingAnswers(ApiModel):
    """What the onboarding wizard collects about a new skill.

    Only rules JSON Schema can express live here, so the generated frontend form enforces
    the same ones. Rules that need the clock live in darb_api.domain.onboarding.
    """

    skill: SkillName
    reason: SkillReason
    level: SelfRatedLevel
    hours_per_week: int = Field(ge=1, le=40)
    preferred_days: list[Weekday] = Field(min_length=1, max_length=7)
    learning_style: LearningStyle
    target_date: date | None = None

    @field_validator("preferred_days")
    @classmethod
    def _unique_days_in_week_order(cls, days: list[Weekday]) -> list[Weekday]:
        if len(set(days)) != len(days):
            raise ValueError("each day can be picked only once")
        week = list(Weekday)
        return sorted(days, key=week.index)
