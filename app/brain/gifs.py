import os
import requests

GIPHY_API_KEY = os.getenv("GIPHY_API_KEY", "")


def search_gif_url(query: str) -> str | None:
    """Searches GIPHY for a gif matching query, returns an mp4 video URL
    (WhatsApp doesn't animate .gif files sent as images — an mp4 sent as a
    video message is what actually renders as an animated gif), or None if
    nothing found or GIPHY isn't configured."""
    if not GIPHY_API_KEY:
        return None
    try:
        res = requests.get(
            "https://api.giphy.com/v1/gifs/search",
            params={
                "api_key": GIPHY_API_KEY,
                "q": query,
                "limit": 1,
                "rating": "pg-13",
            },
            timeout=8,
        )
        data = res.json()
        results = data.get("data", [])
        if not results:
            return None
        images = results[0].get("images", {})
        mp4 = images.get("fixed_height", {}).get("mp4") or images.get("original", {}).get("mp4")
        return mp4 or None
    except Exception as e:
        print(f"[gifs] search error: {e}")
        return None
