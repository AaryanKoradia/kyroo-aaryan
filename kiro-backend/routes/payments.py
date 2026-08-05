from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel
import razorpay
import os
import hmac
import hashlib
import json
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"),
          os.getenv("RAZORPAY_KEY_SECRET"))
)

# Separate secret from RAZORPAY_KEY_SECRET — set under Razorpay Dashboard ->
# Settings -> Webhooks when you add the webhook URL. Used only to verify
# /webhook below, never to authenticate API calls.
RAZORPAY_WEBHOOK_SECRET = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")

# Same secret as app/'s CRON_SECRET — guards the expired-subscription
# safety-net endpoint below the same way app/'s nudge/reminder cron
# endpoints are guarded.
CRON_SECRET = os.getenv("CRON_SECRET", "")


def _require_cron_secret(request: Request) -> None:
    provided = request.headers.get("x-cron-secret") or request.query_params.get("secret")
    if not CRON_SECRET or provided != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Missing or invalid cron secret")


# Real, current pricing: monthly recurring subscriptions via Razorpay Plans.
# The plan_id values are NOT created by this code — a Razorpay Plan is a
# one-time setup step (Dashboard -> Subscriptions -> Plans, or the Plans
# API), done once outside app code, then referenced here by ID.
PLAN_MONTHLY_PRICES = {
    "pro": 10000,       # ₹100/month in paise
    "pro_plus": 29900,  # ₹299/month in paise
}
RAZORPAY_PLAN_IDS = {
    "pro": os.getenv("RAZORPAY_PLAN_ID_PRO", ""),
    "pro_plus": os.getenv("RAZORPAY_PLAN_ID_PRO_PLUS", ""),
}

# Razorpay subscriptions have no "forever" option, only a total_count of
# billing cycles — 120 months (10 years) is the standard way to express
# "indefinite, renews monthly until cancelled" without an artificial gap.
SUBSCRIPTION_TOTAL_COUNT = 120

TOPUP_PRICE_PAISE = 4900  # ₹49
TOPUP_MESSAGE_COUNT = 25


def _resolve_user_id(db, user_id: str = "", phone: str = "") -> str:
    """Website-originated checkout already has a user_id in localStorage
    from onboarding. But the WhatsApp limit-hit message links here for a
    user who's never opened the website in that browser before - nothing
    in localStorage - so that link carries their phone number instead,
    and this resolves it server-side rather than exposing a public
    phone->user_id lookup endpoint."""
    if user_id:
        return user_id
    if phone:
        res = db.table("users").select("id").eq("phone", phone).limit(1).execute()
        if res.data:
            return res.data[0]["id"]
    raise HTTPException(status_code=404, detail="Couldn't find your account - message KYROO on WhatsApp first")


class CreateSubscriptionRequest(BaseModel):
    user_id: str = ""
    phone: str = ""
    plan: str


class VerifySubscriptionRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str
    user_id: str
    plan: str


class CreateTopupOrderRequest(BaseModel):
    user_id: str = ""
    phone: str = ""


class VerifyTopupRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    user_id: str


@router.post("/create-subscription")
async def create_subscription(req: CreateSubscriptionRequest):
    from database import get_db

    plan_id = RAZORPAY_PLAN_IDS.get(req.plan)
    if not plan_id:
        raise HTTPException(status_code=400, detail="Invalid or unconfigured plan")

    user_id = _resolve_user_id(get_db(), req.user_id, req.phone)

    subscription = client.subscription.create({
        "plan_id": plan_id,
        "customer_notify": 1,
        "total_count": SUBSCRIPTION_TOTAL_COUNT,
        "notes": {
            "user_id": user_id,
            "plan": req.plan,
        },
    })

    return {
        "subscription_id": subscription["id"],
        "user_id": user_id,
        "key_id": os.getenv("RAZORPAY_KEY_ID"),
        "amount": PLAN_MONTHLY_PRICES.get(req.plan),
        "currency": "INR",
        "status": "success",
    }


