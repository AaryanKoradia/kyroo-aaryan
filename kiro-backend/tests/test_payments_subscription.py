"""Covers /payments/create-subscription and /payments/create-topup-order's
phone-based user resolution — the WhatsApp "you've hit your limit" message
links here for a user who's often never opened the website in that browser
before, so there's nothing in localStorage and the link carries their
phone number instead."""
import os
from unittest.mock import MagicMock, patch

os.environ["RAZORPAY_KEY_ID"] = "rzp_test_fake"
os.environ["RAZORPAY_KEY_SECRET"] = "fake_key_secret"
os.environ["RAZORPAY_PLAN_ID_PRO"] = "plan_fake_pro"
os.environ["RAZORPAY_PLAN_ID_PRO_PLUS"] = "plan_fake_pro_plus"


def _client():
    import importlib
    import main
    importlib.reload(main)
    from fastapi.testclient import TestClient
    return TestClient(main.app)


def test_create_subscription_with_user_id_skips_phone_lookup():
    mock_db = MagicMock()
    fake_sub = {"id": "sub_abc123"}
    with patch("database.get_db", return_value=mock_db), \
         patch("routes.payments.client") as mock_razorpay:
        mock_razorpay.subscription.create.return_value = fake_sub
        r = _client().post("/payments/create-subscription", json={"user_id": "user-uuid-1", "plan": "pro"})

    assert r.status_code == 200
    body = r.json()
    assert body["subscription_id"] == "sub_abc123"
    assert body["user_id"] == "user-uuid-1"
    mock_db.table.assert_not_called()
    notes = mock_razorpay.subscription.create.call_args[0][0]["notes"]
    assert notes == {"user_id": "user-uuid-1", "plan": "pro"}


def test_create_subscription_resolves_phone_to_user_id():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"id": "resolved-user-id"}
    ]
    fake_sub = {"id": "sub_xyz789"}
    with patch("database.get_db", return_value=mock_db), \
         patch("routes.payments.client") as mock_razorpay:
        mock_razorpay.subscription.create.return_value = fake_sub
        r = _client().post("/payments/create-subscription", json={"phone": "919999999999", "plan": "pro_plus"})

    assert r.status_code == 200
    assert r.json()["user_id"] == "resolved-user-id"
    notes = mock_razorpay.subscription.create.call_args[0][0]["notes"]
    assert notes["user_id"] == "resolved-user-id"


def test_create_subscription_unknown_phone_returns_404():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = []
    with patch("database.get_db", return_value=mock_db), \
         patch("routes.payments.client"):
        r = _client().post("/payments/create-subscription", json={"phone": "910000000000", "plan": "pro"})

    assert r.status_code == 404


def test_create_subscription_unconfigured_plan_rejected():
    mock_db = MagicMock()
    with patch("database.get_db", return_value=mock_db), \
         patch("routes.payments.client"):
        r = _client().post("/payments/create-subscription", json={"user_id": "u1", "plan": "not_a_real_plan"})

    assert r.status_code == 400


def test_create_topup_order_resolves_phone_and_credits_25_messages():
    mock_db = MagicMock()
    mock_db.table.return_value.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"id": "topup-user-id"}
    ]
    fake_order = {"id": "order_topup1"}
    with patch("database.get_db", return_value=mock_db), \
         patch("routes.payments.client") as mock_razorpay:
        mock_razorpay.order.create.return_value = fake_order
        r = _client().post("/payments/create-topup-order", json={"phone": "919999999999"})

    assert r.status_code == 200
    body = r.json()
    assert body["user_id"] == "topup-user-id"
    assert body["message_count"] == 25
    notes = mock_razorpay.order.create.call_args[0][0]["notes"]
    assert notes == {"user_id": "topup-user-id", "type": "topup", "messages": "25"}
