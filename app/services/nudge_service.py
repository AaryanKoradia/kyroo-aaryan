import re
from datetime import datetime, time as dtime

import pytz

from app.database.supabase_client import get_supabase
from app.brain.kyroo_brain import (
    generate_morning_nudge,
    generate_afternoon_nudge,
    generate_evening_nudge,
    generate_night_nudge,
    validate_response,
)
from app.infrastructure.whatsapp.client import WhatsAppClient
from app.services.proactive_messaging import send_proactive

IST = pytz.timezone("Asia/Kolkata")

# Fixed daily slots (IST) — morning uses each user's own onboarding preference
# instead, since that's the only per-user time they were actually asked for.
FIXED_SLOTS = {
    "afternoon_nudge": dtime(hour=13, minute=0),
    "evening_nudge": dtime(hour=18, minute=30),
    "night_nudge": dtime(hour=22, minute=0),
}

GENERATORS = {
    "morning_nudge": generate_morning_nudge,
    "afternoon_nudge": generate_afternoon_nudge,
    "evening_nudge": generate_evening_nudge,
    "night_nudge": generate_night_nudge,
}

# How late a slot is still allowed to fire after its target time. This is
# nominally every 10 min (the cron interval), but GitHub Actions' free
# scheduled workflows are unreliable in practice — observed real gaps
# between runs of up to ~2h40m instead of 10 min, meaning a 20-min window
# was missing almost every fixed slot entirely (this was the actual root
# cause of nudges never arriving). Widened generously so a late-arriving
# cron tick still catches it, trading a bit of precision for actually
# being delivered at all.
FIRE_WINDOW_MINUTES = 180

_TIME_RE = re.compile(r'^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$', re.IGNORECASE)


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


def _is_due(now_ist: datetime, target: dtime) -> bool:
    """True if target has already passed today and we're still within the
    fire window — a wider check than an exact-minute match, since this is
    driven by an external cron rather than an in-process per-minute loop."""
    now_minutes = now_ist.hour * 60 + now_ist.minute
    target_minutes = target.hour * 60 + target.minute
    delta = now_minutes - target_minutes
    return 0 <= delta <= FIRE_WINDOW_MINUTES


def _already_sent_today(db, user_id: str, slot: str) -> bool:
    today_start = datetime.now(IST).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    res = (
        db.table("chat_history")
        .select("id")
        .eq("user_id", user_id)
        .eq("user_message", slot)
        .gte("created_at", today_start)
        .limit(1)
        .execute()
    )
    return bool(res.data)


def _send_nudge(db, user: dict, slot: str) -> None:
    """Generating the full LLM nudge is deferred into the closure below so
    it only actually runs when we're within the 24h session window — if
    we're outside it, send_proactive falls back to a template ping
    instead, and there's no point paying for an LLM call whose output
    would just get discarded."""
    phone = user.get("phone", "")
    sent_text = {"value": None}

    def _generate_and_send():
        nudge_text = GENERATORS[slot](user)
        bubbles = validate_response(nudge_text)
        WhatsAppClient().send_bubbles(phone, bubbles)
        sent_text["value"] = "\n\n".join(bubbles)

    outcome = send_proactive(
        db, user, _generate_and_send,
        "WHATSAPP_TEMPLATE_NUDGE", [user.get("name", "yaar")],
    )
    if outcome == "skipped_no_template":
        # nothing was actually sent — don't log it as today's nudge, so a
        # later attempt (once a template is configured) isn't blocked by
        # _already_sent_today
        return

    db.table("chat_history").insert({
        "user_id": user["id"],
        "user_message": slot,
        "kiro_response": sent_text["value"] or f"(sent via {outcome})",
        "module": "general",
    }).execute()


def check_and_send_nudges() -> dict:
    db = get_supabase()
    now_ist = datetime.now(IST)

    users_res = db.table("users").select("*").eq("is_active", True).execute()
    users = users_res.data or []

    sent = []
    failed = []

    for user in users:
        slots_to_check = dict(FIXED_SLOTS)
        morning_time = parse_nudge_time(user.get("nudge_time", ""))
        if morning_time:
            slots_to_check["morning_nudge"] = morning_time

        for slot, target in slots_to_check.items():
            if not _is_due(now_ist, target):
                continue
            if _already_sent_today(db, user["id"], slot):
                continue
            try:
                _send_nudge(db, user, slot)
                sent.append({"user": user.get("name"), "slot": slot})
            except Exception as e:
                # the cron caller (GitHub Actions) doesn't capture the
                # response body, so this was previously invisible anywhere —
                # print it so a failure actually shows up in Render logs
                print(f"[nudges] failed to send {slot} to {user.get('name')} ({user.get('id')}): {e}")
                failed.append({"user": user.get("name"), "slot": slot, "error": str(e)})

    return {"checked": len(users), "sent": sent, "failed": failed}
