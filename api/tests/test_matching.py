from darb_api.domain.matching import match_communities
from darb_api.schemas.assessment import PlacementLevel
from darb_api.schemas.onboarding import LearningStyle, SkillReason


def test_matches_follow_the_skill_and_explain_the_fit() -> None:
    matches = match_communities(
        "Spanish", PlacementLevel.ELEMENTARY, SkillReason.TRAVEL, LearningStyle.MIXED
    )

    names = [m.community.name for m in matches]
    assert names[0] == "Language exchange with Tandem"  # fits the travel goal and the style
    assert "r/Spanish" in names
    assert "fits your travel goal" in matches[0].reason


def test_level_specific_communities_rank_higher_for_that_level() -> None:
    matches = match_communities(
        "Python", PlacementLevel.BEGINNER, SkillReason.HOBBY, LearningStyle.READING
    )

    assert matches[0].community.name == "r/learnpython"
    assert "suits your level" in matches[0].reason


def test_an_unknown_skill_gets_general_suggestions() -> None:
    matches = match_communities("Beekeeping", None, SkillReason.HOBBY, LearningStyle.VIDEO)

    assert [m.community.name for m in matches] == ["r/GetStudying"]


def test_every_link_is_https() -> None:
    from darb_api.domain.matching import CATALOG, GENERAL

    assert all(c.url.startswith("https://") for c in (*CATALOG, *GENERAL))
