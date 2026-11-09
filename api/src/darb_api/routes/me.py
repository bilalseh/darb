import logging

from fastapi import APIRouter, HTTPException, Response, status

from darb_api.auth import CurrentUser
from darb_api.billing.stripe import BillingError
from darb_api.demo import demo_skills, new_profile
from darb_api.demo_plan import demo_activity
from darb_api.dependencies import BillingDep, ClockDep, RepositoryDep, SettingsDep
from darb_api.domain.usage import next_reset, skill_allowance, usage_day
from darb_api.routes.common import daily_ai_limit, tier_of
from darb_api.schemas import Preferences, Profile, Tier
from darb_api.schemas.profile import Usage

router = APIRouter(tags=["profile"])
logger = logging.getLogger(__name__)


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
    """AI requests used today and the skills allowed on the user's plan. The AI allowance
    resets at midnight UTC for everyone."""
    now = clock()
    tier = tier_of(await repository.get_profile(user.uid))
    return Usage(
        used=await repository.ai_requests_on(user.uid, usage_day(now)),
        limit=daily_ai_limit(tier, settings),
        resets_at=next_reset(now),
        tier=tier,
        skills=len(await repository.list_skills(user.uid)),
        skill_limit=skill_allowance(is_pro=tier is Tier.PRO, is_demo=user.is_anonymous),
    )


@router.put("/me/preferences")
async def save_preferences(
    preferences: Preferences, user: CurrentUser, repository: RepositoryDep
) -> Profile:
    """Replace the user's preferences and return the updated profile."""
    profile = await repository.get_profile(user.uid)
    if profile is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Profile not found")
    await repository.save_preferences(user.uid, preferences)
    return profile.model_copy(update={"preferences": preferences})


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_data(
    user: CurrentUser, repository: RepositoryDep, billing: BillingDep
) -> Response:
    """Cancel any test-mode subscription and erase all of the user's data. The browser then
    deletes the sign-in account itself."""
    record = await repository.get_billing(user.uid)
    if record and billing:
        try:
            await billing.cancel_subscription(record.subscription_id)
        except BillingError:
            logger.warning("Could not cancel subscription for a deleted account")
    await repository.delete_user_data(user.uid)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
