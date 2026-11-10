"""Firestore storage for translated plan and lesson texts, at users/{uid}/translations/{id}. Each
text is translated once per language, however many times it is shown."""

from collections.abc import Mapping, Sequence

from google.cloud.firestore import AsyncClient, AsyncDocumentReference

from darb_api.domain.translation import cache_key
from darb_api.schemas import Language


class FirestoreTranslationStore:
    _db: AsyncClient

    def _translation(self, uid: str, language: Language, text: str) -> AsyncDocumentReference:
        reference: AsyncDocumentReference = (
            self._db.collection("users")
            .document(uid)
            .collection("translations")
            .document(cache_key(language, text))
        )
        return reference

    async def get_translations(
        self, uid: str, language: Language, texts: Sequence[str]
    ) -> dict[str, str]:
        found: dict[str, str] = {}
        references = [self._translation(uid, language, text) for text in texts]
        async for snapshot in self._db.get_all(references):
            data = snapshot.to_dict() if snapshot.exists else None
            if data and isinstance(data.get("source"), str) and isinstance(data.get("text"), str):
                found[data["source"]] = data["text"]
        return found

    async def save_translations(
        self, uid: str, language: Language, translations: Mapping[str, str]
    ) -> None:
        batch = self._db.batch()
        for source, text in translations.items():
            batch.set(self._translation(uid, language, source), {"source": source, "text": text})
        await batch.commit()
