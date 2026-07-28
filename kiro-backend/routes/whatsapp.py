from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from database import get_db
from brain.kyroo_brain import kyroo_brain, generate_morning_nudge, validate_response
from brain.debounce import buffer_message
import requests
import asyncio
import base64
import hashlib
import hmac
import logging
import random
import os
import sentry_sdk

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])

WHATSAPP_TOKEN   = os.getenv("WHATSAPP_TOKEN", "")
PHONE_NUMBER_ID  = os.getenv("PHONE_NUMBER_ID", "")
GRAPH_VERSION    = "v21.0"
VERIFY_TOKEN     = os.getenv("WHATSAPP_VERIFY_TOKEN", "kyroo_verify_2026")
# Same Meta App Secret as app/'s webhook (app/core/config.py) — see that
# file's comment for why this fails open when unset rather than blank.
WHATSAPP_APP_SECRET = os.getenv("WHATSAPP_APP_SECRET", "")


def _verify_meta_signature(raw_body: bytes, signature_header: str | None) -> bool:
    if not WHATSAPP_APP_SECRET:
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(WHATSAPP_APP_SECRET.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header.removeprefix("sha256="))


CRON_SECRET = os.getenv("CRON_SECRET", "")


def _require_cron_secret(request: Request) -> None:
    """Same shared secret as app/'s cron endpoints — /send, /morning-nudge-send,
    and /send-all-nudges had zero auth and could send arbitrary WhatsApp
    messages (as KYROO, from the real business number) to any or all users."""
    provided = request.headers.get("x-cron-secret") or request.query_params.get("secret")
    if not CRON_SECRET or provided != CRON_SECRET:
        raise HTTPException(status_code=403, detail="Missing or invalid cron secret")

# ─── HELPER: SEND MESSAGE VIA META WHATSAPP CLOUD API ────────────────────────

def send_whatsapp(phone: str, message: str) -> dict:
    if not WHATSAPP_TOKEN or not PHONE_NUMBER_ID:
        return {"status": "pending_setup", "message": message}

    # ensure phone starts with country code, no +
    if not phone.startswith("91"):
        phone = f"91{phone}"

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message}
    }

    try:
        response = requests.post(
            f"https://graph.facebook.com/{GRAPH_VERSION}/{PHONE_NUMBER_ID}/messages",
            headers={
                "Authorization": f"Bearer {WHATSAPP_TOKEN}",
                "Content-Type": "application/json"
            },
            json=payload,
            timeout=10
        )
        return response.json()
    except Exception as e:
        logger.exception(f"WhatsApp send error: {e}")
        sentry_sdk.capture_exception(e)
        return {"status": "error", "error": str(e)}


def download_whatsapp_media(media_id: str):
    """Fetches a WhatsApp media file (image, etc.) and returns (base64_data, mime_type), or None on failure."""
    try:
        meta_resp = requests.get(
            f"https://graph.facebook.com/{GRAPH_VERSION}/{media_id}",
            headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
            timeout=10
        )
        meta = meta_resp.json()
        media_url = meta.get("url")
        mime_type = meta.get("mime_type", "image/jpeg")
        if not media_url:
            return None

        file_resp = requests.get(
            media_url,
            headers={"Authorization": f"Bearer {WHATSAPP_TOKEN}"},
            timeout=15
        )
        return base64.b64encode(file_resp.content).decode("utf-8"), mime_type
    except Exception as e:
        logger.exception(f"WhatsApp media download error: {e}")
        sentry_sdk.capture_exception(e)
        return None


async def send_whatsapp_bubbles(phone: str, bubbles: list[str]) -> list[dict]:
    """Sends each bubble as a separate WhatsApp message with a human-like typing delay between them."""
    results = []
    for i, bubble in enumerate(bubbles):
        results.append(send_whatsapp(phone, bubble))
        if i < len(bubbles) - 1:
            await asyncio.sleep(random.uniform(0.4, 0.9))
    return results


# ─── MODELS ──────────────────────────────────────────────────────────────────

class SendMessageRequest(BaseModel):
    user_id: str
    message: str

class SendNudgeRequest(BaseModel):
    user_id: str


# ─── ROUTES ──────────────────────────────────────────────────────────────────

@router.post("/send")
async def send_message(req: SendMessageRequest, request: Request):
    _require_cron_secret(request)
    db   = get_db()
    user = db.table("users").select("*").eq("id", req.user_id).execute()
    if not user.data:
        raise HTTPException(status_code=404, detail="User not found")

    phone  = user.data[0].get("phone", "")
    result = send_whatsapp(phone, req.message)

    return {
        "status":  "sent" if (WHATSAPP_TOKEN and PHONE_NUMBER_ID) else "pending_setup",
        "phone":   phone,
        "message": req.message,
        "result":  result
    }


@router.post("/morning-nudge-send")
async def send_morning_nudge_route(req: SendNudgeRequest, request: Request):
    _require_cron_secret(request)
    db        = get_db()
    user_data = db.table("users").select("*").eq("id", req.user_id).execute()
    if not user_data.data:
        raise HTTPException(status_code=404, detail="User not found")

    user       = user_data.data[0]
    nudge_text = generate_morning_nudge(user)
    bubbles    = validate_response(nudge_text)
    phone      = user.get("phone", "")

    result = await send_whatsapp_bubbles(phone, bubbles)

    db.table("chat_history").insert({
        "user_id":      req.user_id,
        "user_message": "morning_nudge",
        "kiro_response": "\n\n".join(bubbles),
        "module":       "general"
    }).execute()

    return {
        "nudge":  nudge_text,
        "user":   user.get("name"),
        "phone":  phone,
        "status": "sent" if (WHATSAPP_TOKEN and PHONE_NUMBER_ID) else "pending_setup",
        "result": result
    }


