"""Versioned prompt templates. Each file holds a [system] and a [user] section; `$name`
placeholders are filled with string.Template, so a missing value fails loudly."""

from dataclasses import dataclass
from importlib.resources import files
from string import Template

# Bump a version by adding a new file; the version used is stored with what it produced.
CURRENT_VERSIONS = {
    "placement_quiz": "v1",
    "assessment_review": "v1",
    "plan_outline": "v1",
    "plan_week": "v1",
    "lesson_content": "v1",
    "tutor": "v1",
    "module_quiz": "v1",
    "checkin": "v1",
}


@dataclass(frozen=True, slots=True)
class RenderedPrompt:
    task: str
    version: str
    system: str
    user: str


def render(task: str, **values: str) -> RenderedPrompt:
    version = CURRENT_VERSIONS[task]
    text = files(__package__).joinpath(f"{task}.{version}.txt").read_text(encoding="utf-8")
    system, separator, user = text.removeprefix("[system]\n").partition("\n[user]\n")
    if not separator:
        raise ValueError(f"{task}.{version} needs [system] and [user] sections")
    return RenderedPrompt(
        task=task,
        version=version,
        system=Template(system.strip()).substitute(values),
        user=Template(user.strip()).substitute(values),
    )
