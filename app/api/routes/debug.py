from fastapi import APIRouter, Depends

from app.api.dependencies.cron_auth import require_cron_secret
from app.core.config import settings
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
    not a bug in this endpoint.

    A 200 here only proves Meta ACCEPTED the request, not that it was
    delivered - meta_response.contacts[0].wa_id is the number Meta
    actually normalized "to" into (compare it against what you expected),
    and sending_phone_number_id is which WhatsApp Business number this
    service is configured to send FROM (a wrong/test number here would
    explain "sent" with nothing arriving)."""
    meta_response = WhatsAppClient().send_one(phone, message)
    return {
        "status": "sent",
        "to": phone,
        "sending_phone_number_id": settings.phone_number_id,
        "meta_response": meta_response,
    }
