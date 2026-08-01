import logging
from datetime import datetime, time as dtime

import pytz
import sentry_sdk

from app.database.supabase_client import get_supabase
from app.brain.kyroo_brain import (
    generate_mind_nudge,
    generate_money_nudge,
    generate_fitness_nudge,
    generate_study_nudge,
)
from app.brain.response_validator import _strip_em_dashes, _strip_cringe_emoji
from app.infrastructure.whatsapp.client import WhatsAppClient
from app.services.nudge_time import parse_nudge_time
from app.services.proactive_messaging import send_proactive
from app.services.tracking_service import DOMAIN_TIME_COLUMNS
from app.services.cron_log import log_cron_run

IST = pytz.timezone("Asia/Kolkata")
logger = logging.getLogger(__name__)

GENERATORS = {
    "mind_nudge": generate_mind_nudge,
    "money_nudge": generate_money_nudge,
    "fitness_nudge": generate_fitness_nudge,
    "study_nudge": generate_study_nudge,
}

# Falls back to these ONLY if a user's stored time for a domain is missing
# or unparseable (shouldn't normally happen — the schema gives every
# domain column a sensible default) — never used to override a real,
# user-set preference. The actual per-user time always comes from
# DOMAIN_TIME_COLUMNS on the users row, kept current by the set_nudge_time
# tool whenever KYROO picks up on the user's own stated routine.
DEFAULT_SLOT_TIMES = {
    "mind_nudge": dtime(hour=7, minute=0),
    "money_nudge": dtime(hour=13, minute=0),
    "fitness_nudge": dtime(hour=18, minute=30),
    "study_nudge": dtime(hour=21, minute=0),
}

_SLOT_TO_DOMAIN = {"mind_nudge": "mind", "money_nudge": "money", "fitness_nudge": "fitness", "study_nudge": "study"}

# Deliberate product decision, not a temporary gap: nudges only ever go
# out free-form, inside the user's 24h WhatsApp session window, where the
# real AI-generated, data-grounded version can be sent. A WhatsApp
# template is static — the exact same wording every time — which felt
# robotic and repetitive compared to the real thing once actually
# compared side by side. So even though templates for all 4 domains
# exist and can be approved, these env vars are meant to stay UNSET on
# purpose. If a domain's env var ever does get set (e.g. by accident,
# or a future decision to reverse this), send_proactive will use it as
# a fallback — that's just how the shared plumbing works, not something
# this file forces either way.
SLOT_TEMPLATE_ENV_VARS = {
    "mind_nudge": "WHATSAPP_TEMPLATE_NUDGE_MIND",
    "money_nudge": "WHATSAPP_TEMPLATE_NUDGE_MONEY",
    "fitness_nudge": "WHATSAPP_TEMPLATE_NUDGE_FITNESS",
    "study_nudge": "WHATSAPP_TEMPLATE_NUDGE_STUDY",
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
# on. The mind slot is exempt — it's the one daily check-in, not the
# thing users described as irritating.
DISENGAGEMENT_THRESHOLD = -0.4
MIN_MESSAGES_FOR_DISENGAGEMENT_CHECK = 5


def _slot_target_time(user: dict, slot: str) -> dtime:
    """This user's own time for this domain, parsed from the relevant
    users.<domain>_nudge_time column — never a fixed global time. Falls
    back to DEFAULT_SLOT_TIMES only if that column is somehow empty or
    unparseable."""
    domain = _SLOT_TO_DOMAIN[slot]
    column = DOMAIN_TIME_COLUMNS[domain]
    return parse_nudge_time(user.get(column, "")) or DEFAULT_SLOT_TIMES[slot]


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


def _claim_nudge(db, user_id: str, slot: str) -> bool:
    """Atomically claims (user_id, slot, today) via sent_nudges' primary
    key — returns True if this call won the claim, False if another
    (overlapping) cron run already holds it. Must be called right before
    sending, not at the top of the loop, so the window where a duplicate
    run could race in is as small as possible."""
    today = datetime.now(IST).date().isoformat()
    try:
        db.table("sent_nudges").insert({"user_id": user_id, "slot": slot, "sent_date": today}).execute()
        return True
    except Exception:
        return False


def _release_nudge_claim(db, user_id: str, slot: str) -> None:
    """Releases a claim after a failed send so the next cron tick (still
    within the fire window) can retry instead of the user silently never
    getting this nudge."""
    today = datetime.now(IST).date().isoformat()
    try:
        db.table("sent_nudges").delete().eq("user_id", user_id).eq("slot", slot).eq("sent_date", today).execute()
    except Exception:
        pass


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


def _send_nudge(db, user: dict, slot: str) -> str:
    """Generating the full LLM nudge is deferred into the closure below so
    it only actually runs when we're within the 24h session window — if
    we're outside it, send_proactive falls back to a template ping
    instead, and there's no point paying for an LLM call whose output
    would just get discarded. Returns send_proactive's outcome
    ("sent_freeform", "sent_template", or "skipped_no_template") so the
    caller can report accurately whether anything was actually
    delivered, instead of counting every non-exception as "sent"."""
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
        SLOT_TEMPLATE_ENV_VARS[slot], [user.get("name", "yaar")],
    )
    if outcome == "skipped_no_template":
        # nothing was actually sent — don't log it as today's nudge, so a
        # later attempt (once a template is configured) isn't blocked by
        # _already_sent_today
        return outcome

    db.table("chat_history").insert({
        "user_id": user["id"],
        "user_message": slot,
        "kiro_response": sent_text["value"] or f"(sent via {outcome})",
        "module": "general",
    }).execute()
    return outcome


