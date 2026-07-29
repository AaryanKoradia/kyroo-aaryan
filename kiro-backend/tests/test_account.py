"""Covers the self-service account page's profile lookup — same
phone+email ownership proof /delete-account already uses, since reading
a profile isn't more sensitive than deleting it."""
import asyncio
from unittest.mock import MagicMock, patch

import routes.users as users_mod


def _mock_db_for(phone_lookup_data, account_lookup_data):
    mock_db = MagicMock()
    call_count = {"n": 0}

    def select_side_effect(*a, **k):
        call_count["n"] += 1
        result = MagicMock()
        if call_count["n"] == 1:
            result.eq.return_value.execute.return_value.data = phone_lookup_data
        else:
            result.eq.return_value.execute.return_value.data = account_lookup_data
        return result

    mock_db.table.return_value.select.side_effect = select_side_effect
    return mock_db


def test_matching_email_returns_the_profile():
    mock_db = _mock_db_for(
        phone_lookup_data=[{"id": "user-1", "name": "Aarya", "is_active": True}],
        account_lookup_data=[{"name": "Aarya", "email": "aarya@example.com", "plan": "free", "is_active": True}],
    )

    req = users_mod.AccountLookup(phone="9876543210", email="aarya@example.com")
    with patch.object(users_mod, "get_db", return_value=mock_db):
        result = asyncio.run(users_mod.get_account.__wrapped__(request=MagicMock(), req=req))

    assert result["name"] == "Aarya"
    assert result["plan"] == "free"


def test_mismatched_email_rejected():
    from fastapi import HTTPException
    mock_db = _mock_db_for(
        phone_lookup_data=[{"id": "user-1", "name": "Aarya", "is_active": True}],
        account_lookup_data=[{"name": "Aarya", "email": "aarya@example.com"}],
    )

    req = users_mod.AccountLookup(phone="9876543210", email="someone-else@example.com")
    with patch.object(users_mod, "get_db", return_value=mock_db):
        try:
            asyncio.run(users_mod.get_account.__wrapped__(request=MagicMock(), req=req))
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 403


def test_unknown_phone_404s():
    from fastapi import HTTPException
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    req = users_mod.AccountLookup(phone="0000000000", email="x@example.com")
    with patch.object(users_mod, "get_db", return_value=mock_db):
        try:
            asyncio.run(users_mod.get_account.__wrapped__(request=MagicMock(), req=req))
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 404
