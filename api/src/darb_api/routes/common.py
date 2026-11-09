"""Helpers shared by the routes: consistent error shapes, skill lookup, metered AI calls."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import HTTPException, status

from darb_api.ai.types import AiUnavailableError
from darb_api.auth import AuthenticatedUser
from darb_api.config import Settings
from darb_api.dependencies import Clock
from darb_api.domain.usage import UsageLimitError, next_reset, usage_day
from darb_api.repository import UserRepository
from darb_api.schemas import Language, Preferences, Profile, Skill, Tier

AI_UNAVAILABLE = HTTPException(
    status.HTTP_503_SERVICE_UNAVAILABLE,
    detail={"code": "ai_unavailable", "message": "The AI is resting. Please try again soon."},
)

LANGUAGE_NAMES = {Language.EN: "English", Language.AR: "Modern Standard Arabic"}


def conflict(message: str) -> HTTPException:
    return HTTPException(status.HTTP_409_CONFLICT, detail={"code": "conflict", "message": message})


async def require_skill(repository: UserRepository, uid: str, skill_id: str) -> Skill:
    skill = await repository.get_skill(uid, skill_id)
    if skill is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return skill


def tier_of(profile: Profile | None) -> Tier:
    return profile.tier if profile else Tier.FREE


def daily_ai_limit(tier: Tier, settings: Settings) -> int:
    return settings.ai_daily_limit_pro if tier is Tier.PRO else settings.ai_daily_limit_per_user


@asynccontextmanager
async def metered_ai(
    repository: UserRepository, user: AuthenticatedUser, clock: Clock, settings: Settings
) -> AsyncIterator[str]:
    """Count one AI request against the daily limits (429 when reached) and yield the language
    the AI should write in. If the AI call inside fails, the request is given back and the
    client gets a 503."""
    now = clock()
    day = usage_day(now)
    profile = await repository.get_profile(user.uid)
    limit = daily_ai_limit(tier_of(profile), settings)
    try:
        await repository.count_ai_request(user.uid, day, limit, settings.ai_daily_limit_global)
    except UsageLimitError as error:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "code": "ai_limit_reached",
                "scope": error.scope.value,
                "resetsAt": next_reset(now).isoformat(),
            },
        ) from error
    preferences = profile.preferences if profile else Preferences()
    try:
        yield LANGUAGE_NAMES[preferences.language]
    except AiUnavailableError as error:
        await repository.refund_ai_request(user.uid, day)
        raise AI_UNAVAILABLE from error
