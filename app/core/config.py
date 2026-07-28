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
    # Meta App Secret (App Dashboard -> Settings -> Basic -> App Secret), used
    # to verify the X-Hub-Signature-256 header on inbound webhook POSTs so a
    # forged request can't be processed as a real WhatsApp message. Left
    # blank means verification is skipped (fails open) rather than breaking
    # the bot before this is configured in Render — set it and every POST is
    # verified from then on.
    whatsapp_app_secret: str = ""

    # Security
    secret_key: str = ""
    algorithm: str = "HS256"
    # Shared secret required on the cron-triggered endpoints (nudges,
    # reminders, stories) so they can't be hit by anyone who finds the URL —
    # these were completely open before. Passed as either an X-Cron-Secret
    # header or a ?secret= query param (some free external cron services
    # can't set custom headers). Must be set in both Render's env vars and
    # wherever the cron caller lives (GitHub Actions secrets, or the URL
    # configured in an external cron service) — until it's set everywhere,
    # these endpoints reject every call rather than staying open.
    cron_secret: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()