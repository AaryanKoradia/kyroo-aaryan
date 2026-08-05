"""Covers /payments/webhook — server-side payment confirmation independent
of the client-side /verify-subscription or /verify-topup calls, which can
be missed if the tab closes right after a real payment succeeds. Also the
only path for subscription renewals/failures, which happen with no
browser open at all."""
import hashlib
import hmac
import json
import os
from unittest.mock import MagicMock, patch

os.environ["RAZORPAY_KEY_ID"] = "rzp_test_fake"
os.environ["RAZORPAY_KEY_SECRET"] = "fake_key_secret"
os.environ["RAZORPAY_WEBHOOK_SECRET"] = "fake_webhook_secret"

TOPUP_BODY = {
    "event": "payment.captured",
    "payload": {"payment": {"entity": {
        "id": "pay_test123", "order_id": "order_test123",
        "notes": {"user_id": "user-uuid-123", "type": "topup", "messages": "25"},
    }}},
}
RAW_BODY = json.dumps(TOPUP_BODY).encode()
VALID_SIG = hmac.new(b"fake_webhook_secret", RAW_BODY, hashlib.sha256).hexdigest()


def _client():
    import importlib
    import main
    importlib.reload(main)
    from fastapi.testclient import TestClient
    return TestClient(main.app)


def _sign(body: dict) -> tuple[bytes, str]:
    raw = json.dumps(body).encode()
    return raw, hmac.new(b"fake_webhook_secret", raw, hashlib.sha256).hexdigest()


def test_topup_payment_credits_bonus_messages():
    mock_db = MagicMock()
    with patch("database.get_db", return_value=mock_db):
        r = _client().post(
            "/payments/webhook", content=RAW_BODY,
            headers={"x-razorpay-signature": VALID_SIG, "content-type": "application/json"},
        )
    assert r.status_code == 200
    mock_db.rpc.assert_called_with("add_bonus_messages", {"p_user_id": "user-uuid-123", "p_amount": 25})


def test_subscription_charged_updates_plan_status_and_expiry():
    body = {
        "event": "subscription.charged",
        "payload": {"subscription": {"entity": {
            "id": "sub_test123", "current_end": 1893456000,
            "notes": {"user_id": "user-uuid-456", "plan": "pro"},
        }}},
    }
    raw, sig = _sign(body)
    mock_db = MagicMock()
    with patch("database.get_db", return_value=mock_db):
        r = _client().post(
            "/payments/webhook", content=raw,
            headers={"x-razorpay-signature": sig, "content-type": "application/json"},
        )
    assert r.status_code == 200
    update_call = mock_db.table.return_value.update.call_args[0][0]
    assert update_call["plan"] == "pro"
    assert update_call["subscription_status"] == "active"
    assert update_call["subscription_id"] == "sub_test123"
    assert "plan_expires_at" in update_call
    mock_db.table.return_value.update.return_value.eq.assert_called_with("id", "user-uuid-456")


def test_subscription_halted_downgrades_to_free():
    body = {
        "event": "subscription.halted",
        "payload": {"subscription": {"entity": {
            "id": "sub_test789",
            "notes": {"user_id": "user-uuid-789", "plan": "pro_plus"},
        }}},
    }
    raw, sig = _sign(body)
    mock_db = MagicMock()
    with patch("database.get_db", return_value=mock_db):
        r = _client().post(
            "/payments/webhook", content=raw,
            headers={"x-razorpay-signature": sig, "content-type": "application/json"},
        )
    assert r.status_code == 200
    mock_db.table.return_value.update.assert_called_with({"plan": "free", "subscription_status": "halted"})
    mock_db.table.return_value.update.return_value.eq.assert_called_with("id", "user-uuid-789")


def test_tampered_body_rejected():
    tampered = json.dumps({**TOPUP_BODY, "event": "refund.processed"}).encode()
    mock_db = MagicMock()
    with patch("database.get_db", return_value=mock_db):
        r = _client().post(
            "/payments/webhook", content=tampered,
            headers={"x-razorpay-signature": VALID_SIG, "content-type": "application/json"},
        )
    assert r.status_code == 403


def test_missing_signature_rejected():
    mock_db = MagicMock()
    with patch("database.get_db", return_value=mock_db):
        r = _client().post("/payments/webhook", content=RAW_BODY, headers={"content-type": "application/json"})
    assert r.status_code == 403


def test_unconfigured_secret_fails_closed():
    import routes.payments as payments_mod
    mock_db = MagicMock()
    with patch.object(payments_mod, "RAZORPAY_WEBHOOK_SECRET", ""), \
         patch("database.get_db", return_value=mock_db):
        r = _client().post(
            "/payments/webhook", content=RAW_BODY, headers={"x-razorpay-signature": VALID_SIG},
        )
    assert r.status_code == 503
