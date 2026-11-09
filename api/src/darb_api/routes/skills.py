from fastapi import APIRouter, HTTPException, status

from darb_api.auth import CurrentUser
from darb_api.dependencies import ClockDep, RepositoryDep
from darb_api.domain.onboarding import target_date_problem
from darb_api.domain.usage import can_add_skill, skill_allowance
from darb_api.repository import NewSkill
from darb_api.schemas import OnboardingAnswers, Skill, SkillStatus, Tier

router = APIRouter(tags=["skills"])


@router.post("/skills", status_code=status.HTTP_201_CREATED)
async def create_skill(
    answers: OnboardingAnswers,
    user: CurrentUser,
    repository: RepositoryDep,
    clock: ClockDep,
) -> Skill:
    """Start learning a new skill from the onboarding wizard's answers."""
    now = clock()
    problem = target_date_problem(answers.target_date, today=now.date())
    if problem:
        # Same shape as FastAPI's own validation errors, so the client handles one format.
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=[{"loc": ["body", "targetDate"], "msg": problem, "type": "value_error"}],
        )
    profile = await repository.get_profile(user.uid)
    allowance = skill_allowance(
        is_pro=profile is not None and profile.tier is Tier.PRO, is_demo=user.is_anonymous
    )
    if not can_add_skill(len(await repository.list_skills(user.uid)), allowance):
        raise HTTPException(
            status.HTTP_402_PAYMENT_REQUIRED,
            detail={"code": "skill_limit_reached", "limit": allowance},
        )
    skill = NewSkill(answers=answers, status=SkillStatus.ONBOARDED, created_at=now)
    return await repository.add_skill(user.uid, skill)
