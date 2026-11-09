from fastapi import APIRouter

from darb_api.auth import CurrentUser
from darb_api.demo import demo_skills, new_profile
from darb_api.demo_plan import demo_activity
from darb_api.dependencies import ClockDep, RepositoryDep
from darb_api.schemas import Profile

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
