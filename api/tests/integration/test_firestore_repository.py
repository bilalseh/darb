"""Runs against the Firestore emulator: `pnpm test:emulator` at the repo root."""

import asyncio
import os
import uuid
from collections.abc import AsyncIterator
from datetime import UTC, datetime

import pytest
from google.cloud.firestore import AsyncClient

from darb_api.demo import demo_skills, new_profile
from darb_api.repository import FirestoreUserRepository
from tests.conftest import DEMO, NOW

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
async def client() -> AsyncIterator[AsyncClient]:
    firestore = AsyncClient(project="demo-darb")
    yield firestore
    firestore.close()  # type: ignore[no-untyped-call]  # untyped in google-cloud-firestore


async def test_demo_profile_and_seed_are_written_once(client: AsyncClient) -> None:
    repository = FirestoreUserRepository(client)
    profile = new_profile(DEMO, NOW).model_copy(update={"uid": f"demo-{uuid.uuid4().hex}"})

    results = await asyncio.gather(
        *(repository.ensure_profile(profile, demo_skills(NOW)) for _ in range(3))
    )

    assert all(result == profile for result in results)
    skills = [doc async for doc in client.collection(f"users/{profile.uid}/skills").stream()]
    assert len(skills) == 1
    stored = (await client.document(f"users/{profile.uid}").get()).to_dict() or {}
    assert stored["isDemo"] is True
    assert "uid" not in stored


async def test_existing_profile_is_returned_unchanged(client: AsyncClient) -> None:
    repository = FirestoreUserRepository(client)
    original = new_profile(DEMO, NOW).model_copy(update={"uid": f"demo-{uuid.uuid4().hex}"})
    await repository.ensure_profile(original)

    later = original.model_copy(update={"created_at": datetime(2027, 1, 1, tzinfo=UTC)})
    assert await repository.ensure_profile(later) == original


async def test_skills_are_stored_in_camel_case(client: AsyncClient) -> None:
    repository = FirestoreUserRepository(client)
    uid = f"user-{uuid.uuid4().hex}"
    [new_skill] = demo_skills(NOW)
    assert new_skill.answers.target_date is not None

    skill = await repository.add_skill(uid, new_skill)

    stored = (await client.document(f"users/{uid}/skills/{skill.id}").get()).to_dict() or {}
    assert stored["answers"]["hoursPerWeek"] == 4
    assert stored["answers"]["targetDate"] == new_skill.answers.target_date.isoformat()
    assert stored["createdAt"] == new_skill.created_at
    assert stored["status"] == "onboarded"
