"""Runtime configuration, read from environment variables (and `api/.env` locally)."""

from typing import Literal

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


def load_settings() -> Settings:
    return Settings()
