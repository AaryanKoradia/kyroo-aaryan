import asyncio
import json
import traceback
from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import PlainTextResponse
from app.api.dependencies.database import get_db
from app.core.config import settings
from app.engine.orchestrator import Orchestrator
from app.infrastructure.whatsapp.client import WhatsAppClient
from app.brain.kyroo_brain import validate_response, kyroo_brain, finalize_chat_turn
from app.brain.debounce import buffer_message
from app.brain.stickers import is_sticker_war_trigger, pick_random_mood, pick_random_sticker, STICKER_MEDIA_IDS
from app.brain.onboarding_flow import (
    needs_onboarding, current_question, process_answer, format_prompt,
    ONBOARDING_QUESTIONS, COMPLETE_TEXT,
)
from app.services.user_service import UserService
from app.services.conversation_service import ConversationService

router = APIRouter(tags=["WhatsApp"])

MAX_PDF_BYTES = 15 * 1024 * 1024  # 15MB — big enough for a real document, small enough to stay fast


def _save_safely(fn, *args):
    """Runs a deferred save and swallows/logs errors — these are
    fire-and-forget writes that happen after the reply is already sent, so a
    failure here should never surface to the user."""
    try:
        fn(*args)
    except Exception:
        print(f"[webhook] Post-send save error:\n{traceback.format_exc()}")


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


def _extract_interactive_id(message: dict) -> str | None:
    interactive = message.get("interactive", {})
    if "list_reply" in interactive:
        return interactive["list_reply"].get("id")
    if "button_reply" in interactive:
        return interactive["button_reply"].get("id")
    return None


def _send_onboarding_question(wa: WhatsAppClient, phone: str, question: dict, user: dict):
    prompt = format_prompt(question, user)
    if question["type"] == "text":
        wa.send_one(phone, prompt)
    else:
        wa.send_list_message(phone, prompt, question["options"])


