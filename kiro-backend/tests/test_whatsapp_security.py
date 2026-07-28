"""Covers kiro-backend/routes/whatsapp.py's Meta signature verification
and cron-secret guard — this is the second, older WhatsApp implementation
(not the live one, see app/), but it's still publicly reachable and still
holds real send credentials, so it got the same fixes as app/'s webhook."""
import hashlib
import hmac

import routes.whatsapp as wa_mod


def test_meta_signature_fails_open_when_unset():
    assert wa_mod._verify_meta_signature(b'{"a":1}', None) is True
    assert wa_mod._verify_meta_signature(b'{"a":1}', "sha256=garbage") is True


def test_meta_signature_valid_once_configured(monkeypatch):
    monkeypatch.setattr(wa_mod, "WHATSAPP_APP_SECRET", "test_secret")
    body = b'{"entry":[{"id":"1"}]}'
    sig = "sha256=" + hmac.new(b"test_secret", body, hashlib.sha256).hexdigest()
    assert wa_mod._verify_meta_signature(body, sig) is True


def test_meta_signature_rejects_tampered_body(monkeypatch):
    monkeypatch.setattr(wa_mod, "WHATSAPP_APP_SECRET", "test_secret")
    body = b'{"entry":[{"id":"1"}]}'
    sig = "sha256=" + hmac.new(b"test_secret", body, hashlib.sha256).hexdigest()
    assert wa_mod._verify_meta_signature(b'{"entry":[{"id":"2"}]}', sig) is False


def test_cron_secret_fails_closed_when_unset():
    from fastapi import HTTPException
    from unittest.mock import MagicMock
    import pytest

    req = MagicMock()
    req.headers = {}
    req.query_params = {}
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(wa_mod, "CRON_SECRET", "")
        with pytest.raises(HTTPException) as exc_info:
            wa_mod._require_cron_secret(req)
        assert exc_info.value.status_code == 403


def test_cron_secret_accepts_correct_header():
    from unittest.mock import MagicMock
    import pytest

    req = MagicMock()
    req.headers = {"x-cron-secret": "right"}
    req.query_params = {}
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(wa_mod, "CRON_SECRET", "right")
        wa_mod._require_cron_secret(req)  # should not raise
