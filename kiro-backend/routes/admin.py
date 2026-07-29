import os

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from database import get_db
from rate_limit import limiter

router = APIRouter(prefix="/admin", tags=["admin"])

# No admin UI/tooling existed at all before this — any support action
# (look up a user, check their chat history, comp/refund them, unstick a
# stuck conversation) had to be done by hand, directly against Supabase.
# Gated on a single shared secret rather than real per-admin accounts,
# since there's no auth system in this codebase yet — good enough for
# "only Aarya/Aaryan can use this," not a real multi-admin permission
# model if this ever needs one.
ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")


def _require_admin(request: Request) -> None:
    provided = request.headers.get("x-admin-secret", "")
    if not ADMIN_SECRET or provided != ADMIN_SECRET:
        raise HTTPException(status_code=403, detail="Missing or invalid admin secret")


PROFILE_FIELDS = (
    "id, name, email, phone, city, age, plan, is_active, onboarding_step, "
    "created_at, fitness_goal, money_habit, language, nudge_time"
)


@router.get("/search")
@limiter.limit("10/minute")
async def search_users(request: Request, q: str = ""):
    _require_admin(request)
    if not q or len(q.strip()) < 3:
        raise HTTPException(status_code=400, detail="Search term must be at least 3 characters")
    db = get_db()
    term = q.strip()
    by_phone = db.table("users").select(PROFILE_FIELDS).ilike("phone", f"%{term}%").limit(20).execute()
    by_email = db.table("users").select(PROFILE_FIELDS).ilike("email", f"%{term}%").limit(20).execute()
    by_name = db.table("users").select(PROFILE_FIELDS).ilike("name", f"%{term}%").limit(20).execute()
    seen = {}
    for row in (by_phone.data or []) + (by_email.data or []) + (by_name.data or []):
        seen[row["id"]] = row
    return {"results": list(seen.values())}


@router.get("/users/{user_id}")
@limiter.limit("10/minute")
async def get_user_detail(request: Request, user_id: str):
    _require_admin(request)
    db = get_db()
    user = db.table("users").select(PROFILE_FIELDS).eq("id", user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")
    history = (
        db.table("chat_history").select("user_message, kiro_response, module, created_at")
        .eq("user_id", user_id).order("created_at", desc=True).limit(20).execute()
    )
    return {"user": user.data[0], "recent_chat_history": history.data or []}


class UpdateUserRequest(BaseModel):
    plan: str | None = None
    is_active: bool | None = None


@router.post("/users/{user_id}")
@limiter.limit("5/minute")
async def update_user_admin(request: Request, user_id: str, req: UpdateUserRequest):
    """Manual plan changes (comp/refund) and account intervention
    (activate/deactivate) — the two concrete support actions the
    enterprise-readiness audit flagged as having zero tooling."""
    _require_admin(request)
    db = get_db()
    existing = db.table("users").select("id").eq("id", user_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="User not found")

    updates = {}
    if req.plan is not None:
        updates["plan"] = req.plan
    if req.is_active is not None:
        updates["is_active"] = req.is_active
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    db.table("users").update(updates).eq("id", user_id).execute()
    return {"status": "success", "updated": updates}
