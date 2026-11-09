"""Quiz grading and spaced repetition (Leitner boxes)."""

from collections.abc import Sequence
from datetime import date, timedelta

# Days until the next review for a card in each box; a miss sends a card back to box 0.
BOX_INTERVALS = (1, 3, 7, 14, 30)


def next_review(box: int, correct: bool, today: date) -> tuple[int, date]:
    """(new box, next due date) after answering a card."""
    new_box = min(box + 1, len(BOX_INTERVALS) - 1) if correct else 0
    return new_box, today + timedelta(days=BOX_INTERVALS[new_box])


def first_review(today: date) -> date:
    return today + timedelta(days=BOX_INTERVALS[0])


def score(correct_options: Sequence[int], chosen: Sequence[int]) -> int:
    if not correct_options:
        return 0
    right = sum(1 for want, got in zip(correct_options, chosen, strict=True) if want == got)
    return round(100 * right / len(correct_options))


def is_due(due_on: date, today: date) -> bool:
    return due_on <= today
