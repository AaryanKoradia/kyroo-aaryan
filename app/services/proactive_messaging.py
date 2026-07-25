import os
from datetime import datetime, timedelta

from app.infrastructure.whatsapp.client import WhatsAppClient

SESSION_WINDOW_HOURS = 24

# _send_nudge (nudge_service.py) writes a chat_history row for every nudge
# it sends too, using the slot name as a placeholder user_message — those
# rows must never count as "the user replied recently" here, or a
# successfully-sent nudge would keep re-stamping a false recency signal
# for every nudge after it, forever, even if the user never actually
# replies again. This is exactly what caused a real 131047 error in
# production: the window check kept passing on nudge-refreshed
# timestamps alone.
_NUDGE_PLACEHOLDER_MESSAGES = {"morning_nudge", "afternoon_nudge", "evening_nudge", "night_nudge"}


def is_within_session_window(db, user_id: str) -> bool:
    """WhatsApp only allows free-form business-initiated messages within 24
    hours of the user's LAST REAL MESSAGE — outside that, only approved
    templates work (a free-form send returns error 131047). Looks past
    any nudge-placeholder rows to find the most recent genuine inbound
    message."""
    try:
        res = (
            db.table("chat_history")
            .select("created_at")
            .eq("user_id", user_id)
            .not_.in_("user_message", list(_NUDGE_PLACEHOLDER_MESSAGES))
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        rows = res.data or []
    except Exception as e:
        print(f"[proactive] session window check failed for {user_id}: {e}")
        return False

    if not rows:
        return False

    last = datetime.fromisoformat(rows[0]["created_at"])
    now = datetime.now(last.tzinfo) if last.tzinfo else datetime.now()
    return now - last < timedelta(hours=SESSION_WINDOW_HOURS)


def send_proactive(db, user: dict, free_form_sender, template_env_var: str, template_params: list[str]) -> str:
    """Sends a business-initiated message the compliant way: if the user
    texted within the last 24h, free_form_sender() runs as normal (the
    rich, LLM-personalized message). Otherwise, falls back to the approved
    template named by the template_env_var env var (e.g.
    WHATSAPP_TEMPLATE_REMINDER) — templates can't carry fully dynamic
    LLM text, so template_params are the (few) values that fill its
    {{1}}, {{2}}... placeholders. If no template is configured yet
    (env var unset), skips the send and logs why instead of attempting a
    free-form send that would just fail with error 131047.

    Returns "sent_freeform", "sent_template", or "skipped_no_template"."""
    phone = user.get("phone", "")

    if is_within_session_window(db, user["id"]):
        free_form_sender()
        return "sent_freeform"

    template_name = os.getenv(template_env_var, "")
    if not template_name:
        print(
            f"[proactive] {user.get('name')} ({user['id']}) is outside the 24h "
            f"session window and {template_env_var} isn't set yet — skipping "
            "instead of sending a free-form message that would fail with error 131047."
        )
        return "skipped_no_template"

    WhatsAppClient().send_template(phone, template_name, body_params=template_params)
    return "sent_template"
