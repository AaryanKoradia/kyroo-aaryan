from app.database.supabase_client import get_supabase


class UserService:

    def __init__(self, db=None):
        self.db = db or get_supabase()

    def get_or_create_user(self, phone: str) -> dict:
        """Get user by phone or create new one."""
        try:
            res = self.db.table("users").select("*").eq("phone", phone).execute()
            if res.data:
                return res.data[0]
        except Exception:
            pass

        # Create new user
        try:
            res = self.db.table("users").insert({
                "phone": phone,
                "name": phone,
                "email": f"{phone}@temp.kyroo",
                "language": "Hinglish",
                "nudge_time": "7 AM",
                "plan": "free",
                "is_active": True,
            }).execute()
            return res.data[0]
        except Exception as e:
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