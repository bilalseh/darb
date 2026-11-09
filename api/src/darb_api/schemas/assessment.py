from datetime import datetime
from enum import StrEnum
from typing import Self

from pydantic import Field, model_validator

from darb_api.schemas.base import ApiModel
from darb_api.schemas.profile import Language


class QuestionKind(StrEnum):
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    CONFIDENCE = "confidence"


class PlacementLevel(StrEnum):
    BEGINNER = "beginner"
    ELEMENTARY = "elementary"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


# ---- AI output (validated before anything is stored or shown) ----


class QuizQuestionSpec(ApiModel):
    """One placement question as written by the AI, including its answer key."""

    kind: QuestionKind
    prompt: str = Field(min_length=5, max_length=400)
    subskill: str = Field(min_length=2, max_length=40)
    difficulty: int = Field(ge=1, le=5)
    options: list[str] = Field(max_length=5)
    correct_option: int | None
    reference_answer: str | None = Field(max_length=400)

    @model_validator(mode="after")
    def _fits_its_kind(self) -> Self:
        if self.kind is QuestionKind.MULTIPLE_CHOICE:
            if not 3 <= len(self.options) <= 5:
                raise ValueError("multiple choice questions need 3 to 5 options")
            if self.correct_option is None or not 0 <= self.correct_option < len(self.options):
                raise ValueError("correctOption must index one of the options")
        elif self.options or self.correct_option is not None:
            raise ValueError("only multiple choice questions have options")
        if self.kind is QuestionKind.SHORT_ANSWER and not self.reference_answer:
            raise ValueError("short answer questions need a referenceAnswer")
        return self


class PlacementQuiz(ApiModel):
    """The AI's placement quiz: the sub-skills it measures and a bank of questions."""

    subskills: list[str] = Field(min_length=3, max_length=6)
    questions: list[QuizQuestionSpec] = Field(min_length=6, max_length=10)

    @model_validator(mode="after")
    def _consistent(self) -> Self:
        names = {name.casefold() for name in self.subskills}
        if len(names) != len(self.subskills):
            raise ValueError("sub-skill names must be unique")
        used = {question.subskill.casefold() for question in self.questions}
        if unknown := used - names:
            raise ValueError(f"questions use unknown sub-skills: {sorted(unknown)}")
        if missing := names - used:
            raise ValueError(f"sub-skills without questions: {sorted(missing)}")
        if not any(q.kind is QuestionKind.MULTIPLE_CHOICE for q in self.questions):
            raise ValueError("include at least one multiple choice question")
        if len({question.difficulty for question in self.questions}) < 3:
            raise ValueError("spread questions over at least 3 difficulty levels")
        return self


class ShortAnswerGrade(ApiModel):
    question_id: str
    score: float = Field(ge=0, le=1)


class AssessmentReview(ApiModel):
    """The AI's grades for short answers plus a short, encouraging summary for the learner."""

    grades: list[ShortAnswerGrade] = Field(max_length=10)
    summary: str = Field(min_length=20, max_length=600)


# ---- API models ----


class AssessmentQuestion(ApiModel):
    """A question as the learner sees it: never includes the answer."""

    id: str
    kind: QuestionKind
    prompt: str
    subskill: str
    options: list[str]


class AnswerSubmission(ApiModel):
    """The learner's answer to one question: set the field that matches the question kind, or
    `dontKnow` alone to say they do not know yet (scored as a miss, never a guess)."""

    question_id: str = Field(min_length=1, max_length=10)
    choice: int | None = Field(default=None, ge=0, le=4)
    text: str | None = Field(default=None, max_length=1000)
    confidence: int | None = Field(default=None, ge=1, le=5)
    dont_know: bool = False

    @model_validator(mode="after")
    def _dont_know_alone(self) -> Self:
        answered = self.choice is not None or bool(self.text) or self.confidence is not None
        if self.dont_know and answered:
            raise ValueError("send either an answer or dontKnow, not both")
        return self


class AssessmentProgress(ApiModel):
    """Where the learner is in the placement assessment."""

    answered: int
    max_questions: int
    question: AssessmentQuestion | None
    finished: bool
    language: Language


class SubskillScore(ApiModel):
    name: str
    score: int = Field(ge=0, le=100)


class PlacementResult(ApiModel):
    """The outcome of the placement assessment, stored on the skill."""

    level: PlacementLevel
    summary: str
    subskills: list[SubskillScore]
    completed_at: datetime
