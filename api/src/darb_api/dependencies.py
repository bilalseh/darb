"""Shared FastAPI dependencies. Everything is read from app.state, so tests swap in fakes."""

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Request

from darb_api.ai.client import AiClient
from darb_api.billing.stripe import Billing
from darb_api.config import Settings
from darb_api.repository import UserRepository

Clock = Callable[[], datetime]


def utc_now() -> datetime:
    return datetime.now(UTC)


def get_repository(request: Request) -> UserRepository:
    repository: UserRepository = request.app.state.repository
    return repository


def get_clock(request: Request) -> Clock:
    clock: Clock = request.app.state.clock
    return clock


def get_ai(request: Request) -> AiClient:
    ai: AiClient = request.app.state.ai
    return ai


def get_settings(request: Request) -> Settings:
    settings: Settings = request.app.state.settings
    return settings


def get_billing(request: Request) -> Billing | None:
    """Stripe test-mode billing, or None when its keys are not configured."""
    billing: Billing | None = request.app.state.billing
    return billing


RepositoryDep = Annotated[UserRepository, Depends(get_repository)]
ClockDep = Annotated[Clock, Depends(get_clock)]
AiDep = Annotated[AiClient, Depends(get_ai)]
SettingsDep = Annotated[Settings, Depends(get_settings)]
BillingDep = Annotated[Billing | None, Depends(get_billing)]
