import os

import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.logging_config import configure_logging

configure_logging()

from app.api.routes.webhook import router as webhook_router
from app.api.routes.nudges import router as nudges_router
from app.api.routes.stories import router as stories_router
from app.api.routes.reminders import router as reminders_router
from app.api.routes.debug import router as debug_router
from app.api.routes.chat import router as chat_router

SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN, environment=os.getenv("ENVIRONMENT", "production"), traces_sample_rate=0.1)

app = FastAPI(
    title="Kyroo",
    version="1.0.0",
)

# Only needed now that website chat calls this service directly from the
# browser (/chat/send) — every other route here is server-to-server (Meta's
# webhook, cron), which never triggers CORS. Same allow-list as kiro-backend.
_default_origins = "https://www.kyroo.co.in,https://kyroo.co.in,http://localhost:3000"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(webhook_router)
app.include_router(nudges_router)
app.include_router(stories_router)
app.include_router(reminders_router)
app.include_router(debug_router)
app.include_router(chat_router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "kyroo",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "kyroo"}