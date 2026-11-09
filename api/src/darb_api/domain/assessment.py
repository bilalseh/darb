"""Placement assessment rules: which question comes next, when to stop, scores and level."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from darb_api.schemas.assessment import PlacementLevel, QuestionKind, QuizQuestionSpec

MIN_QUESTIONS = 5
STOP_AFTER_MISSES = 2
# Average sub-skill score (0-100) below each bound gives that level; anything higher is Advanced.
LEVEL_BOUNDS = (
    (35, PlacementLevel.BEGINNER),
    (55, PlacementLevel.ELEMENTARY),
    (75, PlacementLevel.INTERMEDIATE),
)


@dataclass(frozen=True, slots=True)
class Answer:
    question_index: int
    choice: int | None = None
    text: str | None = None
    confidence: int | None = None


def question_id(index: int) -> str:
    return f"q{index + 1}"


def question_order(questions: Sequence[QuizQuestionSpec]) -> list[int]:
    """Easiest first; the AI's own order breaks ties."""
    return sorted(range(len(questions)), key=lambda index: (questions[index].difficulty, index))


def is_correct(question: QuizQuestionSpec, answer: Answer) -> bool:
    return (
        question.kind is QuestionKind.MULTIPLE_CHOICE and answer.choice == question.correct_option
    )


def should_stop(questions: Sequence[QuizQuestionSpec], answers: Sequence[Answer]) -> bool:
    """Stop early once the learner has missed several multiple choice questions in a row: the
    remaining questions are harder still, so they would only be discouraging."""
    if len(answers) < MIN_QUESTIONS:
        return False
    misses = 0
    for answer in reversed(answers):
        question = questions[answer.question_index]
        if question.kind is not QuestionKind.MULTIPLE_CHOICE:
            continue
        if is_correct(question, answer):
            return False
        misses += 1
        if misses >= STOP_AFTER_MISSES:
            return True
    return False


def next_question(questions: Sequence[QuizQuestionSpec], answers: Sequence[Answer]) -> int | None:
    if should_stop(questions, answers):
        return None
    answered = {answer.question_index for answer in answers}
    return next((index for index in question_order(questions) if index not in answered), None)


def answer_problem(question: QuizQuestionSpec, answer: Answer) -> str | None:
    """Why an answer does not fit its question, or None when it does."""
    match question.kind:
        case QuestionKind.MULTIPLE_CHOICE:
            if answer.choice is None or not 0 <= answer.choice < len(question.options):
                return "Pick one of the options"
        case QuestionKind.SHORT_ANSWER:
            if not answer.text or not answer.text.strip():
                return "Write an answer"
        case QuestionKind.CONFIDENCE:
            if answer.confidence is None:
                return "Rate your confidence from 1 to 5"
    return None


def subskill_scores(
    subskills: Sequence[str],
    questions: Sequence[QuizQuestionSpec],
    answers: Sequence[Answer],
    short_answer_scores: Mapping[str, float],
) -> dict[str, int]:
    """Score each sub-skill from 0 to 100, weighting questions by difficulty. Questions skipped by
    an early stop count as not yet mastered; unanswered confidence statements do not count."""
    by_index = {answer.question_index: answer for answer in answers}
    earned = dict.fromkeys(subskills, 0.0)
    possible = dict.fromkeys(subskills, 0.0)
    names = {name.casefold(): name for name in subskills}

    for index, question in enumerate(questions):
        name = names[question.subskill.casefold()]
        answer = by_index.get(index)
        if question.kind is QuestionKind.CONFIDENCE:
            if answer is None or answer.confidence is None:
                continue
            weight, credit = 1.0, (answer.confidence - 1) / 4
        elif answer is None:
            weight, credit = float(question.difficulty), 0.0
        elif question.kind is QuestionKind.MULTIPLE_CHOICE:
            weight, credit = float(question.difficulty), float(is_correct(question, answer))
        else:
            score = short_answer_scores.get(question_id(index), 0.0)
            weight, credit = float(question.difficulty), min(max(score, 0.0), 1.0)
        earned[name] += weight * credit
        possible[name] += weight

    return {
        name: round(100 * earned[name] / possible[name]) if possible[name] else 0
        for name in subskills
    }


def placement_level(scores: Mapping[str, int]) -> PlacementLevel:
    average = sum(scores.values()) / len(scores) if scores else 0
    for bound, level in LEVEL_BOUNDS:
        if average < bound:
            return level
    return PlacementLevel.ADVANCED
