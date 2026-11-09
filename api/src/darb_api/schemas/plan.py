from datetime import date, datetime
from enum import StrEnum

from pydantic import Field

from darb_api.schemas.base import ApiModel


class LessonKind(StrEnum):
    LEARN = "learn"
    PRACTICE = "practice"
    REVIEW = "review"
    PROJECT = "project"


class LessonStatus(StrEnum):
    TODO = "todo"
    DONE = "done"


class WeekAdjustment(StrEnum):
    SAME = "same"
    EASIER = "easier"
    HARDER = "harder"


# ---- AI output ----


class LessonDraft(ApiModel):
    title: str = Field(min_length=3, max_length=80)
    objective: str = Field(min_length=10, max_length=200)
    minutes: int = Field(ge=10, le=90)
    kind: LessonKind


class WeekDraft(ApiModel):
    goal: str = Field(min_length=10, max_length=200)
    lessons: list[LessonDraft] = Field(min_length=1, max_length=6)


class ModuleDraft(ApiModel):
    title: str = Field(min_length=3, max_length=80)
    summary: str = Field(min_length=10, max_length=300)
    weeks: list[WeekDraft] = Field(min_length=1, max_length=4)


class PlanDraft(ApiModel):
    """The AI's roadmap: modules made of weeks made of short lessons. Dates come later."""

    modules: list[ModuleDraft] = Field(min_length=1, max_length=5)


# ---- Stored plan (users/{uid}/plans/{skillId}), read directly by the browser ----


class PlanLesson(ApiModel):
    id: str
    title: str
    objective: str
    minutes: int
    kind: LessonKind
    scheduled_date: date
    status: LessonStatus


class PlanWeek(ApiModel):
    index: int
    start_date: date
    module_index: int
    goal: str
    lessons: list[PlanLesson]


class PlanModule(ApiModel):
    title: str
    summary: str


class Plan(ApiModel):
    """A skill's study plan: modules, then weeks with dated lessons."""

    skill_id: str
    modules: list[PlanModule]
    weeks: list[PlanWeek]
    difficulty: int = Field(ge=-2, le=2)
    generated_at: datetime


# ---- Requests ----


class RegenerateWeekRequest(ApiModel):
    """Replace a week's unfinished lessons; "easier" and "harder" shift the plan's difficulty."""

    adjust: WeekAdjustment = WeekAdjustment.SAME


class MoveLessonRequest(ApiModel):
    """Move a lesson to another day, from today to the end of the plan."""

    scheduled_date: date
