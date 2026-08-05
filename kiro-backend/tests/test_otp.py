"""Covers the Resend-based OTP email send (replaced Gmail SMTP, which
failed three different ways in production) and the rate limit on
/otp/send (previously only a 30s per-EMAIL cooldown, trivially bypassed
by using a new address each time)."""
import asyncio
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock, patch

import httpx
import pytest

import routes.otp as otp_mod


def test_send_email_builds_correct_resend_request():
    with patch.object(otp_mod, "RESEND_API_KEY", "re_test_fake_key"), \
         patch.object(otp_mod, "RESEND_FROM_EMAIL", "KYROO <onboarding@resend.dev>"), \
         patch.object(httpx, "post") as mock_post:
        fake_resp = MagicMock()
        fake_resp.raise_for_status.return_value = None
        mock_post.return_value = fake_resp

        otp_mod._send_email("someone@example.com", "123456")

        args, kwargs = mock_post.call_args
        assert args[0] == "https://api.resend.com/emails"
        assert kwargs["headers"]["Authorization"] == "Bearer re_test_fake_key"
        assert kwargs["json"]["to"] == ["someone@example.com"]
        assert "123456" in kwargs["json"]["subject"]
        assert "123456" in kwargs["json"]["text"]


def test_send_email_propagates_resend_errors():
    with patch.object(otp_mod, "RESEND_API_KEY", "re_test_fake_key"), \
         patch.object(httpx, "post") as mock_post:
        fake_resp = MagicMock()
        fake_resp.raise_for_status.side_effect = httpx.HTTPStatusError(
            "403 Forbidden", request=MagicMock(), response=MagicMock(status_code=403)
        )
        mock_post.return_value = fake_resp
        with pytest.raises(httpx.HTTPStatusError):
            otp_mod._send_email("someone@example.com", "654321")


def test_send_email_missing_key_raises_clear_error():
    with patch.object(otp_mod, "RESEND_API_KEY", ""):
        with pytest.raises(RuntimeError, match="RESEND_API_KEY"):
            otp_mod._send_email("someone@example.com", "111111")


def test_otp_send_rate_limited_after_5_per_minute():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []
    mock_db.table.return_value.insert.return_value.execute.return_value.data = [{"id": "x"}]

    with patch.object(otp_mod, "get_db", return_value=mock_db), \
         patch.object(otp_mod, "_send_email", return_value=None):
        import main
        from fastapi.testclient import TestClient
        client = TestClient(main.app)

        statuses = [
            client.post("/otp/send", json={"email": "ratelimit-suite@example.com"}).status_code
            for _ in range(7)
        ]

    assert statuses[:5].count(429) == 0
    assert 429 in statuses


def _otp_row(code="123456", attempts=0):
    return {
        "id": "otp-1",
        "otp_code": code,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "verified": False,
        "attempts": attempts,
    }


def _verify_client(mock_db):
    import main
    from fastapi.testclient import TestClient
    return TestClient(main.app), patch.object(otp_mod, "get_db", return_value=mock_db)


def test_verify_otp_flags_already_registered_for_a_completed_account():
    mock_db = MagicMock()
    otp_chain = mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value
    otp_chain.execute.return_value.data = [_otp_row()]
    users_chain = mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value
    users_chain.execute.return_value.data = [{"id": "existing-user"}]

    client, patched = _verify_client(mock_db)
    with patched:
        resp = client.post("/otp/verify", json={"email": "already1@example.com", "code": "123456"})

    assert resp.status_code == 200
    result = resp.json()
    assert result["status"] == "verified"
    assert result["already_registered"] is True


def test_verify_otp_reports_not_registered_for_a_new_email():
    mock_db = MagicMock()
    otp_chain = mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value
    otp_chain.execute.return_value.data = [_otp_row()]
    users_chain = mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value
    users_chain.execute.return_value.data = []

    client, patched = _verify_client(mock_db)
    with patched:
        resp = client.post("/otp/verify", json={"email": "new1@example.com", "code": "123456"})

    assert resp.json()["already_registered"] is False


def test_verify_otp_wrong_code_increments_attempts_and_never_matches_an_old_code():
    """The lookup is by email only (latest request wins), not by code - a
    stale code from an earlier /otp/send should no longer verify once a
    newer one has been requested, and a wrong guess should count against
    the attempt cap."""
    mock_db = MagicMock()
    otp_chain = mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value
    otp_chain.execute.return_value.data = [_otp_row(code="123456", attempts=2)]

    client, patched = _verify_client(mock_db)
    with patched:
        resp = client.post("/otp/verify", json={"email": "wrong1@example.com", "code": "000000"})

    assert resp.status_code == 400
    update_call = mock_db.table.return_value.update.call_args
    assert update_call is not None
    assert update_call[0][0] == {"attempts": 3}


def test_verify_otp_blocked_after_max_attempts_even_with_correct_code():
    mock_db = MagicMock()
    otp_chain = mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value
    otp_chain.execute.return_value.data = [_otp_row(code="123456", attempts=otp_mod.MAX_VERIFY_ATTEMPTS)]

    client, patched = _verify_client(mock_db)
    with patched:
        resp = client.post("/otp/verify", json={"email": "locked1@example.com", "code": "123456"})

    assert resp.status_code == 429


def test_otp_verify_rate_limited_after_10_per_minute():
    # the in-memory limiter's state is process-wide, not per-test - reset
    # it first so quota already spent by other tests hitting /otp/verify
    # above doesn't make this one flaky depending on run order
    from rate_limit import limiter
    limiter.reset()

    mock_db = MagicMock()
    otp_chain = mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value
    otp_chain.execute.return_value.data = [_otp_row(code="123456")]

    client, patched = _verify_client(mock_db)
    with patched:
        statuses = [
            client.post("/otp/verify", json={"email": "ratelimit-verify@example.com", "code": "000000"}).status_code
            for _ in range(12)
        ]

    assert statuses[:10].count(429) == 0
    assert 429 in statuses


def test_is_recently_verified_true_within_window():
    mock_db = MagicMock()
    row = {"verified": True, "created_at": (datetime.now(timezone.utc) - timedelta(minutes=3)).isoformat()}
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [row]

    with patch.object(otp_mod, "get_db", return_value=mock_db):
        assert otp_mod.is_recently_verified("someone@example.com") is True


def test_is_recently_verified_false_once_outside_window():
    mock_db = MagicMock()
    row = {"verified": True, "created_at": (datetime.now(timezone.utc) - timedelta(minutes=30)).isoformat()}
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [row]

    with patch.object(otp_mod, "get_db", return_value=mock_db):
        assert otp_mod.is_recently_verified("someone@example.com") is False


def test_is_recently_verified_false_when_unverified():
    mock_db = MagicMock()
    row = {"verified": False, "created_at": datetime.now(timezone.utc).isoformat()}
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = [row]

    with patch.object(otp_mod, "get_db", return_value=mock_db):
        assert otp_mod.is_recently_verified("someone@example.com") is False


def test_is_recently_verified_false_with_no_otp_history():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.order.return_value.limit.return_value.execute.return_value.data = []

    with patch.object(otp_mod, "get_db", return_value=mock_db):
        assert otp_mod.is_recently_verified("someone@example.com") is False
