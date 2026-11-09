"""A deterministic provider for local development and E2E tests: no keys, no network."""

import json
import re

from darb_api.ai.types import AiRequest, FailureKind, ProviderError

_SHORT_ANSWER_ID = re.compile(r"^\s*-\s*id:\s*(q\d+)\s*\(short answer\)", re.MULTILINE)
_WEEKS = re.compile(r"^- Weeks: (\d+)$", re.MULTILINE)
_REMAINING = re.compile(r"add up to\s+roughly (\d+)")
_MINUTES = re.compile(r"^- Minutes per week: (\d+)$", re.MULTILINE)


def _number(pattern: re.Pattern[str], text: str, default: int) -> int:
    match = pattern.search(text)
    return int(match.group(1)) if match else default


def _week(number: int, minutes: int) -> dict[str, object]:
    each = max(10, min(90, minutes // 3))
    kinds = ["learn", "practice", "review"]
    return {
        "goal": f"Build steady progress in week {number} with focused practice.",
        "lessons": [
            {
                "title": f"Week {number}: {kind} session",
                "objective": f"Complete a focused {kind} session for this week's goal.",
                "minutes": each,
                "kind": kind,
            }
            for kind in kinds
        ],
    }


def _plan(weeks: int, minutes: int) -> dict[str, object]:
    first = (weeks + 1) // 2
    sizes = [size for size in (first, weeks - first) if size]
    modules = []
    start = 1
    for index, size in enumerate(sizes, start=1):
        modules.append(
            {
                "title": f"Module {index}",
                "summary": f"Module {index} builds the skills needed for the next stage.",
                "weeks": [_week(start + offset, minutes) for offset in range(size)],
            }
        )
        start += size
    return {"modules": modules}


def _mc(prompt: str, subskill: str, difficulty: int) -> dict[str, object]:
    return {
        "kind": "multiple_choice",
        "prompt": prompt,
        "subskill": subskill,
        "difficulty": difficulty,
        "options": ["The first option", "The second option", "The third option"],
        "correctOption": 0,
        "referenceAnswer": None,
    }


def _quiz() -> dict[str, object]:
    return {
        "subskills": ["Foundations", "Technique", "Application"],
        "questions": [
            _mc("Which option describes the very first step?", "Foundations", 1),
            {
                "kind": "confidence",
                "prompt": "I can explain the basic terms to a friend.",
                "subskill": "Foundations",
                "difficulty": 1,
                "options": [],
                "correctOption": None,
                "referenceAnswer": None,
            },
            _mc("Which option is the common beginner mistake?", "Technique", 2),
            {
                "kind": "short_answer",
                "prompt": "In one or two sentences, how would you practise this week?",
                "subskill": "Application",
                "difficulty": 2,
                "options": [],
                "correctOption": None,
                "referenceAnswer": "A short, regular practice routine with a clear goal.",
            },
            _mc("Which option fits an intermediate situation?", "Technique", 3),
            _mc("Which option solves the tricky case?", "Application", 4),
            _mc("Which option would an expert choose?", "Foundations", 5),
        ],
    }


class FakeProvider:
    name = "fake"

    async def generate_json(self, request: AiRequest) -> str:
        if request.task == "placement_quiz":
            return json.dumps(_quiz())
        if request.task == "assessment_review":
            grades = [
                {"questionId": question_id, "score": 0.6}
                for question_id in _SHORT_ANSWER_ID.findall(request.prompt)
            ]
            summary = (
                "You have a solid grip on the basics. The next step is regular, focused "
                "practice on the harder techniques."
            )
            return json.dumps({"grades": grades, "summary": summary})
        if request.task == "plan_outline":
            weeks = _number(_WEEKS, request.prompt, 4)
            return json.dumps(_plan(weeks, _number(_MINUTES, request.prompt, 180)))
        if request.task == "plan_week":
            return json.dumps(_week(0, _number(_REMAINING, request.prompt, 180)))
        raise ProviderError(self.name, FailureKind.REJECTED, f"unknown task {request.task}")
