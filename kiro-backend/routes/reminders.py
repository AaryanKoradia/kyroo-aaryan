from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db
from datetime import datetime, timedelta
import pytz

router = APIRouter(prefix="/reminders", tags=["reminders"])

IST = pytz.timezone("Asia/Kolkata")

class ReminderCreate(BaseModel):
    user_id: str
    message: str
    remind_at: str  # "2026-06-01 08:00" IST

class ReminderDelete(BaseModel):
    reminder_id: str
    user_id: str

def parse_time(time_str: str) -> datetime:
    dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M")
    return IST.localize(dt)

@router.post("/create")
async def create_reminder(req: ReminderCreate):
    db = get_db()

    user = db.table("users").select("id").eq("id", req.user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    remind_at    = parse_time(req.remind_at)
    pre_alert_at = remind_at - timedelta(minutes=30)

    db.table("reminders").insert({
        "user_id":       req.user_id,
        "message":       req.message,
        "remind_at":     remind_at.isoformat(),
        "pre_alert_at":  pre_alert_at.isoformat(),
        "is_sent":       False,
        "pre_alert_sent": False
    }).execute()

    return {
        "status":  "success",
        "message": f"Reminder set for {req.remind_at} IST. Pre-alert 30 mins before.",
        "remind_at": req.remind_at
    }

@router.get("/list/{user_id}")
async def list_reminders(user_id: str):
    db  = get_db()
    now = datetime.now(IST).isoformat()

    res = db.table("reminders").select("*")\
        .eq("user_id", user_id)\
        .eq("is_sent", False)\
        .gte("remind_at", now)\
        .order("remind_at")\
        .execute()

    return {"reminders": res.data or [], "count": len(res.data or [])}

@router.delete("/delete")
async def delete_reminder(req: ReminderDelete):
    db = get_db()

    db.table("reminders").delete()\
        .eq("id", req.reminder_id)\
        .eq("user_id", req.user_id)\
        .execute()

    return {"status": "success", "message": "Reminder deleted"}

@router.post("/check-and-send")
async def check_and_send():
    db  = get_db()
    now = datetime.now(IST)

    # pre-alerts due
    pre = db.table("reminders").select("*")\
        .eq("pre_alert_sent", False)\
        .eq("is_sent", False)\
        .lte("pre_alert_at", now.isoformat())\
        .execute()

    for r in (pre.data or []):
        user = db.table("users").select("name, phone").eq("id", r["user_id"]).single().execute()
        if user.data:
            print(f"PRE-ALERT to {user.data['name']}: {r['message']} in 30 mins")
            # WhatsApp send goes here when connected
        db.table("reminders").update({"pre_alert_sent": True}).eq("id", r["id"]).execute()

    # main reminders due
    main = db.table("reminders").select("*")\
        .eq("is_sent", False)\
        .lte("remind_at", now.isoformat())\
        .execute()

    for r in (main.data or []):
        user = db.table("users").select("name, phone").eq("id", r["user_id"]).single().execute()
        if user.data:
            print(f"REMINDER to {user.data['name']}: {r['message']}")
            # WhatsApp send goes here when connected
        db.table("reminders").update({"is_sent": True}).eq("id", r["id"]).execute()

    return {
        "status": "success",
        "pre_alerts_sent": len(pre.data or []),
        "reminders_sent":  len(main.data or [])
    }