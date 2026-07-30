from fastapi import APIRouter, Depends

from app.api.dependencies.cron_auth import require_cron_secret
from app.infrastructure.whatsapp.client import WhatsAppClient

router = APIRouter(prefix="/debug", tags=["debug"])

DEFAULT_TEST_MESSAGE = (
    "Hey, this is a manual test message from KYROO - checking the WhatsApp "
    "send path is working end to end."
)


@router.get("/send-test", dependencies=[Depends(require_cron_secret)])
async def send_test(phone: str, message: str = DEFAULT_TEST_MESSAGE):
    """Manual one-off send for verifying the WhatsApp integration without
    needing Render shell access - paste the URL (with ?secret=... since
    this uses the same cron-secret guard as /nudges and /reminders) into
    a browser. Bypasses send_proactive's session-window/template logic
    entirely, since this is a direct ad-hoc send, not a proactive nudge -
    if the recipient hasn't messaged KYROO within the last 24h, WhatsApp's
    API itself will reject it with error 131047, which is expected here,
    not a bug in this endpoint."""
    WhatsAppClient().send_one(phone, message)
    return {"status": "sent", "to": phone}
