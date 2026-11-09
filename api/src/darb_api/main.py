from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from google.cloud.firestore import AsyncClient

from darb_api.auth import FirebaseTokenVerifier, TokenVerifier
from darb_api.config import Settings, apply_emulator_hosts, load_settings
from darb_api.dependencies import Clock, utc_now
from darb_api.logging_config import configure_logging
from darb_api.repository import FirestoreUserRepository, UserRepository
from darb_api.routes import health, me, skills

# Firebase Hosting forwards `/api/**` to Cloud Run with the path intact.
API_PREFIX = "/api"


def create_app(
    settings: Settings | None = None,
    token_verifier: TokenVerifier | None = None,
    repository: UserRepository | None = None,
    clock: Clock = utc_now,
) -> FastAPI:
    """Build the app. Uvicorn calls this with no arguments (`--factory`); tests inject fakes."""
    settings = settings or load_settings()
    configure_logging(settings.log_level)
    apply_emulator_hosts(settings)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        if repository is not None:
            app.state.repository = repository
            yield
            return
        # Created inside the running event loop, as the gRPC async client requires.
        client = AsyncClient(project=settings.firebase_project_id)
        app.state.repository = FirestoreUserRepository(client)
        yield
        client.close()  # type: ignore[no-untyped-call]  # untyped in google-cloud-firestore

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

    for router in (health.router, me.router, skills.router):
        app.include_router(router, prefix=API_PREFIX)
    return app
