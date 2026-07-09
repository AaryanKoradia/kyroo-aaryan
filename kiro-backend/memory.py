import os
import voyageai
from database import get_db

VOYAGE_MODEL = "voyage-3-lite"

_voyage_client = None


def get_voyage():
    global _voyage_client
    if _voyage_client is None:
        api_key = os.getenv("VOYAGE_API_KEY")
        if not api_key:
            raise RuntimeError("VOYAGE_API_KEY is not set. Add it to kiro-backend/.env")
        _voyage_client = voyageai.Client(api_key=api_key)
    return _voyage_client


def embed_text(text: str, input_type: str = "document"):
    result = get_voyage().embed([text], model=VOYAGE_MODEL, input_type=input_type)
    return result.embeddings[0]


def save_memory(user_id: str, content: str, source: str = "chat"):
    try:
        vector = embed_text(content, input_type="document")
        get_db().table("memory_embeddings").insert({
            "user_id": user_id,
            "content": content,
            "embedding": vector,
            "source": source
        }).execute()
    except Exception as e:
        print(f"[memory] failed to save embedding: {e}")


def search_memories(user_id: str, query: str, limit: int = 3, min_similarity: float = 0.5):
    try:
        vector = embed_text(query, input_type="query")
        res = get_db().rpc("match_memories", {
            "query_embedding": vector,
            "match_user_id": user_id,
            "match_count": limit
        }).execute()
        return [m for m in (res.data or []) if m.get("similarity", 0) >= min_similarity]
    except Exception as e:
        print(f"[memory] search failed: {e}")
        return []
