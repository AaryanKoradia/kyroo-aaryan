from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import razorpay
import os
import hmac
import hashlib

router = APIRouter(prefix="/payments", tags=["payments"])

client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), 
          os.getenv("RAZORPAY_KEY_SECRET"))
)

class CreateOrderRequest(BaseModel):
    user_id: str
    plan: str

class VerifyPaymentRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: str
    plan: str

PLAN_PRICES = {
    "pro": 99900,      # ₹999 in paise
    "pro_plus": 199900  # ₹1,999 in paise
}

@router.post("/create-order")
async def create_order(req: CreateOrderRequest):
    if req.plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail="Invalid plan")
    
    amount = PLAN_PRICES[req.plan]
    
    order = client.order.create({
        "amount": amount,
        "currency": "INR",
        "receipt": f"kiro_{req.user_id[:8]}",
        "notes": {
            "user_id": req.user_id,
            "plan": req.plan
        }
    })
    
    return {
        "order_id": order["id"],
        "amount": amount,
        "currency": "INR",
        "key_id": os.getenv("RAZORPAY_KEY_ID"),
        "status": "success"
    }

@router.post("/verify")
async def verify_payment(req: VerifyPaymentRequest):
    from database import get_db
    
    # Verify signature
    message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    secret = os.getenv("RAZORPAY_KEY_SECRET")
    
    generated_signature = hmac.new(
        secret.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    if generated_signature != req.razorpay_signature:
        raise HTTPException(status_code=400, detail="Invalid payment signature")
    
    # Update user plan in database
    db = get_db()
    db.table("users").update({
        "plan": req.plan,
        "is_active": True
    }).eq("id", req.user_id).execute()
    
    return {
        "message": "Payment verified! Welcome to KIRO PRO 🎉",
        "plan": req.plan,
        "status": "success"
    }