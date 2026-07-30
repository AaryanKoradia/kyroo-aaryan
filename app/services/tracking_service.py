import logging
from datetime import datetime

import pytz

from app.database.supabase_client import get_supabase
from app.services.nudge_time import parse_nudge_time

IST = pytz.timezone("Asia/Kolkata")
logger = logging.getLogger(__name__)

# Every field the log_daily_activity tool can set, one-to-one with
# user_tracking's own column names — no name-mapping layer, so a new
# trackable field only ever needs adding in one place (there, and here).
TRACKABLE_FIELDS = (
    "spent_today", "spent_category", "mood_score", "stress_score",
    "workout_done", "workout_name", "workout_duration",
    "sleep_hours", "study_minutes", "study_topic",
)

# users.<column> for each nudge-able domain. "mind" reuses the pre-existing
# nudge_time column (it already meant "the morning/mind slot"); the other
# three are new columns added specifically for this.
DOMAIN_TIME_COLUMNS = {
    "mind": "nudge_time",
    "money": "money_nudge_time",
    "fitness": "fitness_nudge_time",
    "study": "study_nudge_time",
}


def log_daily_activity(user_id: str, **fields) -> dict:
    """Upserts today's (IST) user_tracking row for user_id with whatever
    of TRACKABLE_FIELDS were actually given — called by the
    log_daily_activity tool whenever the user mentions something
    trackable in normal conversation, so nudges have real data to draw
    on instead of always hitting their "nothing logged yet" fallback."""
    data = {k: v for k, v in fields.items() if k in TRACKABLE_FIELDS and v is not None}
    if not data:
        return {"ok": False, "error": "nothing to log"}

    today = datetime.now(IST).strftime("%Y-%m-%d")
    db = get_supabase()
    try:
        existing = (
            db.table("user_tracking").select("id")
            .eq("user_id", user_id).eq("date", today)
            .limit(1).execute()
        )
        if existing.data:
            db.table("user_tracking").update(data).eq("id", existing.data[0]["id"]).execute()
        else:
            db.table("user_tracking").insert({"user_id": user_id, "date": today, **data}).execute()
        return {"ok": True}
    except Exception as e:
        logger.exception(f"[tracking] failed to log activity for {user_id}: {e}")
        return {"ok": False, "error": str(e)}


def set_domain_nudge_time(user_id: str, domain: str, time_str: str) -> dict:
    """Updates which time of day KYROO checks in about a given domain,
    based on the user's own stated routine - e.g. "I work out every
    morning" -> fitness moves to morning from the next check. Never set
    from a fixed default or a form; only ever from what the user actually
    says, via the set_nudge_time tool."""
    column = DOMAIN_TIME_COLUMNS.get(domain)
    if not column:
        return {"ok": False, "error": f"unknown domain '{domain}', must be one of {list(DOMAIN_TIME_COLUMNS)}"}
    if parse_nudge_time(time_str) is None:
        return {"ok": False, "error": f"'{time_str}' isn't a time I can parse, use a format like '7 AM' or '9:30 PM'"}

    db = get_supabase()
    try:
        db.table("users").update({column: time_str}).eq("id", user_id).execute()
        return {"ok": True}
    except Exception as e:
        logger.exception(f"[tracking] failed to set {domain} nudge time for {user_id}: {e}")
        return {"ok": False, "error": str(e)}
