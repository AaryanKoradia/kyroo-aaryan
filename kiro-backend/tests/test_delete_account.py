"""Covers the self-service account/data-deletion endpoint — previously the
only path was emailing support. Every related table has ON DELETE CASCADE,
so deleting the users row alone is expected to erase everything."""
import asyncio
from unittest.mock import MagicMock, patch

import routes.users as users_mod


def _mock_db_for(phone_lookup_data, email_lookup_data):
    mock_db = MagicMock()
    call_count = {"n": 0}

    def select_side_effect(*a, **k):
        call_count["n"] += 1
        result = MagicMock()
        if call_count["n"] == 1:
            result.eq.return_value.execute.return_value.data = phone_lookup_data
        else:
            result.eq.return_value.execute.return_value.data = email_lookup_data
        return result

    mock_db.table.return_value.select.side_effect = select_side_effect
    return mock_db


def test_matching_email_deletes_the_account():
    mock_db = _mock_db_for(
        phone_lookup_data=[{"id": "user-1", "name": "Aarya", "is_active": True}],
        email_lookup_data=[{"email": "aarya@example.com"}],
    )

    req = users_mod.DeleteAccountRequest(phone="9876543210", email="aarya@example.com")
    with patch.object(users_mod, "get_db", return_value=mock_db):
        result = asyncio.run(users_mod.delete_account.__wrapped__(request=MagicMock(), req=req))

    assert result["status"] == "success"
    mock_db.table.return_value.delete.return_value.eq.assert_called_with("id", "user-1")


def test_mismatched_email_rejected():
    from fastapi import HTTPException
    mock_db = _mock_db_for(
        phone_lookup_data=[{"id": "user-1", "name": "Aarya", "is_active": True}],
        email_lookup_data=[{"email": "aarya@example.com"}],
    )

    req = users_mod.DeleteAccountRequest(phone="9876543210", email="someone-else@example.com")
    with patch.object(users_mod, "get_db", return_value=mock_db):
        try:
            asyncio.run(users_mod.delete_account.__wrapped__(request=MagicMock(), req=req))
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 403
    mock_db.table.return_value.delete.assert_not_called()


def test_unknown_phone_404s():
    from fastapi import HTTPException
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    req = users_mod.DeleteAccountRequest(phone="0000000000", email="x@example.com")
    with patch.object(users_mod, "get_db", return_value=mock_db):
        try:
            asyncio.run(users_mod.delete_account.__wrapped__(request=MagicMock(), req=req))
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 404
