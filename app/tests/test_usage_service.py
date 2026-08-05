from unittest.mock import MagicMock

from app.services.usage_service import check_usage, DAILY_LIMITS


def _db_returning(increment_value, bonus_value=None):
    db = MagicMock()

    def rpc_side_effect(fn_name, params):
        result = MagicMock()
        if fn_name == "increment_message_usage":
            result.execute.return_value.data = increment_value
        elif fn_name == "consume_bonus_message":
            result.execute.return_value.data = bonus_value
        return result

    db.rpc.side_effect = rpc_side_effect
    return db


def test_under_limit_allows():
    db = _db_returning(increment_value=5)
    allowed, message = check_usage(db, {"id": "u1", "phone": "919999999999", "plan": "free"})
    assert allowed is True
    assert message is None


def test_pro_plus_is_unlimited_regardless_of_count():
    db = _db_returning(increment_value=99999)
    allowed, message = check_usage(db, {"id": "u1", "phone": "919999999999", "plan": "pro_plus"})
    assert allowed is True
    assert message is None


def test_over_limit_with_no_bonus_blocks_with_phone_in_link():
    db = _db_returning(increment_value=DAILY_LIMITS["free"] + 1, bonus_value=None)
    allowed, message = check_usage(db, {"id": "u1", "phone": "919999999999", "plan": "free"})
    assert allowed is False
    assert "919999999999" in message
    assert "kyroo.co.in/pricing" in message


def test_over_limit_with_bonus_available_consumes_one_and_allows():
    db = _db_returning(increment_value=DAILY_LIMITS["free"] + 1, bonus_value=24)
    allowed, message = check_usage(db, {"id": "u1", "phone": "919999999999", "plan": "free"})
    assert allowed is True
    assert message is None
    db.rpc.assert_any_call("consume_bonus_message", {"p_user_id": "u1"})


def test_unknown_plan_falls_back_to_free_limit():
    db = _db_returning(increment_value=DAILY_LIMITS["free"] + 1, bonus_value=None)
    allowed, _ = check_usage(db, {"id": "u1", "phone": "919999999999", "plan": "some_future_plan"})
    assert allowed is False


def test_increment_failure_fails_open():
    db = MagicMock()
    db.rpc.return_value.execute.side_effect = Exception("connection reset")
    allowed, message = check_usage(db, {"id": "u1", "phone": "919999999999", "plan": "free"})
    assert allowed is True
    assert message is None


def test_missing_user_id_fails_open_without_touching_db():
    db = MagicMock()
    allowed, message = check_usage(db, {"phone": "919999999999", "plan": "free"})
    assert allowed is True
    assert message is None
    db.rpc.assert_not_called()
