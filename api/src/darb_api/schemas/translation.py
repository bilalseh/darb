from typing import Annotated

from pydantic import Field

from darb_api.schemas.base import ApiModel
from darb_api.schemas.profile import Language

TRANSLATION_BATCH = 40


class TranslationRequest(ApiModel):
    language: Language


class Translation(ApiModel):
    """A plan's or lesson's texts in `language`, keyed by the text as it was written. Texts
    already in that language are left out."""

    language: Language
    texts: dict[str, str]


class TranslationDraft(ApiModel):
    """The AI's translations, in the same order as the numbered texts it was given."""

    texts: list[Annotated[str, Field(max_length=4000)]] = Field(
        min_length=1, max_length=TRANSLATION_BATCH
    )
