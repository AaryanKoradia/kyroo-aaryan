from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db
from datetime import datetime
import pytz

router = APIRouter(prefix="/tracking", tags=["tracking"])

IST = pytz.timezone("Asia/Kolkata")

def today_ist():
    return datetime.now(IST).strftime("%Y-%m-%d")


class DailyLog(BaseModel):
    user_id: str
    date: str = ""

    # fitness
    steps: int = None
    workout_done: bool = None
    workout_name: str = ""
    workout_duration: int = None
    calories_burned: int = None
    water_glasses: int = None
    weight_kg: float = None

    # finance
    spent_today: float = None
    spent_category: str = ""
    saved_today: float = None

    # mood
    mood_score: int = None
    stress_score: int = None
    journal_entry: str = ""

    # sleep
    sleep_hours: float = None
    sleep_quality: int = None
    bedtime: str = ""
    wake_time: str = ""


@router.post("/log")
async def log_daily(req: DailyLog):
    db   = get_db()
    date = req.date or today_ist()

    user = db.table("users").select("id").eq("id", req.user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    existing = db.table("user_tracking").select("id")\
        .eq("user_id", req.user_id)\
        .eq("date", date)\
        .execute()

    data = {"user_id": req.user_id, "date": date}

    fields = [
        "steps", "workout_done", "workout_name", "workout_duration",
        "calories_burned", "water_glasses", "weight_kg",
        "spent_today", "spent_category", "saved_today",
        "mood_score", "stress_score", "journal_entry",
        "sleep_hours", "sleep_quality", "bedtime", "wake_time"
    ]
    for f in fields:
        val = getattr(req, f)
        if val is not None and val != "":
            data[f] = val

    if existing.data:
        db.table("user_tracking").update(data)\
            .eq("user_id", req.user_id)\
            .eq("date", date)\
            .execute()
        action = "updated"
    else:
        db.table("user_tracking").insert(data).execute()
        action = "created"

    return {"status": "success", "action": action, "date": date}


@router.get("/today/{user_id}")
async def get_today(user_id: str):
    db   = get_db()
    date = today_ist()

    res = db.table("user_tracking").select("*")\
        .eq("user_id", user_id)\
        .eq("date", date)\
        .execute()

    return {
        "date": date,
        "data": res.data[0] if res.data else {},
        "logged": bool(res.data)
    }


@router.get("/history/{user_id}")
async def get_history(user_id: str, days: int = 7):
    db  = get_db()
    res = db.table("user_tracking").select("*")\
        .eq("user_id", user_id)\
        .order("date", desc=True)\
        .limit(days)\
        .execute()

    return {"history": res.data or [], "days": days}


@router.get("/summary/{user_id}")
async def get_summary(user_id: str):
    db  = get_db()
    res = db.table("user_tracking").select("*")\
        .eq("user_id", user_id)\
        .order("date", desc=True)\
        .limit(30)\
        .execute()

    logs = res.data or []
    if not logs:
        return {"status": "no data"}

    workouts    = [l for l in logs if l.get("workout_done")]
    sleep_logs  = [l for l in logs if l.get("sleep_hours")]
    mood_logs   = [l for l in logs if l.get("mood_score")]
    finance_logs= [l for l in logs if l.get("spent_today") is not None]

    avg_sleep   = round(sum(l["sleep_hours"] for l in sleep_logs) / len(sleep_logs), 1) if sleep_logs else 0
    avg_mood    = round(sum(l["mood_score"] for l in mood_logs) / len(mood_logs), 1) if mood_logs else 0
    avg_stress  = round(sum(l["stress_score"] for l in mood_logs if l.get("stress_score")) / len(mood_logs), 1) if mood_logs else 0
    total_spent = sum(l["spent_today"] for l in finance_logs)
    total_saved = sum(l.get("saved_today", 0) or 0 for l in finance_logs)

    return {
        "period":        "last 30 days",
        "total_workouts": len(workouts),
        "avg_sleep_hrs":  avg_sleep,
        "avg_mood":       avg_mood,
        "avg_stress":     avg_stress,
        "total_spent":    round(total_spent, 2),
        "total_saved":    round(total_saved, 2),
        "days_tracked":   len(logs)
    }