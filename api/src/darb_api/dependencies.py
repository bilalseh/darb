"""Shared FastAPI dependencies. Everything is read from app.state, so tests swap in fakes."""

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Request

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


RepositoryDep = Annotated[UserRepository, Depends(get_repository)]
ClockDep = Annotated[Clock, Depends(get_clock)]
