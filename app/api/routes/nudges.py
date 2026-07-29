from fastapi import APIRouter, Depends

from app.api.dependencies.cron_auth import require_cron_secret
from app.services.nudge_service import check_and_send_nudges

router = APIRouter(prefix="/nudges", tags=["nudges"])


@router.api_route("/check-and-send", methods=["GET", "POST"], dependencies=[Depends(require_cron_secret)])
async def check_and_send():
    """Called on a schedule by an external cron. Accepts GET or POST since
    some free cron services (e.g. cron-job.org) default new jobs to GET and
    don't always expose a method picker — same rationale as reminders' route.
    Checks every active user's morning/afternoon/evening/night nudge slots
    and sends whichever are due."""
    return check_and_send_nudges()
