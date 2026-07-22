import os
import voyageai
from app.database.supabase_client import get_supabase
from app.core.config import settings

VOYAGE_MODEL = "voyage-3-lite"
_voyage_client = None


def get_voyage():
    global _voyage_client
    if _voyage_client is None:
        if not settings.voyage_api_key:
            return None
        _voyage_client = voyageai.Client(api_key=settings.voyage_api_key)
    return _voyage_client


class MemoryService:

    def __init__(self, db=None):
        self.db = db or get_supabase()

    def get_context(self, user_id: str) -> str:
        memories = self._search_recent_memories(user_id, limit=3)
        if not memories:
            return ""
        context_parts = []
        for m in memories:
            context_parts.append(f"- {m['content']}")
        return "\n".join(context_parts)

    def _search_recent_memories(self, user_id: str, limit: int = 3) -> list[dict]:
        try:
            res = (
                self.db.table("memory_embeddings")
                .select("content, source, created_at")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception:
            return []

    def search_memories(self, user_id: str, query: str, limit: int = 3, min_similarity: float = 0.5) -> list[dict]:
        voyage = get_voyage()
        if not voyage:
            return self._search_recent_memories(user_id, limit)
        try:
            result = voyage.embed([query], model=VOYAGE_MODEL, input_type="query")
            vector = result.embeddings[0]
            res = self.db.rpc("match_memories", {
                "query_embedding": vector,
                "match_user_id": user_id,
                "match_count": limit,
            }).execute()
            return [m for m in (res.data or []) if m.get("similarity", 0) >= min_similarity]
        except Exception:
            return self._search_recent_memories(user_id, limit)

    def save_memory(self, user_id: str, content: str, source: str = "chat") -> bool:
        voyage = get_voyage()
        if voyage:
            try:
                result = voyage.embed([content], model=VOYAGE_MODEL, input_type="document")
                vector = result.embeddings[0]
                self.db.table("memory_embeddings").insert({
                    "user_id": user_id,
                    "content": content,
                    "embedding": vector,
                    "source": source,
                }).execute()
                return True
            except Exception:
                pass
        return False

    def get_emotional_memory(self, user_id: str, limit: int = 10) -> list[dict]:
        try:
            res = (
                self.db.table("emotional_memory")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return res.data or []
        except Exception:
            return []

    def get_unfollowedup_memories(self, user_id: str) -> list[dict]:
        try:
            res = (
                self.db.table("emotional_memory")
                .select("*")
                .eq("user_id", user_id)
                .eq("follow_up_sent", False)
                .order("created_at", desc=True)
                .limit(3)
                .execute()
            )
            return res.data or []
        except Exception:
            return []

    def save_emotional_memory(self, user_id: str, event_type: str, detail: str) -> bool:
        try:
            self.db.table("emotional_memory").insert({
                "user_id": user_id,
                "event_type": event_type,
                "detail": detail,
                "follow_up_sent": False,
            }).execute()
            return True
        except Exception:
            return False

    def mark_memory_followedup(self, memory_id: str) -> bool:
        try:
            self.db.table("emotional_memory").update({
                "follow_up_sent": True,
            }).eq("id", memory_id).execute()
            return True
        except Exception:
            return False
