from datetime import date

from fastapi import APIRouter

from darb_api.auth import CurrentUser
from darb_api.dependencies import ClockDep, RepositoryDep
from darb_api.domain import lessons as rules
from darb_api.schemas.lesson import Stats

router = APIRouter(tags=["stats"])


@router.get("/stats")
async def get_stats(
    user: CurrentUser, repository: RepositoryDep, clock: ClockDep, today: date | None = None
) -> Stats:
    """Streak and totals. `today` is the learner's calendar date (within a day of the server's)."""
    server_today = clock().date()
    if today is None or rules.completion_date_problem(today, server_today):
        today = server_today
    activity = await repository.list_activity(user.uid)
    active_days = {date.fromisoformat(a.day) for a in activity if a.lessons > 0}
    current, longest = rules.streaks(active_days, today)
    return Stats(
        streak=current,
        longest_streak=longest,
        active_today=today in active_days,
        lessons_done=sum(a.lessons for a in activity),
        minutes_studied=sum(a.minutes for a in activity),
    )
