"""Weekly check-ins and automatic rescheduling of missed lessons."""

import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, status

from darb_api.auth import CurrentUser
from darb_api.dependencies import AiDep, ClockDep, RepositoryDep, SettingsDep
from darb_api.domain import lessons as lesson_rules
from darb_api.domain import plan as plan_rules
from darb_api.domain import reschedule as rules
from darb_api.prompts import render
from darb_api.routes.common import conflict, metered_ai, require_skill
from darb_api.schemas.checkin import (
    Checkin,
    CheckinDraft,
    CheckinDue,
    CheckinFeeling,
    CheckinRequest,
    SyncRequest,
    SyncResult,
)
from darb_api.schemas.plan import LessonStatus

router = APIRouter(tags=["check-in"])

FEELING_CHANGE = {
    CheckinFeeling.TOO_EASY: 1,
    CheckinFeeling.JUST_RIGHT: 0,
    CheckinFeeling.TOO_HARD: -1,
}


def _learner_today(requested: date, server_today: date) -> None:
    """The learner's date may differ from the server's UTC date by a day, no more."""
    if lesson_rules.completion_date_problem(requested, server_today):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Today must be today")


@router.post("/plans/sync")
async def sync_plans(
    request: SyncRequest, user: CurrentUser, repository: RepositoryDep, clock: ClockDep
) -> SyncResult:
    """Called when the app opens: moves missed lessons to upcoming days, in every plan."""
    _learner_today(request.today, clock().date())
    moved, due = 0, []
    for skill in await repository.list_skills(user.uid):
        plan = await repository.get_plan(user.uid, skill.id)
        if plan is None:
            continue
        updated, moves = rules.reschedule_missed(plan, request.today, skill.answers.preferred_days)
        if moves:
            await repository.save_plan(user.uid, updated)
            moved += len(moves)
        week = rules.checkin_week(updated, request.today)
        if week is not None:
            due.append(CheckinDue(skill_id=skill.id, week_index=week))
    return SyncResult(rescheduled_lessons=moved, checkins_due=due)


@router.post("/skills/{skill_id}/checkin")
async def weekly_checkin(
    skill_id: str,
    request: CheckinRequest,
    user: CurrentUser,
    repository: RepositoryDep,
    ai: AiDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> Checkin:
    """Reflect on a week; the AI rewrites the following week and explains the change."""
    _learner_today(request.today, clock().date())
    skill = await require_skill(repository, user.uid, skill_id)
    plan = await repository.get_plan(user.uid, skill_id)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No plan for this skill yet")
    week_index = rules.checkin_week(plan, request.today)
    if week_index is None:
        raise conflict("No check-in is due right now")
    week, next_week = plan.weeks[week_index], plan.weeks[week_index + 1]

    async with metered_ai(repository, user, clock, settings) as language:
        change = FEELING_CHANGE[request.feeling]
        difficulty = plan_rules.adjusted_difficulty(plan.difficulty, change)
        minutes = skill.answers.hours_per_week * 60
        done = [lesson for lesson in week.lessons if lesson.status is LessonStatus.DONE]
        prompt = render(
            "checkin",
            language=language,
            skill=skill.answers.skill,
            level=skill.placement.level.value if skill.placement else skill.answers.level.value,
            week_number=str(week_index + 1),
            goal=week.goal,
            done=str(len(done)),
            total=str(len(week.lessons)),
            went_well=request.went_well.strip() or "(nothing written)",
            hard=request.hard.strip() or "(nothing written)",
            feeling=request.feeling.value.replace("_", " "),
            difficulty=plan_rules.DIFFICULTY_WORDS[difficulty],
            next_number=str(week_index + 2),
            next_goal=next_week.goal,
            minutes_per_week=str(minutes),
        )
        result = await ai.generate(
            prompt.task,
            CheckinDraft,
            prompt.system,
            prompt.user,
            check=lambda draft: plan_rules.week_problems(draft.week, minutes, "next week"),
        )

    kept = [lesson for lesson in next_week.lessons if lesson.status is LessonStatus.DONE]
    rebuilt = plan_rules.build_week(
        next_week.index,
        next_week.module_index,
        result.value.week,
        plan.weeks[0].start_date,
        skill.answers.preferred_days,
        request.today,
        kept=kept,
    )
    plan = plan_rules.replace_week(plan, rebuilt, difficulty)
    plan = plan.model_copy(update={"checked_in_weeks": [*plan.checked_in_weeks, week_index]})
    checkin = Checkin(
        id=uuid.uuid4().hex,
        skill_id=skill_id,
        week_index=week_index,
        adjusted_week_index=next_week.index,
        went_well=request.went_well.strip(),
        hard=request.hard.strip(),
        feeling=request.feeling,
        explanation=result.value.explanation,
        difficulty=difficulty,
        created_on=request.today,
    )
    await repository.save_plan(user.uid, plan)
    await repository.add_checkin(user.uid, checkin)
    return checkin
