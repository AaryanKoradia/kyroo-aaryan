from fastapi import HTTPException, Request

from app.core.config import settings


def require_cron_secret(request: Request) -> None:
    """FastAPI dependency guarding cron-triggered endpoints (nudges,
    reminders, stories) — these were previously open to anyone who found
    the URL, letting them trigger a mass WhatsApp send on demand. Accepts
    the secret as either an X-Cron-Secret header or a ?secret= query param,
    since some free external cron services can only set the URL, not
    headers. Fails CLOSED if CRON_SECRET isn't configured yet — unlike the
    webhook signature check, both sides of this are ours to set, so there's
    no reason to leave it open in the meantime."""
    provided = request.headers.get("x-cron-secret") or request.query_params.get("secret")
    if not settings.cron_secret or provided != settings.cron_secret:
        raise HTTPException(status_code=403, detail="Missing or invalid cron secret")
