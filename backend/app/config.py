import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All configuration comes from environment variables (or backend/.env)."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "sqlite:///./data/transcript_lab.db"
    cors_origins: str = "http://localhost:3000"

    anthropic_api_key: str = ""
    anthropic_model: str = "claude-opus-5-5"
    openai_api_key: str = ""
    openai_model: str = "gpt-4.1-mini"
    local_base_url: str = ""
    local_model: str = "llama3.1:8b"

    max_output_tokens: int = 1024
    request_timeout_seconds: float = 60.0

    @property
    def resolved_database_url(self) -> str:
        """Normalize provider URLs and keep SQLite usable on read-only serverless filesystems."""
        url = self.database_url
        # Hosted Postgres (Neon, Supabase, Vercel Marketplace) hands out postgres:// or postgresql://;
        # we ship the psycopg (v3) driver, so make SQLAlchemy use it.
        if url.startswith("postgres://"):
            url = "postgresql+psycopg://" + url[len("postgres://") :]
        elif url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://") :]
        # On Vercel only /tmp is writable. SQLite there works but is NOT persistent — use Postgres in production.
        if url.startswith("sqlite:///./") and os.environ.get("VERCEL"):
            url = "sqlite:////tmp/" + url[len("sqlite:///./") :]
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
