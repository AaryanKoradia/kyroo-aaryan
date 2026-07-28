from fastapi import APIRouter, Depends

from app.api.dependencies.cron_auth import require_cron_secret
from app.services.nudge_service import check_and_send_nudges

router = APIRouter(prefix="/nudges", tags=["nudges"])


@router.post("/check-and-send", dependencies=[Depends(require_cron_secret)])
async def check_and_send():
    """Called on a schedule by an external cron. Checks every active user's
    morning/afternoon/evening/night nudge slots and sends whichever are due."""
    return check_and_send_nudges()
