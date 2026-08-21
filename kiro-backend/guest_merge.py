GUEST_ONBOARDING_STEP = -2  # keep in sync with app/brain/onboarding_flow.py

# Tables a guest's brief trial chat could plausibly have touched (the full
# kyroo_brain runs for guests too, tools and all — see app/api/routes/chat.py).
# message_usage/sent_nudges are deliberately excluded: guests never go
# through check_usage or the nudge cron, so there's nothing there to move.
_MERGE_TABLES = [
    "chat_history", "user_tracking", "weekly_reports",
    "reminders", "emotional_memory", "memory_embeddings",
]


def resolve_guest(db, guest_token: str) -> dict | None:
    """Returns the guest's user row if guest_token is a live session for an
    actual guest identity, else None (missing/expired token, or a token
    that somehow points at a real account — never merge onto itself)."""
    if not guest_token:
        return None
    session = db.table("chat_sessions").select("user_id").eq("token", guest_token).execute()
    if not session.data:
        return None
    guest = db.table("users").select("id, onboarding_step").eq("id", session.data[0]["user_id"]).execute()
    if not guest.data or guest.data[0].get("onboarding_step") != GUEST_ONBOARDING_STEP:
        return None
    return guest.data[0]


def merge_guest_into_user(db, guest_id: str, real_user_id: str) -> None:
    """Re-points a guest's trial chat history onto a real account (used
    when someone hits the 5-message cap and logs into an EXISTING
    account — a fresh signup instead just updates the guest row in place,
    see routes/users.py, so no merge is needed there). Best-effort: a
    table-level conflict (e.g. user_tracking's unique (user_id, date) if
    both rows logged something for today) drops the guest's row rather
    than failing the whole login over a few messages' worth of trial data."""
    if guest_id == real_user_id:
        return
    for table in _MERGE_TABLES:
        try:
            db.table(table).update({"user_id": real_user_id}).eq("user_id", guest_id).execute()
        except Exception:
            db.table(table).delete().eq("user_id", guest_id).execute()

    # user_style is unique per user_id — transfer only if the real account
    # doesn't already have one, otherwise the guest's few-message sample
    # just gets dropped in favor of the real account's actual style.
    existing_style = db.table("user_style").select("id").eq("user_id", real_user_id).execute()
    if existing_style.data:
        db.table("user_style").delete().eq("user_id", guest_id).execute()
    else:
        db.table("user_style").update({"user_id": real_user_id}).eq("user_id", guest_id).execute()

    db.table("chat_sessions").delete().eq("user_id", guest_id).execute()
    db.table("users").delete().eq("id", guest_id).execute()
