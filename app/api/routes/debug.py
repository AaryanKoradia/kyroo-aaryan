from fastapi import APIRouter, Depends

from app.api.dependencies.cron_auth import require_cron_secret
from app.core.config import settings
from app.database.supabase_client import get_supabase
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


@router.get("/cron-status", dependencies=[Depends(require_cron_secret)])
async def cron_status(limit: int = 20):
    """Shows the last N times /nudges/check-and-send and
    /reminders/check-and-send actually ran (see cron_runs, written by
    app.services.cron_log.log_cron_run) - this is what tells you WHETHER
    the external cron trigger (GitHub Actions / cron-job.org) is actually
    firing at all, instead of guessing again every time a "no nudge
    arrived today" report comes in. A big gap in ran_at between rows (or
    no row at all for a day) means the trigger didn't fire - go check
    that service's dashboard, not the app code. Rows present on schedule
    with sent=0/failed=0 all day means the trigger is fine and the miss
    is inside app logic instead."""
    db = get_supabase()
    res = (
        db.table("cron_runs").select("*")
        .order("ran_at", desc=True)
        .limit(limit)
        .execute()
    )
    return {"runs": res.data or []}
