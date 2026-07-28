from fastapi import APIRouter, Depends
from app.api.dependencies.cron_auth import require_cron_secret
from app.services.story_service import refresh_story_cache

router = APIRouter(prefix="/stories", tags=["stories"])


@router.post("/refresh", dependencies=[Depends(require_cron_secret)])
async def refresh():
    """Called on a schedule by an external cron. Re-fetches a fresh pool of
    stories from Reddit and replaces the cached set."""
    return refresh_story_cache()
