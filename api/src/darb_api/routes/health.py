from fastapi import APIRouter, Request

from darb_api.config import Settings
from darb_api.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health")
async def get_health(request: Request) -> HealthResponse:
    settings: Settings = request.app.state.settings
    return HealthResponse(status="ok", version=settings.app_version)
