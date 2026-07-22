from app.database.supabase_client import get_supabase
from app.models.message import MessageRole


class ConversationService:

    def __init__(self, db=None):
        self.db = db or get_supabase()

    def add_message(
        self,
        user: dict,
        role: MessageRole,
        content: str,
        module: str = "general",
    ) -> dict:
        """Add a message to chat history."""
        if role == MessageRole.USER:
            user_message = content
            kiro_response = ""
        else:
            user_message = ""
            kiro_response = content

        res = self.db.table("chat_history").insert({
            "user_id": user["id"],
            "user_message": user_message,
            "kiro_response": kiro_response,
            "module": module,
        }).execute()

        return {"conversation_id": user["id"]}

    def add_exchange(
        self,
        user: dict,
        user_message: str,
        kiro_response: str,
        module: str = "general",
    ) -> None:
        """Saves the user message + KYROO's reply as a single batched insert
        (2 rows, 1 network round trip) instead of two separate add_message()
        calls."""
        self.db.table("chat_history").insert([
            {"user_id": user["id"], "user_message": user_message, "kiro_response": "", "module": module},
            {"user_id": user["id"], "user_message": "", "kiro_response": kiro_response, "module": module},
        ]).execute()

    def history(
        self,
        conversation_id: str,
        limit: int = 10,
    ) -> list[dict]:
        """Get recent chat history as message objects."""
        try:
            res = (
                self.db.table("chat_history")
                .select("*")
                .eq("user_id", conversation_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )

            messages = []
            for m in reversed(res.data or []):
                if m.get("user_message"):
                    messages.append({
                        "role": "user",
                        "content": m["user_message"],
                    })
                if m.get("kiro_response"):
                    messages.append({
                        "role": "assistant",
                        "content": m["kiro_response"],
                    })
            return messages
        except Exception:
            return []

    def get_history_raw(
        self,
        user_id: str,
        limit: int = 10,
    ) -> list[dict]:
        """Get raw chat history records."""
        try:
            res = (
                self.db.table("chat_history")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception:
            return []