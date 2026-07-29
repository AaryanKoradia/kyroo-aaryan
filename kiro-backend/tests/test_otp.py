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


def _otp_row(code="123456"):
    return {
        "id": "otp-1",
        "otp_code": code,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat(),
        "verified": False,
    }


def test_verify_otp_flags_already_registered_for_a_completed_account():
    mock_db = MagicMock()
    otp_chain = mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value
    otp_chain.execute.return_value.data = [_otp_row()]
    users_chain = mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value
    users_chain.execute.return_value.data = [{"id": "existing-user"}]

    with patch.object(otp_mod, "get_db", return_value=mock_db):
        result = asyncio.run(otp_mod.verify_otp(otp_mod.VerifyOtpRequest(email="already@example.com", code="123456")))

    assert result["status"] == "verified"
    assert result["already_registered"] is True


def test_verify_otp_reports_not_registered_for_a_new_email():
    mock_db = MagicMock()
    otp_chain = mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.order.return_value.limit.return_value
    otp_chain.execute.return_value.data = [_otp_row()]
    users_chain = mock_db.table.return_value.select.return_value.eq.return_value.eq.return_value.limit.return_value
    users_chain.execute.return_value.data = []

    with patch.object(otp_mod, "get_db", return_value=mock_db):
        result = asyncio.run(otp_mod.verify_otp(otp_mod.VerifyOtpRequest(email="new@example.com", code="123456")))

    assert result["already_registered"] is False
