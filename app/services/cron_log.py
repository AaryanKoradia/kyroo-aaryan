import logging

logger = logging.getLogger(__name__)


def log_cron_run(db, job: str, **counts: int) -> None:
    """Records that this cron tick actually ran, so a "nothing arrived
    today" report can be diagnosed from a real gap between rows in
    cron_runs (the external trigger — GitHub Actions or cron-job.org —
    silently not firing) via GET /debug/cron-status, instead of guessed
    at from app logic that already looked correct the last time this
    came up. Never allowed to break the actual send path if it fails."""
    try:
        db.table("cron_runs").insert({"job": job, **counts}).execute()
    except Exception:
        logger.exception(f"[{job}] cron_runs logging failed")
