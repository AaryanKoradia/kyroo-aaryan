from fastapi import APIRouter, Depends

from app.api.dependencies.cron_auth import require_cron_secret

router = APIRouter(prefix="/nudges", tags=["nudges"])


@router.api_route("/check-and-send", methods=["GET", "POST"], dependencies=[Depends(require_cron_secret)])
async def check_and_send():
    """Called on a schedule by an external cron. Nudges are paused
    product-wide (website chat is primary now, proactive WhatsApp nudges
    are off), so this is a no-op — the external cron can keep firing on
    its existing schedule harmlessly instead of needing to be touched.
    check_and_send_nudges() in nudge_service.py still has the real logic
    intact; call it here again to re-enable. Was erroring on every active
    user before this (404 from Meta — the WhatsApp template/number it
    targets is gone), churning a Supabase read per user for nothing every
    cycle."""
    return {"status": "paused"}
