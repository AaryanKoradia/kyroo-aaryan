"""Covers log_daily_activity (the tool that lets KYROO actually remember
money/mood/workout/sleep/study details mentioned in normal conversation —
previously nothing wrote to user_tracking at all) and set_domain_nudge_time
(lets KYROO move a domain's check-in time based on the user's own stated
routine, never a fixed default)."""
from unittest.mock import MagicMock, patch

from app.services import tracking_service as ts


def test_log_daily_activity_inserts_when_no_row_exists_today():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = []

    with patch.object(ts, "get_supabase", return_value=mock_db):
        result = ts.log_daily_activity("user-1", spent_today=300, spent_category="food")

    assert result["ok"] is True
    insert_call = mock_db.table.return_value.insert.call_args[0][0]
    assert insert_call["user_id"] == "user-1"
    assert insert_call["spent_today"] == 300
    assert insert_call["spent_category"] == "food"


def test_log_daily_activity_updates_existing_row_today():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = [{"id": "row-1"}]

    with patch.object(ts, "get_supabase", return_value=mock_db):
        result = ts.log_daily_activity("user-1", workout_done=True, workout_duration=40)

    assert result["ok"] is True
    mock_db.table.return_value.update.assert_called_once_with({"workout_done": True, "workout_duration": 40})
    mock_db.table.return_value.update.return_value.eq.assert_called_with("id", "row-1")


def test_log_daily_activity_ignores_unknown_fields_and_none_values():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value.execute.return_value.data = []

    with patch.object(ts, "get_supabase", return_value=mock_db):
        result = ts.log_daily_activity("user-1", mood_score=None, not_a_real_field="whatever", sleep_hours=6.5)

    assert result["ok"] is True
    insert_call = mock_db.table.return_value.insert.call_args[0][0]
    assert insert_call == {"user_id": "user-1", "date": insert_call["date"], "sleep_hours": 6.5}


def test_log_daily_activity_no_fields_given():
    result = ts.log_daily_activity("user-1")
    assert result["ok"] is False


def test_set_domain_nudge_time_updates_the_right_column():
    mock_db = MagicMock()
    with patch.object(ts, "get_supabase", return_value=mock_db):
        result = ts.set_domain_nudge_time("user-1", "fitness", "7 AM")

    assert result["ok"] is True
    mock_db.table.return_value.update.assert_called_once_with({"fitness_nudge_time": "7 AM"})


def test_set_domain_nudge_time_rejects_unknown_domain():
    result = ts.set_domain_nudge_time("user-1", "sleep", "7 AM")
    assert result["ok"] is False
    assert "domain" in result["error"]


def test_set_domain_nudge_time_rejects_unparseable_time():
    result = ts.set_domain_nudge_time("user-1", "money", "sometime later")
    assert result["ok"] is False
