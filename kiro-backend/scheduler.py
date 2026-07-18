import random
import re
import time as time_module
from datetime import datetime, time as dtime

import pytz
from apscheduler.schedulers.background import BackgroundScheduler

from database import get_db
from brain.kyroo_brain import generate_morning_nudge, validate_response
from routes.whatsapp import send_whatsapp

IST = pytz.timezone("Asia/Kolkata")

_TIME_RE = re.compile(
    r'^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$', re.IGNORECASE
)


def parse_nudge_time(nudge_time: str) -> dtime | None:
    """Parses things like '7 AM', '7:30am', '19:00', '6 PM' into a time in IST."""
    if not nudge_time:
        return None
    match = _TIME_RE.match(nudge_time)
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    meridiem = (match.group(3) or "").lower()

    if meridiem == "pm" and hour != 12:
        hour += 12
    elif meridiem == "am" and hour == 12:
        hour = 0

    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None

    return dtime(hour=hour, minute=minute)


def _already_sent_today(db, user_id: str) -> bool:
    today_start = datetime.now(IST).replace(
        hour=0, minute=0, second=0, microsecond=0
    ).isoformat()

    res = (
        db.table("chat_history")
        .select("id")
        .eq("user_id", user_id)
        .eq("user_message", "morning_nudge")
        .gte("created_at", today_start)
        .limit(1)
        .execute()
    )
    return bool(res.data)


def check_and_send_nudges():
    db = get_db()
    now_ist = datetime.now(IST)

    users = db.table("users").select("*").eq("is_active", True).execute()

    for user in (users.data or []):
        target = parse_nudge_time(user.get("nudge_time", ""))
        if not target:
            continue

        # fire once, in the minute the scheduled time falls in
        if now_ist.hour != target.hour or now_ist.minute != target.minute:
            continue

        if _already_sent_today(db, user["id"]):
            continue

        try:
            nudge_text = generate_morning_nudge(user)
            bubbles = validate_response(nudge_text)
            phone = user.get("phone", "")

            results = []
            for i, bubble in enumerate(bubbles):
                results.append(send_whatsapp(phone, bubble))
                if i < len(bubbles) - 1:
                    time_module.sleep(random.uniform(0.4, 0.9))

            db.table("chat_history").insert({
                "user_id": user["id"],
                "user_message": "morning_nudge",
                "kiro_response": "\n\n".join(bubbles),
                "module": "general"
            }).execute()

            print(f"[scheduler] nudge sent to {user.get('name')} ({phone}): {results}")
        except Exception as e:
            print(f"[scheduler] failed to send nudge to {user.get('name')}: {e}")


_scheduler: BackgroundScheduler | None = None


def start_scheduler():
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    _scheduler = BackgroundScheduler(timezone=str(IST))
    _scheduler.add_job(check_and_send_nudges, "cron", minute="*", id="morning_nudges")
    _scheduler.start()
    print("[scheduler] started, checking nudge times every minute (IST)")
    return _scheduler


def stop_scheduler():
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