@router.post("/verify-subscription")
async def verify_subscription(req: VerifySubscriptionRequest):
    from database import get_db

    # Subscriptions use a different signature scheme than one-off orders:
    # payment_id|subscription_id, not order_id|payment_id.
    message = f"{req.razorpay_payment_id}|{req.razorpay_subscription_id}"
    secret = os.getenv("RAZORPAY_KEY_SECRET")
    generated_signature = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(generated_signature, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    plan_expires_at = None
    try:
        sub = client.subscription.fetch(req.razorpay_subscription_id)
        current_end = sub.get("current_end")
        if current_end:
            plan_expires_at = datetime.fromtimestamp(current_end, tz=timezone.utc).isoformat()
    except Exception:
        logger.exception(f"[payments] couldn't fetch subscription {req.razorpay_subscription_id}")

    db = get_db()
    db.table("users").update({
        "plan": req.plan,
        "is_active": True,
        "subscription_id": req.razorpay_subscription_id,
        "subscription_status": "active",
        "plan_expires_at": plan_expires_at,
    }).eq("id", req.user_id).execute()

    return {
        "message": "Payment verified! Welcome to KYROO 🎉",
        "plan": req.plan,
        "status": "success",
    }


@router.post("/create-topup-order")
async def create_topup_order(req: CreateTopupOrderRequest):
    from database import get_db

    user_id = _resolve_user_id(get_db(), req.user_id, req.phone)

    order = client.order.create({
        "amount": TOPUP_PRICE_PAISE,
        "currency": "INR",
        "receipt": f"topup_{user_id[:8]}",
        "notes": {
            "user_id": user_id,
            "type": "topup",
            "messages": str(TOPUP_MESSAGE_COUNT),
        },
    })

    return {
        "order_id": order["id"],
        "user_id": user_id,
        "amount": TOPUP_PRICE_PAISE,
        "currency": "INR",
        "key_id": os.getenv("RAZORPAY_KEY_ID"),
        "message_count": TOPUP_MESSAGE_COUNT,
        "status": "success",
    }


@router.post("/verify-topup")
async def verify_topup(req: VerifyTopupRequest):
    from database import get_db

    message = f"{req.razorpay_order_id}|{req.razorpay_payment_id}"
    secret = os.getenv("RAZORPAY_KEY_SECRET")
    generated_signature = hmac.new(secret.encode(), message.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(generated_signature, req.razorpay_signature):
        raise HTTPException(status_code=400, detail="Invalid payment signature")

    db = get_db()
    result = db.rpc("add_bonus_messages", {"p_user_id": req.user_id, "p_amount": TOPUP_MESSAGE_COUNT}).execute()

    return {
        "message": f"Added {TOPUP_MESSAGE_COUNT} messages!",
        "bonus_messages": result.data,
        "status": "success",
    }


@router.post("/webhook")
async def razorpay_webhook(request: Request):
    """Server-to-server confirmation from Razorpay, independent of whether
    the client ever called /verify-subscription or /verify-topup (a closed
    tab, a network drop, or a crash right after paying would otherwise
    leave the DB never updated even though the payment genuinely
    succeeded). Also the ONLY path for subscription renewals/failures —
    those happen with no browser open at all, so this is not just a
    fallback for that part. Fails closed if the secret isn't configured."""
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

    from database import get_db
    db = get_db()

    if event in ("payment.captured", "order.paid"):
        # one-off order path — currently only top-ups use this; kept
        # generic (branches on notes.type) in case anything else ever
        # needs a one-off order again
        entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
        notes = entity.get("notes", {}) or {}
        user_id = notes.get("user_id")
        if user_id and notes.get("type") == "topup":
            messages = int(notes.get("messages") or TOPUP_MESSAGE_COUNT)
            db.rpc("add_bonus_messages", {"p_user_id": user_id, "p_amount": messages}).execute()

    elif event in ("subscription.activated", "subscription.charged"):
        # initial activation and every successful monthly renewal both
        # land here — re-sync plan/status/expiry either way
        entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        notes = entity.get("notes", {}) or {}
        user_id = notes.get("user_id")
        plan = notes.get("plan")
        if user_id and plan:
            update = {
                "plan": plan,
                "is_active": True,
                "subscription_status": "active",
                "subscription_id": entity.get("id"),
            }
            current_end = entity.get("current_end")
            if current_end:
                update["plan_expires_at"] = datetime.fromtimestamp(current_end, tz=timezone.utc).isoformat()
            db.table("users").update(update).eq("id", user_id).execute()

    elif event in ("subscription.halted", "subscription.cancelled", "subscription.completed"):
        # halted = renewal payment failed and Razorpay gave up retrying;
        # cancelled/completed = explicitly ended. All three mean "this
        # user is not a paying subscriber anymore" - downgrade immediately
        # rather than leave them on a paid plan with no active billing.
        entity = payload.get("payload", {}).get("subscription", {}).get("entity", {})
        notes = entity.get("notes", {}) or {}
        user_id = notes.get("user_id")
        if user_id:
            db.table("users").update({
                "plan": "free",
                "subscription_status": event.split(".", 1)[1],
            }).eq("id", user_id).execute()

    return {"status": "ok"}


@router.post("/check-expired-subscriptions", dependencies=[Depends(_require_cron_secret)])
async def check_expired_subscriptions():
    """Safety net for a subscription lifecycle webhook that never arrived —
    Razorpay retries webhook delivery but not forever. Anyone still marked
    on a paid plan whose plan_expires_at has already passed gets
    downgraded to free. The webhook above is the primary mechanism; this
    just catches what it might miss, the same defense-in-depth pattern
    app/'s nudges/reminders use (a webhook-equivalent plus a cron
    safety-net), called on a daily schedule."""
    from database import get_db
    db = get_db()
    now = datetime.now(timezone.utc).isoformat()

    res = (
        db.table("users")
        .select("id")
        .neq("plan", "free")
        .lt("plan_expires_at", now)
        .execute()
    )
    downgraded = []
    for row in (res.data or []):
        db.table("users").update({"plan": "free", "subscription_status": "expired"}).eq("id", row["id"]).execute()
        downgraded.append(row["id"])

    return {"checked": True, "downgraded_count": len(downgraded)}
