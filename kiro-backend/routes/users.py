from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from database import get_db
from routes.otp import is_email_verified
from rate_limit import limiter

router = APIRouter(prefix="/users", tags=["users"])


def normalize_phone(phone: str) -> str:
    """Store phone numbers in the exact format WhatsApp's webhook sends them in
    (country code + number, no +, no spaces) so a user who signs up on the
    website is recognized as the same person when they message on WhatsApp."""
    digits = "".join(c for c in phone if c.isdigit())
    if len(digits) == 10:
        digits = "91" + digits
    elif len(digits) == 11 and digits.startswith("0"):
        digits = "91" + digits[1:]
    return digits

class UserSignup(BaseModel):
    name: str
    email: str
    phone: str
    city: str = ""
    age: int = 0
    language: str = "Hinglish"
    nudge_time: str = "7 AM"
    fitness_level: str = ""
    fitness_goal: str = ""
    sleep_hours: str = ""
    stress_level: int = 0
    money_habit: str = ""
    diet_type: str = ""
    energy_peak: str = ""
    plan: str = "free"
    injuries: str = ""
    fitness_workouts: list[str] = []
    sleep_quality: str = ""
    sleep_issues: list[str] = []
    stress_triggers: list[str] = []
    income_range: str = ""
    eat_habits: list[str] = []
    diet_restrictions: str = ""
    job_type: str = ""

@router.post("/signup")
@limiter.limit("10/hour")
async def signup(request: Request, user: UserSignup):
    db = get_db()
    existing = db.table("users").select("*").eq("email", user.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    if not is_email_verified(user.email):
        # defends against calling /signup directly without ever completing
        # /otp/send + /otp/verify — the frontend gate alone isn't enough
        raise HTTPException(status_code=400, detail="Email not verified. Please verify your email first.")
    phone = normalize_phone(user.phone)
    fields = {
        "name": user.name,
        "email": user.email,
        "phone": phone,
        "city": user.city,
        "age": user.age,
        "language": user.language,
        "nudge_time": user.nudge_time,
        "fitness_level": user.fitness_level,
        "fitness_goal": user.fitness_goal,
        "sleep_hours": user.sleep_hours,
        "stress_level": user.stress_level,
        "money_habit": user.money_habit,
        "diet_type": user.diet_type,
        "energy_peak": user.energy_peak,
        "plan": user.plan,
        "is_active": True,
        "injuries": user.injuries,
        "fitness_workouts": user.fitness_workouts,
        "sleep_quality": user.sleep_quality,
        "sleep_issues": user.sleep_issues,
        "stress_triggers": user.stress_triggers,
        "income_range": user.income_range,
        "eat_habits": user.eat_habits,
        "diet_restrictions": user.diet_restrictions,
        "job_type": user.job_type,
        "onboarding_step": 99,
    }

    # If this phone already has a row — e.g. they messaged KYROO on WhatsApp
    # first and got sent here to finish setup, which creates a row with
    # onboarding_step=-1/-2 — finish THAT row instead of inserting a second
    # one. Otherwise the WhatsApp webhook can keep reading the old,
    # half-onboarded row (it has no way to know this new one is "them"),
    # and re-asks for consent/onboarding even though signup just completed.
    existing_by_phone = (
        db.table("users").select("id")
        .eq("phone", phone)
        .order("onboarding_step", desc=True)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    if existing_by_phone.data:
        user_id = existing_by_phone.data[0]["id"]
        db.table("users").update(fields).eq("id", user_id).execute()
    else:
        new_user = db.table("users").insert(fields).execute()
        user_id = new_user.data[0]["id"]

    return {
        "message": f"Welcome to KIRO, {user.name}! 🎉",
        "user_id": user_id,
        "status": "success"
    }

@router.get("/profile/{user_id}")
async def get_profile(user_id: str, email: str = ""):
    """Requires the caller to also know the account's registered email —
    there's no real session/login system yet, so a bare user_id alone
    (even though UUIDs aren't easily guessable) was the only thing
    standing between anyone and a full profile: name, phone, stress
    level, income range. This is a lightweight ownership check, not a
    replacement for real auth if this endpoint gets more use later."""
    db = get_db()
    user = db.table("users").select("*").eq("id", user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    record = user.data[0]
    if not email or email.strip().lower() != (record.get("email") or "").strip().lower():
        raise HTTPException(status_code=403, detail="Email does not match this account")
    return record


class PhoneOnly(BaseModel):
    phone: str


def _find_user_by_phone(db, phone: str):
    normalized = normalize_phone(phone)
    res = db.table("users").select("id, name, is_active").eq("phone", normalized).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="No KYROO account found for that phone number")
    return res.data[0]


@router.post("/unsubscribe")
async def unsubscribe(req: PhoneOnly):
    """Stops all proactive/business-initiated WhatsApp messages (nudges,
    reminders) — required so users have a real way to opt out, per
    WhatsApp's Business Messaging Policy. Doesn't delete the account or
    stop KYROO replying if the user messages it directly, since that's a
    user-initiated conversation, not the thing the policy is about."""
    db = get_db()
    user = _find_user_by_phone(db, req.phone)
    db.table("users").update({"is_active": False}).eq("id", user["id"]).execute()
    return {"status": "success", "message": f"You're unsubscribed, {user.get('name', 'there')}. No more nudges or reminders from KYROO."}


@router.post("/resubscribe")
async def resubscribe(req: PhoneOnly):
    db = get_db()
    user = _find_user_by_phone(db, req.phone)
    db.table("users").update({"is_active": True}).eq("id", user["id"]).execute()
    return {"status": "success", "message": f"Welcome back, {user.get('name', 'there')}! Nudges and reminders are back on."}