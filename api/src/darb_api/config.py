"""Runtime configuration, read from environment variables (and `api/.env` locally)."""

import os
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

Environment = Literal["local", "test", "production"]
LogLevel = Literal["DEBUG", "INFO", "WARNING", "ERROR"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        frozen=True,
    )

    environment: Environment = "local"
    app_version: str = "dev"
    firebase_project_id: str
    log_level: LogLevel = "INFO"
    firestore_emulator_host: str | None = None
    firebase_auth_emulator_host: str | None = None

    # AI providers, tried in this order. "fake" is deterministic and needs no key.
    ai_providers: str = "gemini,groq"
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-flash-latest"
    groq_api_key: SecretStr | None = None
    groq_model: str = "openai/gpt-oss-120b"
    # Per provider. Firebase Hosting gives up after 60s, so a fallback must still fit.
    ai_timeout_seconds: float = 25
    ai_daily_limit_per_user: int = 20
    ai_daily_limit_global: int = 500

    @property
    def ai_provider_names(self) -> list[str]:
        return [name.strip() for name in self.ai_providers.split(",") if name.strip()]


def load_settings() -> Settings:
    return Settings()


def apply_emulator_hosts(settings: Settings) -> None:
    """The Google SDKs read emulator hosts only from os.environ, so values that came from
    api/.env are copied there. Never applied in production."""
    if settings.environment == "production":
        return
    hosts = {
        "FIRESTORE_EMULATOR_HOST": settings.firestore_emulator_host,
        "FIREBASE_AUTH_EMULATOR_HOST": settings.firebase_auth_emulator_host,
    }
    for name, value in hosts.items():
        if value:
            os.environ.setdefault(name, value)
