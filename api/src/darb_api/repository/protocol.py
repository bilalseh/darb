"""The storage boundary: routes depend on this protocol, never on Firestore directly."""

from collections.abc import Sequence
from typing import Protocol

from darb_api.repository.records import DayActivity, NewSkill, StoredAssessment
from darb_api.schemas import PlacementResult, Profile, Skill
from darb_api.schemas.lesson import LessonContent
from darb_api.schemas.plan import Plan


class UserRepository(Protocol):
    async def ensure_profile(
        self,
        profile: Profile,
        seed_skills: Sequence[NewSkill] = (),
        seed_activity: Sequence[DayActivity] = (),
    ) -> Profile:
        """Create the profile with its seed skills and activity, atomically, if it does not exist
        yet. Returns the stored profile, which may be an older one."""
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

    async def get_plan(self, uid: str, skill_id: str) -> Plan | None: ...

    async def save_plan(self, uid: str, plan: Plan) -> None: ...

    async def get_lesson_content(
        self, uid: str, skill_id: str, lesson_id: str
    ) -> LessonContent | None: ...

    async def save_lesson_content(self, uid: str, content: LessonContent) -> None: ...

    async def record_activity(self, uid: str, day: str, minutes: int) -> None:
        """Count one finished lesson (and its minutes) on a calendar day."""
        ...

    async def list_activity(self, uid: str) -> list[DayActivity]: ...
