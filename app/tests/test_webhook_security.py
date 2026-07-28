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

import pytest

from conftest import stub_webhook_dependencies


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

    r1 = asyncio.run(mod.webhook(_FakeRequest(IMAGE_BODY), db=None))
    r2 = asyncio.run(mod.webhook(_FakeRequest(IMAGE_BODY), db=None))

    assert r1 == {"status": "ok"}
    assert r2 == {"status": "ok"}
    assert stubs["app.brain.kyroo_brain"].kyroo_brain.call_count == 1
    assert stubs["app.services.user_service"].UserService.return_value.get_or_create_user.call_count == 1


def test_different_message_id_is_processed_normally():
    mod, stubs = _load_webhook_module()
    stubs["_mock_wa_instance"].download_media.return_value = ("b64", "image/jpeg")

    body_a = IMAGE_BODY
    body_b = json.loads(json.dumps(IMAGE_BODY))
    body_b["entry"][0]["changes"][0]["value"]["messages"][0]["id"] = "wamid.TEST2"

    asyncio.run(mod.webhook(_FakeRequest(body_a), db=None))
    asyncio.run(mod.webhook(_FakeRequest(body_b), db=None))

    assert stubs["app.brain.kyroo_brain"].kyroo_brain.call_count == 2


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
