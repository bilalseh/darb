from typing import Literal

from darb_api.schemas.base import ApiModel


class HealthResponse(ApiModel):
    """Liveness payload returned by GET /api/health."""

    status: Literal["ok"]
    version: str
