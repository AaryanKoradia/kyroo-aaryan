import logging
from datetime import datetime, timedelta

import pytz
import sentry_sdk

from app.database.supabase_client import get_supabase
from app.infrastructure.whatsapp.client import WhatsAppClient
from app.services.proactive_messaging import send_proactive

IST = pytz.timezone("Asia/Kolkata")
logger = logging.getLogger(__name__)

# "5 mins before, then again at the time" per the feature request — distinct
# from kiro-backend/routes/reminders.py's unused 30-min offset, which nothing
# calls into (that stub predates WhatsApp having a real send path wired up).
PRE_ALERT_MINUTES = 5

# Same rationale as nudge_service.FIRE_WINDOW_MINUTES: this cron is driven by
# an external service now (not GitHub Actions) specifically so this can stay
# tight — reminders are only useful if they land close to on time.
FIRE_WINDOW_MINUTES = 10

# cron-job.org (and similar free cron services) fail a run if the response
# body is too large, regardless of status code. The failed/sent lists below
# are for debugging, not required by the caller, so they're capped rather
# than left to grow unbounded with the checked/backlog count.
MAX_DETAIL_ITEMS = 20
MAX_ERROR_CHARS = 200


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


def _claim(db, reminder_id: str, field: str) -> bool:
    """Atomically claims a reminder's pre-alert/main send via a conditional
    UPDATE ... WHERE <field> = false. This cron is driven by an external
    service with no guarantee only one run is ever in flight (and is also
    still triggered on a fixed interval that can overlap a slow prior run)
    — without this, two overlapping runs could both pass the earlier SELECT
    before either wrote the flag, sending the same reminder twice. Only the
    run whose UPDATE actually flips the row gets rows back; the loser sees
    an empty result and skips. On a subsequent send failure the caller
    flips the flag back so the next tick (still within the fire window)
    can retry instead of the reminder being silently dropped."""
    res = db.table("reminders").update({field: True}).eq("id", reminder_id).eq(field, False).execute()
    return bool(res.data)


def check_and_send_reminders() -> dict:
    db = get_supabase()
    now = datetime.now(IST)
    wa = WhatsAppClient()

    sent_pre_alerts = []
    sent_reminders = []
    skipped = []
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
        if not _claim(db, r["id"], "pre_alert_sent"):
            continue  # an overlapping run already claimed this one
        try:
            user = db.table("users").select("id, name, phone, is_active").eq("id", r["user_id"]).single().execute()
            outcome = None
            if user.data and user.data.get("is_active", True):
                outcome = send_proactive(
                    db, user.data,
                    lambda: wa.send_one(user.data["phone"], f"heads up, in 5 mins: {r['message']}"),
                    "WHATSAPP_TEMPLATE_REMINDER_PRE_ALERT", [r["message"]],
                )
            if outcome == "skipped_no_template":
                db.table("reminders").update({"pre_alert_sent": False}).eq("id", r["id"]).execute()
                skipped.append({"id": r["id"], "stage": "pre_alert", "reason": "no_template_configured"})
            else:
                sent_pre_alerts.append(r["id"])
        except Exception as e:
            db.table("reminders").update({"pre_alert_sent": False}).eq("id", r["id"]).execute()
            logger.exception(f"[reminders] failed to send pre-alert for {r['id']}: {e}")
            sentry_sdk.capture_exception(e)
            failed.append({"id": r["id"], "stage": "pre_alert", "error": str(e)[:MAX_ERROR_CHARS]})

    main_due = (
        db.table("reminders").select("*")
        .eq("is_sent", False)
        .lte("remind_at", now.isoformat())
        .execute()
    )
    for r in (main_due.data or []):
        if not _is_due(r["remind_at"], now):
            continue
        if not _claim(db, r["id"], "is_sent"):
            continue  # an overlapping run already claimed this one
        try:
            user = db.table("users").select("id, name, phone, is_active").eq("id", r["user_id"]).single().execute()
            outcome = None
            if user.data and user.data.get("is_active", True):
                outcome = send_proactive(
                    db, user.data,
                    lambda: wa.send_one(user.data["phone"], f"⏰ {r['message']}"),
                    "WHATSAPP_TEMPLATE_REMINDER", [r["message"]],
                )
            if outcome == "skipped_no_template":
                db.table("reminders").update({"is_sent": False}).eq("id", r["id"]).execute()
                skipped.append({"id": r["id"], "stage": "reminder", "reason": "no_template_configured"})
            else:
                sent_reminders.append(r["id"])
        except Exception as e:
            db.table("reminders").update({"is_sent": False}).eq("id", r["id"]).execute()
            logger.exception(f"[reminders] failed to send reminder for {r['id']}: {e}")
            sentry_sdk.capture_exception(e)
            failed.append({"id": r["id"], "stage": "reminder", "error": str(e)[:MAX_ERROR_CHARS]})

    return {
        "checked_pre_alerts": len(pre_due.data or []),
        "checked_reminders": len(main_due.data or []),
        "sent_pre_alerts_count": len(sent_pre_alerts),
        "sent_reminders_count": len(sent_reminders),
        "sent_pre_alerts": sent_pre_alerts[:MAX_DETAIL_ITEMS],
        "sent_reminders": sent_reminders[:MAX_DETAIL_ITEMS],
        "skipped_count": len(skipped),
        "skipped": skipped[:MAX_DETAIL_ITEMS],
        "failed_count": len(failed),
        "failed": failed[:MAX_DETAIL_ITEMS],
    }
