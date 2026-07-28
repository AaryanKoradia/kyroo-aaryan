"""Covers get_or_create_user's ordering — if a phone ever has more than one
row (e.g. from before the website-signup upsert fix), it must prefer the
most-onboarded row, not an arbitrary one."""
from unittest.mock import MagicMock

from app.services.user_service import UserService


def test_prefers_most_onboarded_row_when_duplicates_exist():
    mock_db = MagicMock()
    chain = mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value
    chain.execute.return_value.data = [
        {"id": "row-B-complete", "onboarding_step": 99, "created_at": "2026-07-26T22:00:00Z"},
        {"id": "row-A-stale", "onboarding_step": -3, "created_at": "2026-07-26T11:29:00Z"},
    ]

    result = UserService(db=mock_db).get_or_create_user("919999999999")

    assert result["id"] == "row-B-complete"
    order_calls = mock_db.table.return_value.select.return_value.eq.return_value.order.call_args_list
    assert order_calls[0].args == ("onboarding_step",)
    assert order_calls[0].kwargs == {"desc": True}


def test_creates_new_user_when_none_exists():
    mock_db = MagicMock()
    chain = mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.order.return_value
    chain.execute.return_value.data = []
    mock_db.table.return_value.insert.return_value.execute.return_value.data = [
        {"id": "new-row", "phone": "919999999999", "onboarding_step": -1}
    ]

    result = UserService(db=mock_db).get_or_create_user("919999999999")

    assert result["id"] == "new-row"
    mock_db.table.return_value.insert.assert_called_once()
