"""Milestone badges, derived from what the learner has actually done (never stored)."""

from collections.abc import Sequence
from enum import StrEnum

from darb_api.schemas.plan import LessonStatus, Plan


class Badge(StrEnum):
    FIRST_LESSON = "first_lesson"
    FIRST_WEEK = "first_week"
    FIRST_QUIZ = "first_quiz"
    STREAK_7 = "streak_7"
    STREAK_30 = "streak_30"


def earned_badges(
    plans: Sequence[Plan], lessons_done: int, quizzes_taken: int, longest_streak: int
) -> list[Badge]:
    week_complete = any(
        week.lessons and all(lesson.status is LessonStatus.DONE for lesson in week.lessons)
        for plan in plans
        for week in plan.weeks
    )
    earned = {
        Badge.FIRST_LESSON: lessons_done >= 1,
        Badge.FIRST_WEEK: week_complete,
        Badge.FIRST_QUIZ: quizzes_taken >= 1,
        Badge.STREAK_7: longest_streak >= 7,
        Badge.STREAK_30: longest_streak >= 30,
    }
    return [badge for badge in Badge if earned[badge]]
