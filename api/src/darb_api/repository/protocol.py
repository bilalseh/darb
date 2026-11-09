"""The storage boundary: routes depend on this protocol, never on Firestore directly."""

from collections.abc import Sequence
from datetime import datetime
from typing import Protocol

from darb_api.repository.records import (
    BillingRecord,
    DayActivity,
    NewSkill,
    StoredAssessment,
    StoredQuiz,
)
from darb_api.schemas import PlacementResult, Preferences, Profile, Skill, Tier
from darb_api.schemas.checkin import Checkin
from darb_api.schemas.lesson import LessonContent
from darb_api.schemas.plan import Plan
from darb_api.schemas.quiz import QuizResult, ReviewItem


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

    async def get_profile(self, uid: str) -> Profile | None: ...

    async def save_preferences(self, uid: str, preferences: Preferences) -> None: ...

    async def set_tier(self, uid: str, tier: Tier, billing: BillingRecord | None) -> None:
        """Change the user's plan and keep (or, with None, drop) their billing record."""
        ...

    async def get_billing(self, uid: str) -> BillingRecord | None: ...

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

    async def refund_ai_request(self, uid: str, day: str) -> None:
        """Give back a counted request whose AI call failed."""
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

    async def get_quiz(self, uid: str, skill_id: str, module_index: int) -> StoredQuiz | None: ...

    async def save_quiz(self, uid: str, quiz: StoredQuiz) -> None: ...

    async def finish_quiz(
        self, uid: str, result: QuizResult, reviews: Sequence[ReviewItem]
    ) -> None:
        """Store the result and new review cards and drop the answer key, in one write."""
        ...

    async def get_review(self, uid: str, review_id: str) -> ReviewItem | None: ...

    async def save_review(self, uid: str, item: ReviewItem) -> None: ...

    async def record_review(self, uid: str, day: str) -> None:
        """Count one answered review card on a calendar day."""
        ...

    async def list_skills(self, uid: str) -> list[Skill]: ...

    async def add_checkin(self, uid: str, checkin: Checkin) -> None: ...

    async def list_quiz_results(self, uid: str) -> list[QuizResult]: ...

    async def ai_requests_on(self, uid: str, day: str) -> int: ...

    async def expired_demo_users(self, created_before: datetime, limit: int) -> list[str]:
        """Demo accounts whose profile was created before the cutoff, oldest first."""
        ...

    async def delete_user_data(self, uid: str) -> None:
        """Erase everything the user owns, including server-only answer keys."""
        ...
