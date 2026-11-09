from datetime import datetime
from enum import StrEnum

from darb_api.domain.badges import Badge
from darb_api.schemas.assessment import PlacementLevel, SubskillScore
from darb_api.schemas.base import ApiModel
from darb_api.schemas.lesson import Stats


class QuizScorePoint(ApiModel):
    skill_id: str
    skill: str
    title: str
    score: int
    completed_at: datetime


class SkillProgress(ApiModel):
    skill_id: str
    skill: str
    level: PlacementLevel | None
    starting_subskills: list[SubskillScore]
    lessons_done: int
    lessons_total: int


class Progress(ApiModel):
    """Everything the dashboard shows, computed from the learner's own data."""

    stats: Stats
    badges: list[Badge]
    quizzes: list[QuizScorePoint]
    skills: list[SkillProgress]


class MatchKind(StrEnum):
    COMMUNITY = "community"
    FORUM = "forum"
    CHAT = "chat"
    PRACTICE = "practice"


class CommunityMatch(ApiModel):
    """A free community or practice format suggested for a skill, with why it fits."""

    name: str
    url: str
    kind: MatchKind
    reason: str
