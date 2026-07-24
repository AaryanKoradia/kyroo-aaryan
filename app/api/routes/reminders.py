from fastapi import APIRouter

from app.services.reminder_service import check_and_send_reminders

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.post("/check-and-send")
async def check_and_send():
    """Called on a schedule by an external cron (needs tight, minute-level
    timing to be useful, unlike nudges). Sends any due 5-min pre-alerts and
    any due exact-time reminders."""
    return check_and_send_reminders()
