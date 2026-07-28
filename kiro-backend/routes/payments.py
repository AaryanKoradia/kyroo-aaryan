from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
import razorpay
import os
import hmac
import hashlib
import json

router = APIRouter(prefix="/payments", tags=["payments"])

client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"),
          os.getenv("RAZORPAY_KEY_SECRET"))
)

# Separate secret from RAZORPAY_KEY_SECRET — set under Razorpay Dashboard ->
# Settings -> Webhooks when you add the webhook URL. Used only to verify
# /webhook below, never to authenticate API calls.
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

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


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Server-to-server confirmation from Razorpay, independent of whether
    the client ever called /verify (a closed tab, a network drop, or a
    crash right after paying would otherwise leave the DB never updated
    even though the payment genuinely succeeded). Fails closed — there's no
    prior behavior to preserve here, this is new, so there's no reason to
    accept unverified webhook calls in the meantime."""
    if not RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Webhook not configured")

    raw_body = await request.body()
    signature = request.headers.get("x-razorpay-signature", "")

    try:
        client.utility.verify_webhook_signature(raw_body.decode(), signature, RAZORPAY_WEBHOOK_SECRET)
    except razorpay.errors.SignatureVerificationError:
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

    payload = json.loads(raw_body)
    event = payload.get("event", "")

    if event in ("payment.captured", "order.paid"):
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        notes = entity.get("notes", {}) or {}
        user_id = notes.get("user_id")
        plan = notes.get("plan")
        if user_id and plan:
            from database import get_db
            db = get_db()
            db.table("users").update({"plan": plan, "is_active": True}).eq("id", user_id).execute()

    return {"status": "ok"}