from darb_api.schemas.assessment import PlacementQuiz, QuestionKind, QuizQuestionSpec
from darb_api.schemas.text import LocalizedText


def both(text: str) -> LocalizedText:
    return LocalizedText(en=text, ar=f"ع: {text}")


def mc(subskill: str, difficulty: int, correct: int = 0) -> QuizQuestionSpec:
    return QuizQuestionSpec(
        kind=QuestionKind.MULTIPLE_CHOICE,
        prompt=both(f"A {subskill} question at level {difficulty}?"),
        subskill=subskill,
        difficulty=difficulty,
        options=[both("A"), both("B"), both("C")],
        correct_option=correct,
        reference_answer=None,
    )


def short(subskill: str, difficulty: int) -> QuizQuestionSpec:
    return QuizQuestionSpec(
        kind=QuestionKind.SHORT_ANSWER,
        prompt=both(f"Explain {subskill} briefly."),
        subskill=subskill,
        difficulty=difficulty,
        options=[],
        correct_option=None,
        reference_answer="A sensible explanation.",
    )


def confidence(subskill: str) -> QuizQuestionSpec:
    return QuizQuestionSpec(
        kind=QuestionKind.CONFIDENCE,
        prompt=both(f"I can use {subskill} confidently."),
        subskill=subskill,
        difficulty=1,
        options=[],
        correct_option=None,
        reference_answer=None,
    )


def sample_quiz() -> PlacementQuiz:
    """Seven questions over three sub-skills; index order differs from difficulty order."""
    return PlacementQuiz(
        subskills=[both(name) for name in ("Grammar", "Vocabulary", "Listening")],
        questions=[
            mc("Grammar", 3),  # q1
            mc("Vocabulary", 1),  # q2
            confidence("Listening"),  # q3
            short("Listening", 2),  # q4
            mc("Grammar", 2),  # q5
            mc("Vocabulary", 4),  # q6
            mc("Grammar", 5),  # q7
        ],
    )
