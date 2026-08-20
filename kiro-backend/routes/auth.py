import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from database import get_db
from routes.otp import is_recently_verified
from routes.users import _find_user_by_phone
from rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_TTL_DAYS = 30


class LoginRequest(BaseModel):
    phone: str
    email: str


@router.post("/login")
@limiter.limit("20/hour")
async def login(request: Request, req: LoginRequest):
    """Issues a persistent chat_sessions token after OTP verification. Unlike
    /users/account's is_recently_verified check (fine for an occasional
    profile lookup), website chat is now the primary product surface
    (WhatsApp retired), so it needs a real login that survives across
    days — SESSION_TTL_DAYS, not a 15-minute window. app/'s /chat/send
    validates this same token directly against chat_sessions (shared
    Supabase DB, no cross-service call needed)."""
    db = get_db()
    user = _find_user_by_phone(db, req.phone)

    if not is_recently_verified(req.email):
        raise HTTPException(status_code=403, detail="Please verify your email first")

    full = db.table("users").select("id, name, email").eq("id", user["id"]).execute()
    record = (full.data or [{}])[0]
    if not req.email or req.email.strip().lower() != (record.get("email") or "").strip().lower():
        raise HTTPException(status_code=403, detail="Email does not match this account")

    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()
    db.table("chat_sessions").insert({
        "token": token,
        "user_id": record["id"],
        "expires_at": expires_at,
    }).execute()

    return {
        "token": token,
        "user_id": record["id"],
        "name": record.get("name"),
        "status": "success",
    }


class LogoutRequest(BaseModel):
    token: str


@router.post("/logout")
async def logout(req: LogoutRequest):
    db = get_db()
    db.table("chat_sessions").delete().eq("token", req.token).execute()
    return {"status": "success"}
