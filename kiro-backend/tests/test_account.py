"""Covers the self-service account page's profile lookup. Unlike
/delete-account (phone+email match, checked once for an irreversible
action), this is checked on every visit, so it also requires a fresh
OTP verification via is_recently_verified - not just phone+email
knowledge, which alone would let anyone who knows both see the profile."""
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


def test_matching_email_returns_the_profile_when_recently_verified():
    mock_db = _mock_db_for(
        phone_lookup_data=[{"id": "user-1", "name": "Aarya", "is_active": True}],
        account_lookup_data=[{"name": "Aarya", "email": "aarya@example.com", "plan": "free", "is_active": True}],
    )

    req = users_mod.AccountLookup(phone="9876543210", email="aarya@example.com")
    with patch.object(users_mod, "get_db", return_value=mock_db), \
         patch.object(users_mod, "is_recently_verified", return_value=True):
        result = asyncio.run(users_mod.get_account.__wrapped__(request=MagicMock(), req=req))

    assert result["name"] == "Aarya"
    assert result["plan"] == "free"


def test_rejected_without_a_recent_otp_verification():
    from fastapi import HTTPException
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "user-1", "name": "Aarya", "is_active": True}
    ]

    req = users_mod.AccountLookup(phone="9876543210", email="aarya@example.com")
    with patch.object(users_mod, "get_db", return_value=mock_db), \
         patch.object(users_mod, "is_recently_verified", return_value=False):
        try:
            asyncio.run(users_mod.get_account.__wrapped__(request=MagicMock(), req=req))
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 403
            assert "verify" in e.detail.lower()


def test_mismatched_email_rejected_even_if_recently_verified():
    from fastapi import HTTPException
    mock_db = _mock_db_for(
        phone_lookup_data=[{"id": "user-1", "name": "Aarya", "is_active": True}],
        account_lookup_data=[{"name": "Aarya", "email": "aarya@example.com"}],
    )

    # verifying a DIFFERENT email than the one on the account shouldn't
    # be enough - is_recently_verified only proves control of whatever
    # email was passed in, not that it's the account's actual email
    req = users_mod.AccountLookup(phone="9876543210", email="someone-else@example.com")
    with patch.object(users_mod, "get_db", return_value=mock_db), \
         patch.object(users_mod, "is_recently_verified", return_value=True):
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
    with patch.object(users_mod, "get_db", return_value=mock_db), \
         patch.object(users_mod, "is_recently_verified", return_value=True):
        try:
            asyncio.run(users_mod.get_account.__wrapped__(request=MagicMock(), req=req))
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 404
