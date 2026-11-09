"""Plan rules: how long a plan runs, whether an AI draft fits, and when lessons happen."""

from collections.abc import Sequence
from datetime import date, datetime, timedelta

from darb_api.schemas.onboarding import Weekday
from darb_api.schemas.plan import (
    LessonDraft,
    LessonStatus,
    Plan,
    PlanDraft,
    PlanLesson,
    PlanModule,
    PlanWeek,
    WeekDraft,
)

DEFAULT_WEEKS = 8
MIN_WEEKS, MAX_WEEKS = 2, 8
WEEKLY_TOLERANCE = 0.4  # a week's lessons may differ from the learner's hours by 40% either way
WEEKDAYS = list(Weekday)
# Dates arrive in the learner's time zone; allow a day of skew against the server's UTC "today".
TIME_ZONE_ALLOWANCE = timedelta(days=1)
DIFFICULTY_WORDS = {
    -2: "much easier than their level suggests",
    -1: "a little easier than their level suggests",
    0: "none",
    1: "a little harder than their level suggests",
    2: "much harder than their level suggests",
}


def monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


def plan_weeks(today: date, target_date: date | None) -> int:
    if target_date is None:
        return DEFAULT_WEEKS
    weeks_left = (monday_of(target_date) - monday_of(today)).days // 7 + 1
    return min(max(weeks_left, MIN_WEEKS), MAX_WEEKS)


def week_problems(week: WeekDraft, minutes_per_week: int, label: str) -> list[str]:
    total = sum(lesson.minutes for lesson in week.lessons)
    low = round(minutes_per_week * (1 - WEEKLY_TOLERANCE))
    high = round(minutes_per_week * (1 + WEEKLY_TOLERANCE))
    if not low <= total <= high:
        return [f"{label} has {total} minutes of lessons; it must be between {low} and {high}"]
    return []


def draft_problems(
    weeks: Sequence[WeekDraft], expected_weeks: int, minutes_per_week: int
) -> list[str]:
    """Why an AI plan does not fit this learner (empty when it fits)."""
    problems = []
    if len(weeks) != expected_weeks:
        problems.append(f"the plan has {len(weeks)} weeks in total; it must have {expected_weeks}")
    for number, week in enumerate(weeks, start=1):
        problems += week_problems(week, minutes_per_week, f"week {number}")
    return problems


def study_days(week_start: date, preferred_days: Sequence[Weekday], earliest: date) -> list[date]:
    """The learner's preferred days in this week, from `earliest` on. If none are left, any
    remaining day of the week; if the week is over, its last day."""
    week = [week_start + timedelta(days=offset) for offset in range(7)]
    preferred = {WEEKDAYS.index(day) for day in preferred_days}
    remaining = [day for day in week if day >= earliest]
    chosen = [day for day in remaining if day.weekday() in preferred]
    return chosen or remaining or [week[-1]]


def schedule(minutes: Sequence[int], days: Sequence[date]) -> list[date]:
    """Give each lesson, in order, the day with the fewest minutes so far (earliest on ties)."""
    load = dict.fromkeys(days, 0)
    dates = []
    for lesson_minutes in minutes:
        day = min(days, key=lambda candidate: (load[candidate], candidate))
        load[day] += lesson_minutes
        dates.append(day)
    return dates


def build_week(
    index: int,
    module_index: int,
    draft: WeekDraft,
    plan_start: date,
    preferred_days: Sequence[Weekday],
    today: date,
    kept: Sequence[PlanLesson] = (),
) -> PlanWeek:
    start = plan_start + timedelta(weeks=index)
    days = study_days(start, preferred_days, today)
    dates = schedule([lesson.minutes for lesson in draft.lessons], days)
    taken = {lesson.id for lesson in kept}
    new_lessons = []
    for position, (lesson, when) in enumerate(zip(draft.lessons, dates, strict=True), start=1):
        lesson_id = _free_id(f"w{index + 1}-l{position}", taken)
        taken.add(lesson_id)
        new_lessons.append(_lesson(lesson_id, lesson, when))
    return PlanWeek(
        index=index,
        start_date=start,
        module_index=module_index,
        goal=draft.goal,
        lessons=[*kept, *new_lessons],
    )


def _free_id(candidate: str, taken: set[str]) -> str:
    suffix = 2
    lesson_id = candidate
    while lesson_id in taken:
        lesson_id = f"{candidate}-{suffix}"
        suffix += 1
    return lesson_id


def _lesson(lesson_id: str, draft: LessonDraft, when: date) -> PlanLesson:
    return PlanLesson(
        id=lesson_id,
        title=draft.title,
        objective=draft.objective,
        minutes=draft.minutes,
        kind=draft.kind,
        scheduled_date=when,
        status=LessonStatus.TODO,
    )


def plan_end(plan: Plan) -> date:
    return plan.weeks[-1].start_date + timedelta(days=6)


def move_problem(plan: Plan, new_date: date, today: date) -> str | None:
    if new_date < today - TIME_ZONE_ALLOWANCE:
        return "Lessons can only move to today or later"
    if new_date > plan_end(plan):
        return "That day is after the end of the plan"
    return None


def move_lesson(plan: Plan, lesson_id: str, new_date: date) -> Plan:
    weeks = [
        week.model_copy(
            update={
                "lessons": [
                    lesson.model_copy(update={"scheduled_date": new_date})
                    if lesson.id == lesson_id
                    else lesson
                    for lesson in week.lessons
                ]
            }
        )
        for week in plan.weeks
    ]
    return plan.model_copy(update={"weeks": weeks})


def find_lesson(plan: Plan, lesson_id: str) -> PlanLesson | None:
    return next((les for week in plan.weeks for les in week.lessons if les.id == lesson_id), None)


def adjusted_difficulty(current: int, change: int) -> int:
    return min(max(current + change, -2), 2)


def draft_weeks(draft: PlanDraft) -> list[WeekDraft]:
    return [week for module in draft.modules for week in module.weeks]


def assemble_plan(
    skill_id: str,
    draft: PlanDraft,
    preferred_days: Sequence[Weekday],
    today: date,
    generated_at: datetime,
    difficulty: int = 0,
) -> Plan:
    """Turn a validated AI draft into a dated plan that starts this week."""
    start = monday_of(today)
    weeks: list[PlanWeek] = []
    for module_index, module in enumerate(draft.modules):
        for week in module.weeks:
            weeks.append(build_week(len(weeks), module_index, week, start, preferred_days, today))
    return Plan(
        skill_id=skill_id,
        modules=[PlanModule(title=m.title, summary=m.summary) for m in draft.modules],
        weeks=weeks,
        difficulty=difficulty,
        generated_at=generated_at,
    )


def replace_week(plan: Plan, week: PlanWeek, difficulty: int) -> Plan:
    weeks = [week if existing.index == week.index else existing for existing in plan.weeks]
    return plan.model_copy(update={"weeks": weeks, "difficulty": difficulty})
