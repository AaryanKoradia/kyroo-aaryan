"""Covers _has_unanswered_nudge's scope-to-today fix — previously checked
the most recent chat_history row ever, with no lower bound, so one ignored
nudge silenced every future slot for that user forever instead of just
holding off piling on within the same day."""
from unittest.mock import MagicMock

from app.services.nudge_service import _has_unanswered_nudge


def _mock_db_with(rows):
    mock_db = MagicMock()
    chain = mock_db.table.return_value.select.return_value.eq.return_value.gte.return_value.order.return_value.limit.return_value
    chain.execute.return_value.data = rows
    return mock_db


def test_true_when_todays_most_recent_row_is_a_nudge_placeholder():
    mock_db = _mock_db_with([{"user_message": "afternoon_nudge"}])
    assert _has_unanswered_nudge(mock_db, "user-1") is True


def test_false_when_todays_most_recent_row_is_a_real_reply():
    mock_db = _mock_db_with([{"user_message": "hey what's up"}])
    assert _has_unanswered_nudge(mock_db, "user-1") is False


def test_false_when_nothing_logged_today():
    mock_db = _mock_db_with([])
    assert _has_unanswered_nudge(mock_db, "user-1") is False


def test_queries_are_scoped_to_today_via_gte():
    mock_db = _mock_db_with([{"user_message": "morning_nudge"}])
    _has_unanswered_nudge(mock_db, "user-1")
    eq_call = mock_db.table.return_value.select.return_value.eq
    eq_call.assert_called_with("user_id", "user-1")
    gte_call = mock_db.table.return_value.select.return_value.eq.return_value.gte
    assert gte_call.call_args.args[0] == "created_at"
