"""Which plan and lesson texts need translating into a language, and how they are batched."""

import hashlib
import json
from collections.abc import Iterable, Sequence

from darb_api.schemas.lesson import LessonContent, TutorRole
from darb_api.schemas.plan import Plan
from darb_api.schemas.profile import Language


def _unique(texts: Iterable[str]) -> list[str]:
    return list(dict.fromkeys(text for text in texts if text.strip()))


def plan_texts(plan: Plan, target: Language) -> list[str]:
    """The plan's texts written in another language. Rewritten weeks and lessons carry the
    language they were written in, so a plan can mix both."""
    texts: list[str] = []
    if plan.language is not target:
        texts += [text for module in plan.modules for text in (module.title, module.summary)]
    for week in plan.weeks:
        if week.language is not target:
            texts.append(week.goal)
        for lesson in week.lessons:
            if lesson.language is not target:
                texts += [lesson.title, lesson.objective]
    return _unique(texts)


def lesson_texts(content: LessonContent, target: Language) -> list[str]:
    """The lesson's written content and tutor replies in another language. The learner's own
    messages stay as they wrote them."""
    texts: list[str] = []
    if content.language is not target:
        texts += [content.explanation, content.exercise]
        texts += [resource.title for resource in content.resources]
    texts += [
        message.text
        for message in content.tutor
        if message.role is TutorRole.TUTOR and message.language is not target
    ]
    return _unique(texts)


def cache_key(language: Language, text: str) -> str:
    return f"{language.value}_{hashlib.sha256(text.encode()).hexdigest()[:40]}"


def batches(texts: Sequence[str], size: int) -> list[list[str]]:
    return [list(texts[start : start + size]) for start in range(0, len(texts), size)]


def numbered(texts: Sequence[str]) -> str:
    """One JSON string per line, so line breaks inside a text cannot blur the numbering."""
    return "\n".join(
        f"{n}. {json.dumps(text, ensure_ascii=False)}" for n, text in enumerate(texts, 1)
    )


def count_problems(texts: Sequence[str], expected: int) -> list[str]:
    if len(texts) != expected:
        return [f"texts must hold exactly {expected} translations, one per numbered text"]
    if any(not text.strip() for text in texts):
        return ["every translation must be non-empty"]
    return []
