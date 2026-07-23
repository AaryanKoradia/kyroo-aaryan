from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db

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
async def signup(user: UserSignup):
    db = get_db()
    existing = db.table("users").select("*").eq("email", user.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    phone = normalize_phone(user.phone)
    new_user = db.table("users").insert({
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
        "job_type": user.job_type
    }).execute()
    return {
        "message": f"Welcome to KIRO, {user.name}! 🎉",
        "user_id": new_user.data[0]["id"],
        "status": "success"
    }

@router.get("/profile/{user_id}")
async def get_profile(user_id: str):
    db = get_db()
    user = db.table("users").select("*").eq("id", user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    return user.data[0]