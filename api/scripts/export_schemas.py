"""Export PUBLIC_MODELS as JSON Schema into shared/schemas (run via `pnpm gen:schemas`)."""

import json
from pathlib import Path

from pydantic.json_schema import GenerateJsonSchema

from darb_api.schemas import PUBLIC_MODELS

SCHEMA_DIR = Path(__file__).resolve().parents[2] / "shared" / "schemas"


class WithoutFieldTitles(GenerateJsonSchema):
    """Field titles would become standalone TS aliases (`Status`, `Version`) that collide
    across models, so only model titles are kept."""

    def field_title_should_be_set(self, schema: object) -> bool:
        return False


def main() -> None:
    SCHEMA_DIR.mkdir(parents=True, exist_ok=True)
    written: set[str] = set()
    for model in PUBLIC_MODELS:
        path = SCHEMA_DIR / f"{model.__name__}.json"
        schema = model.model_json_schema(mode="serialization", schema_generator=WithoutFieldTitles)
        path.write_text(
            json.dumps(schema, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
            newline="\n",
        )
        written.add(path.name)

    for stale in SCHEMA_DIR.glob("*.json"):
        if stale.name not in written:
            stale.unlink()

    print(f"Exported {len(written)} schema(s) to {SCHEMA_DIR}")


if __name__ == "__main__":
    main()
