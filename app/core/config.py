from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Application
    app_name: str = "Kyroo"
    app_version: str = "1.0.0"
    environment: str = Field(default="development")

    # Database - Supabase
    supabase_url: str = ""
    supabase_key: str = ""

    # LLM
    llm_provider: str = "anthropic"
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    gemini_api_key: str = ""
    openrouter_api_key: str = ""
    anthropic_model: str = "claude-sonnet-4-5"

    # Voyage (Semantic Memory)
    voyage_api_key: str = ""

    # WhatsApp
    whatsapp_token: str = ""
    phone_number_id: str = ""
    verify_token: str = "kyroo_verify_2026"

    # Security
    secret_key: str = ""
    algorithm: str = "HS256"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()