from datetime import datetime, timedelta, timezone

import requests

from app.database.supabase_client import get_supabase

# Slang/meme definitions are stable over this kind of window - re-fetching
# the same term on every message would just be redundant load on Urban
# Dictionary's API for content that hasn't changed.
CACHE_TTL_DAYS = 30


def _fetch_definition(term: str) -> str | None:
    """Returns None on a transient fetch error (never cached - a network
    blip shouldn't get remembered as "no definition" for 30 days), or the
    definition text otherwise, including the genuine not-found case (that
    result is stable and still worth caching)."""
    try:
        res = requests.get(
            "https://api.urbandictionary.com/v0/define",
            params={"term": term},
            timeout=5,
        )
        res.raise_for_status()
        data = res.json()
    except Exception:
        return None

    results = data.get("list", [])
    if not results:
        return f"No definition found for '{term}'."
    top = max(results, key=lambda r: r.get("thumbs_up", 0))
    definition = top.get("definition", "").replace("[", "").replace("]", "")
    example = top.get("example", "").replace("[", "").replace("]", "")
    return f"{term}: {definition[:300]}" + (f" | example: {example[:150]}" if example else "")


def lookup_slang(term: str) -> str:
    normalized = term.strip().lower()
    if not normalized:
        return "No term given."

    db = get_supabase()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=CACHE_TTL_DAYS)).isoformat()
    try:
        cached = (
            db.table("slang_cache")
            .select("definition")
            .eq("term", normalized)
            .gte("cached_at", cutoff)
            .limit(1)
            .execute()
        )
        if cached.data:
            return cached.data[0]["definition"]
    except Exception:
        pass  # cache lookup failing shouldn't block a live fetch

    definition = _fetch_definition(normalized)
    if definition is None:
        return f"Couldn't look up '{term}' right now."

    try:
        db.table("slang_cache").upsert({
            "term": normalized,
            "definition": definition,
            "cached_at": datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception:
        pass  # caching is best-effort, never block the actual reply on it

    return definition
