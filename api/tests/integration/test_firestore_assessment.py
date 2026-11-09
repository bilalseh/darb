"""Runs against the Firestore emulator: `pnpm test:emulator` at the repo root."""

import asyncio
import os
import uuid
from collections.abc import AsyncIterator

import pytest
from google.cloud.firestore import AsyncClient

from darb_api.demo import demo_skills
from darb_api.domain.usage import UsageLimitError, UsageScope
from darb_api.repository import FirestoreUserRepository, RecordedAnswer, StoredAssessment
from darb_api.schemas import PlacementLevel, PlacementResult, SkillStatus, SubskillScore
from tests.conftest import NOW
from tests.quiz_factory import sample_quiz

pytestmark = [
    pytest.mark.anyio,
    pytest.mark.skipif(
        not os.environ.get("FIRESTORE_EMULATOR_HOST"), reason="needs the Firestore emulator"
    ),
]


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def repository() -> AsyncIterator[FirestoreUserRepository]:
    client = AsyncClient(project="demo-darb")
    yield FirestoreUserRepository(client)
    client.close()  # type: ignore[no-untyped-call]  # untyped in google-cloud-firestore


async def test_assessment_round_trip_and_placement(repository: FirestoreUserRepository) -> None:
    uid = f"user-{uuid.uuid4().hex}"
    [new_skill] = demo_skills(NOW)
    skill = await repository.add_skill(uid, new_skill)
    stored = StoredAssessment(
        quiz=sample_quiz(),
        answers=[RecordedAnswer(question_index=1, choice=0)],
        started_at=NOW,
        provider="fake",
        prompt_version="v1",
    )

    await repository.save_assessment(uid, skill.id, stored)
    assert await repository.get_assessment(uid, skill.id) == stored

    result = PlacementResult(
        level=PlacementLevel.INTERMEDIATE,
        summary="Solid foundations, keep practising the harder material.",
        subskills=[SubskillScore(name="Grammar", score=61)],
        completed_at=NOW,
    )
    await repository.save_placement(uid, skill.id, result)

    saved = await repository.get_skill(uid, skill.id)
    assert saved is not None
    assert saved.status is SkillStatus.ASSESSED
    assert saved.placement == result
    assert await repository.get_assessment(uid, skill.id) is None


async def test_ai_usage_stops_at_the_daily_limit(repository: FirestoreUserRepository) -> None:
    uid, day = f"user-{uuid.uuid4().hex}", f"test-{uuid.uuid4().hex[:8]}"
    for _ in range(3):
        await repository.count_ai_request(uid, day, 3, 100)

    with pytest.raises(UsageLimitError) as refused:
        await repository.count_ai_request(uid, day, 3, 100)

    assert refused.value.scope is UsageScope.USER


async def test_concurrent_ai_requests_are_all_counted(repository: FirestoreUserRepository) -> None:
    uid, day = f"user-{uuid.uuid4().hex}", f"test-{uuid.uuid4().hex[:8]}"

    await asyncio.gather(*(repository.count_ai_request(uid, day, 100, 100) for _ in range(5)))

    client = AsyncClient(project="demo-darb")
    snapshot = await client.document(f"users/{uid}/usage/{day}").get()
    global_snapshot = await client.document(f"aiUsage/{day}").get()
    client.close()  # type: ignore[no-untyped-call]  # untyped in google-cloud-firestore
    assert (snapshot.to_dict() or {})["aiRequests"] == 5
    assert (global_snapshot.to_dict() or {})["aiRequests"] == 5


async def test_deleting_a_user_erases_their_tree_and_answer_keys(
    repository: FirestoreUserRepository,
) -> None:
    from darb_api.demo import new_profile
    from darb_api.repository import StoredQuiz
    from tests.conftest import DEMO

    uid, other = f"user-{uuid.uuid4().hex}", f"user-{uuid.uuid4().hex}"
    profile = new_profile(DEMO, NOW).model_copy(update={"uid": uid})
    await repository.ensure_profile(profile, demo_skills(NOW))
    [skill] = await repository.list_skills(uid)
    quiz = StoredQuiz(
        skill_id=skill.id, module_index=0, title="Basics", questions=[], created_at=NOW
    )
    await repository.save_quiz(uid, quiz)
    await repository.save_quiz(other, quiz.model_copy(update={"skill_id": "theirs"}))

    await repository.delete_user_data(uid)

    assert await repository.list_skills(uid) == []
    assert await repository.get_plan(uid, skill.id) is None
    assert await repository.get_quiz(uid, skill.id, 0) is None
    assert await repository.get_quiz(other, "theirs", 0) is not None


async def test_tier_billing_refunds_and_expired_demos(
    repository: FirestoreUserRepository,
) -> None:
    from datetime import timedelta

    from darb_api.demo import new_profile
    from darb_api.repository import BillingRecord
    from darb_api.schemas import Language, Preferences, Tier
    from tests.conftest import DEMO

    uid = f"user-{uuid.uuid4().hex}"
    started = NOW - timedelta(days=400)  # older than any other test's demo profile
    profile = new_profile(DEMO, started).model_copy(update={"uid": uid})
    await repository.ensure_profile(profile)
    record = BillingRecord(customer_id="cus_1", subscription_id="sub_1")

    await repository.set_tier(uid, Tier.PRO, record)
    await repository.save_preferences(uid, Preferences(language=Language.AR))
    day = f"refund-{uuid.uuid4().hex}"
    await repository.count_ai_request(uid, day, 5, 1000)
    await repository.refund_ai_request(uid, day)

    stored = await repository.get_profile(uid)
    assert stored is not None
    assert (stored.tier, stored.preferences.language) == (Tier.PRO, Language.AR)
    assert await repository.get_billing(uid) == record
    assert await repository.ai_requests_on(uid, day) == 0
    expired = await repository.expired_demo_users(started + timedelta(seconds=1), 500)
    assert uid in expired

    await repository.delete_user_data(uid)
    assert await repository.get_billing(uid) is None
    assert await repository.get_profile(uid) is None
