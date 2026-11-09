from fastapi import APIRouter, Response, status

from darb_api.auth import CurrentUser
from darb_api.demo import demo_skills, new_profile
from darb_api.demo_plan import demo_activity
from darb_api.dependencies import ClockDep, RepositoryDep, SettingsDep
from darb_api.domain.usage import next_reset, usage_day
from darb_api.schemas import Profile
from darb_api.schemas.profile import Usage

router = APIRouter(tags=["profile"])


@router.post("/me")
async def ensure_my_profile(
    user: CurrentUser, repository: RepositoryDep, clock: ClockDep
) -> Profile:
    """Return the signed-in user's profile, creating it on first sign-in. Safe to repeat.

    Anonymous users are demo users, so their profile is created together with the demo seed.
    Creating both in one atomic write means a demo account is never half-seeded.
    """
    now = clock()
    if not user.is_anonymous:
        return await repository.ensure_profile(new_profile(user, now))
    seed = demo_skills(now)
    activity = [day for skill in seed if skill.plan for day in demo_activity(now, skill.plan)]
    return await repository.ensure_profile(new_profile(user, now), seed, activity)


@router.get("/me/usage")
async def get_usage(
    user: CurrentUser,
    repository: RepositoryDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> Usage:
    """AI requests used today; the allowance resets at midnight UTC for everyone."""
    now = clock()
    return Usage(
        used=await repository.ai_requests_on(user.uid, usage_day(now)),
        limit=settings.ai_daily_limit_per_user,
        resets_at=next_reset(now),
    )


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_data(user: CurrentUser, repository: RepositoryDep) -> Response:
    """Erase all of the user's data. The browser then deletes the sign-in account itself."""
    await repository.delete_user_data(user.uid)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
