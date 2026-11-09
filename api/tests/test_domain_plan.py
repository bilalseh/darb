from datetime import UTC, date, datetime

import pytest

from darb_api.domain import plan as rules
from darb_api.schemas.onboarding import Weekday
from darb_api.schemas.plan import LessonDraft, LessonKind, LessonStatus, WeekDraft

MONDAY = date(2026, 11, 9)


def week(*minutes: int) -> WeekDraft:
    return WeekDraft(
        goal="A clear goal for the week.",
        lessons=[
            LessonDraft(
                title=f"Lesson {m}",
                objective="Learn something useful.",
                minutes=m,
                kind=LessonKind.LEARN,
            )
            for m in minutes
        ],
    )


@pytest.mark.parametrize(
    ("target", "weeks"),
    [(None, 8), (date(2026, 11, 12), 2), (date(2026, 12, 9), 5), (date(2027, 6, 1), 8)],
)
def test_plan_length_follows_the_goal_date(target: date | None, weeks: int) -> None:
    assert rules.plan_weeks(MONDAY, target) == weeks


def test_a_draft_must_match_the_weeks_and_the_weekly_hours() -> None:
    problems = rules.draft_problems([week(60, 60), week(90, 90, 90, 90, 90)], 3, 180)

    assert problems == [
        "the plan has 2 weeks in total; it must have 3",
        "week 2 has 450 minutes of lessons; it must be between 108 and 252",
    ]


def test_a_fitting_draft_has_no_problems() -> None:
    assert rules.draft_problems([week(60, 60, 60)], 1, 180) == []


def test_study_days_are_the_preferred_days_from_today_on() -> None:
    days = rules.study_days(MONDAY, [Weekday.MON, Weekday.WED, Weekday.SAT], date(2026, 11, 10))

    assert days == [date(2026, 11, 11), date(2026, 11, 14)]


def test_without_preferred_days_left_any_remaining_day_is_used() -> None:
    days = rules.study_days(MONDAY, [Weekday.MON], date(2026, 11, 14))

    assert days == [date(2026, 11, 14), date(2026, 11, 15)]


def test_lessons_go_to_the_lightest_day() -> None:
    days = [date(2026, 11, 9), date(2026, 11, 11)]

    # After three lessons both days hold 60 minutes, so the tie goes to the earlier day.
    assert rules.schedule([60, 30, 30, 45], days) == [days[0], days[1], days[1], days[0]]


def test_a_regenerated_week_keeps_finished_lessons_and_unique_ids() -> None:
    first = rules.build_week(0, 0, week(60, 60), MONDAY, [Weekday.MON], MONDAY)
    done = [first.lessons[0].model_copy(update={"status": LessonStatus.DONE})]

    rebuilt = rules.build_week(0, 0, week(45, 45), MONDAY, [Weekday.MON, Weekday.FRI], MONDAY, done)

    assert [lesson.id for lesson in rebuilt.lessons] == ["w1-l1", "w1-l1-2", "w1-l2"]
    assert rebuilt.lessons[0].status is LessonStatus.DONE


def test_a_plan_is_dated_from_this_week() -> None:
    from darb_api.schemas.plan import ModuleDraft, PlanDraft

    draft = PlanDraft(
        modules=[
            ModuleDraft(title="Basics", summary="The very first steps.", weeks=[week(60), week(60)])
        ]
    )

    plan = rules.assemble_plan(
        "s1", draft, [Weekday.WED], date(2026, 11, 12), datetime(2026, 11, 12, tzinfo=UTC)
    )

    assert [w.start_date for w in plan.weeks] == [MONDAY, date(2026, 11, 16)]
    # This week's Wednesday has passed, so the first lesson goes to a remaining day.
    assert plan.weeks[0].lessons[0].scheduled_date == date(2026, 11, 12)
    assert plan.weeks[1].lessons[0].scheduled_date == date(2026, 11, 18)
    assert rules.plan_end(plan) == date(2026, 11, 22)


def test_moves_are_limited_to_today_through_the_end_of_the_plan() -> None:
    from darb_api.demo_plan import demo_plan

    plan = demo_plan(datetime(2026, 11, 9, tzinfo=UTC))
    today = date(2026, 11, 9)

    assert rules.move_problem(plan, date(2026, 11, 7), today) is not None
    assert rules.move_problem(plan, date(2026, 11, 8), today) is None  # time-zone allowance
    assert rules.move_problem(plan, rules.plan_end(plan), today) is None
    assert rules.move_problem(plan, date(2027, 1, 1), today) is not None


def test_difficulty_stays_within_two_steps() -> None:
    assert rules.adjusted_difficulty(2, 1) == 2
    assert rules.adjusted_difficulty(-2, -1) == -2
    assert rules.adjusted_difficulty(0, -1) == -1
