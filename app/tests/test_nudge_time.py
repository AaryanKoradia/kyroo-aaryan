from datetime import time as dtime

from app.services.nudge_time import parse_nudge_time


def test_parses_hour_only_with_meridiem():
    assert parse_nudge_time("7 AM") == dtime(hour=7, minute=0)
    assert parse_nudge_time("7 PM") == dtime(hour=19, minute=0)


def test_parses_hour_and_minute():
    assert parse_nudge_time("9:30 PM") == dtime(hour=21, minute=30)


def test_noon_and_midnight_edge_cases():
    assert parse_nudge_time("12 PM") == dtime(hour=12, minute=0)
    assert parse_nudge_time("12 AM") == dtime(hour=0, minute=0)


def test_empty_or_garbage_returns_none():
    assert parse_nudge_time("") is None
    assert parse_nudge_time("whenever") is None
    assert parse_nudge_time("25 AM") is None
