from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import random
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta, timezone
from database import get_db

router = APIRouter(prefix="/otp", tags=["otp"])

GMAIL_ADDRESS = os.getenv("GMAIL_ADDRESS")
GMAIL_APP_PASSWORD = os.getenv("GMAIL_APP_PASSWORD")

OTP_EXPIRY_MINUTES = 10
OTP_RESEND_COOLDOWN_SECONDS = 30


class SendOtpRequest(BaseModel):
    email: str


class VerifyOtpRequest(BaseModel):
    email: str
    code: str


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _send_email(to_email: str, code: str):
    if not GMAIL_ADDRESS or not GMAIL_APP_PASSWORD:
        raise RuntimeError("GMAIL_ADDRESS / GMAIL_APP_PASSWORD not configured on the server")

    msg = MIMEText(
        f"Your KYROO verification code is {code}. It expires in {OTP_EXPIRY_MINUTES} minutes.\n\n"
        "If you didn't request this, you can safely ignore this email."
    )
    msg["Subject"] = f"{code} is your KYROO verification code"
    msg["From"] = GMAIL_ADDRESS
    msg["To"] = to_email

    with smtplib.SMTP("smtp.gmail.com", 587, timeout=15) as server:
        server.starttls()
        server.login(GMAIL_ADDRESS, GMAIL_APP_PASSWORD)
        server.sendmail(GMAIL_ADDRESS, [to_email], msg.as_string())


@router.post("/send")
async def send_otp(req: SendOtpRequest):
    email = req.email.strip().lower()
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

    return {"status": "sent"}


@router.post("/verify")
async def verify_otp(req: VerifyOtpRequest):
    email = req.email.strip().lower()
    code = req.code.strip()

    db = get_db()
    res = (
        db.table("email_otps")
        .select("*")
        .eq("email", email)
        .eq("otp_code", code)
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

    db.table("email_otps").update({"verified": True}).eq("id", row["id"]).execute()
    return {"status": "verified"}


def is_email_verified(email: str) -> bool:
    """Used by /users/signup to confirm this email actually completed OTP
    verification, so the check can't be bypassed by calling signup
    directly without ever going through /otp/send + /otp/verify."""
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
