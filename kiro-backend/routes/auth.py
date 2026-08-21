import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from database import get_db
from guest_merge import merge_guest_into_user, resolve_guest
from routes.otp import is_recently_verified, send_otp_code
from rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])

SESSION_TTL_DAYS = 30


def _escape_ilike(value: str) -> str:
    """Postgres ILIKE treats % and _ as wildcards — real emails routinely
    contain underscores (john_doe@gmail.com), so an unescaped ilike lookup
    could match a different account by accident. Escaping makes this an
    exact case-insensitive match, nothing more."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _find_user_by_email(db, email: str) -> dict:
    """Case-insensitive lookup — /users/signup stores email exactly as
    typed (no normalization), so a login attempt in a different case than
    signup used must still resolve to the same account."""
    normalized = email.strip().lower()
    res = db.table("users").select("id, name, email").ilike("email", _escape_ilike(normalized)).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="No KYROO account found for that email")
    return res.data[0]


class LoginStartRequest(BaseModel):
    email: str


@router.post("/login/start")
@limiter.limit("10/hour")
async def login_start(request: Request, req: LoginStartRequest):
    """Confirms an account exists BEFORE sending an OTP. Sending the code
    first and only checking afterward (the old flow) wastes an email and
    means whoever mistyped their email doesn't find out until after
    they've gone and entered a code."""
    db = get_db()
    _find_user_by_email(db, req.email)
    send_otp_code(req.email.strip().lower())
    return {"status": "sent"}


class LoginRequest(BaseModel):
    email: str
    guest_token: str = ""


@router.post("/login")
@limiter.limit("20/hour")
async def login(request: Request, req: LoginRequest):
    """Issues a persistent chat_sessions token after OTP verification.
    Unlike /users/account's is_recently_verified check (fine for an
    occasional profile lookup), website chat is now the primary product
    surface (WhatsApp retired), so it needs a real login that survives
    across days — SESSION_TTL_DAYS, not a 15-minute window, and only
    needs to happen once per device per TTL: /chat/session restores it
    silently after that, no repeat OTP. app/'s /chat/send validates this
    same token directly against chat_sessions (shared Supabase DB, no
    cross-service call needed). Email alone identifies the account —
    unlike /users/account's phone+email pair, this isn't a lookup form,
    it's a login, so one verified credential is enough.

    guest_token: if someone hit the landing-page trial's 5-message cap
    and logged into an EXISTING account (rather than signing up fresh,
    which just upgrades the guest row in place — see /users/signup), fold
    their trial chat history into the real account instead of losing it."""
    db = get_db()
    user = _find_user_by_email(db, req.email)

    if not is_recently_verified(req.email.strip().lower()):
        raise HTTPException(status_code=403, detail="Please verify your email first")

    guest = resolve_guest(db, req.guest_token)
    if guest:
        merge_guest_into_user(db, guest["id"], user["id"])

    token = secrets.token_urlsafe(32)
    expires_at = (datetime.now(timezone.utc) + timedelta(days=SESSION_TTL_DAYS)).isoformat()
    db.table("chat_sessions").insert({
        "token": token,
        "user_id": user["id"],
        "expires_at": expires_at,
    }).execute()

    return {
        "token": token,
        "user_id": user["id"],
        "name": user.get("name"),
        "status": "success",
    }


class LogoutRequest(BaseModel):
    token: str


@router.post("/logout")
async def logout(req: LogoutRequest):
    db = get_db()
    db.table("chat_sessions").delete().eq("token", req.token).execute()
    return {"status": "success"}
