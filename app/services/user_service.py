from app.database.supabase_client import get_supabase


class UserService:

    def __init__(self, db=None):
        self.db = db or get_supabase()

    def get_or_create_user(self, phone: str) -> dict:
        """Get user by phone or create new one.

        Ordered by onboarding_step (then created_at) descending so that if
        more than one row ever exists for the same phone — e.g. a stale
        WhatsApp-first row stuck at AWAITING_ENTRY_CHOICE alongside a
        complete row from a later website signup, before the signup
        endpoint started upserting by phone — the most-onboarded row wins
        instead of an arbitrary one. onboarding_step is a reliable
        "how done is this row" signal: -1/-2/-3 are WhatsApp-native
        onboarding states, 0-12 are in-progress questions, 99 is complete."""
        try:
            res = (
                self.db.table("users").select("*")
                .eq("phone", phone)
                .order("onboarding_step", desc=True)
                .order("created_at", desc=True)
                .execute()
            )
            if res.data:
                return res.data[0]
        except Exception:
            pass

        # Create new user. onboarding_step=-1 marks them as never having
        # gone through the website form — the webhook uses this to gate
        # them into a WhatsApp-native onboarding flow instead of full chat.
        try:
            res = self.db.table("users").insert({
                "phone": phone,
                "name": phone,
                "email": f"{phone}@temp.kyroo",
                "language": "Hinglish",
                "nudge_time": "7 AM",
                "plan": "free",
                "is_active": True,
                "onboarding_step": -1,
            }).execute()
            return res.data[0]
        except Exception as e:
            # Two concurrent first-messages from the same brand-new phone
            # (Meta redelivery racing the original, or two rapid inbound
            # messages) can both pass the "no existing row" check above
            # before either INSERT commits. The temp email is deterministic
            # per phone and unique-constrained, so the loser here hits a
            # unique-violation rather than silently duplicating — re-fetch
            # and return the winner's row instead of blowing up the whole
            # webhook request over a race that isn't actually an error.
            try:
                retry = (
                    self.db.table("users").select("*")
                    .eq("phone", phone)
                    .order("onboarding_step", desc=True)
                    .order("created_at", desc=True)
                    .execute()
                )
                if retry.data:
                    return retry.data[0]
            except Exception:
                pass
            raise RuntimeError(f"Failed to create user: {e}")

    def get_user(self, user_id: str) -> dict | None:
        """Get user by ID."""
        try:
            res = self.db.table("users").select("*").eq("id", user_id).single().execute()
            return res.data
        except Exception:
            return None

    def update_user(self, user_id: str, data: dict) -> bool:
        """Update user fields."""
        try:
            self.db.table("users").update(data).eq("id", user_id).execute()
            return True
        except Exception:
            return False