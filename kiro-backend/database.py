from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()

_supabase: Client = None

def get_db() -> Client:
    global _supabase
    if _supabase is None:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL / SUPABASE_KEY are not set. Add them to kiro-backend/.env"
            )
        _supabase = create_client(url, key)
    return _supabase

def get_user(user_id: str):
    try:
        res = get_db().table("users").select("*").eq("id", user_id).single().execute()
        return res.data
    except:
        return None

def get_onboarding(user_id: str):
    return get_user(user_id)

def get_messages(user_id: str, limit: int = 20, domain: str = None):
    try:
        query = get_db().table("chat_history").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit)
        if domain:
            query = query.eq("module", domain)
        res = query.execute()
        messages = []
        for m in reversed(res.data or []):
            messages.append({"role": "user", "content": m["user_message"]})
            messages.append({"role": "assistant", "content": m["kiro_response"]})
        return messages
    except:
        return []

def save_message(user_id: str, role: str, content: str, domain: str = "general"):
    pass

def get_tracking_logs(user_id: str, limit: int = 14):
    try:
        res = get_db().table("user_tracking").select("*").eq("user_id", user_id).order("date", desc=True).limit(limit).execute()
        return res.data or []
    except:
        return []

def get_fitness_logs(user_id: str, limit: int = 7):
    logs = get_tracking_logs(user_id, limit)
    return [l for l in logs if l.get("workout_done")]

def get_finance_logs(user_id: str, limit: int = 7):
    logs = get_tracking_logs(user_id, limit)
    return [l for l in logs if l.get("spent_today") is not None]

def get_sleep_logs(user_id: str, limit: int = 7):
    logs = get_tracking_logs(user_id, limit)
    return [l for l in logs if l.get("sleep_hours") is not None]

def get_mood_logs(user_id: str, limit: int = 7):
    logs = get_tracking_logs(user_id, limit)
    return [l for l in logs if l.get("mood_score") is not None]

def save_nudge(user_id: str, content: str, domain: str):
    pass

def save_emotional_memory(user_id: str, event_type: str, detail: str):
    try:
        get_db().table("emotional_memory").insert({
            "user_id": user_id,
            "event_type": event_type,
            "detail": detail,
            "follow_up_sent": False
        }).execute()
    except:
        pass

def get_emotional_memory(user_id: str, limit: int = 10):
    try:
        res = get_db().table("emotional_memory").select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(limit)\
            .execute()
        return res.data or []
    except:
        return []

def get_unfollowedup_memories(user_id: str):
    try:
        res = get_db().table("emotional_memory").select("*")\
            .eq("user_id", user_id)\
            .eq("follow_up_sent", False)\
            .order("created_at", desc=True)\
            .limit(3)\
            .execute()
        return res.data or []
    except:
        return []

def mark_memory_followedup(memory_id: str):
    try:
        get_db().table("emotional_memory").update({"follow_up_sent": True})\
            .eq("id", memory_id)\
            .execute()
    except:
        pass

def get_user_style(user_id: str):
    try:
        res = get_db().table("user_style").select("*")\
            .eq("user_id", user_id)\
            .single()\
            .execute()
        return res.data
    except:
        return None

def save_user_style(user_id: str, style: dict):
    try:
        existing = get_user_style(user_id)
        if existing:
            get_db().table("user_style").update(style)\
                .eq("user_id", user_id)\
                .execute()
        else:
            get_db().table("user_style").insert({"user_id": user_id, **style})\
                .execute()
    except:
        pass