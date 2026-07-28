"""Covers the shared cron-secret guard on /nudges, /reminders, /stories —
these had zero auth before, letting anyone trigger a mass WhatsApp send."""
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.api.dependencies.cron_auth import require_cron_secret
from app.core.config import settings


def _fake_request(headers=None, query=None):
    req = MagicMock()
    req.headers = headers or {}
    req.query_params = query or {}
    return req


def test_fails_closed_when_secret_not_configured():
    settings.cron_secret = ""
    with pytest.raises(HTTPException) as exc_info:
        require_cron_secret(_fake_request())
    assert exc_info.value.status_code == 403


def test_accepts_correct_header():
    settings.cron_secret = "sekrit123"
    require_cron_secret(_fake_request(headers={"x-cron-secret": "sekrit123"}))  # no raise


def test_accepts_correct_query_param():
    settings.cron_secret = "sekrit123"
    require_cron_secret(_fake_request(query={"secret": "sekrit123"}))  # no raise


def test_rejects_wrong_secret():
    settings.cron_secret = "sekrit123"
    with pytest.raises(HTTPException) as exc_info:
        require_cron_secret(_fake_request(headers={"x-cron-secret": "wrong"}))
    assert exc_info.value.status_code == 403
