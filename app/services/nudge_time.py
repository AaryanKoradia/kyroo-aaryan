import re
from datetime import time as dtime

# Split out from nudge_service.py so tracking_service.py (which validates
# set_nudge_time's input) doesn't have to import nudge_service, which
# itself imports from app.brain.kyroo_brain - and kyroo_brain imports
# tracking_service for its own tools, which would otherwise be a cycle.
_TIME_RE = re.compile(r'^\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*$', re.IGNORECASE)


def parse_nudge_time(nudge_time: str) -> dtime | None:
    """Parses things like '7 AM', '7:30am', '19:00', '6 PM' into a time in IST."""
    if not nudge_time:
        return None
    match = _TIME_RE.match(nudge_time)
    if not match:
        return None

    hour = int(match.group(1))
    minute = int(match.group(2) or 0)
    meridiem = (match.group(3) or "").lower()

    if meridiem == "pm" and hour != 12:
        hour += 12
    elif meridiem == "am" and hour == 12:
        hour = 0

    if not (0 <= hour <= 23 and 0 <= minute <= 59):
        return None

    return dtime(hour=hour, minute=minute)
