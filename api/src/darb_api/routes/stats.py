from collections.abc import Sequence
from datetime import date

from fastapi import APIRouter

from darb_api.auth import CurrentUser
from darb_api.dependencies import ClockDep, RepositoryDep
from darb_api.domain import lessons as rules
from darb_api.domain.badges import earned_badges
from darb_api.repository import DayActivity
from darb_api.schemas.lesson import Stats
from darb_api.schemas.plan import LessonStatus
from darb_api.schemas.progress import Progress, QuizScorePoint, SkillProgress

router = APIRouter(tags=["stats"])


def _learner_today(requested: date | None, server_today: date) -> date:
    """The learner's date if given and within a day of the server's UTC date."""
    if requested is None or rules.completion_date_problem(requested, server_today):
        return server_today
    return requested


def compute_stats(activity: Sequence[DayActivity], today: date) -> Stats:
    active_days = {date.fromisoformat(a.day) for a in activity if a.lessons + a.reviews > 0}
    current, longest = rules.streaks(active_days, today)
    return Stats(
        streak=current,
        longest_streak=longest,
        active_today=today in active_days,
        lessons_done=sum(a.lessons for a in activity),
        minutes_studied=sum(a.minutes for a in activity),
    )


@router.get("/stats")
async def get_stats(
    user: CurrentUser, repository: RepositoryDep, clock: ClockDep, today: date | None = None
) -> Stats:
    """Streak and totals. `today` is the learner's calendar date (within a day of the server's)."""
    learner_today = _learner_today(today, clock().date())
    return compute_stats(await repository.list_activity(user.uid), learner_today)


@router.get("/progress")
async def get_progress(
    user: CurrentUser, repository: RepositoryDep, clock: ClockDep, today: date | None = None
) -> Progress:
    """The dashboard: stats, badges, quiz scores over time and per-skill progress."""
    learner_today = _learner_today(today, clock().date())
    stats = compute_stats(await repository.list_activity(user.uid), learner_today)
    skills = await repository.list_skills(user.uid)
    names = {skill.id: skill.answers.skill for skill in skills}
    results = await repository.list_quiz_results(user.uid)
    plans = {skill.id: await repository.get_plan(user.uid, skill.id) for skill in skills}

    progress = []
    for skill in skills:
        plan = plans[skill.id]
        lessons = [les for week in plan.weeks for les in week.lessons] if plan else []
        progress.append(
            SkillProgress(
                skill_id=skill.id,
                skill=skill.answers.skill,
                level=skill.placement.level if skill.placement else None,
                starting_subskills=skill.placement.subskills if skill.placement else [],
                lessons_done=sum(1 for les in lessons if les.status is LessonStatus.DONE),
                lessons_total=len(lessons),
            )
        )
    return Progress(
        stats=stats,
        badges=earned_badges(
            [plan for plan in plans.values() if plan],
            stats.lessons_done,
            len(results),
            stats.longest_streak,
        ),
        quizzes=sorted(
            (
                QuizScorePoint(
                    skill_id=result.skill_id,
                    skill=names.get(result.skill_id, ""),
                    title=result.title,
                    score=result.score,
                    completed_at=result.completed_at,
                )
                for result in results
            ),
            key=lambda point: point.completed_at,
        ),
        skills=progress,
    )
