from datetime import date, datetime
from typing import Self

from pydantic import Field, model_validator

from darb_api.schemas.base import ApiModel

# ---- AI output ----


class QuizQuestionDraft(ApiModel):
    prompt: str = Field(min_length=5, max_length=300)
    options: list[str] = Field(min_length=3, max_length=4)
    correct_option: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=10, max_length=300)

    @model_validator(mode="after")
    def _correct_option_exists(self) -> Self:
        if self.correct_option >= len(self.options):
            raise ValueError("correctOption must index one of the options")
        if len({option.casefold() for option in self.options}) != len(self.options):
            raise ValueError("options must be different from each other")
        return self


class ModuleQuizDraft(ApiModel):
    """A short end-of-module quiz written by the AI, answer key included."""

    questions: list[QuizQuestionDraft] = Field(min_length=4, max_length=6)


# ---- API ----


class QuizQuestion(ApiModel):
    id: str
    prompt: str
    options: list[str]


class ModuleQuiz(ApiModel):
    """A module quiz as the learner sees it: no answers until it is submitted."""

    skill_id: str
    module_index: int
    title: str
    questions: list[QuizQuestion]


class QuizSubmission(ApiModel):
    """One chosen option index per question, in question order."""

    answers: list[int] = Field(min_length=1, max_length=6)


class QuestionResult(ApiModel):
    id: str
    prompt: str
    options: list[str]
    chosen: int
    correct_option: int
    correct: bool
    explanation: str


class QuizResult(ApiModel):
    """A graded module quiz, stored at users/{uid}/quizResults/{skillId}__{module}."""

    skill_id: str
    module_index: int
    title: str
    score: int = Field(ge=0, le=100)
    results: list[QuestionResult]
    added_to_review: int
    completed_at: datetime


class ReviewItem(ApiModel):
    """A spaced-repetition card from a missed quiz question, at users/{uid}/reviews/{id}."""

    id: str
    skill_id: str
    prompt: str
    options: list[str]
    correct_option: int
    explanation: str
    box: int = Field(ge=0, le=4)
    due_on: date
    last_reviewed_on: date | None


class ReviewAnswer(ApiModel):
    """The learner's answer to a review card; `answeredOn` is their own calendar date."""

    choice: int = Field(ge=0, le=3)
    answered_on: date


class ReviewOutcome(ApiModel):
    item: ReviewItem
    correct: bool
