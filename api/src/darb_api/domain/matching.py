"""Community and practice suggestions from a curated list (no AI, so no invented links)."""

import re
from dataclasses import dataclass, field

from darb_api.schemas.assessment import PlacementLevel
from darb_api.schemas.onboarding import LearningStyle, SkillReason

ALL_LEVELS = frozenset(PlacementLevel)


@dataclass(frozen=True, slots=True)
class Community:
    name: str
    url: str
    kind: str  # "community", "forum", "chat" or "practice"
    topics: frozenset[str]
    why: str
    levels: frozenset[PlacementLevel] = ALL_LEVELS
    reasons: frozenset[SkillReason] = field(default_factory=frozenset)
    styles: frozenset[LearningStyle] = field(default_factory=frozenset)


def _c(
    name: str,
    url: str,
    kind: str,
    topics: str,
    why: str,
    *,
    levels: frozenset[PlacementLevel] = ALL_LEVELS,
    reasons: frozenset[SkillReason] = frozenset(),
    styles: frozenset[LearningStyle] = frozenset(),
) -> Community:
    return Community(name, url, kind, frozenset(topics.split()), why, levels, reasons, styles)


BEGINNERS = frozenset({PlacementLevel.BEGINNER, PlacementLevel.ELEMENTARY})
PRACTICE = frozenset({LearningStyle.PRACTICE, LearningStyle.MIXED})

CATALOG: tuple[Community, ...] = (
    _c(
        "r/languagelearning",
        "https://www.reddit.com/r/languagelearning/",
        "community",
        "language spanish french german english italian japanese korean chinese arabic portuguese",
        "a large, friendly community for any language, with study tips and methods",
    ),
    _c(
        "r/Spanish",
        "https://www.reddit.com/r/Spanish/",
        "community",
        "spanish",
        "questions about Spanish answered by learners and native speakers",
    ),
    _c(
        "r/French",
        "https://www.reddit.com/r/French/",
        "community",
        "french",
        "questions about French answered by learners and native speakers",
    ),
    _c(
        "Language exchange with Tandem",
        "https://www.tandem.net/",
        "practice",
        "language spanish french german english italian japanese korean chinese arabic portuguese",
        "trade conversation practice with native speakers, which suits a travel goal",
        reasons=frozenset({SkillReason.TRAVEL, SkillReason.PERSONAL}),
        styles=PRACTICE,
    ),
    _c(
        "r/learnpython",
        "https://www.reddit.com/r/learnpython/",
        "community",
        "python programming coding",
        "a patient community that welcomes beginner Python questions",
        levels=BEGINNERS,
    ),
    _c(
        "Python Discord",
        "https://www.pythondiscord.com/",
        "chat",
        "python programming coding",
        "live help channels and study groups for Python learners",
    ),
    _c(
        "freeCodeCamp forum",
        "https://forum.freecodecamp.org/",
        "forum",
        "javascript web html css programming coding python",
        "help with exercises and projects from a large learner community",
    ),
    _c(
        "Exercism",
        "https://exercism.org/",
        "practice",
        "python javascript programming coding",
        "free coding exercises with mentor feedback",
        styles=PRACTICE,
    ),
    _c(
        "r/learnprogramming",
        "https://www.reddit.com/r/learnprogramming/",
        "community",
        "programming coding javascript python web",
        "advice on learning paths and career questions for new programmers",
        reasons=frozenset({SkillReason.CAREER, SkillReason.SCHOOL}),
    ),
    _c(
        "r/guitarlessons",
        "https://www.reddit.com/r/guitarlessons/",
        "community",
        "guitar",
        "technique questions and practice routines for guitar learners",
    ),
    _c(
        "r/piano",
        "https://www.reddit.com/r/piano/",
        "community",
        "piano",
        "practice advice and repertoire ideas from pianists of every level",
    ),
    _c(
        "r/Cooking",
        "https://www.reddit.com/r/Cooking/",
        "community",
        "cooking baking",
        "everyday cooking questions, recipes and technique tips",
    ),
    _c(
        "Toastmasters",
        "https://www.toastmasters.org/",
        "practice",
        "public speaking presentation",
        "local clubs where you practise speeches and get supportive feedback",
        styles=PRACTICE,
    ),
    _c(
        "r/PublicSpeaking",
        "https://www.reddit.com/r/PublicSpeaking/",
        "community",
        "public speaking presentation",
        "tips and encouragement for nervous speakers",
    ),
    _c(
        "r/excel",
        "https://www.reddit.com/r/excel/",
        "forum",
        "excel spreadsheets",
        "post a spreadsheet problem and get formula help from experts",
    ),
    _c(
        "r/photography",
        "https://www.reddit.com/r/photography/",
        "community",
        "photography camera",
        "gear, technique and critique threads for photographers",
    ),
    _c(
        "r/learnart",
        "https://www.reddit.com/r/learnart/",
        "community",
        "drawing painting art sketching",
        "share drawings and get constructive feedback",
    ),
    _c(
        "r/chess",
        "https://www.reddit.com/r/chess/",
        "community",
        "chess",
        "analysis, puzzles and study advice from chess players",
    ),
    _c(
        "Lichess",
        "https://lichess.org/",
        "practice",
        "chess",
        "free games, puzzles and lessons to practise every day",
        styles=PRACTICE,
    ),
)

GENERAL = (
    _c(
        "r/GetStudying",
        "https://www.reddit.com/r/GetStudying/",
        "community",
        "",
        "study habits and motivation for any subject",
    ),
)


@dataclass(frozen=True, slots=True)
class Match:
    community: Community
    reason: str


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z]+", text.casefold()))


def match_communities(
    skill: str,
    level: PlacementLevel | None,
    reason: SkillReason,
    style: LearningStyle,
    limit: int = 4,
) -> list[Match]:
    """Communities about this skill, best fit first, each with a one-line reason."""
    words = _tokens(skill)
    scored: list[tuple[int, int, Match]] = []
    for position, community in enumerate(CATALOG):
        topic_hits = len(words & community.topics)
        if not topic_hits:
            continue
        score = topic_hits * 10
        fits = []
        if level is not None and level in community.levels and community.levels != ALL_LEVELS:
            score += 3
            fits.append("suits your level")
        if reason in community.reasons:
            score += 2
            fits.append(f"fits your {reason.value} goal")
        if style in community.styles:
            score += 2
            fits.append("matches how you like to learn")
        extra = f" ({', '.join(fits)})" if fits else ""
        line = f"{community.why[0].upper()}{community.why[1:]}{extra}."
        scored.append((-score, position, Match(community, line)))
    matches = [match for _, _, match in sorted(scored)][:limit]
    if not matches:
        matches = [Match(c, f"{c.why[0].upper()}{c.why[1:]}.") for c in GENERAL]
    return matches
