"""Records the repository stores and returns, beyond the public API models."""

from dataclasses import dataclass
from datetime import datetime

from darb_api.domain.assessment import Answer
from darb_api.schemas import OnboardingAnswers, PlacementResult, SkillStatus
from darb_api.schemas.assessment import PlacementQuiz
from darb_api.schemas.base import ApiModel
from darb_api.schemas.plan import Plan
from darb_api.schemas.quiz import QuizQuestionDraft, QuizResult, ReviewItem


@dataclass(frozen=True, slots=True)
class NewSkill:
    answers: OnboardingAnswers
    status: SkillStatus
    created_at: datetime
    placement: PlacementResult | None = None
    plan: Plan | None = None  # its skill_id is filled in when the skill is written
    reviews: tuple[ReviewItem, ...] = ()  # likewise
    quiz_results: tuple[QuizResult, ...] = ()  # likewise


class RecordedAnswer(ApiModel):
    question_index: int
    choice: int | None = None
    text: str | None = None
    confidence: int | None = None

    def to_domain(self) -> Answer:
        return Answer(self.question_index, self.choice, self.text, self.confidence)


@dataclass(frozen=True, slots=True)
class DayActivity:
    day: str
    lessons: int
    minutes: int
    reviews: int = 0


class StoredAssessment(ApiModel):
    """A placement quiz in progress, answer key included. Kept outside users/{uid} so that the
    security rules never let the browser read it."""

    quiz: PlacementQuiz
    answers: list[RecordedAnswer]
    started_at: datetime
    provider: str
    prompt_version: str

    def domain_answers(self) -> list[Answer]:
        return [answer.to_domain() for answer in self.answers]


class StoredQuiz(ApiModel):
    """A module quiz in progress, answer key included; kept where the browser cannot read it."""

    skill_id: str
    module_index: int
    title: str
    questions: list[QuizQuestionDraft]
    created_at: datetime
