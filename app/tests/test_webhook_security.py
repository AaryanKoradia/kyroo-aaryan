"""Covers app/api/routes/webhook.py's two real fixes this session:
Meta signature verification, and message-id dedup (Meta redelivers the
identical payload if it doesn't get a fast 200 back, and a slow vision/LLM
reply was getting processed twice — same photo explained to the user
twice)."""
import asyncio
import hashlib
import hmac
import importlib.util
import json
import os
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest

from conftest import stub_webhook_dependencies


def _make_dedup_db():
    """Simulates processed_messages' real behavior: insert succeeds the
    first time a message_id is seen, raises a duplicate-key-shaped error
    the second time — same signal Postgres' primary key constraint gives."""
    seen = set()
    db = MagicMock()

    def insert_side_effect(row):
        mid = row["message_id"]
        result = MagicMock()
        if mid in seen:
            result.execute.side_effect = Exception('duplicate key value violates unique constraint "processed_messages_pkey"')
        else:
            seen.add(mid)
            result.execute.return_value = MagicMock()
        return result

    db.table.return_value.insert.side_effect = insert_side_effect
    db.table.return_value.delete.return_value.lt.return_value.execute.return_value = MagicMock()
    # usage_service.check_usage runs on every non-sticker message now -
    # keep it a well-under-the-limit no-op here so these dedup-focused
    # tests aren't actually exercising the usage-limit path
    db.rpc.return_value.execute.return_value.data = 1
    return db


