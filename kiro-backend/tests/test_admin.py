"""Covers the admin dashboard's backend — no admin tooling existed at all
before this, every support action was done by hand directly in Supabase."""
import asyncio
from unittest.mock import MagicMock, patch

import routes.admin as admin_mod


def _fake_request(secret=None):
    req = MagicMock()
    req.headers = {"x-admin-secret": secret} if secret else {}
    return req


def test_require_admin_fails_closed_when_secret_unset():
    from fastapi import HTTPException
    with patch.object(admin_mod, "ADMIN_SECRET", ""):
        try:
            admin_mod._require_admin(_fake_request("anything"))
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 403


def test_require_admin_rejects_wrong_secret():
    from fastapi import HTTPException
    with patch.object(admin_mod, "ADMIN_SECRET", "right"):
        try:
            admin_mod._require_admin(_fake_request("wrong"))
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 403


def test_require_admin_accepts_correct_secret():
    with patch.object(admin_mod, "ADMIN_SECRET", "right"):
        admin_mod._require_admin(_fake_request("right"))  # no raise


def test_search_users_dedupes_across_phone_email_name_matches():
    mock_db = MagicMock()
    row = {"id": "u1", "name": "Aarya", "email": "aarya@example.com", "phone": "919876543210"}
    mock_db.table.return_value.select.return_value.ilike.return_value.limit.return_value.execute.return_value.data = [row]

    with patch.object(admin_mod, "ADMIN_SECRET", "right"), \
         patch.object(admin_mod, "get_db", return_value=mock_db):
        result = asyncio.run(admin_mod.search_users.__wrapped__(_fake_request("right"), q="aarya"))

    assert len(result["results"]) == 1
    assert result["results"][0]["id"] == "u1"


def test_search_users_requires_min_length():
    from fastapi import HTTPException
    with patch.object(admin_mod, "ADMIN_SECRET", "right"):
        try:
            asyncio.run(admin_mod.search_users.__wrapped__(_fake_request("right"), q="ab"))
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 400


def test_get_user_detail_includes_recent_chat_history():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "u1", "name": "Aarya"}
    ]
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [
        {"user_message": "hi", "kiro_response": "heyyy", "module": "general", "created_at": "2026-07-26T10:00:00Z"}
    ]

    with patch.object(admin_mod, "ADMIN_SECRET", "right"), \
         patch.object(admin_mod, "get_db", return_value=mock_db):
        result = asyncio.run(admin_mod.get_user_detail.__wrapped__(_fake_request("right"), user_id="u1"))

    assert result["user"]["id"] == "u1"
    assert len(result["recent_chat_history"]) == 1


def test_update_user_plan_and_active_status():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [{"id": "u1"}]

    req = admin_mod.UpdateUserRequest(plan="pro", is_active=False)
    with patch.object(admin_mod, "ADMIN_SECRET", "right"), \
         patch.object(admin_mod, "get_db", return_value=mock_db):
        result = asyncio.run(admin_mod.update_user_admin.__wrapped__(_fake_request("right"), user_id="u1", req=req))

    assert result["status"] == "success"
    mock_db.table.return_value.update.assert_called_with({"plan": "pro", "is_active": False})


def test_update_user_404s_for_unknown_id():
    from fastapi import HTTPException
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

    req = admin_mod.UpdateUserRequest(plan="pro")
    with patch.object(admin_mod, "ADMIN_SECRET", "right"), \
         patch.object(admin_mod, "get_db", return_value=mock_db):
        try:
            asyncio.run(admin_mod.update_user_admin.__wrapped__(_fake_request("right"), user_id="does-not-exist", req=req))
            assert False, "should have raised"
        except HTTPException as e:
            assert e.status_code == 404
