import random
import requests
from app.database.supabase_client import get_supabase

# Picked for light "wild thing that happened to somebody" energy —
# deliberately NOT r/confession or r/relationship_advice, which surface
# genuinely serious content (self-harm, abuse, explicit content) far too
# often for a casual "wanna hear something funny" feature.
SUBREDDITS = ["tifu", "MaliciousCompliance", "pettyrevenge", "AmItheAsshole", "mildlyinfuriating"]
USER_AGENT = "KYROO-StoryFetcher/1.0 (WhatsApp life-coaching bot)"

# Deliberately short — this is enough for KYROO to know the gist and retell
# it casually in its own words, not a substitute for the original post.
MAX_GIST_CHARS = 300
STORIES_PER_SUBREDDIT = 3
TARGET_POOL_SIZE = 10

# Defense-in-depth on top of subreddit choice — skip anything that touches
# genuinely heavy topics, which have no place in a casual "fun story" feature
# regardless of which subreddit it came from.
_UNSAFE_KEYWORDS = [
    "suicide", "self harm", "self-harm", "kill myself", "abuse", "rape",
    "molest", "overdose", "medication", "self medicate", "assault",
    "die", "death threat", "cutting myself", "csa", "cheat", "affair",
]


def _is_safe(title: str, gist: str) -> bool:
    text = f"{title} {gist}".lower()
    return not any(k in text for k in _UNSAFE_KEYWORDS)


def _fetch_subreddit_top(subreddit: str, limit: int) -> list[dict]:
    try:
        # old.reddit.com + an honest, descriptive User-Agent is what
        # actually works unauthenticated — www.reddit.com 403s regardless
        # of headers, and a spoofed browser User-Agent gets blocked too;
        # Reddit wants bots to identify themselves honestly, which this does
        res = requests.get(
            f"https://old.reddit.com/r/{subreddit}/top.json",
            params={"limit": limit * 2, "t": "week"},  # over-fetch, since some get filtered out
            headers={"User-Agent": USER_AGENT},
            timeout=10,
        )
        res.raise_for_status()
        posts = []
        for child in res.json().get("data", {}).get("children", []):
            p = child.get("data", {})
            if p.get("over_18") or p.get("stickied"):
                continue
            title = (p.get("title") or "").strip()
            if not title:
                continue
            gist = (p.get("selftext") or "").strip()[:MAX_GIST_CHARS]
            if not _is_safe(title, gist):
                continue
            posts.append({
                "subreddit": subreddit,
                "title": title,
                "gist": gist,
                "url": f"https://reddit.com{p.get('permalink', '')}",
            })
            if len(posts) >= limit:
                break
        return posts
    except Exception as e:
        print(f"[stories] fetch error for r/{subreddit}: {e}")
        return []


def refresh_story_cache() -> dict:
    """Re-fetches a fresh pool of ~10 stories and replaces the cached set —
    called on a schedule, not per-message."""
    db = get_supabase()
    all_posts = []
    for sub in SUBREDDITS:
        all_posts.extend(_fetch_subreddit_top(sub, STORIES_PER_SUBREDDIT))

    if not all_posts:
        return {"fetched": 0, "stored": 0}

    random.shuffle(all_posts)

    try:
        db.table("story_cache").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    except Exception as e:
        print(f"[stories] cache clear error: {e}")

    stored = 0
    for post in all_posts[:TARGET_POOL_SIZE]:
        try:
            db.table("story_cache").insert({
                "source": "reddit",
                "subreddit": post["subreddit"],
                "title": post["title"],
                "gist": post["gist"],
                "url": post["url"],
            }).execute()
            stored += 1
        except Exception as e:
            print(f"[stories] store error: {e}")

    return {"fetched": len(all_posts), "stored": stored}


def get_random_stories(n: int = 3) -> list[dict]:
    db = get_supabase()
    try:
        res = db.table("story_cache").select("title, gist, subreddit").limit(30).execute()
        rows = res.data or []
    except Exception:
        return []
    random.shuffle(rows)
    return rows[:n]
