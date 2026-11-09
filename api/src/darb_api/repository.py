"""Storage boundary for user data. Routes depend on the protocol; Firestore implements it."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol

from google.api_core.exceptions import Aborted, AlreadyExists
from google.cloud.firestore import AsyncClient, AsyncDocumentReference

from darb_api.schemas import OnboardingAnswers, Profile, Skill, SkillStatus

# A failed create means another request won the race (or Firestore aborted on contention);
# either way nothing was written, so re-reading and trying again is safe.
_ENSURE_PROFILE_ATTEMPTS = 3


@dataclass(frozen=True, slots=True)
class NewSkill:
    answers: OnboardingAnswers
    status: SkillStatus
    created_at: datetime


class UserRepository(Protocol):
    async def ensure_profile(
        self, profile: Profile, seed_skills: Sequence[NewSkill] = ()
    ) -> Profile:
        """Create the profile and its seed skills atomically if the profile does not exist yet.
        Returns the stored profile, which may be an older one."""
        ...

    async def add_skill(self, uid: str, skill: NewSkill) -> Skill: ...


def _skill_document(skill: NewSkill) -> dict[str, Any]:
    return {
        "answers": skill.answers.model_dump(mode="json"),
        "status": skill.status.value,
        "createdAt": skill.created_at,
    }


class FirestoreUserRepository:
    def __init__(self, client: AsyncClient) -> None:
        self._db = client

    def _user(self, uid: str) -> AsyncDocumentReference:
        return self._db.collection("users").document(uid)

    async def ensure_profile(
        self, profile: Profile, seed_skills: Sequence[NewSkill] = ()
    ) -> Profile:
        user_ref = self._user(profile.uid)
        for attempt in range(1, _ENSURE_PROFILE_ATTEMPTS + 1):
            snapshot = await user_ref.get()
            if snapshot.exists:
                return Profile.model_validate({"uid": profile.uid, **(snapshot.to_dict() or {})})
            batch = self._db.batch()
            batch.create(user_ref, profile.model_dump(exclude={"uid"}))
            for skill in seed_skills:
                batch.create(user_ref.collection("skills").document(), _skill_document(skill))
            try:
                await batch.commit()
            except (AlreadyExists, Aborted):
                if attempt == _ENSURE_PROFILE_ATTEMPTS:
                    raise
                continue
            return profile
        raise AssertionError("unreachable")

    async def add_skill(self, uid: str, skill: NewSkill) -> Skill:
        skill_ref = self._user(uid).collection("skills").document()
        await skill_ref.create(_skill_document(skill))
        return Skill(
            id=skill_ref.id,
            answers=skill.answers,
            status=skill.status,
            created_at=skill.created_at,
        )
