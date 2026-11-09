from collections.abc import Sequence

from darb_api.auth import AuthenticatedUser, InvalidTokenError
from darb_api.repository import NewSkill
from darb_api.schemas import Profile, Skill


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
        )
        self.skills.setdefault(uid, []).append(stored)
        return stored
