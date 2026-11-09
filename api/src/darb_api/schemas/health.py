from typing import Literal

from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    """Liveness payload returned by GET /api/health."""

    model_config = ConfigDict(extra="forbid", frozen=True)

    status: Literal["ok"]
    version: str
