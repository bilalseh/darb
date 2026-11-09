from datetime import datetime
from enum import StrEnum

from pydantic import Field

from darb_api.schemas.base import ApiModel


class Tier(StrEnum):
    FREE = "free"
    PRO = "pro"


class Language(StrEnum):
    EN = "en"
    AR = "ar"


class Preferences(ApiModel):
    """Settings the learner chooses. Language also sets the language the AI writes in."""

    language: Language = Language.EN
    checkin_reminders: bool = True
    review_reminders: bool = True


class Profile(ApiModel):
    """The signed-in user's profile, stored at users/{uid}."""

    uid: str
    display_name: str | None
    email: str | None
    is_demo: bool
    created_at: datetime
    tier: Tier = Tier.FREE
    preferences: Preferences = Field(default_factory=Preferences)


class Usage(ApiModel):
    """Today's AI requests against the daily allowance of the user's plan."""

    used: int
    limit: int
    resets_at: datetime
    tier: Tier
    skills: int
    skill_limit: int | None = Field(description="Skills allowed on this plan; null is unlimited")
