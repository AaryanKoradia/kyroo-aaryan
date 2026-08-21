"""Covers the phone-based upsert fix: a phone that already has a row
(e.g. someone who messaged KYROO on WhatsApp before finishing signup on
the website) must be completed in place, never duplicated — a duplicate
row previously let the WhatsApp webhook read the stale, unfinished row
and re-ask for consent even after signup had genuinely completed."""
import asyncio
from unittest.mock import MagicMock, patch

import routes.users as users_mod


def test_existing_phone_is_updated_not_duplicated():
    mock_db = MagicMock()
    mock_users_table = MagicMock()
    mock_db.table.return_value = mock_users_table
    mock_users_table.select.return_value.eq.return_value.execute.return_value.data = []
    phone_chain = mock_users_table.select.return_value.eq.return_value.order.return_value.order.return_value.limit.return_value
    phone_chain.execute.return_value.data = [{"id": "existing-row-id"}]

    req = users_mod.UserSignup(name="Aaryan", email="aaryan@example.com", phone="9876543210")

    with patch.object(users_mod, "get_db", return_value=mock_db), \
         patch.object(users_mod, "is_email_verified", return_value=True):
        result = asyncio.run(users_mod.signup.__wrapped__(request=MagicMock(), user=req))

    assert result["user_id"] == "existing-row-id"
    mock_users_table.update.assert_called_once()
    update_fields = mock_users_table.update.call_args[0][0]
    assert update_fields["onboarding_step"] == 99
    assert update_fields["phone"] == "919876543210"
    # the one insert() call is the chat_sessions token issued on completion
    # (see routes/users.py) - the user row itself was updated, not inserted
    mock_users_table.insert.assert_called_once()
    assert "token" in result


def test_brand_new_phone_still_inserts():
    mock_db = MagicMock()
    mock_users_table = MagicMock()
    mock_db.table.return_value = mock_users_table
    mock_users_table.select.return_value.eq.return_value.execute.return_value.data = []
    phone_chain = mock_users_table.select.return_value.eq.return_value.order.return_value.order.return_value.limit.return_value
    phone_chain.execute.return_value.data = []
    mock_users_table.insert.return_value.execute.return_value.data = [{"id": "brand-new-id"}]

    req = users_mod.UserSignup(name="Priya", email="priya@example.com", phone="9123456780")

    with patch.object(users_mod, "get_db", return_value=mock_db), \
         patch.object(users_mod, "is_email_verified", return_value=True):
        result = asyncio.run(users_mod.signup.__wrapped__(request=MagicMock(), user=req))

    assert result["user_id"] == "brand-new-id"
    mock_users_table.update.assert_not_called()
    # two inserts: the new user row, then the chat_sessions token issued
    # on completion (see routes/users.py)
    assert mock_users_table.insert.call_count == 2
    assert "token" in result


def test_normalize_phone_variants():
    assert users_mod.normalize_phone("9876543210") == "919876543210"
    assert users_mod.normalize_phone("09876543210") == "919876543210"
    assert users_mod.normalize_phone("+91 98765 43210") == "919876543210"
