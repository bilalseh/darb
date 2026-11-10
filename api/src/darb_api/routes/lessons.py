"""Lessons: content written on first open, marking done, and the lesson's AI tutor."""

from fastapi import APIRouter, HTTPException, status

from darb_api.auth import CurrentUser
from darb_api.dependencies import AiDep, ClockDep, RepositoryDep, SettingsDep
from darb_api.domain import lessons as lesson_rules
from darb_api.domain import plan as plan_rules
from darb_api.prompts import render
from darb_api.repository import UserRepository
from darb_api.routes.common import conflict, metered_ai, require_skill
from darb_api.schemas.lesson import (
    CompleteLessonRequest,
    LessonContent,
    LessonContentDraft,
    TutorMessage,
    TutorReplyDraft,
    TutorRequest,
    TutorRole,
)
from darb_api.schemas.plan import LessonStatus, Plan, PlanLesson, PlanWeek

router = APIRouter(tags=["lessons"], prefix="/skills/{skill_id}/lessons/{lesson_id}")

TUTOR_HISTORY_KEPT = 20
TUTOR_HISTORY_IN_PROMPT = 6


async def _lesson_in_plan(
    repository: UserRepository, uid: str, skill_id: str, lesson_id: str
) -> tuple[Plan, PlanWeek, PlanLesson]:
    plan = await repository.get_plan(uid, skill_id)
    week = plan_rules.find_week_of(plan, lesson_id) if plan else None
    lesson = plan_rules.find_lesson(plan, lesson_id) if plan else None
    if plan is None or week is None or lesson is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return plan, week, lesson


@router.post("/content")
async def get_lesson_content(
    skill_id: str,
    lesson_id: str,
    user: CurrentUser,
    repository: RepositoryDep,
    ai: AiDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> LessonContent:
    """Return the lesson's content, writing it with the AI the first time it is opened."""
    stored = await repository.get_lesson_content(user.uid, skill_id, lesson_id)
    if stored is not None:
        # Lessons written before YouTube links became searches are corrected as they are read.
        resources = [lesson_rules.searchable(resource) for resource in stored.resources]
        return stored.model_copy(update={"resources": resources})
    skill = await require_skill(repository, user.uid, skill_id)
    plan, week, lesson = await _lesson_in_plan(repository, user.uid, skill_id, lesson_id)

    async with metered_ai(repository, user, clock, settings) as language:
        prompt = render(
            "lesson_content",
            language=language,
            skill=skill.answers.skill,
            level=skill.placement.level.value if skill.placement else skill.answers.level.value,
            style=skill.answers.learning_style.value,
            module=plan.modules[week.module_index].title,
            title=lesson.title,
            minutes=str(lesson.minutes),
            kind=lesson.kind.value,
            objective=lesson.objective,
        )
        result = await ai.generate(prompt.task, LessonContentDraft, prompt.system, prompt.user)
    draft = result.value
    content = LessonContent(
        skill_id=skill_id,
        lesson_id=lesson_id,
        explanation=draft.explanation,
        exercise=draft.exercise,
        resources=lesson_rules.safe_resources(
            draft.resources, f"{skill.answers.skill} {lesson.title}"
        ),
        tutor=[],
        generated_at=clock(),
        language=language,
    )
    await repository.save_lesson_content(user.uid, content)
    return content


@router.post("/complete")
async def complete_lesson(
    skill_id: str,
    lesson_id: str,
    request: CompleteLessonRequest,
    user: CurrentUser,
    repository: RepositoryDep,
    clock: ClockDep,
) -> Plan:
    """Mark the lesson done and count it for the day. Repeating it changes nothing."""
    plan, _, lesson = await _lesson_in_plan(repository, user.uid, skill_id, lesson_id)
    problem = lesson_rules.completion_date_problem(request.completed_on, clock().date())
    if problem:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=[{"loc": ["body", "completedOn"], "msg": problem, "type": "value_error"}],
        )
    if lesson.status is LessonStatus.DONE:
        return plan
    plan = plan_rules.with_lesson_done(plan, lesson_id)
    await repository.save_plan(user.uid, plan)
    await repository.record_activity(user.uid, request.completed_on.isoformat(), lesson.minutes)
    return plan


def _history(content: LessonContent) -> str:
    turns = content.tutor[-TUTOR_HISTORY_IN_PROMPT:]
    return "\n".join(f'{m.role.value}: """{m.text}"""' for m in turns) or "(none)"


@router.post("/tutor")
async def ask_tutor(
    skill_id: str,
    lesson_id: str,
    request: TutorRequest,
    user: CurrentUser,
    repository: RepositoryDep,
    ai: AiDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> LessonContent:
    """Ask the lesson's tutor a question; returns the lesson with the updated conversation."""
    content = await repository.get_lesson_content(user.uid, skill_id, lesson_id)
    if content is None:
        raise conflict("Open the lesson first")
    skill = await require_skill(repository, user.uid, skill_id)
    _, _, lesson = await _lesson_in_plan(repository, user.uid, skill_id, lesson_id)

    async with metered_ai(repository, user, clock, settings) as language:
        prompt = render(
            "tutor",
            language=language,
            skill=skill.answers.skill,
            level=skill.placement.level.value if skill.placement else skill.answers.level.value,
            title=lesson.title,
            objective=lesson.objective,
            explanation=content.explanation,
            history=_history(content),
            message=request.message.strip(),
        )
        result = await ai.generate(
            prompt.task, TutorReplyDraft, prompt.system, prompt.user, temperature=0.6
        )
    now = clock()
    messages = [
        *content.tutor,
        TutorMessage(
            role=TutorRole.LEARNER, text=request.message.strip(), at=now, language=language
        ),
        TutorMessage(role=TutorRole.TUTOR, text=result.value.reply, at=now, language=language),
    ][-TUTOR_HISTORY_KEPT:]
    content = content.model_copy(update={"tutor": messages})
    await repository.save_lesson_content(user.uid, content)
    return content
