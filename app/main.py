import os

import sentry_sdk
from fastapi import FastAPI

from app.core.logging_config import configure_logging

configure_logging()

from app.api.routes.webhook import router as webhook_router
from app.api.routes.nudges import router as nudges_router
from app.api.routes.stories import router as stories_router
from app.api.routes.reminders import router as reminders_router
from app.api.routes.debug import router as debug_router

SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN, environment=os.getenv("ENVIRONMENT", "production"), traces_sample_rate=0.1)

app = FastAPI(
    title="Kyroo",
    version="1.0.0",
)

app.include_router(webhook_router)
app.include_router(nudges_router)
app.include_router(stories_router)
app.include_router(reminders_router)
app.include_router(debug_router)


@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "kyroo",
    }


@app.get("/health")
def health():
    return {"status": "healthy", "service": "kyroo"}