def _handle_onboarding_turn(db, user: dict, message: dict, msg_type: str, message_id: str):
    """Anyone who's never been through the website form (onboarding_step is
    set, not the "complete" default) gets walked through the exact same
    questions here instead of full chat — gated, so there's no personalized
    or generic chat access until this finishes."""
    wa = WhatsAppClient()
    if message_id:
        wa.send_typing_indicator(message_id)

    phone = user["phone"]
    user_service = UserService(db)

    question = current_question(user)
    if question is None:
        # onboarding_step is still NOT_STARTED — nothing has been asked yet,
        # this inbound message (whatever it is) is just their opener
        _send_onboarding_question(wa, phone, ONBOARDING_QUESTIONS[0], user)
        user_service.update_user(user["id"], {"onboarding_step": 0})
        return

    if msg_type == "text":
        text = message["text"]["body"].strip()
        interactive_id = None
    elif msg_type == "interactive":
        text = None
        interactive_id = _extract_interactive_id(message)
    else:
        # image/sticker/audio etc mid-onboarding — steer back to the
        # question rather than silently ignoring or treating it as an answer
        wa.send_one(phone, "Let's finish setting you up first — " + format_prompt(question, user))
        return

    update, error = process_answer(user, text, interactive_id)
    if error:
        wa.send_one(phone, error)
        return

    user_service.update_user(user["id"], update)
    user.update(update)

    next_question = current_question(user)
    if next_question is None:
        wa.send_one(phone, COMPLETE_TEXT.format(name=user.get("name") or "yaar"))
    else:
        _send_onboarding_question(wa, phone, next_question, user)


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

    # looked up once up front — needed to decide whether this number has
    # ever completed onboarding before dispatching on message type
    try:
        user = UserService(db).get_or_create_user(phone)
    except Exception:
        print(f"[webhook] User lookup error:\n{traceback.format_exc()}")
        return {"status": "ok"}

    if needs_onboarding(user):
        try:
            _handle_onboarding_turn(db, user, message, msg_type, message_id)
        except Exception:
            print(f"[webhook] Onboarding error:\n{traceback.format_exc()}")
        return {"status": "ok"}

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

            conversation_service = ConversationService(db)

            on_bubble = lambda b: wa.send_one(phone, b)
            result = kyroo_brain(user, caption, [], image_base64, image_media_type, on_bubble=on_bubble)
            _send_remaining_if_needed(phone, result)

            # history/memory writes happen after the reply is already sent
            _background_save(
                _save_image_exchange, conversation_service, user,
                caption or "(sent a photo)", result,
            )
        except Exception:
            print(f"[webhook] Image error:\n{traceback.format_exc()}")
        return {"status": "ok"}

    if msg_type == "document":
        # PDFs bypass the text debounce buffer and get a direct reply, same
        # as images — Claude reads the document natively, no separate
        # text-extraction step needed
        doc = message.get("document", {})
        mime_type = doc.get("mime_type", "")
        caption = doc.get("caption", "")
        media_id = doc.get("id")

        try:
            wa = WhatsAppClient()
            if message_id:
                wa.send_typing_indicator(message_id)

            if mime_type != "application/pdf":
                wa.send_one(phone, "I can only read PDFs right now, not that file type — send it as a PDF?")
                return {"status": "ok"}

            downloaded = wa.download_media(media_id, max_bytes=MAX_PDF_BYTES) if media_id else None
            if not downloaded:
                wa.send_one(phone, "That PDF's too big for me to read (or didn't come through) — try a smaller file?")
                return {"status": "ok"}
            document_base64, document_media_type = downloaded

            conversation_service = ConversationService(db)

            on_bubble = lambda b: wa.send_one(phone, b)
            result = kyroo_brain(
                user, caption, [], on_bubble=on_bubble,
                document_base64=document_base64, document_media_type=document_media_type,
            )
            _send_remaining_if_needed(phone, result)

            _background_save(
                _save_image_exchange, conversation_service, user,
                caption or "(sent a PDF)", result,
            )
        except Exception:
            print(f"[webhook] Document error:\n{traceback.format_exc()}")
        return {"status": "ok"}

    if msg_type == "sticker":
        # a sticker back is the whole point — no LLM call needed, this
        # should feel instant and rapid-fire, the way a real sticker war does
        try:
            wa = WhatsAppClient()
            if message_id:
                wa.send_typing_indicator(message_id)

            conversation_service = ConversationService(db)

            wa.send_sticker(phone, pick_random_sticker())

            _background_save(
                conversation_service.add_exchange, user,
                "[sent a sticker]", "[sent a sticker back]", "general",
            )
        except Exception:
            print(f"[webhook] Sticker error:\n{traceback.format_exc()}")
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

            if is_sticker_war_trigger(combined_text):
                # kick it off with a couple of stickers rather than a
                # wordy reply — no LLM needed, just start firing
                conversation_service = ConversationService(db)
                first_mood = pick_random_mood()
                wa.send_sticker(phone, STICKER_MEDIA_IDS[first_mood])
                wa.send_sticker(phone, STICKER_MEDIA_IDS[pick_random_mood(exclude=first_mood)])
                _background_save(
                    conversation_service.add_exchange, user,
                    combined_text, "[started a sticker war]", "general",
                )
                return

            orchestrator = Orchestrator(db)
            on_bubble = lambda b: wa.send_one(phone, b)
            _, result = orchestrator.process(phone, combined_text, on_bubble=on_bubble)
            _send_remaining_if_needed(phone, result)

            # chat history + style/memory writes happen after the reply is
            # already on its way to the user, not before
            _background_save(orchestrator.save_exchange, user, combined_text, result)
        except Exception:
            print(f"[webhook] Error:\n{traceback.format_exc()}")

    # buffers rapid consecutive messages (someone splitting one thought
    # across 2-3 texts) into a single reply instead of responding to each
    # fragment separately
    await buffer_message(phone, text, message_id, _reply_to_batch)

    return {"status": "ok"}
