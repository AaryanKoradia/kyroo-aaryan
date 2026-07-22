import random
import re

# Sticker artwork: OpenMoji (https://openmoji.org), CC BY-SA 4.0 — free for
# commercial use with attribution, converted from SVG to 512x512 WebP and
# uploaded once to Meta's Media API. Media ids below are permanent handles
# to that upload, not per-message ids.
STICKER_MEDIA_IDS: dict[str, str] = {
    "angry": "1235312205319543",
    "bittersweet": "1591401722419854",
    "cool": "1585059489876897",
    "crying": "1706975547221303",
    "crying_laughing": "1557831085797991",
    "eyeroll": "2201429507065829",
    "eyes": "1980908155957202",
    "fire": "1734475071201633",
    "heart": "1582465460265673",
    "huff": "1772427774121384",
    "hundred": "2233139087452653",
    "mindblown": "1348567650667200",
    "party": "3617549855062888",
    "pray": "2121111928819949",
    "salute": "1035880019145681",
    "skull": "1538260577775883",
    "smirk": "1507526974478281",
    "sobbing": "2068031924110122",
    "thumbsup": "27521422370876398",
    "weary": "1015136494814024",
}

# Mirrors the emoji vocabulary already defined in the persona's system
# prompt (kyroo_brain.py's EMOJI USAGE section) — same meanings, now
# available as an actual sticker instead of just a text character.
EMOJI_TO_MOOD: dict[str, str] = {
    "😭": "sobbing",
    "💀": "skull",
    "🔥": "fire",
    "😩": "weary",
    "🥲": "bittersweet",
    "👀": "eyes",
    "🙏": "pray",
    "😤": "huff",
    "💯": "hundred",
    "🫡": "salute",
    "😂": "crying_laughing",
    "❤": "heart",
    "❤️": "heart",
    "👍": "thumbsup",
    "😎": "cool",
    "🤯": "mindblown",
    "😢": "crying",
    "😡": "angry",
    "🎉": "party",
    "🙄": "eyeroll",
    "😏": "smirk",
}

_STICKER_WAR_RE = re.compile(r"\bsticker\s*(war|fight|battle|spam)\b", re.IGNORECASE)


def is_sticker_war_trigger(text: str) -> bool:
    """True if the user is explicitly asking to start a sticker war/fight,
    e.g. "sticker war", "sticker fight" — used to kick one off from a plain
    text message rather than only reacting to an incoming sticker."""
    return bool(_STICKER_WAR_RE.search(text or ""))


def pick_random_mood(exclude: str | None = None) -> str:
    """Picks a random sticker mood, optionally avoiding an immediate repeat."""
    moods = [m for m in STICKER_MEDIA_IDS if m != exclude] or list(STICKER_MEDIA_IDS)
    return random.choice(moods)


def pick_random_sticker(exclude_mood: str | None = None) -> str:
    """Returns a random sticker media_id, optionally avoiding an immediate
    repeat of the mood the user (or KYROO) just sent."""
    return STICKER_MEDIA_IDS[pick_random_mood(exclude_mood)]


def sticker_for_emoji(text: str) -> str | None:
    """If the given text contains one of the mapped emoji, returns the
    matching sticker's media_id — lets a bubble that would've used e.g. 🔥
    be paired with (or replaced by) an actual fire sticker."""
    for emoji, mood in EMOJI_TO_MOOD.items():
        if emoji in text:
            return STICKER_MEDIA_IDS[mood]
    return None
