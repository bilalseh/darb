"""Versioned prompt templates. Each file holds a [system] and a [user] section; `$name`
placeholders are filled with string.Template, so a missing value fails loudly."""

from dataclasses import dataclass
from importlib.resources import files
from string import Template

from darb_api.schemas.profile import Language

# Bump a version by adding a new file; the version used is stored with what it produced.
CURRENT_VERSIONS = {
    "placement_quiz": "v2",
    "assessment_review": "v2",
    "plan_outline": "v1",
    "plan_week": "v1",
    "lesson_content": "v1",
    "tutor": "v1",
    "module_quiz": "v2",
    "checkin": "v1",
    "translate": "v1",
}

# Tests are written in both languages at once, so switching language mid-test is instant.
BILINGUAL_TASKS = frozenset({"placement_quiz", "assessment_review", "module_quiz"})


@dataclass(frozen=True, slots=True)
class RenderedPrompt:
    task: str
    version: str
    system: str
    user: str


# Added to every system prompt, so each template stays language-neutral.
LANGUAGE_RULE = (
    "Write every text meant for the learner in $language. Keep JSON keys, enum values and "
    "anything the schema fixes exactly as specified."
)

# Used instead for the BILINGUAL_TASKS.
BILINGUAL_RULE = (
    'Write every text meant for the learner twice, as an object with "en" (English) and "ar" '
    "(Modern Standard Arabic) versions that say the same thing. Text that is itself the subject "
    "being learned, such as words in a language being studied, stays the same in both. Keep JSON "
    "keys, enum values and anything the schema fixes exactly as specified."
)


LANGUAGE_NAMES = {Language.EN: "English", Language.AR: "Modern Standard Arabic"}


def render(task: str, language: Language = Language.EN, **values: str) -> RenderedPrompt:
    version = CURRENT_VERSIONS[task]
    text = files(__package__).joinpath(f"{task}.{version}.txt").read_text(encoding="utf-8")
    system, separator, user = text.removeprefix("[system]\n").partition("\n[user]\n")
    if not separator:
        raise ValueError(f"{task}.{version} needs [system] and [user] sections")
    rule = BILINGUAL_RULE if task in BILINGUAL_TASKS else LANGUAGE_RULE
    return RenderedPrompt(
        task=task,
        version=version,
        system=Template(system.strip() + "\n\n" + rule).substitute(
            values, language=LANGUAGE_NAMES[language]
        ),
        user=Template(user.strip()).substitute(values),
    )
