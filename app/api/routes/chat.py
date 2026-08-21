import logging
import secrets
from datetime import datetime, timedelta, timezone

import sentry_sdk
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from app.api.dependencies.database import get_db
from app.brain.kyroo_brain import finalize_chat_turn, kyroo_brain, validate_response
from app.brain.onboarding_flow import WEBSITE_SIGNUP_URL, is_guest, needs_onboarding
from app.engine.orchestrator import Orchestrator
from app.services.conversation_service import ConversationService
from app.services.usage_service import check_usage

router = APIRouter(prefix="/chat", tags=["chat"])

logger = logging.getLogger(__name__)

GUEST_MESSAGE_CAP = 5
GUEST_SESSION_TTL_DAYS = 7  # plenty of time to come back and sign up; real logins get 30
GUEST_SESSIONS_PER_IP_PER_DAY = 20  # generous enough for a shared office/campus IP, not a script


def _resolve_session(db, authorization: str | None) -> dict:
    """Validates a chat_sessions token (issued by kiro-backend's
    /auth/login, or by /chat/guest/start below) and returns the owning
    user row. Both services read the same Supabase table, so no call back
    to kiro-backend is needed here."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not logged in")
    token = authorization.removeprefix("Bearer ").strip()

    session = db.table("chat_sessions").select("user_id, expires_at").eq("token", token).execute()
    if not session.data:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")

    row = session.data[0]
    expires_at = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired, please log in again")

    user = db.table("users").select("*").eq("id", row["user_id"]).execute()
    if not user.data:
        raise HTTPException(status_code=401, detail="Session expired, please log in again")
    return user.data[0]


@router.get("/session")
async def session_info(authorization: str | None = Header(default=None), db=Depends(get_db)):
    """Lets the frontend check a stored token on page load without sending
    a throwaway chat message just to find out if it's still valid."""
    user = _resolve_session(db, authorization)
    return {"user_id": user["id"], "name": user.get("name"), "is_guest": is_guest(user)}


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("/guest/start")
async def guest_start(request: Request, db=Depends(get_db)):
    """Mints a landing-page trial identity so an anonymous visitor can chat
    with the real brain before signing up. Rate-limited by IP (session
    CREATION, not messages — a guest's own 5-message cap handles that part)
    since this is the one place a script could mint unlimited free identities
    to burn Claude credits without ever proving they're a real person."""
    ip = _client_ip(request)
    cutoff = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    recent = (
        db.table("guest_rate_limit").select("id", count="exact")
        .eq("ip_address", ip).gte("created_at", cutoff).execute()
    )
    if (recent.count or 0) >= GUEST_SESSIONS_PER_IP_PER_DAY:
        raise HTTPException(status_code=429, detail="Too many trial sessions from this network, try again tomorrow or sign up")

    suffix = secrets.token_hex(8)
    guest = db.table("users").insert({
        "name": "Guest",
        "email": f"guest_{suffix}@guest.kyroo",
        "phone": f"guest_{suffix}",
        "language": "Hinglish",
        "plan": "free",
        "is_active": False,  # never a nudge/reminder target
        "onboarding_step": -2,  # GUEST_ONBOARDING_STEP, see onboarding_flow.py
    }).execute()
    user_id = guest.data[0]["id"]

    db.table("guest_rate_limit").insert({"ip_address": ip}).execute()

    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=GUEST_SESSION_TTL_DAYS)).isoformat()
    db.table("chat_sessions").insert({"token": token, "user_id": user_id, "expires_at": expires_at}).execute()

    return {"token": token}


def _guest_message_count(db, user_id: str) -> int:
    res = (
        db.table("chat_history").select("id", count="exact")
        .eq("user_id", user_id).neq("user_message", "").execute()
    )
    return res.count or 0


class SendMessage(BaseModel):
    message: str
    image_base64: str | None = None
    image_media_type: str | None = None


def _save_image_exchange(db, user, text, result):
    ConversationService(db).add_exchange(user, text, result["response"], result.get("module", "general"))
    finalize_chat_turn(user, text, result, db)


@router.post("/send")
async def send(
    req: SendMessage,
    background_tasks: BackgroundTasks,
    authorization: str | None = Header(default=None),
    db=Depends(get_db),
):
    user = _resolve_session(db, authorization)

    if is_guest(user):
        if _guest_message_count(db, user["id"]) >= GUEST_MESSAGE_CAP:
            return {"status": "signup_required"}
    elif needs_onboarding(user):
        return {"status": "needs_onboarding", "redirect": WEBSITE_SIGNUP_URL}
    else:
        allowed, block_message = check_usage(db, user)
        if not allowed:
            return {"status": "limit_reached", "message": block_message}

    try:
        if req.image_base64:
            # Orchestrator.process() has no image passthrough — go straight
            # to kyroo_brain, same as the webhook's image branch does.
            text = req.message or "(sent a photo)"
            result = kyroo_brain(user, req.message, [], req.image_base64, req.image_media_type)
            bubbles = result.get("bubbles") or validate_response(result["response"])
            background_tasks.add_task(_save_image_exchange, db, user, text, result)
            return {"status": "ok", "bubbles": bubbles}

        orchestrator = Orchestrator(db)
        _, result = orchestrator.process(user["phone"], req.message)
        bubbles = result.get("bubbles") or validate_response(result["response"])
        background_tasks.add_task(orchestrator.save_exchange, user, req.message, result)
        return {"status": "ok", "bubbles": bubbles}
    except Exception:
        logger.exception("[chat] send error")
        sentry_sdk.capture_exception()
        raise HTTPException(status_code=500, detail="Something went wrong on our end, try again?")
