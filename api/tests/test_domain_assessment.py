import pytest

from darb_api.domain.assessment import (
    Answer,
    answer_problem,
    next_question,
    placement_level,
    question_order,
    should_stop,
    subskill_scores,
)
from darb_api.schemas.assessment import PlacementLevel
from tests.quiz_factory import sample_quiz

QUIZ = sample_quiz()
QUESTIONS = QUIZ.questions


def test_questions_go_from_easy_to_hard_keeping_ties_in_order() -> None:
    assert question_order(QUESTIONS) == [1, 2, 3, 4, 0, 5, 6]


def test_next_question_skips_answered_ones() -> None:
    assert next_question(QUESTIONS, []) == 1
    assert next_question(QUESTIONS, [Answer(1, choice=0)]) == 2


def test_stops_after_two_missed_multiple_choice_questions_in_a_row() -> None:
    answers = [
        Answer(1, choice=0),  # correct
        Answer(2, confidence=3),
        Answer(3, text="something"),
        Answer(4, choice=2),  # wrong
        Answer(0, choice=1),  # wrong
    ]

    assert should_stop(QUESTIONS, answers)
    assert next_question(QUESTIONS, answers) is None


def test_does_not_stop_before_the_minimum_number_of_questions() -> None:
    assert not should_stop(QUESTIONS, [Answer(1, choice=2), Answer(4, choice=2)])


def test_a_correct_answer_resets_the_miss_streak() -> None:
    answers = [Answer(1, choice=2), Answer(2, confidence=1), Answer(3, text="x")]
    answers += [Answer(4, choice=2), Answer(0, choice=0)]

    assert not should_stop(QUESTIONS, answers)


def test_finishes_when_every_question_is_answered() -> None:
    answers = [Answer(i, choice=0, confidence=3, text="x") for i in question_order(QUESTIONS)]

    assert next_question(QUESTIONS, answers) is None


@pytest.mark.parametrize(
    ("index", "answer", "problem"),
    [
        (1, Answer(1), "Pick one of the options"),
        (1, Answer(1, choice=3), "Pick one of the options"),
        (3, Answer(3, text="   "), "Write an answer"),
        (2, Answer(2), "Rate your confidence from 1 to 5"),
        (1, Answer(1, choice=2), None),
    ],
)
def test_checks_that_an_answer_fits_its_question(
    index: int, answer: Answer, problem: str | None
) -> None:
    assert answer_problem(QUESTIONS[index], answer) == problem


def test_scores_weight_questions_by_difficulty() -> None:
    answers = [
        Answer(1, choice=0),  # Vocabulary d1 correct
        Answer(2, confidence=5),  # Listening confidence, full credit
        Answer(3, text="ok"),  # Listening short d2, graded 0.5
        Answer(4, choice=0),  # Grammar d2 correct
        Answer(0, choice=1),  # Grammar d3 wrong
        Answer(5, choice=0),  # Vocabulary d4 correct
        Answer(6, choice=0),  # Grammar d5 correct
    ]

    scores = subskill_scores(QUIZ.subskills, QUESTIONS, answers, {"q4": 0.5})

    assert scores == {"Grammar": 70, "Vocabulary": 100, "Listening": 67}


def test_questions_skipped_by_an_early_stop_count_as_not_mastered() -> None:
    scores = subskill_scores(QUIZ.subskills, QUESTIONS, [Answer(1, choice=0)], {})

    assert scores["Vocabulary"] == 20  # 1 of a possible 1 + 4
    assert scores["Listening"] == 0  # confidence unanswered, short answer skipped


@pytest.mark.parametrize(
    ("average", "level"),
    [
        (0, PlacementLevel.BEGINNER),
        (34, PlacementLevel.BEGINNER),
        (35, PlacementLevel.ELEMENTARY),
        (60, PlacementLevel.INTERMEDIATE),
        (75, PlacementLevel.ADVANCED),
    ],
)
def test_level_comes_from_the_average_score(average: int, level: PlacementLevel) -> None:
    assert placement_level({"A": average, "B": average}) == level


def test_no_scores_means_beginner() -> None:
    assert placement_level({}) == PlacementLevel.BEGINNER
