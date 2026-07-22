import asyncio
import json
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import PlainTextResponse
from app.api.dependencies.database import get_db
from app.core.config import settings
from app.engine.orchestrator import Orchestrator
from app.infrastructure.whatsapp.client import WhatsAppClient
from app.brain.kyroo_brain import validate_response, kyroo_brain, finalize_chat_turn
from app.brain.debounce import buffer_message
from app.services.user_service import UserService
from app.services.conversation_service import ConversationService

router = APIRouter(tags=["WhatsApp"])


def _save_safely(fn, *args):
    """Runs a deferred save and swallows/logs errors — these are
    fire-and-forget writes that happen after the reply is already sent, so a
    failure here should never surface to the user."""
    try:
        fn(*args)
    except Exception as e:
        print(f"[webhook] Post-send save error: {e}")


def _background_save(fn, *args):
    """Schedules a blocking save function on a worker thread so it neither
    blocks the event loop nor makes the caller wait on it."""
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _save_safely, fn, *args)


def _save_image_exchange(conversation_service, user, caption, result):
    conversation_service.add_exchange(user, caption, result["response"], result.get("module", "general"))
    finalize_chat_turn(user, caption, result, conversation_service.db)


def _send_remaining_if_needed(phone: str, result: dict):
    """Bubbles from the main LLM path are already sent as they streamed in
    (result["already_sent"] is True); the crisis/math paths don't stream,
    so their bubbles still need sending here the normal way."""
    if result.get("already_sent"):
        return
    bubbles = result.get("bubbles") or validate_response(result["response"])
    WhatsAppClient().send(phone, bubbles)


@router.get("/webhook")
async def verify(request: Request):
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")

    if mode == "subscribe" and token == settings.verify_token:
        return PlainTextResponse(challenge)

    raise HTTPException(status_code=403)


@router.post("/webhook")
async def webhook(request: Request, db=Depends(get_db)):
    body = await request.json()
    print(json.dumps(body, indent=2))

    try:
        value = body["entry"][0]["changes"][0]["value"]
    except Exception:
        return {"status": "ignored"}

    if "messages" not in value:
        return {"status": "ignored"}

    message = value["messages"][0]
    phone = message["from"]
    message_id = message.get("id", "")
    msg_type = message.get("type")

    if msg_type == "image":
        # images bypass the text debounce buffer and get a direct reply
        caption = message.get("image", {}).get("caption", "")
        media_id = message.get("image", {}).get("id")
        downloaded = WhatsAppClient().download_media(media_id) if media_id else None
        image_base64, image_media_type = downloaded if downloaded else (None, None)

        try:
            wa = WhatsAppClient()
            if message_id:
                wa.send_typing_indicator(message_id)

            user = UserService(db).get_or_create_user(phone)
            conversation_service = ConversationService(db)

            on_bubble = lambda b: wa.send_one(phone, b)
            result = kyroo_brain(user, caption, [], image_base64, image_media_type, on_bubble=on_bubble)
            _send_remaining_if_needed(phone, result)

            # history/memory writes happen after the reply is already sent
            _background_save(
                _save_image_exchange, conversation_service, user,
                caption or "(sent a photo)", result,
            )
        except Exception as e:
            print(f"[webhook] Image error: {e}")
        return {"status": "ok"}

    if msg_type != "text":
        return {"status": "ignored"}

    text = message["text"]["body"].strip()

    async def _reply_to_batch(combined_text: str, latest_message_id: str):
        try:
            wa = WhatsAppClient()
            if latest_message_id:
                # marks the message read + shows "typing..." while the LLM
                # is actually generating, instead of the user seeing nothing
                # happen for the next several seconds
                wa.send_typing_indicator(latest_message_id)

            orchestrator = Orchestrator(db)
            on_bubble = lambda b: wa.send_one(phone, b)
            user, result = orchestrator.process(phone, combined_text, on_bubble=on_bubble)
            _send_remaining_if_needed(phone, result)

            # chat history + style/memory writes happen after the reply is
            # already on its way to the user, not before
            _background_save(orchestrator.save_exchange, user, combined_text, result)
        except Exception as e:
            print(f"[webhook] Error: {e}")

    # buffers rapid consecutive messages (someone splitting one thought
    # across 2-3 texts) into a single reply instead of responding to each
    # fragment separately
    await buffer_message(phone, text, message_id, _reply_to_batch)

    return {"status": "ok"}
