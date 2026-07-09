from fastapi import APIRouter, HTTPException
from database import get_db
from brain import generate_weekly_report

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("/weekly/{user_id}")
async def weekly_report(user_id: str):
    db = get_db()

    user = db.table("users").select("id").eq("id", user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    report = generate_weekly_report(user_id)

    db.table("weekly_reports").insert({
        "user_id":     user_id,
        "report_text": report,
        "week_start":  "",
        "week_end":    ""
    }).execute()

    return {
        "status": "success",
        "report": report,
        "user_id": user_id
    }

@router.get("/history/{user_id}")
async def report_history(user_id: str):
    db = get_db()

    res = db.table("weekly_reports").select("*")\
        .eq("user_id", user_id)\
        .order("created_at", desc=True)\
        .limit(10)\
        .execute()

    return {"reports": res.data or [], "count": len(res.data or [])}

@router.post("/send-all-weekly")
async def send_all_weekly():
    db    = get_db()
    users = db.table("users").select("id, name").eq("is_active", True).execute()

    sent = []
    for user in (users.data or []):
        try:
            report = generate_weekly_report(user["id"])
            db.table("weekly_reports").insert({
                "user_id":     user["id"],
                "report_text": report
            }).execute()
            sent.append(user["name"])
        except Exception as e:
            print(f"Failed for {user['name']}: {e}")

    return {"status": "success", "sent_to": sent, "count": len(sent)}