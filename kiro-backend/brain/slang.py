import requests


def lookup_slang(term: str) -> str:
    try:
        res = requests.get(
            "https://api.urbandictionary.com/v0/define",
            params={"term": term},
            timeout=5
        )
        data = res.json()
        results = data.get("list", [])
        if not results:
            return f"No definition found for '{term}'."
        top = max(results, key=lambda r: r.get("thumbs_up", 0))
        definition = top.get("definition", "").replace("[", "").replace("]", "")
        example = top.get("example", "").replace("[", "").replace("]", "")
        return f"{term}: {definition[:300]}" + (f" | example: {example[:150]}" if example else "")
    except Exception as e:
        return f"Couldn't look up '{term}': {e}"
