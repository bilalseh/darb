from collections.abc import Sequence

from darb_api.ai.types import AiRequest, FailureKind, ProviderError
from darb_api.auth import AuthenticatedUser, InvalidTokenError
from darb_api.domain.usage import check_allowance
from darb_api.repository import NewSkill, StoredAssessment
from darb_api.schemas import PlacementResult, Profile, Skill, SkillStatus
from darb_api.schemas.plan import Plan


class FakeTokenVerifier:
    """Maps known token strings to users; anything else is an invalid token."""

    def __init__(self, users: dict[str, AuthenticatedUser]) -> None:
        self._users = users

    def verify(self, id_token: str) -> AuthenticatedUser:
        try:
            return self._users[id_token]
        except KeyError as exc:
            raise InvalidTokenError from exc


class InMemoryUserRepository:
    def __init__(self) -> None:
        self.profiles: dict[str, Profile] = {}
        self.skills: dict[str, list[Skill]] = {}
        self.assessments: dict[tuple[str, str], StoredAssessment] = {}
        self.usage: dict[tuple[str, str], int] = {}
        self.plans: dict[tuple[str, str], Plan] = {}

    async def ensure_profile(
        self, profile: Profile, seed_skills: Sequence[NewSkill] = ()
    ) -> Profile:
        if profile.uid in self.profiles:
            return self.profiles[profile.uid]
        self.profiles[profile.uid] = profile
        for skill in seed_skills:
            await self.add_skill(profile.uid, skill)
        return profile

    async def add_skill(self, uid: str, skill: NewSkill) -> Skill:
        stored = Skill(
            id=f"skill-{sum(len(items) for items in self.skills.values()) + 1}",
            answers=skill.answers,
            status=skill.status,
            created_at=skill.created_at,
            placement=skill.placement,
        )
        self.skills.setdefault(uid, []).append(stored)
        if skill.plan:
            self.plans[(uid, stored.id)] = skill.plan.model_copy(update={"skill_id": stored.id})
        return stored

    async def get_skill(self, uid: str, skill_id: str) -> Skill | None:
        return next((s for s in self.skills.get(uid, []) if s.id == skill_id), None)

    async def get_assessment(self, uid: str, skill_id: str) -> StoredAssessment | None:
        return self.assessments.get((uid, skill_id))

    async def save_assessment(self, uid: str, skill_id: str, assessment: StoredAssessment) -> None:
        self.assessments[(uid, skill_id)] = assessment

    async def save_placement(self, uid: str, skill_id: str, result: PlacementResult) -> None:
        self.skills[uid] = [
            s.model_copy(update={"placement": result, "status": SkillStatus.ASSESSED})
            if s.id == skill_id
            else s
            for s in self.skills[uid]
        ]
        self.assessments.pop((uid, skill_id), None)

    async def count_ai_request(
        self, uid: str, day: str, user_limit: int, global_limit: int
    ) -> None:
        used_globally = sum(n for (_, d), n in self.usage.items() if d == day)
        check_allowance(self.usage.get((uid, day), 0), used_globally, user_limit, global_limit)
        self.usage[(uid, day)] = self.usage.get((uid, day), 0) + 1

    async def get_plan(self, uid: str, skill_id: str) -> Plan | None:
        return self.plans.get((uid, skill_id))

    async def save_plan(self, uid: str, plan: Plan) -> None:
        self.plans[(uid, plan.skill_id)] = plan


class ScriptedProvider:
    """Replies with the given strings in order; a ProviderError in the list is raised instead."""

    def __init__(self, name: str, replies: Sequence[str | ProviderError]) -> None:
        self.name = name
        self._replies = list(replies)
        self.requests: list[AiRequest] = []

    async def generate_json(self, request: AiRequest) -> str:
        self.requests.append(request)
        if not self._replies:
            raise ProviderError(self.name, FailureKind.TRANSIENT, "no scripted reply left")
        reply = self._replies.pop(0)
        if isinstance(reply, ProviderError):
            raise reply
        return reply
