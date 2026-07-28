"""Covers /payments/webhook — server-side payment confirmation independent
of the client-side /verify call, which can be missed if the tab closes
right after a real payment succeeds."""
import hashlib
import hmac
import json
import os
from unittest.mock import MagicMock, patch

os.environ["RAZORPAY_KEY_ID"] = "rzp_test_fake"
os.environ["RAZORPAY_KEY_SECRET"] = "fake_key_secret"
os.environ["RAZORPAY_WEBHOOK_SECRET"] = "fake_webhook_secret"

BODY = {
    "event": "payment.captured",
    "payload": {"payment": {"entity": {
        "id": "pay_test123", "order_id": "order_test123",
        "notes": {"user_id": "user-uuid-123", "plan": "pro"},
    }}},
}
RAW_BODY = json.dumps(BODY).encode()
VALID_SIG = hmac.new(b"fake_webhook_secret", RAW_BODY, hashlib.sha256).hexdigest()


def _client():
    import importlib
    import main
    importlib.reload(main)
    from fastapi.testclient import TestClient
    return TestClient(main.app)


def test_valid_webhook_updates_the_right_user():
    mock_db = MagicMock()
    with patch("database.get_db", return_value=mock_db):
        r = _client().post(
            "/payments/webhook", content=RAW_BODY,
            headers={"x-razorpay-signature": VALID_SIG, "content-type": "application/json"},
        )
    assert r.status_code == 200
    mock_db.table.return_value.update.assert_called_with({"plan": "pro", "is_active": True})
    mock_db.table.return_value.update.return_value.eq.assert_called_with("id", "user-uuid-123")


def test_tampered_body_rejected():
    tampered = json.dumps({**BODY, "event": "refund.processed"}).encode()
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
