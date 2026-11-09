"""Public API models. Everything in PUBLIC_MODELS is exported to shared/ as JSON Schema
and TypeScript types by `pnpm gen:schemas` (see docs/adr/0005)."""

from pydantic import BaseModel

from darb_api.schemas.health import HealthResponse

PUBLIC_MODELS: tuple[type[BaseModel], ...] = (HealthResponse,)

__all__ = ["PUBLIC_MODELS", "HealthResponse"]
