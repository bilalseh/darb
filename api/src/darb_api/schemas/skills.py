from datetime import datetime
from enum import StrEnum

from darb_api.schemas.base import ApiModel
from darb_api.schemas.onboarding import OnboardingAnswers


class SkillStatus(StrEnum):
    ONBOARDED = "onboarded"


class Skill(ApiModel):
    """One skill the user is learning, stored at users/{uid}/skills/{id}."""

    id: str
    answers: OnboardingAnswers
    status: SkillStatus
    created_at: datetime
