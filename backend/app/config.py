from pathlib import Path

from fastapi import Request
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime configuration. Every field can be overridden with a BOILERFOUND_* env var."""

    model_config = SettingsConfigDict(env_prefix="BOILERFOUND_", env_file=".env", extra="ignore")

    # Switching to Postgres later should only require changing this URL.
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'boilerfound.db').as_posix()}"
    upload_dir: Path = BACKEND_DIR / "uploads"
    max_image_bytes: int = 10 * 1024 * 1024  # 10 MB, same limit FR-103 sets for found reports

    # Placeholder auth until Firebase vs. Cognito is decided. Must be False in any deployment.
    enable_dev_auth: bool = True

    # Explicit browser origins; configurable as a JSON array in BOILERFOUND_CORS_ORIGINS.
    cors_origins: list[str] = ["http://localhost:8081", "http://127.0.0.1:8081"]


def get_settings(request: Request) -> Settings:
    return request.app.state.settings
