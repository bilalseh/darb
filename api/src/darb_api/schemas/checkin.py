from datetime import date
from enum import StrEnum

from pydantic import Field

from darb_api.schemas.base import ApiModel
from darb_api.schemas.plan import WeekDraft


class CheckinFeeling(StrEnum):
    TOO_EASY = "too_easy"
    JUST_RIGHT = "just_right"
    TOO_HARD = "too_hard"


class CheckinRequest(ApiModel):
    """The weekly check-in; `today` is the learner's own calendar date."""

    went_well: str = Field(max_length=500)
    hard: str = Field(max_length=500)
    feeling: CheckinFeeling
    today: date


class CheckinDraft(ApiModel):
    """The AI's response to a check-in: next week rewritten, and why."""

    explanation: str = Field(min_length=20, max_length=500)
    week: WeekDraft


class Checkin(ApiModel):
    """A completed check-in and the change it made, at users/{uid}/checkins/{id}."""

    id: str
    skill_id: str
    week_index: int
    adjusted_week_index: int
    went_well: str
    hard: str
    feeling: CheckinFeeling
    explanation: str
    difficulty: int
    created_on: date


class SyncRequest(ApiModel):
    """Sent when the app opens, so missed lessons can be rescheduled against the learner's date."""

    today: date


class CheckinDue(ApiModel):
    skill_id: str
    week_index: int


class SyncResult(ApiModel):
    rescheduled_lessons: int
    checkins_due: list[CheckinDue]
