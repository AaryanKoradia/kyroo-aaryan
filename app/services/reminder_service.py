from datetime import datetime, timedelta

import pytz

from app.database.supabase_client import get_supabase
from app.infrastructure.whatsapp.client import WhatsAppClient

IST = pytz.timezone("Asia/Kolkata")

# "5 mins before, then again at the time" per the feature request — distinct
# from kiro-backend/routes/reminders.py's unused 30-min offset, which nothing
# calls into (that stub predates WhatsApp having a real send path wired up).
PRE_ALERT_MINUTES = 5

# Same rationale as nudge_service.FIRE_WINDOW_MINUTES: this cron is driven by
# an external service now (not GitHub Actions) specifically so this can stay
# tight — reminders are only useful if they land close to on time.
FIRE_WINDOW_MINUTES = 10


def parse_remind_at(remind_at: str) -> datetime:
    """Parses 'YYYY-MM-DD HH:MM' (as produced by the set_reminder tool,
    which resolves relative times using the current IST date/time given in
    the system prompt) into an IST-aware datetime. Raises ValueError on a
    bad format, letting the caller turn that into a tool-result the model
    can recover from."""
    dt = datetime.strptime(remind_at.strip(), "%Y-%m-%d %H:%M")
    return IST.localize(dt)


def create_reminder(user_id: str, message: str, remind_at: str) -> dict:
    """Creates a reminder row for user_id. Returns {"ok": True} on success,
    or {"ok": False, "error": "..."} on a bad/past time so the LLM tool loop
    can ask the user to clarify instead of silently failing."""
    if not message.strip():
        return {"ok": False, "error": "no reminder text given"}

    try:
        remind_dt = parse_remind_at(remind_at)
    except ValueError:
        return {"ok": False, "error": "remind_at wasn't in 'YYYY-MM-DD HH:MM' format"}

    if remind_dt <= datetime.now(IST):
        return {"ok": False, "error": "that time has already passed, ask for a future time"}

    pre_alert_dt = remind_dt - timedelta(minutes=PRE_ALERT_MINUTES)

    db = get_supabase()
    db.table("reminders").insert({
        "user_id": user_id,
        "message": message.strip(),
        "remind_at": remind_dt.isoformat(),
        "pre_alert_at": pre_alert_dt.isoformat(),
        "is_sent": False,
        "pre_alert_sent": False,
    }).execute()

    return {"ok": True}


def _is_due(target_iso: str, now: datetime) -> bool:
    target = datetime.fromisoformat(target_iso)
    delta_minutes = (now - target).total_seconds() / 60
    return 0 <= delta_minutes <= FIRE_WINDOW_MINUTES


def check_and_send_reminders() -> dict:
    db = get_supabase()
    now = datetime.now(IST)
    wa = WhatsAppClient()

    sent_pre_alerts = []
    sent_reminders = []
    failed = []

    pre_due = (
        db.table("reminders").select("*")
        .eq("pre_alert_sent", False)
        .eq("is_sent", False)
        .lte("pre_alert_at", now.isoformat())
        .execute()
    )
    for r in (pre_due.data or []):
        if not _is_due(r["pre_alert_at"], now):
            continue
        try:
            user = db.table("users").select("name, phone").eq("id", r["user_id"]).single().execute()
            if user.data:
                wa.send_one(user.data["phone"], f"heads up, in 5 mins: {r['message']}")
            db.table("reminders").update({"pre_alert_sent": True}).eq("id", r["id"]).execute()
            sent_pre_alerts.append(r["id"])
        except Exception as e:
            print(f"[reminders] failed to send pre-alert for {r['id']}: {e}")
            failed.append({"id": r["id"], "stage": "pre_alert", "error": str(e)})

    main_due = (
        db.table("reminders").select("*")
        .eq("is_sent", False)
        .lte("remind_at", now.isoformat())
        .execute()
    )
    for r in (main_due.data or []):
        if not _is_due(r["remind_at"], now):
            continue
        try:
            user = db.table("users").select("name, phone").eq("id", r["user_id"]).single().execute()
            if user.data:
                wa.send_one(user.data["phone"], f"⏰ {r['message']}")
            db.table("reminders").update({"is_sent": True}).eq("id", r["id"]).execute()
            sent_reminders.append(r["id"])
        except Exception as e:
            print(f"[reminders] failed to send reminder for {r['id']}: {e}")
            failed.append({"id": r["id"], "stage": "reminder", "error": str(e)})

    return {
        "checked_pre_alerts": len(pre_due.data or []),
        "checked_reminders": len(main_due.data or []),
        "sent_pre_alerts": sent_pre_alerts,
        "sent_reminders": sent_reminders,
        "failed": failed,
    }
