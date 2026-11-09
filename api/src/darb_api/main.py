from collections.abc import AsyncIterator
from contextlib import AsyncExitStack, asynccontextmanager

import httpx
from fastapi import FastAPI
from google.cloud.firestore import AsyncClient

from darb_api.ai.client import AiClient
from darb_api.ai.setup import build_ai_client
from darb_api.auth import FirebaseTokenVerifier, TokenVerifier
from darb_api.config import Settings, apply_emulator_hosts, load_settings
from darb_api.dependencies import Clock, utc_now
from darb_api.logging_config import configure_logging
from darb_api.repository import FirestoreUserRepository, UserRepository
from darb_api.routes import (
    assessment,
    checkin,
    health,
    lessons,
    matches,
    me,
    plan,
    quiz,
    skills,
    stats,
)

# Firebase Hosting forwards `/api/**` to Cloud Run with the path intact.
API_PREFIX = "/api"


def create_app(
    settings: Settings | None = None,
    token_verifier: TokenVerifier | None = None,
    repository: UserRepository | None = None,
    clock: Clock = utc_now,
    ai: AiClient | None = None,
) -> FastAPI:
    """Build the app. Uvicorn calls this with no arguments (`--factory`); tests inject fakes."""
    settings = settings or load_settings()
    configure_logging(settings.log_level)
    apply_emulator_hosts(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        async with AsyncExitStack() as stack:
            if repository is None:
                # Created inside the running event loop, as the gRPC async client requires.
                firestore = AsyncClient(project=settings.firebase_project_id)
                stack.callback(firestore.close)
                app.state.repository = FirestoreUserRepository(firestore)
            else:
                app.state.repository = repository
            if ai is None:
                http = await stack.enter_async_context(
                    httpx.AsyncClient(timeout=settings.ai_timeout_seconds)
                )
                app.state.ai = build_ai_client(settings, http)
            else:
                app.state.ai = ai
            yield

    docs_enabled = settings.environment != "production"
    app = FastAPI(
        title="Darb API",
        version=settings.app_version,
        docs_url=f"{API_PREFIX}/docs" if docs_enabled else None,
        redoc_url=None,
        openapi_url=f"{API_PREFIX}/openapi.json" if docs_enabled else None,
        lifespan=lifespan,
    )
    app.state.settings = settings
    app.state.clock = clock
    app.state.token_verifier = token_verifier or FirebaseTokenVerifier(settings.firebase_project_id)

    routers = (
        health.router,
        me.router,
        skills.router,
        assessment.router,
        plan.router,
        lessons.router,
        stats.router,
        quiz.router,
        checkin.router,
        matches.router,
    )
    for router in routers:
        app.include_router(router, prefix=API_PREFIX)
    return app
