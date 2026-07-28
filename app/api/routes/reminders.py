from fastapi import APIRouter, Depends

from app.api.dependencies.cron_auth import require_cron_secret
from app.services.reminder_service import check_and_send_reminders

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.api_route("/check-and-send", methods=["GET", "POST"], dependencies=[Depends(require_cron_secret)])
async def check_and_send():
    """Called on a schedule by an external cron (needs tight, minute-level
    timing to be useful, unlike nudges). Accepts GET or POST since most
    free cron services default to GET and don't always expose a method
    picker. Sends any due 5-min pre-alerts and any due exact-time
    reminders."""
    return check_and_send_reminders()
