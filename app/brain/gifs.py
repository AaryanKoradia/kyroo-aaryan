import os
import requests

TENOR_API_KEY = os.getenv("TENOR_API_KEY", "")
TENOR_CLIENT_KEY = "kyroo_whatsapp"


def search_gif_url(query: str) -> str | None:
    """Searches Tenor for a gif matching query, returns an mp4 video URL
    (WhatsApp doesn't animate .gif files sent as images — an mp4 sent as a
    video message is what actually renders as an animated gif), or None if
    nothing found or Tenor isn't configured."""
    if not TENOR_API_KEY:
        return None
    try:
        res = requests.get(
            "https://tenor.googleapis.com/v2/search",
            params={
                "q": query,
                "key": TENOR_API_KEY,
                "client_key": TENOR_CLIENT_KEY,
                "limit": 1,
                "media_filter": "mp4",
                "contentfilter": "medium",
            },
            timeout=8,
        )
        data = res.json()
        results = data.get("results", [])
        if not results:
            return None
        formats = results[0].get("media_formats", {})
        mp4 = formats.get("tinymp4") or formats.get("mp4")
        return mp4.get("url") if mp4 else None
    except Exception as e:
        print(f"[gifs] search error: {e}")
        return None
