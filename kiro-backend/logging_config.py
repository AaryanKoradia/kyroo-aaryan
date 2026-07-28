import logging
import sys


def configure_logging() -> None:
    """Replaces bare print() output with leveled, timestamped logging —
    Render captures stdout either way, but this makes it possible to
    actually tell an error from routine info in the log stream, and errors
    logged via logger.error()/logger.exception() inside an `except` block
    are also sent to Sentry (see the capture_exception calls at each call
    site) instead of only ever-unhandled exceptions reaching it."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
        stream=sys.stdout,
    )
