from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db

router = APIRouter(prefix="/users", tags=["users"])

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

@router.post("/signup")
async def signup(user: UserSignup):
    db = get_db()
    existing = db.table("users").select("*").eq("email", user.email).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Email already registered")
    new_user = db.table("users").insert({
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
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
        "is_active": True
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