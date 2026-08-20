from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import os
import random
import httpx
from datetime import datetime, timedelta, timezone
from database import get_db
from rate_limit import limiter

router = APIRouter(prefix="/otp", tags=["otp"])

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "KYROO <onboarding@resend.dev>")

OTP_EXPIRY_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 30
MAX_VERIFY_ATTEMPTS = 5


class SendOtpRequest(BaseModel):
    email: str


class VerifyOtpRequest(BaseModel):
    email: str
    code: str


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _send_email(to_email: str, code: str):
    if not RESEND_API_KEY:
        raise RuntimeError("RESEND_API_KEY not configured on the server")

    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {RESEND_API_KEY}"},
        json={
            "from": RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": f"{code} is your KYROO verification code",
            "text": (
                f"Your KYROO verification code is {code}. It expires in {OTP_EXPIRY_MINUTES} minutes.\n\n"
                "If you didn't request this, you can safely ignore this email."
            ),
        },
        timeout=10,
    )
    resp.raise_for_status()


def send_otp_code(email: str) -> None:
    """Core send logic, factored out of the /send route so callers that
    need a different rate-limit tier (e.g. /auth/login/start) can trigger
    a code without duplicating the cooldown/expiry/email-send logic.
    Expects an already-normalized (stripped+lowercased) email."""
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Enter a valid email address")

    db = get_db()

    # rate-limit resends so someone can't hammer the send endpoint
    recent = (
        db.table("email_otps")
        .select("created_at")
        .eq("email", email)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if recent.data:
        last_sent = datetime.fromisoformat(recent.data[0]["created_at"].replace("Z", "+00:00"))
        elapsed = (datetime.now(timezone.utc) - last_sent).total_seconds()
        if elapsed < OTP_RESEND_COOLDOWN_SECONDS:
            wait = int(OTP_RESEND_COOLDOWN_SECONDS - elapsed)
            raise HTTPException(status_code=429, detail=f"Please wait {wait}s before requesting another code")

    code = _generate_code()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=OTP_EXPIRY_MINUTES)).isoformat()

    try:
        db.table("email_otps").insert({
            "email": email,
            "otp_code": code,
            "expires_at": expires_at,
            "verified": False,
        }).execute()
        _send_email(email, code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Couldn't send verification email: {e}")


@router.post("/send")
@limiter.limit("5/minute")
async def send_otp(request: Request, req: SendOtpRequest):
    send_otp_code(req.email.strip().lower())
    return {"status": "sent"}


@router.post("/verify")
@limiter.limit("10/minute")
async def verify_otp(request: Request, req: VerifyOtpRequest):
    email = req.email.strip().lower()
    code = req.code.strip()

    db = get_db()
    # Looks up the latest OTP request for this email regardless of code -
    # requesting a fresh code now supersedes any earlier one, and this is
    # also what lets attempts be tracked against a specific row even when
    # the submitted code is wrong (matching on otp_code directly, like
    # before, would return zero rows on a wrong guess and there'd be
    # nothing to increment).
    res = (
        db.table("email_otps")
        .select("*")
        .eq("email", email)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=400, detail="Incorrect code")

    row = res.data[0]
    expires_at = datetime.fromisoformat(row["expires_at"].replace("Z", "+00:00"))
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="That code expired, request a new one")

    # Per-OTP attempt cap, independent of the per-IP rate limit above - a
    # 6-digit code is only 1,000,000 combinations, and the rate limit alone
    # doesn't stop an attacker spread across many IPs from grinding through
    # them against one still-valid code within its 10-minute window.
    if (row.get("attempts") or 0) >= MAX_VERIFY_ATTEMPTS:
        raise HTTPException(status_code=429, detail="Too many incorrect attempts, request a new code")

    if row["otp_code"] != code:
        db.table("email_otps").update({"attempts": (row.get("attempts") or 0) + 1}).eq("id", row["id"]).execute()
        raise HTTPException(status_code=400, detail="Incorrect code")

    db.table("email_otps").update({"verified": True}).eq("id", row["id"]).execute()

    # onboarding_step == 99 means this email belongs to a fully completed
    # signup, not a stray WhatsApp-first stub (those get -1/-2) — tells the
    # frontend to stop the onboarding flow here and point them at WhatsApp
    # instead of walking them through 9 more questions for an account that
    # already exists (and /users/signup would reject anyway).
    existing = (
        db.table("users").select("id")
        .eq("email", email)
        .eq("onboarding_step", 99)
        .limit(1)
        .execute()
    )
    return {"status": "verified", "already_registered": bool(existing.data)}


def is_email_verified(email: str) -> bool:
    """Used by /users/signup to confirm this email actually completed OTP
    verification, so the check can't be bypassed by calling signup
    directly without ever going through /otp/send + /otp/verify. This has
    no recency requirement - true forever once verified once - which is
    fine for signup (a one-time action right after verifying) but wrong
    for anything checked repeatedly across visits, like /users/account.
    Use is_recently_verified for those instead."""
    db = get_db()
    res = (
        db.table("email_otps")
        .select("verified")
        .eq("email", email.strip().lower())
        .eq("verified", True)
        .limit(1)
        .execute()
    )
    return bool(res.data)


def is_recently_verified(email: str, within_minutes: int = 15) -> bool:
    """Stricter than is_email_verified: only the MOST RECENT OTP request for
    this email counts, and only if it was verified within the last
    within_minutes. Used to gate /users/account, where the point is
    proving current control of the inbox on every visit - not just once,
    ever, the way signup only needs to."""
    db = get_db()
    res = (
        db.table("email_otps")
        .select("verified, created_at")
        .eq("email", email.strip().lower())
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if not res.data or not res.data[0].get("verified"):
        return False
    created_at = datetime.fromisoformat(res.data[0]["created_at"].replace("Z", "+00:00"))
    elapsed_minutes = (datetime.now(timezone.utc) - created_at).total_seconds() / 60
    return elapsed_minutes <= within_minutes
