"""Storage boundary for user data. Routes depend on the protocol; Firestore implements it."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Protocol

from google.api_core.exceptions import Aborted, AlreadyExists
from google.cloud.firestore import AsyncClient, AsyncDocumentReference, Increment

from darb_api.domain.assessment import Answer
from darb_api.domain.usage import check_allowance
from darb_api.schemas import OnboardingAnswers, PlacementResult, Profile, Skill, SkillStatus
from darb_api.schemas.assessment import PlacementQuiz
from darb_api.schemas.base import ApiModel

# A failed create means another request won the race (or Firestore aborted on contention);
# either way nothing was written, so re-reading and trying again is safe.
_ENSURE_PROFILE_ATTEMPTS = 3


@dataclass(frozen=True, slots=True)
class NewSkill:
    answers: OnboardingAnswers
    status: SkillStatus
    created_at: datetime
    placement: PlacementResult | None = None


class RecordedAnswer(ApiModel):
    question_index: int
    choice: int | None = None
    text: str | None = None
    confidence: int | None = None

    def to_domain(self) -> Answer:
        return Answer(self.question_index, self.choice, self.text, self.confidence)


class StoredAssessment(ApiModel):
    """A placement quiz in progress, answer key included. Kept outside users/{uid} so that the
    security rules never let the browser read it."""

    quiz: PlacementQuiz
    answers: list[RecordedAnswer]
    started_at: datetime
    provider: str
    prompt_version: str

    def domain_answers(self) -> list[Answer]:
        return [answer.to_domain() for answer in self.answers]


class UserRepository(Protocol):
    async def ensure_profile(
        self, profile: Profile, seed_skills: Sequence[NewSkill] = ()
    ) -> Profile:
        """Create the profile and its seed skills atomically if the profile does not exist yet.
        Returns the stored profile, which may be an older one."""
        ...

    async def add_skill(self, uid: str, skill: NewSkill) -> Skill: ...

    async def get_skill(self, uid: str, skill_id: str) -> Skill | None: ...

    async def get_assessment(self, uid: str, skill_id: str) -> StoredAssessment | None: ...

    async def save_assessment(
        self, uid: str, skill_id: str, assessment: StoredAssessment
    ) -> None: ...

    async def save_placement(self, uid: str, skill_id: str, result: PlacementResult) -> None:
        """Store the result on the skill and discard the answer key, in one write."""
        ...

    async def count_ai_request(
        self, uid: str, day: str, user_limit: int, global_limit: int
    ) -> None:
        """Count one AI request, or raise UsageLimitError if a daily limit is already reached."""
        ...


def _skill_document(skill: NewSkill) -> dict[str, Any]:
    document: dict[str, Any] = {
        "answers": skill.answers.model_dump(mode="json"),
        "status": skill.status.value,
        "createdAt": skill.created_at,
    }
    if skill.placement:
        document["placement"] = skill.placement.model_dump(mode="json")
    return document


def _used(snapshot: Any) -> int:
    return int((snapshot.to_dict() or {}).get("aiRequests", 0))


class FirestoreUserRepository:
    def __init__(self, client: AsyncClient) -> None:
        self._db = client

    def _user(self, uid: str) -> AsyncDocumentReference:
        return self._db.collection("users").document(uid)

    def _assessment_key(self, uid: str, skill_id: str) -> AsyncDocumentReference:
        return self._db.collection("assessmentKeys").document(f"{uid}__{skill_id}")

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
            placement=skill.placement,
        )

    async def get_skill(self, uid: str, skill_id: str) -> Skill | None:
        snapshot = await self._user(uid).collection("skills").document(skill_id).get()
        if not snapshot.exists:
            return None
        return Skill.model_validate({"id": skill_id, **(snapshot.to_dict() or {})})

    async def get_assessment(self, uid: str, skill_id: str) -> StoredAssessment | None:
        snapshot = await self._assessment_key(uid, skill_id).get()
        if not snapshot.exists:
            return None
        return StoredAssessment.model_validate(snapshot.to_dict() or {})

    async def save_assessment(self, uid: str, skill_id: str, assessment: StoredAssessment) -> None:
        await self._assessment_key(uid, skill_id).set(assessment.model_dump(mode="json"))

    async def save_placement(self, uid: str, skill_id: str, result: PlacementResult) -> None:
        batch = self._db.batch()
        batch.update(
            self._user(uid).collection("skills").document(skill_id),
            {"placement": result.model_dump(mode="json"), "status": SkillStatus.ASSESSED.value},
        )
        batch.delete(self._assessment_key(uid, skill_id))
        await batch.commit()

    async def count_ai_request(
        self, uid: str, day: str, user_limit: int, global_limit: int
    ) -> None:
        # Soft limits: read, check, then atomic increments. A transaction would make every user
        # contend on the one global document; this way concurrent requests can overshoot a daily
        # limit by a request or two, but no count is ever lost.
        user_ref = self._user(uid).collection("usage").document(day)
        global_ref = self._db.collection("aiUsage").document(day)
        user_snapshot, global_snapshot = await user_ref.get(), await global_ref.get()
        check_allowance(_used(user_snapshot), _used(global_snapshot), user_limit, global_limit)
        batch = self._db.batch()
        batch.set(user_ref, {"aiRequests": Increment(1)}, merge=True)
        batch.set(global_ref, {"aiRequests": Increment(1)}, merge=True)
        await batch.commit()
