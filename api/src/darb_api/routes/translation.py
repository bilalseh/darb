"""Plans and lessons are written in one language; these translate them on demand when the learner
views them in the other. Each text is translated once and stored, so later views are free."""

import asyncio

from fastapi import APIRouter, HTTPException, status

from darb_api.ai.client import AiClient
from darb_api.ai.types import AiUnavailableError
from darb_api.auth import AuthenticatedUser, CurrentUser
from darb_api.config import Settings
from darb_api.dependencies import AiDep, Clock, ClockDep, RepositoryDep, SettingsDep
from darb_api.domain import translation as rules
from darb_api.prompts import render
from darb_api.repository import UserRepository
from darb_api.routes.common import metered_ai, require_skill
from darb_api.schemas import Language
from darb_api.schemas.translation import (
    TRANSLATION_BATCH,
    Translation,
    TranslationDraft,
    TranslationRequest,
)

router = APIRouter(tags=["translation"], prefix="/skills/{skill_id}")


async def _translate_batch(
    ai: AiClient, skill: str, language: Language, texts: list[str]
) -> dict[str, str]:
    prompt = render(
        "translate",
        language=language,
        skill=skill,
        texts=rules.numbered(texts),
        count=str(len(texts)),
    )
    result = await ai.generate(
        prompt.task,
        TranslationDraft,
        prompt.system,
        prompt.user,
        temperature=0.2,
        check=lambda draft: rules.count_problems(draft.texts, len(texts)),
    )
    return dict(zip(texts, result.value.texts, strict=True))


async def _translate(
    texts: list[str],
    language: Language,
    skill: str,
    user: AuthenticatedUser,
    repository: UserRepository,
    ai: AiClient,
    clock: Clock,
    settings: Settings,
) -> Translation:
    found = await repository.get_translations(user.uid, language, texts) if texts else {}
    missing = [text for text in texts if text not in found]
    if missing:
        # One request against the daily limit, however many batches a long plan needs.
        async with metered_ai(repository, user, clock, settings):
            outcomes = await asyncio.gather(
                *(
                    _translate_batch(ai, skill, language, batch)
                    for batch in rules.batches(missing, TRANSLATION_BATCH)
                ),
                return_exceptions=True,
            )
            translated: dict[str, str] = {}
            for outcome in outcomes:
                if isinstance(outcome, BaseException) and not isinstance(
                    outcome, AiUnavailableError
                ):
                    raise outcome
                if isinstance(outcome, dict):
                    translated.update(outcome)
            if translated:
                await repository.save_translations(user.uid, language, translated)
            if len(translated) < len(missing):
                # What did translate is kept, so a retry only asks for the rest.
                raise AiUnavailableError("translate")
        found.update(translated)
    return Translation(language=language, texts={text: found[text] for text in texts})


@router.post("/plan/translation")
async def translate_plan(
    skill_id: str,
    request: TranslationRequest,
    user: CurrentUser,
    repository: RepositoryDep,
    ai: AiDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> Translation:
    """The plan's texts in the requested language, for those written in the other one."""
    skill = await require_skill(repository, user.uid, skill_id)
    plan = await repository.get_plan(user.uid, skill_id)
    if plan is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No plan for this skill yet")
    texts = rules.plan_texts(plan, request.language)
    return await _translate(
        texts, request.language, skill.answers.skill, user, repository, ai, clock, settings
    )


@router.post("/lessons/{lesson_id}/translation")
async def translate_lesson(
    skill_id: str,
    lesson_id: str,
    request: TranslationRequest,
    user: CurrentUser,
    repository: RepositoryDep,
    ai: AiDep,
    clock: ClockDep,
    settings: SettingsDep,
) -> Translation:
    """The lesson's content and tutor replies in the requested language."""
    skill = await require_skill(repository, user.uid, skill_id)
    content = await repository.get_lesson_content(user.uid, skill_id, lesson_id)
    if content is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Open the lesson first")
    texts = rules.lesson_texts(content, request.language)
    return await _translate(
        texts, request.language, skill.answers.skill, user, repository, ai, clock, settings
    )
