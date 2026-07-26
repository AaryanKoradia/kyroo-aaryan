import re
from datetime import datetime, time as dtime

import pytz

from app.database.supabase_client import get_supabase
from app.brain.kyroo_brain import (
    generate_morning_nudge,
    generate_afternoon_nudge,
    generate_evening_nudge,
    generate_night_nudge,
)
from app.brain.response_validator import _strip_em_dashes, _strip_cringe_emoji
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

# Below this rolling engagement score (see detect_reaction_signal /
# analyze_user_style in kyroo_brain.py — already tracked from every chat
# turn), a user seems consistently checked out rather than just having one
# flat reply, so non-essential nudge slots get skipped instead of piling
# on. The morning slot is exempt — it's the one daily check-in, not the
# thing users described as irritating.
DISENGAGEMENT_THRESHOLD = -0.4
MIN_MESSAGES_FOR_DISENGAGEMENT_CHECK = 5

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


def _is_disengaged(db, user_id: str) -> bool:
    """True if this user's rolling chat engagement score suggests extra
    proactive nudges would land as spam rather than being welcome. Reuses
    the engagement_score already tracked per-message in kyroo_brain.py
    (analyze_user_style/detect_reaction_signal), no new tracking needed."""
    try:
        res = db.table("user_style").select("engagement_score, message_count").eq("user_id", user_id).single().execute()
        style = res.data
    except Exception:
        return False
    if not style or (style.get("message_count") or 0) < MIN_MESSAGES_FOR_DISENGAGEMENT_CHECK:
        return False
    return (style.get("engagement_score") or 0) < DISENGAGEMENT_THRESHOLD


_NUDGE_SLOT_NAMES = set(GENERATORS.keys())


def _has_unanswered_nudge(db, user_id: str) -> bool:
    """True if the most recent chat_history row for this user IS a nudge
    (user_message equals one of the slot-name placeholders _send_nudge
    writes, never a real inbound message) — meaning the user hasn't
    actually replied to anything since. Piling another nudge on top of an
    already-unanswered one is exactly what got reported as spammy, so
    every slot (including morning) is gated on this, not just the
    engagement-score check below."""
    try:
        res = (
            db.table("chat_history")
            .select("user_message")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = res.data or []
    except Exception:
        return False
    if not rows:
        return False
    return rows[0].get("user_message") in _NUDGE_SLOT_NAMES


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
        # sent as ONE WhatsApp message, not split into multiple bubbles —
        # a nudge arriving as a burst of 3-4 separate texts in a row was
        # part of what made nudges feel spammy. The internal blank lines
        # in the structured brief format are just visual spacing within
        # that one message, not separate sends.
        nudge_text = _strip_cringe_emoji(_strip_em_dashes(GENERATORS[slot](user)))
        WhatsAppClient().send_one(phone, nudge_text)
        sent_text["value"] = nudge_text

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
    suppressed = []

    for user in users:
        slots_to_check = dict(FIXED_SLOTS)
        morning_time = parse_nudge_time(user.get("nudge_time", ""))
        if morning_time:
            slots_to_check["morning_nudge"] = morning_time

        # computed once per user, not per slot — same verdict applies to
        # every slot checked below
        disengaged = _is_disengaged(db, user["id"])
        unanswered = _has_unanswered_nudge(db, user["id"])

        for slot, target in slots_to_check.items():
            if not _is_due(now_ist, target):
                continue
            if _already_sent_today(db, user["id"], slot):
                continue
            if unanswered:
                suppressed.append({"user": user.get("name"), "slot": slot, "reason": "unanswered_nudge"})
                continue
            if slot != "morning_nudge" and disengaged:
                suppressed.append({"user": user.get("name"), "slot": slot, "reason": "disengaged"})
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

    return {"checked": len(users), "sent": sent, "failed": failed, "suppressed": suppressed}
