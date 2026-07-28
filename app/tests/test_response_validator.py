"""Covers the deterministic code-level backstops in response_validator.py —
things the persona prompt asks the model not to do, but which get enforced
in code too since the model doesn't always follow prompted instructions."""
from app.brain.response_validator import (
    validate_response,
    clean_streamed_bubble,
    _fix_double_asterisk_bold,
    _strip_em_dashes,
    _strip_cringe_emoji,
)


def test_double_asterisk_bold_is_fixed():
    text = "**analytical thinking** - break down complex problems"
    out = validate_response(text)
    assert out[0].startswith("*analytical thinking*")
    assert "**" not in out[0]


def test_streamed_bubble_also_fixes_double_asterisk():
    cleaned, _ = clean_streamed_bubble("**business acumen** - understand markets", False)
    assert cleaned.startswith("*business acumen*")
    assert "**" not in cleaned


def test_already_correct_single_asterisk_bold_untouched():
    assert _fix_double_asterisk_bold("*already correct* stays the same") == "*already correct* stays the same"


def test_multiple_bold_segments_all_fixed():
    assert _fix_double_asterisk_bold("**first** and **second** both fixed") == "*first* and *second* both fixed"


def test_em_dash_stripped():
    assert _strip_em_dashes("Hey — that's cool") == "Hey, that's cool"


def test_cringe_emoji_stripped():
    assert "😊" not in _strip_cringe_emoji("heyyy 😊 welcome!")


def test_validate_response_caps_at_4_bubbles():
    text = "\n\n".join([f"bubble {i}" for i in range(10)])
    assert len(validate_response(text)) <= 4
