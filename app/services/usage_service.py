import logging
from datetime import datetime
from urllib.parse import quote

import pytz
import sentry_sdk

IST = pytz.timezone("Asia/Kolkata")
logger = logging.getLogger(__name__)

# Free and Pro have a real daily cap; Pro Plus is unlimited (None). Pro's
# 300/day is a reasoned default, not a number the product owner gave
# explicitly - free was set to 100/day and Pro Plus to unlimited, but Pro's
# "higher cap" was left to be picked; adjust here if that's wrong.
DAILY_LIMITS: dict[str, int | None] = {
    "free": 100,
    "pro": 300,
    "pro_plus": None,
}

PRICING_URL = "https://www.kyroo.co.in/pricing"


def _limit_hit_message(phone: str) -> str:
    # carries the phone number so the pricing/payment pages can resolve
    # this user server-side even with nothing in that browser's
    # localStorage - this link is very often opened for the first time on
    # a phone that's never visited the website before, only WhatsApp.
    upgrade_url = f"{PRICING_URL}?phone={quote(phone)}"
    return (
        "hey, you've hit today's free message limit with me 😅\n\n"
        "you can top up for more messages today, or go unlimited with Pro/Pro Plus, right here: "
        f"{upgrade_url}\n\n"
        "once that's done just message me again and we'll pick up right where we left off"
    )


def check_usage(db, user: dict) -> tuple[bool, str | None]:
    """True + None if this message should get a real reply. False + a
    ready-to-send block message if the user is over their daily cap and
    has no bonus (top-up) messages left. Always increments today's usage
    count first, even for unlimited plans (so usage is visible either
    way), then checks it against the plan's cap.

    Fails OPEN on any infra error (a bug in this check, or the DB being
    down, should never be the reason a paying-or-not user can't get a
    reply) - logged to Sentry so a real failure is still visible."""
    plan = user.get("plan") or "free"
    limit = DAILY_LIMITS.get(plan, DAILY_LIMITS["free"])
    user_id = user.get("id")
    if not user_id:
        return True, None

    today = datetime.now(IST).date().isoformat()

    try:
        count = db.rpc("increment_message_usage", {"p_user_id": user_id, "p_date": today}).execute().data
    except Exception as e:
        logger.exception(f"[usage] increment failed for {user_id}: {e}")
        sentry_sdk.capture_exception(e)
        return True, None

    if limit is None or (count or 0) <= limit:
        return True, None

    # Over the daily cap - a purchased top-up can still cover this message.
    try:
        bonus_left = db.rpc("consume_bonus_message", {"p_user_id": user_id}).execute().data
    except Exception as e:
        logger.exception(f"[usage] bonus consume failed for {user_id}: {e}")
        sentry_sdk.capture_exception(e)
        bonus_left = None

    if bonus_left is not None:
        return True, None

    return False, _limit_hit_message(user.get("phone", ""))
