"""Keeping a plan realistic: moving missed lessons, and when a weekly check-in is due."""

from collections.abc import Sequence
from datetime import date, timedelta

from darb_api.domain.plan import WEEKDAYS, plan_end
from darb_api.schemas.onboarding import Weekday
from darb_api.schemas.plan import (
    LessonStatus,
    Plan,
    PlanLesson,
    RescheduleMove,
    RescheduleNotice,
)

RESCHEDULE_HORIZON = timedelta(days=13)
CHECKIN_FROM_DAY = 3  # the check-in is offered from the 4th day of a week (Thursday)


def _candidate_days(plan: Plan, today: date, preferred_days: Sequence[Weekday]) -> list[date]:
    end = min(plan_end(plan), today + RESCHEDULE_HORIZON)
    span = [today + timedelta(days=offset) for offset in range((end - today).days + 1)]
    preferred = {WEEKDAYS.index(day) for day in preferred_days}
    return [day for day in span if day.weekday() in preferred] or span or [today]


def reschedule_missed(
    plan: Plan, today: date, preferred_days: Sequence[Weekday]
) -> tuple[Plan, list[RescheduleMove]]:
    """Move every unfinished lesson dated before today to the lightest upcoming preferred day."""
    lessons = [lesson for week in plan.weeks for lesson in week.lessons]
    missed = sorted(
        (les for les in lessons if les.status is LessonStatus.TODO and les.scheduled_date < today),
        key=lambda lesson: (lesson.scheduled_date, lesson.id),
    )
    if not missed:
        return plan, []
    days = _candidate_days(plan, today, preferred_days)
    load = dict.fromkeys(days, 0)
    for lesson in lessons:
        if lesson.status is LessonStatus.TODO and lesson.scheduled_date in load:
            load[lesson.scheduled_date] += lesson.minutes
    new_dates: dict[str, date] = {}
    moves: list[RescheduleMove] = []
    for lesson in missed:
        day = min(days, key=lambda candidate: (load[candidate], candidate))
        load[day] += lesson.minutes
        new_dates[lesson.id] = day
        moves.append(
            RescheduleMove(
                lesson_id=lesson.id,
                title=lesson.title,
                from_date=lesson.scheduled_date,
                to_date=day,
            )
        )

    def moved(lesson: PlanLesson) -> PlanLesson:
        if lesson.id not in new_dates:
            return lesson
        return lesson.model_copy(update={"scheduled_date": new_dates[lesson.id]})

    weeks = [
        w.model_copy(update={"lessons": [moved(les) for les in w.lessons]}) for w in plan.weeks
    ]
    notice = RescheduleNotice(on=today, moves=moves)
    return plan.model_copy(update={"weeks": weeks, "last_reschedule": notice}), moves


def current_week_index(plan: Plan, today: date) -> int | None:
    for week in plan.weeks:
        if week.start_date <= today <= week.start_date + timedelta(days=6):
            return week.index
    return None


def checkin_week(plan: Plan, today: date) -> int | None:
    """The week a check-in is due for: last week if it was skipped, else this week from its
    fourth day. Only weeks that have a following week to adjust count."""
    current = current_week_index(plan, today)
    if current is None:
        return None
    previous = current - 1
    if previous >= 0 and previous not in plan.checked_in_weeks:
        return previous
    week = plan.weeks[current]
    has_next = current + 1 < len(plan.weeks)
    started_enough = (today - week.start_date).days >= CHECKIN_FROM_DAY
    if has_next and started_enough and current not in plan.checked_in_weeks:
        return current
    return None
