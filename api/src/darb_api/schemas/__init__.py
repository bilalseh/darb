"""Public API models, exported to shared/ by `pnpm gen:schemas` (see docs/adr/0005).

Request models also get generated Zod schemas, so frontend forms validate with the same rules.
"""

from pydantic import BaseModel

from darb_api.schemas.health import HealthResponse
from darb_api.schemas.onboarding import (
    LearningStyle,
    OnboardingAnswers,
    SelfRatedLevel,
    SkillReason,
    Weekday,
)
from darb_api.schemas.profile import Profile
from darb_api.schemas.skills import Skill, SkillStatus

REQUEST_MODELS: tuple[type[BaseModel], ...] = (OnboardingAnswers,)
RESPONSE_MODELS: tuple[type[BaseModel], ...] = (HealthResponse, Profile, Skill)

__all__ = [
    "REQUEST_MODELS",
    "RESPONSE_MODELS",
    "HealthResponse",
    "LearningStyle",
    "OnboardingAnswers",
    "Profile",
    "SelfRatedLevel",
    "Skill",
    "SkillReason",
    "SkillStatus",
    "Weekday",
]
