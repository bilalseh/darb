"""Helpers shared by the routes: consistent error shapes, skill lookup, AI usage counting."""

from fastapi import HTTPException, status

from darb_api.auth import AuthenticatedUser
from darb_api.config import Settings
from darb_api.dependencies import Clock
from darb_api.domain.usage import UsageLimitError, next_reset, usage_day
from darb_api.repository import UserRepository
from darb_api.schemas import Skill

AI_UNAVAILABLE = HTTPException(
    status.HTTP_503_SERVICE_UNAVAILABLE,
    detail={"code": "ai_unavailable", "message": "The AI is resting. Please try again soon."},
)


def conflict(message: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, detail={"code": "conflict", "message": message})


async def require_skill(repository: UserRepository, uid: str, skill_id: str) -> Skill:
    skill = await repository.get_skill(uid, skill_id)
    if skill is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return skill


async def count_ai_request(
    repository: UserRepository, user: AuthenticatedUser, clock: Clock, settings: Settings
) -> None:
    """Count one AI request against the daily limits, or answer 429 with when they reset."""
    now = clock()
    try:
        await repository.count_ai_request(
            user.uid,
            usage_day(now),
            settings.ai_daily_limit_per_user,
            settings.ai_daily_limit_global,
        )
    except UsageLimitError as error:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "ai_limit_reached",
                "scope": error.scope.value,
                "resetsAt": next_reset(now).isoformat(),
            },
        ) from error