@router.post("/send-all-nudges")
async def send_all_nudges(request: Request):
    _require_cron_secret(request)
    db    = get_db()
    users = db.table("users").select("*").eq("is_active", True).execute()

    results = []
    for user in (users.data or []):
        try:
            nudge_text = generate_morning_nudge(user)
            bubbles    = validate_response(nudge_text)
            phone      = user.get("phone", "")
            result     = await send_whatsapp_bubbles(phone, bubbles)

            db.table("chat_history").insert({
                "user_id":       user["id"],
                "user_message":  "morning_nudge",
                "kiro_response": "\n\n".join(bubbles),
                "module":        "general"
            }).execute()

            results.append({"user": user.get("name"), "status": "sent", "result": result})
        except Exception as e:
            results.append({"user": user.get("name", "unknown"), "status": "failed", "error": str(e)})

    return {"sent": len(results), "results": results, "status": "complete"}


@router.post("/webhook")
async def whatsapp_webhook(request: Request):
    raw_body = await request.body()
    if not _verify_meta_signature(raw_body, request.headers.get("x-hub-signature-256")):
        raise HTTPException(status_code=403, detail="Invalid signature")

    try:
        import json
        data = json.loads(raw_body)

        # Meta WhatsApp Cloud API webhook format:
        # entry[].changes[].value.messages[] / value.contacts[]
        entries = data.get("entry", [])
        if not entries:
            return {"status": "ok"}

        for entry in entries:
            for change in entry.get("changes", []):
                value = change.get("value", {})
                messages = value.get("messages", [])

                for msg in messages:
                    phone = msg.get("from", "")
                    text  = ""
                    image_base64 = None
                    image_media_type = None

                    msg_type = msg.get("type")
                    if msg_type == "text":
                        text = msg.get("text", {}).get("body", "")
                    elif msg_type == "button":
                        text = msg.get("button", {}).get("text", "")
                    elif msg_type == "interactive":
                        interactive = msg.get("interactive", {})
                        text = interactive.get("button_reply", {}).get("title", "") or \
                               interactive.get("list_reply", {}).get("title", "")
                    elif msg_type == "image":
                        text = msg.get("image", {}).get("caption", "")
                        media_id = msg.get("image", {}).get("id")
                        downloaded = download_whatsapp_media(media_id) if media_id else None
                        if downloaded:
                            image_base64, image_media_type = downloaded

                    if not phone or (not text and not image_base64):
                        continue

                    db = get_db()

                    # normalize phone
                    search_phone = phone.replace("91", "", 1) if phone.startswith("91") else phone

                    user_data = db.table("users").select("*").eq("phone", search_phone).execute()

                    if not user_data.data:
                        # user not found — send signup link
                        send_whatsapp(phone, "Hey! 👋 I'm KYROO, your AI best friend.\n\nSign up here to get started:\nhttps://www.kyroo.co.in\n\nMain hoon yahan 24/7! 💚")
                        continue

                    user = user_data.data[0]

                    if image_base64:
                        # images bypass the text debounce buffer and get a direct reply
                        result  = kyroo_brain(user, text, [], image_base64, image_media_type)
                        reply   = result["response"]
                        bubbles = result.get("bubbles", [reply])

                        db.table("chat_history").insert({
                            "user_id":       user["id"],
                            "user_message":  text or "(sent a photo)",
                            "kiro_response": reply,
                            "module":        result["module"]
                        }).execute()

                        await send_whatsapp_bubbles(phone, bubbles)
                        continue

                    async def _reply_to_batch(combined_text: str, user=user, phone=phone, db=db):
                        result  = kyroo_brain(user, combined_text, [])
                        reply   = result["response"]
                        bubbles = result.get("bubbles", [reply])

                        db.table("chat_history").insert({
                            "user_id":       user["id"],
                            "user_message":  combined_text,
                            "kiro_response": reply,
                            "module":        result["module"]
                        }).execute()

                        await send_whatsapp_bubbles(phone, bubbles)

                    # buffers rapid consecutive messages (someone splitting one
                    # thought across 2-3 texts) into a single reply instead of
                    # responding to each fragment separately
                    await buffer_message(user["id"], text, _reply_to_batch)

        return {"status": "ok"}

    except Exception as e:
        logger.exception(f"Webhook error: {e}")
        sentry_sdk.capture_exception(e)
        return {"status": "ok"}


@router.get("/webhook")
async def verify_webhook(
    hub_mode:         str = None,
    hub_challenge:    str = None,
    hub_verify_token: str = None
):
    if hub_verify_token == VERIFY_TOKEN:
        return int(hub_challenge)
    raise HTTPException(status_code=403, detail="Invalid verify token")


@router.get("/status")
async def whatsapp_status():
    return {
        "whatsapp_configured": bool(WHATSAPP_TOKEN and PHONE_NUMBER_ID),
        "provider":            "Meta WhatsApp Cloud API",
        "phone_number_id":     PHONE_NUMBER_ID,
        "status":              "ready" if (WHATSAPP_TOKEN and PHONE_NUMBER_ID) else "pending_setup"
    }
