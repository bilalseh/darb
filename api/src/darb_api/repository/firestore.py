"""Firestore implementation of the storage boundary."""

from collections.abc import Sequence
from typing import Any

from google.api_core.exceptions import Aborted, AlreadyExists
from google.cloud.firestore import AsyncClient, AsyncDocumentReference, Increment

from darb_api.domain.usage import check_allowance
from darb_api.repository.records import DayActivity, NewSkill, StoredAssessment, StoredQuiz
from darb_api.schemas import PlacementResult, Profile, Skill, SkillStatus
from darb_api.schemas.lesson import LessonContent
from darb_api.schemas.plan import Plan
from darb_api.schemas.quiz import QuizResult, ReviewItem

# A failed create means another request won the race (or Firestore aborted on contention);
# either way nothing was written, so re-reading and trying again is safe.
_ENSURE_PROFILE_ATTEMPTS = 3


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
        self,
        profile: Profile,
        seed_skills: Sequence[NewSkill] = (),
        seed_activity: Sequence[DayActivity] = (),
    ) -> Profile:
        user_ref = self._user(profile.uid)
        for attempt in range(1, _ENSURE_PROFILE_ATTEMPTS + 1):
            snapshot = await user_ref.get()
            if snapshot.exists:
                return Profile.model_validate({"uid": profile.uid, **(snapshot.to_dict() or {})})
            batch = self._db.batch()
            batch.create(user_ref, profile.model_dump(exclude={"uid"}))
            for skill in seed_skills:
                skill_ref = user_ref.collection("skills").document()
                batch.create(skill_ref, _skill_document(skill))
                if skill.plan:
                    plan = skill.plan.model_copy(update={"skill_id": skill_ref.id})
                    batch.create(
                        self._plan(profile.uid, skill_ref.id), plan.model_dump(mode="json")
                    )
                for item in skill.reviews:
                    card = item.model_copy(update={"skill_id": skill_ref.id})
                    batch.create(
                        user_ref.collection("reviews").document(card.id),
                        card.model_dump(mode="json"),
                    )
            for activity in seed_activity:
                batch.create(
                    user_ref.collection("activity").document(activity.day),
                    {"lessons": activity.lessons, "minutes": activity.minutes},
                )
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

    def _plan(self, uid: str, skill_id: str) -> AsyncDocumentReference:
        reference: AsyncDocumentReference = self._user(uid).collection("plans").document(skill_id)
        return reference

    async def get_plan(self, uid: str, skill_id: str) -> Plan | None:
        snapshot = await self._plan(uid, skill_id).get()
        if not snapshot.exists:
            return None
        return Plan.model_validate(snapshot.to_dict() or {})

    async def save_plan(self, uid: str, plan: Plan) -> None:
        await self._plan(uid, plan.skill_id).set(plan.model_dump(mode="json"))

    def _lesson(self, uid: str, skill_id: str, lesson_id: str) -> AsyncDocumentReference:
        reference: AsyncDocumentReference = (
            self._user(uid).collection("lessons").document(f"{skill_id}__{lesson_id}")
        )
        return reference

    async def get_lesson_content(
        self, uid: str, skill_id: str, lesson_id: str
    ) -> LessonContent | None:
        snapshot = await self._lesson(uid, skill_id, lesson_id).get()
        if not snapshot.exists:
            return None
        return LessonContent.model_validate(snapshot.to_dict() or {})

    async def save_lesson_content(self, uid: str, content: LessonContent) -> None:
        reference = self._lesson(uid, content.skill_id, content.lesson_id)
        await reference.set(content.model_dump(mode="json"))

    async def record_activity(self, uid: str, day: str, minutes: int) -> None:
        await (
            self._user(uid)
            .collection("activity")
            .document(day)
            .set({"lessons": Increment(1), "minutes": Increment(minutes)}, merge=True)
        )

    async def list_activity(self, uid: str) -> list[DayActivity]:
        days = []
        async for snapshot in self._user(uid).collection("activity").stream():
            data = snapshot.to_dict() or {}
            days.append(
                DayActivity(
                    snapshot.id,
                    int(data.get("lessons", 0)),
                    int(data.get("minutes", 0)),
                    int(data.get("reviews", 0)),
                )
            )
        return days

    def _quiz_key(self, uid: str, skill_id: str, module_index: int) -> AsyncDocumentReference:
        reference: AsyncDocumentReference = self._db.collection("quizKeys").document(
            f"{uid}__{skill_id}__{module_index}"
        )
        return reference

    async def get_quiz(self, uid: str, skill_id: str, module_index: int) -> StoredQuiz | None:
        snapshot = await self._quiz_key(uid, skill_id, module_index).get()
        return StoredQuiz.model_validate(snapshot.to_dict() or {}) if snapshot.exists else None

    async def save_quiz(self, uid: str, quiz: StoredQuiz) -> None:
        reference = self._quiz_key(uid, quiz.skill_id, quiz.module_index)
        await reference.set(quiz.model_dump(mode="json"))

    async def finish_quiz(
        self, uid: str, result: QuizResult, reviews: Sequence[ReviewItem]
    ) -> None:
        batch = self._db.batch()
        result_id = f"{result.skill_id}__{result.module_index}"
        batch.set(
            self._user(uid).collection("quizResults").document(result_id),
            result.model_dump(mode="json"),
        )
        for item in reviews:
            batch.set(
                self._user(uid).collection("reviews").document(item.id),
                item.model_dump(mode="json"),
            )
        batch.delete(self._quiz_key(uid, result.skill_id, result.module_index))
        await batch.commit()

    async def get_review(self, uid: str, review_id: str) -> ReviewItem | None:
        snapshot = await self._user(uid).collection("reviews").document(review_id).get()
        return ReviewItem.model_validate(snapshot.to_dict() or {}) if snapshot.exists else None

    async def save_review(self, uid: str, item: ReviewItem) -> None:
        reference = self._user(uid).collection("reviews").document(item.id)
        await reference.set(item.model_dump(mode="json"))

    async def record_review(self, uid: str, day: str) -> None:
        await (
            self._user(uid)
            .collection("activity")
            .document(day)
            .set({"reviews": Increment(1)}, merge=True)
        )