def _load_webhook_module():
    stubs = stub_webhook_dependencies()
    spec = importlib.util.spec_from_file_location(
        "webhook_mod", os.path.join(os.path.dirname(os.path.dirname(__file__)), "api", "routes", "webhook.py")
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod, stubs


class _FakeHeaders(dict):
    def get(self, k, default=None):
        return super().get(k.lower(), default)


class _FakeRequest:
    def __init__(self, body_dict, headers=None):
        self._raw = json.dumps(body_dict).encode()
        self.headers = _FakeHeaders(headers or {})

    async def body(self):
        return self._raw


IMAGE_BODY = {
    "entry": [{"changes": [{"value": {"messages": [{
        "from": "919999999999", "id": "wamid.TEST1", "type": "image",
        "image": {"id": "media123", "caption": "explain this"},
    }]}}]}]
}


def test_redelivered_message_id_is_not_reprocessed():
    mod, stubs = _load_webhook_module()
    stubs["_mock_wa_instance"].download_media.return_value = ("b64", "image/jpeg")
    dedup_db = _make_dedup_db()

    r1 = asyncio.run(mod.webhook(_FakeRequest(IMAGE_BODY), db=dedup_db))
    r2 = asyncio.run(mod.webhook(_FakeRequest(IMAGE_BODY), db=dedup_db))

    assert r1 == {"status": "ok"}
    assert r2 == {"status": "ok"}
    assert stubs["app.brain.kyroo_brain"].kyroo_brain.call_count == 1
    assert stubs["app.services.user_service"].UserService.return_value.get_or_create_user.call_count == 1


def test_different_message_id_is_processed_normally():
    mod, stubs = _load_webhook_module()
    stubs["_mock_wa_instance"].download_media.return_value = ("b64", "image/jpeg")
    dedup_db = _make_dedup_db()

    body_a = IMAGE_BODY
    body_b = json.loads(json.dumps(IMAGE_BODY))
    body_b["entry"][0]["changes"][0]["value"]["messages"][0]["id"] = "wamid.TEST2"

    asyncio.run(mod.webhook(_FakeRequest(body_a), db=dedup_db))
    asyncio.run(mod.webhook(_FakeRequest(body_b), db=dedup_db))

    assert stubs["app.brain.kyroo_brain"].kyroo_brain.call_count == 2


def test_already_processed_directly():
    mod, stubs = _load_webhook_module()
    dedup_db = _make_dedup_db()
    assert mod._already_processed(dedup_db, "wamid.DIRECT1") is False
    assert mod._already_processed(dedup_db, "wamid.DIRECT1") is True
    assert mod._already_processed(dedup_db, "wamid.DIRECT2") is False


def test_already_processed_fails_open_on_unrelated_db_error():
    mod, stubs = _load_webhook_module()
    broken_db = MagicMock()
    broken_db.table.return_value.insert.return_value.execute.side_effect = Exception("connection reset")
    broken_db.table.return_value.delete.return_value.lt.return_value.execute.return_value = MagicMock()
    # A transient/unrelated DB error must never be mistaken for "already
    # processed" — that would silently drop a genuinely new message.
    assert mod._already_processed(broken_db, "wamid.FLAKY") is False


def test_dedup_survives_far_longer_than_the_old_broken_10_minute_ttl(monkeypatch):
    """Regression test for the actual reported bug: the same photo
    explanation got resent repeatedly over TWO DAYS, because the old code
    expired dedup rows after just 10 minutes — any redelivery arriving
    later than that found no record and got reprocessed from scratch.
    This forces the cleanup sweep to run and asserts it only targets rows
    older than the new ~1 year retention, nowhere near 10 minutes, so a
    redelivery days later still correctly finds its dedup row intact."""
    mod, stubs = _load_webhook_module()
    monkeypatch.setattr(mod.random, "random", lambda: 0.0)  # force the cleanup branch to run

    captured_cutoff = {}
    db = MagicMock()
    db.table.return_value.insert.return_value.execute.return_value = MagicMock()

    def lt_side_effect(field, cutoff):
        captured_cutoff["value"] = cutoff
        result = MagicMock()
        result.execute.return_value = MagicMock()
        return result

    db.table.return_value.delete.return_value.lt.side_effect = lt_side_effect

    mod._already_processed(db, "wamid.REGRESSION1")

    cutoff_dt = datetime.fromisoformat(captured_cutoff["value"])
    age = datetime.now(timezone.utc) - cutoff_dt
    ten_minutes = timedelta(minutes=10)
    two_days = timedelta(days=2)

    assert age > two_days, (
        f"cleanup cutoff is only {age} old — a redelivery {two_days} later would still be wrongly wiped"
    )
    assert age > ten_minutes * 100, "retention window regressed back toward the old ~10-minute bug"


def test_signature_verification_fails_open_when_secret_unset():
    mod, stubs = _load_webhook_module()
    stubs["app.core.config"].settings.whatsapp_app_secret = ""
    assert mod._verify_meta_signature(b'{"a":1}', None) is True


def test_signature_verification_rejects_tampered_body_once_configured():
    mod, stubs = _load_webhook_module()
    stubs["app.core.config"].settings.whatsapp_app_secret = "test_secret"
    body = b'{"entry":[{"id":"1"}]}'
    sig = "sha256=" + hmac.new(b"test_secret", body, hashlib.sha256).hexdigest()
    assert mod._verify_meta_signature(body, sig) is True
    assert mod._verify_meta_signature(b'{"entry":[{"id":"2"}]}', sig) is False


TEXT_BODY = {
    "entry": [{"changes": [{"value": {"messages": [{
        "from": "919999999999", "id": "wamid.TEXT1", "type": "text",
        "text": {"body": "hi"},
    }]}}]}]
}


def test_unregistered_user_gets_website_link_not_the_chat_pipeline():
    """Registration is website-only now - an unregistered contact should
    get pointed at the signup link on every message, and never reach
    kyroo_brain/the orchestrator at all."""
    mod, stubs = _load_webhook_module()
    # webhook.py did `from onboarding_flow import needs_onboarding` at
    # exec time, which copied a reference to the stub's default (False)
    # lambda - reassigning the attribute on the stub module now wouldn't
    # reach back into that already-bound name, so patch mod's own
    # binding directly instead.
    mod.needs_onboarding = lambda user: True
    dedup_db = _make_dedup_db()

    result = asyncio.run(mod.webhook(_FakeRequest(TEXT_BODY), db=dedup_db))

    assert result == {"status": "ok"}
    stubs["_mock_wa_instance"].send_one.assert_called_once_with(
        "919999999999", mod.REGISTER_ON_WEBSITE_TEXT
    )
    stubs["app.brain.kyroo_brain"].kyroo_brain.assert_not_called()


def test_registered_user_still_reaches_the_chat_pipeline():
    """Sanity check on the other side of the same branch - a registered
    user's text message should NOT get the registration link and should
    reach the normal reply path."""
    # needs_onboarding defaults to False in the stub already - nothing to
    # override here, this just confirms that default routes correctly.
    mod, stubs = _load_webhook_module()
    dedup_db = _make_dedup_db()

    asyncio.run(mod.webhook(_FakeRequest(TEXT_BODY), db=dedup_db))

    for call in stubs["_mock_wa_instance"].send_one.call_args_list:
        assert call.args[1] != mod.REGISTER_ON_WEBSITE_TEXT
