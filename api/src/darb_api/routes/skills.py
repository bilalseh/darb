from fastapi import APIRouter, HTTPException, status

from darb_api.auth import CurrentUser
from darb_api.dependencies import ClockDep, RepositoryDep
from darb_api.domain.onboarding import target_date_problem
from darb_api.repository import NewSkill
from darb_api.schemas import OnboardingAnswers, Skill, SkillStatus

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
    skill = NewSkill(answers=answers, status=SkillStatus.ONBOARDED, created_at=now)
    return await repository.add_skill(user.uid, skill)
