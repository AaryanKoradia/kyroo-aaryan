"""Covers _has_unanswered_nudge's scope-to-today fix — previously checked
the most recent chat_history row ever, with no lower bound, so one ignored
nudge silenced every future slot for that user forever instead of just
holding off piling on within the same day. Also covers _slot_target_time —
each domain's check-in time comes from that specific user's own column,
never a shared fixed time, and only falls back to a default when the
user hasn't set one (or KYROO hasn't picked one up from conversation) yet."""
from datetime import time as dtime
from unittest.mock import MagicMock

from app.services.nudge_service import _has_unanswered_nudge, _slot_target_time


def _mock_db_with(rows):
    mock_db = MagicMock()
    chain = mock_db.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.limit.return_value
    chain.execute.return_value.data = rows
    return mock_db


def test_true_when_todays_most_recent_row_is_a_nudge_placeholder():
    mock_db = _mock_db_with([{"user_message": "money_nudge"}])
    assert _has_unanswered_nudge(mock_db, "user-1") is True


def test_false_when_todays_most_recent_row_is_a_real_reply():
    mock_db = _mock_db_with([{"user_message": "hey what's up"}])
    assert _has_unanswered_nudge(mock_db, "user-1") is False


def test_false_when_nothing_logged_today():
    mock_db = _mock_db_with([])
    assert _has_unanswered_nudge(mock_db, "user-1") is False


def test_queries_are_scoped_to_today_via_gte():
    mock_db = _mock_db_with([{"user_message": "mind_nudge"}])
    _has_unanswered_nudge(mock_db, "user-1")
    eq_call = mock_db.table.return_value.select.return_value.eq
    eq_call.assert_called_with("user_id", "user-1")
    gte_call = mock_db.table.return_value.select.return_value.eq.return_value.gte
    assert gte_call.call_args.args[0] == "created_at"


def test_slot_target_time_uses_this_users_own_stored_time():
    user = {"fitness_nudge_time": "7 AM"}
    assert _slot_target_time(user, "fitness_nudge") == dtime(hour=7, minute=0)


def test_slot_target_time_different_users_get_different_times_for_same_domain():
    morning_person = {"fitness_nudge_time": "6 AM"}
    night_person = {"fitness_nudge_time": "9:30 PM"}
    assert _slot_target_time(morning_person, "fitness_nudge") == dtime(hour=6, minute=0)
    assert _slot_target_time(night_person, "fitness_nudge") == dtime(hour=21, minute=30)


def test_slot_target_time_falls_back_to_default_when_unset():
    user = {}
    assert _slot_target_time(user, "money_nudge") == dtime(hour=13, minute=0)


def test_slot_target_time_falls_back_to_default_when_unparseable():
    user = {"study_nudge_time": "whenever I feel like it"}
    assert _slot_target_time(user, "study_nudge") == dtime(hour=21, minute=0)


def test_slot_target_time_mind_domain_reads_the_pre_existing_nudge_time_column():
    user = {"nudge_time": "8 AM"}
    assert _slot_target_time(user, "mind_nudge") == dtime(hour=8, minute=0)
