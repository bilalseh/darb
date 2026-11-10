from datetime import date, datetime
from enum import StrEnum

from pydantic import Field

from darb_api.schemas.base import ApiModel
from darb_api.schemas.profile import Language


class ResourceKind(StrEnum):
    ARTICLE = "article"
    VIDEO = "video"
    EXERCISE = "exercise"
    REFERENCE = "reference"


class ResourceLink(ApiModel):
    title: str = Field(min_length=3, max_length=100)
    url: str = Field(min_length=10, max_length=300)
    kind: ResourceKind


# ---- AI output ----


class LessonContentDraft(ApiModel):
    """What the AI writes for a lesson: a short explanation, one exercise and resource links."""

    explanation: str = Field(min_length=80, max_length=1500)
    exercise: str = Field(min_length=30, max_length=600)
    resources: list[ResourceLink] = Field(min_length=1, max_length=3)


class TutorReplyDraft(ApiModel):
    reply: str = Field(min_length=1, max_length=1200)


# ---- Stored and returned ----


class TutorRole(StrEnum):
    LEARNER = "learner"
    TUTOR = "tutor"


class TutorMessage(ApiModel):
    role: TutorRole
    text: str
    at: datetime
    language: Language = Language.EN


class LessonContent(ApiModel):
    """A lesson's written content plus its tutor conversation, at users/{uid}/lessons/{id}."""

    skill_id: str
    lesson_id: str
    explanation: str
    exercise: str
    resources: list[ResourceLink]
    tutor: list[TutorMessage]
    generated_at: datetime
    language: Language = Language.EN  # of the explanation, exercise and resource titles


class CompleteLessonRequest(ApiModel):
    """Mark a lesson done; `completedOn` is the learner's own calendar date."""

    completed_on: date


class TutorRequest(ApiModel):
    message: str = Field(min_length=1, max_length=800)


class Stats(ApiModel):
    """Progress figures computed from the learner's activity."""

    streak: int
    longest_streak: int
    active_today: bool
    lessons_done: int
    minutes_studied: int
