"""Study plans: one AI call drafts the roadmap, domain code dates it, the learner adjusts it."""

from datetime import timedelta

from fastapi import APIRouter, HTTPException, status

from darb_api.ai.types import AiUnavailableError
from darb_api.auth import CurrentUser
from darb_api.dependencies import AiDep, ClockDep, RepositoryDep, SettingsDep
from darb_api.domain import plan as rules
from darb_api.prompts import render
from darb_api.repository import UserRepository
from darb_api.routes.common import AI_UNAVAILABLE, conflict, count_ai_request, require_skill
from darb_api.schemas import Skill
from darb_api.schemas.plan import (
    LessonStatus,
    MoveLessonRequest,
    Plan,
    PlanDraft,
    RegenerateWeekRequest,
    WeekAdjustment,
    WeekDraft,
)

router = APIRouter(tags=["plan"], prefix="/skills/{skill_id}/plan")

DIFFICULTY_CHANGE = {WeekAdjustment.SAME: 0, WeekAdjustment.EASIER: -1, WeekAdjustment.HARDER: 1}


async def _plan(repository: UserRepository, uid: str, skill_id: str) -> Plan:
    plan = await repository.get_plan(uid, skill_id)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No plan for this skill yet")
    return plan


def _subskills(skill: Skill) -> str:
    if skill.placement is None:
        return "unknown"
    return ", ".join(f"{s.name} {s.score}/100" for s in skill.placement.subskills)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_plan(
    skill_id: str,
    user: CurrentUser,
    repository: RepositoryDep,
    ai: AiDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> Plan:
    """Draft a plan from the onboarding answers and the placement result."""
    skill = await require_skill(repository, user.uid, skill_id)
    if skill.placement is None:
        raise conflict("Take the placement test first")
    if await repository.get_plan(user.uid, skill_id) is not None:
        raise conflict("This skill already has a plan")

    await count_ai_request(repository, user, clock, settings)
    now = clock()
    answers = skill.answers
    weeks = rules.plan_weeks(now.date(), answers.target_date)
    minutes = answers.hours_per_week * 60
    prompt = render(
        "plan_outline",
        skill=answers.skill,
        reason=answers.reason.value,
        level=skill.placement.level.value,
        subskills=_subskills(skill),
        style=answers.learning_style.value,
        difficulty=rules.DIFFICULTY_WORDS[0],
        weeks=str(weeks),
        minutes_per_week=str(minutes),
    )
    try:
        result = await ai.generate(
            prompt.task,
            PlanDraft,
            prompt.system,
            prompt.user,
            check=lambda draft: rules.draft_problems(rules.draft_weeks(draft), weeks, minutes),
        )
    except AiUnavailableError as error:
        raise AI_UNAVAILABLE from error
    plan = rules.assemble_plan(skill_id, result.value, answers.preferred_days, now.date(), now)
    await repository.save_plan(user.uid, plan)
    return plan


@router.post("/weeks/{week_index}/regenerate")
async def regenerate_week(
    skill_id: str,
    week_index: int,
    request: RegenerateWeekRequest,
    user: CurrentUser,
    repository: RepositoryDep,
    ai: AiDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> Plan:
    """Replace a week's unfinished lessons, optionally easier or harder than before."""
    skill = await require_skill(repository, user.uid, skill_id)
    plan = await _plan(repository, user.uid, skill_id)
    if not 0 <= week_index < len(plan.weeks):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No such week")
    week = plan.weeks[week_index]
    today = clock().date()
    if week.start_date + timedelta(days=6) < today:
        raise conflict("Past weeks cannot be changed")

    await count_ai_request(repository, user, clock, settings)
    difficulty = rules.adjusted_difficulty(plan.difficulty, DIFFICULTY_CHANGE[request.adjust])
    done = [lesson for lesson in week.lessons if lesson.status is LessonStatus.DONE]
    minutes = skill.answers.hours_per_week * 60
    remaining = max(minutes - sum(lesson.minutes for lesson in done), 30)
    prompt = render(
        "plan_week",
        skill=skill.answers.skill,
        level=skill.placement.level.value if skill.placement else "unknown",
        style=skill.answers.learning_style.value,
        difficulty=rules.DIFFICULTY_WORDS[difficulty],
        week_number=str(week_index + 1),
        module=plan.modules[week.module_index].title,
        goal=week.goal,
        done=", ".join(lesson.title for lesson in done) or "none",
        minutes_per_week=str(minutes),
        remaining_minutes=str(remaining),
    )
    try:
        result = await ai.generate(
            prompt.task,
            WeekDraft,
            prompt.system,
            prompt.user,
            check=lambda draft: rules.week_problems(draft, remaining, "the week"),
        )
    except AiUnavailableError as error:
        raise AI_UNAVAILABLE from error
    new_week = rules.build_week(
        week_index,
        week.module_index,
        result.value,
        plan.weeks[0].start_date,
        skill.answers.preferred_days,
        today,
        kept=done,
    )
    plan = rules.replace_week(plan, new_week, difficulty)
    await repository.save_plan(user.uid, plan)
    return plan


@router.patch("/lessons/{lesson_id}")
async def move_lesson(
    skill_id: str,
    lesson_id: str,
    request: MoveLessonRequest,
    user: CurrentUser,
    repository: RepositoryDep,
    clock: ClockDep,
) -> Plan:
    """Move a lesson to another day (drag and drop in the calendar)."""
    plan = await _plan(repository, user.uid, skill_id)
    if rules.find_lesson(plan, lesson_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No such lesson")
    problem = rules.move_problem(plan, request.scheduled_date, clock().date())
    if problem:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=[{"loc": ["body", "scheduledDate"], "msg": problem, "type": "value_error"}],
        )
    plan = rules.move_lesson(plan, lesson_id, request.scheduled_date)
    await repository.save_plan(user.uid, plan)
    return plan
