import sentry_sdk
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from logging_config import configure_logging

configure_logging()

from routes import users, ai, payments, fitness, files, tracking, reports, otp, admin
from rate_limit import limiter
import os

load_dotenv()

SENTRY_DSN = os.getenv("SENTRY_DSN", "")
if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN, environment=os.getenv("ENVIRONMENT", "production"), traces_sample_rate=0.1)

app = FastAPI(title="KYROO API", version="1.0.0")

# Per-IP rate limiting on the public, previously-unlimited endpoints
# (/otp/send, /users/signup, /ai/chat) — someone could otherwise script
# unlimited signups/OTP sends, or run up the Anthropic bill through the
# website chat with no cap at all. In-memory (per-process), matching every
# other piece of in-memory state already in this codebase — fine at
# current scale, would need a shared backend (Redis) if this ever runs as
# more than one worker process.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Wide open to any origin used to be the default here - fine for a purely
# server-to-server API, but this one is called directly from the browser
# (website signup/OTP/payments/admin), so a malicious page could otherwise
# ride a logged-in-ish visitor's browser to hit these endpoints cross-site.
# Restricted to KYROO's actual frontend origins; ALLOWED_ORIGINS (comma-
# separated) lets this be extended (a staging domain, say) without a
# code change.
_default_origins = "https://www.kyroo.co.in,https://kyroo.co.in,http://localhost:3000"
ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(ai.router)
app.include_router(payments.router)
app.include_router(fitness.router)
app.include_router(files.router)
app.include_router(tracking.router)
app.include_router(reports.router)
app.include_router(otp.router)
app.include_router(admin.router)

@app.get("/")
async def root():
    return {"message": "KYROO API is alive 🔥", "status": "ok"}

@app.get("/health")
async def health():
    return {"status": "healthy", "version": "1.0.0", "app": "KYROO"}