from fastapi import APIRouter

from darb_api.auth import CurrentUser
from darb_api.dependencies import RepositoryDep
from darb_api.domain.matching import match_communities
from darb_api.routes.common import require_skill
from darb_api.schemas.progress import CommunityMatch, MatchKind

router = APIRouter(tags=["matching"])


@router.get("/skills/{skill_id}/matches")
async def get_matches(
    skill_id: str, user: CurrentUser, repository: RepositoryDep
) -> list[CommunityMatch]:
    """Free communities and practice formats for this skill, each with a one-line reason."""
    skill = await require_skill(repository, user.uid, skill_id)
    matches = match_communities(
        skill.answers.skill,
        skill.placement.level if skill.placement else None,
        skill.answers.reason,
        skill.answers.learning_style,
    )
    return [
        CommunityMatch(
            name=m.community.name,
            url=m.community.url,
            kind=MatchKind(m.community.kind),
            reason=m.reason,
        )
        for m in matches
    ]
