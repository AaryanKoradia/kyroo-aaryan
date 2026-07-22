from fastapi import APIRouter

from app.services.nudge_service import check_and_send_nudges

router = APIRouter(prefix="/nudges", tags=["nudges"])


@router.post("/check-and-send")
async def check_and_send():
    """Called on a schedule by an external cron. Checks every active user's
    morning/afternoon/evening/night nudge slots and sends whichever are due."""
    return check_and_send_nudges()
