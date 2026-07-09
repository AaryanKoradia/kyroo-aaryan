from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db
from brain import kyroo_brain, generate_morning_nudge
import os

router = APIRouter(prefix="/ai", tags=["ai"])

class ChatMessage(BaseModel):
    user_id: str
    message: str
    module: str = "general"

class NudgeRequest(BaseModel):
    user_id: str

@router.post("/chat")
async def chat(msg: ChatMessage):
    db = get_db()
    
    user_data = db.table("users").select("*").eq("id", msg.user_id).execute()
    if not user_data.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = user_data.data[0]
    
    # Get chat history
    history = db.table("chat_history").select("*").eq("user_id", msg.user_id).order("created_at", desc=True).limit(10).execute()
    
    # Use KIRO brain
    result = kyroo_brain(user, msg.message, history.data)
    
    # Save to chat history
    db.table("chat_history").insert({
        "user_id": msg.user_id,
        "user_message": msg.message,
        "kiro_response": result["response"],
        "module": result["module"]
    }).execute()
    
    return {
        "response": result["response"],
        "bubbles": result.get("bubbles", [result["response"]]),
        "module": result["module"],
        "emotion": result["emotion"],
        "status": "success"
    }

@router.post("/morning-nudge")
async def morning_nudge(req: NudgeRequest):
    db = get_db()
    
    user_data = db.table("users").select("*").eq("id", req.user_id).execute()
    if not user_data.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = user_data.data[0]
    
    nudge = generate_morning_nudge(user)
    
    # Save to chat history
    db.table("chat_history").insert({
        "user_id": req.user_id,
        "user_message": "morning_nudge",
        "kiro_response": nudge,
        "module": "general"
    }).execute()
    
    return {
        "nudge": nudge,
        "user": user.get('name'),
        "status": "success"
    }