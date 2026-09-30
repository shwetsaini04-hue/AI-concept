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
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