def check_and_send_nudges() -> dict:
    db = get_supabase()
    now_ist = datetime.now(IST)

    users_res = db.table("users").select("*").eq("is_active", True).execute()
    users = users_res.data or []

    sent = []
    failed = []
    suppressed = []

    for user in users:
        # computed once per user, not per slot — same verdict applies to
        # every slot checked below. This USED to also gate on whether the
        # most recent nudge of ANY domain went unanswered today — dropped,
        # because with 4 genuinely different domains now, ignoring the
        # morning mind check-in is not a reason to also withhold the
        # unrelated money/fitness/study ones later that day; each domain
        # already caps at once/day via _already_sent_today on its own.
        disengaged = _is_disengaged(db, user["id"])

        for slot in GENERATORS:
            target = _slot_target_time(user, slot)
            if not _is_due(now_ist, target):
                continue
            if _already_sent_today(db, user["id"], slot):
                continue
            if slot != "mind_nudge" and disengaged:
                suppressed.append({"user": user.get("name"), "slot": slot, "reason": "disengaged"})
                continue
            if not _claim_nudge(db, user["id"], slot):
                # another (overlapping) cron run already claimed this
                # user+slot+day — not a failure, just don't double-send
                continue
            try:
                outcome = _send_nudge(db, user, slot)
                if outcome == "skipped_no_template":
                    _release_nudge_claim(db, user["id"], slot)
                    # by design, not a bug — see SLOT_TEMPLATE_ENV_VARS above
                    suppressed.append({"user": user.get("name"), "slot": slot, "reason": "outside_session_window_no_fallback_by_design"})
                else:
                    sent.append({"user": user.get("name"), "slot": slot})
            except Exception as e:
                _release_nudge_claim(db, user["id"], slot)
                # the cron caller (GitHub Actions) doesn't capture the
                # response body, so this was previously invisible anywhere —
                # print it so a failure actually shows up in Render logs
                logger.exception(f"[nudges] failed to send {slot} to {user.get('name')} ({user.get('id')}): {e}")
                sentry_sdk.capture_exception(e)
                failed.append({"user": user.get("name"), "slot": slot, "error": str(e)})

    log_cron_run(db, "nudges", checked=len(users), sent=len(sent), failed=len(failed), suppressed=len(suppressed))
    return {"checked": len(users), "sent": sent, "failed": failed, "suppressed": suppressed}
