"""Text the AI writes in both app languages at once, so switching language needs no new call."""

from typing import Annotated

from pydantic import AfterValidator, BeforeValidator, Field

from darb_api.schemas.base import ApiModel
from darb_api.schemas.profile import Language


class LocalizedText(ApiModel):
    """The same text in English and in Arabic."""

    en: str = Field(min_length=1)
    ar: str = Field(min_length=1)

    def in_language(self, language: Language) -> str:
        return self.ar if language is Language.AR else self.en


def lengths(min_length: int, max_length: int) -> AfterValidator:
    """For `Annotated[LocalizedText, lengths(5, 400)]`: each version must fit the lengths."""

    def _fits(text: LocalizedText) -> LocalizedText:
        for version in (text.en, text.ar):
            if not min_length <= len(version) <= max_length:
                raise ValueError(f"each version must be {min_length} to {max_length} characters")
        return text

    return AfterValidator(_fits)


def _from_plain(value: object) -> object:
    return {"en": value, "ar": value} if isinstance(value, str) else value


# Stored text that may predate bilingual content: a plain string is shown in both languages.
StoredText = Annotated[LocalizedText, BeforeValidator(_from_plain)]
