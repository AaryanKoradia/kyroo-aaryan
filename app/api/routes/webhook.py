import asyncio
import hashlib
import hmac
import json
import logging
import random
from datetime import datetime, timedelta, timezone
import sentry_sdk
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
    ONBOARDING_QUESTIONS, COMPLETE_TEXT, NOT_STARTED, AWAITING_ENTRY_CHOICE,
    AWAITING_CONSENT, ENTRY_CHOICE_PROMPT, ENTRY_CHOICE_OPTIONS, ENTRY_WEBSITE_REPLY,
    CONSENT_PROMPT, CONSENT_RETRY_PROMPT, resolve_entry_choice, is_consent_accepted,
)
from app.brain.transcription import transcribe_audio
from app.services.user_service import UserService
from app.services.conversation_service import ConversationService

router = APIRouter(tags=["WhatsApp"])

logger = logging.getLogger(__name__)

MAX_PDF_BYTES = 15 * 1024 * 1024  # 15MB — big enough for a real document, small enough to stay fast

# Meta's Cloud API webhook redelivers the identical payload (same
# message["id"]) if it doesn't get a fast 200 back — and image/document/
# video replies here run the full vision/LLM pipeline synchronously before
# ever returning, easily taking longer than Meta's ack window. Without this,
# a slow reply gets processed a second time from scratch and the user sees
# the exact same response sent twice. Keyed on message id, not per-user, so
# it catches a redelivered duplicate regardless of message type.
#
# Backed by the processed_messages table (not an in-memory dict) so this
# survives a Render restart and stays correct even if this ever runs as
# more than one worker process — a bare dict only works for a single,
# long-lived process.
#
# REAL BUG FIXED HERE: this used to expire dedup rows after 10 minutes,
# on the (wrong) assumption that's "longer than any realistic redelivery
# window." It isn't — a real report showed the same photo explanation
# getting resent repeatedly over TWO DAYS, because every redelivery that
# arrived more than 10 minutes after the first got treated as brand new
# the moment its dedup row had been swept, and reprocessed from scratch.
# A message_id from Meta is globally unique forever, so there is no
# correctness reason to ever forget one — retention here is now purely
# storage hygiene (keep the table from growing forever), not a
# redelivery-window guess, and is deliberately generous.
_DEDUP_RETENTION_SECONDS = 60 * 60 * 24 * 365  # 1 year — hygiene only, never a correctness window
_CLEANUP_PROBABILITY = 0.02  # ~1 in 50 calls sweeps old rows, no need to do it every time


def _verify_meta_signature(raw_body: bytes, signature_header: str | None) -> bool:
    """Verifies Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw
    body, keyed with the app secret) so a forged POST can't be processed as
    a real WhatsApp message. If WHATSAPP_APP_SECRET isn't configured yet,
    this fails OPEN (returns True) rather than breaking the bot before
    Render has the env var set — once it's set, every request is verified."""
    if not settings.whatsapp_app_secret:
        return True
    if not signature_header or not signature_header.startswith("sha256="):
        return False
    expected = hmac.new(
        settings.whatsapp_app_secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    provided = signature_header.removeprefix("sha256=")
    return hmac.compare_digest(expected, provided)


def _already_processed(db, message_id: str) -> bool:
    """True if this message id was already handled — checked by trying to
    insert it into processed_messages (primary key on message_id): the
    insert succeeding means this is the first time we've seen it, a
    constraint violation means it's a genuine redelivery. Any OTHER DB
    error (a transient connection hiccup, say) fails OPEN — treating an
    infra blip as "already processed" would silently drop a real message,
    which is worse than the rare double-send this whole guard exists to
    prevent."""
    if not message_id:
        return False

    if random.random() < _CLEANUP_PROBABILITY:
        try:
            cutoff = (datetime.now(timezone.utc) - timedelta(seconds=_DEDUP_RETENTION_SECONDS)).isoformat()
            db.table("processed_messages").delete().lt("created_at", cutoff).execute()
        except Exception:
            logger.exception("[webhook] processed_messages cleanup failed")
            sentry_sdk.capture_exception()

    try:
        db.table("processed_messages").insert({"message_id": message_id}).execute()
        return False
    except Exception as e:
        if "duplicate key" in str(e).lower() or "23505" in str(e):
            return True
        logger.exception(f"[webhook] dedup check failed for message_id={message_id}")
        sentry_sdk.capture_exception()
        return False


def _save_safely(fn, *args):
    """Runs a deferred save and swallows/logs errors — these are
    fire-and-forget writes that happen after the reply is already sent, so a
    failure here should never surface to the user."""
    try:
        fn(*args)
    except Exception:
        logger.exception("[webhook] Post-send save error")
        sentry_sdk.capture_exception()


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
    step = user.get("onboarding_step", NOT_STARTED)

    if step == NOT_STARTED:
        # brand new contact — offer the website as the primary path and
        # WhatsApp-native questions as the fallback, rather than diving
        # straight into the 13-question flow
        wa.send_list_message(phone, ENTRY_CHOICE_PROMPT, ENTRY_CHOICE_OPTIONS, button_text="Choose")
        user_service.update_user(user["id"], {"onboarding_step": AWAITING_ENTRY_CHOICE})
        return

    if step == AWAITING_ENTRY_CHOICE:
        text = message.get("text", {}).get("body") if msg_type == "text" else None
        interactive_id = _extract_interactive_id(message) if msg_type == "interactive" else None
        choice = resolve_entry_choice(text, interactive_id)
        if choice == "website":
            wa.send_one(phone, ENTRY_WEBSITE_REPLY)
            # stays at AWAITING_ENTRY_CHOICE — if they come back without
            # finishing on the website, typing anything at all still falls
            # through to the WhatsApp flow below next time
            return
        wa.send_one(phone, CONSENT_PROMPT)
        user_service.update_user(user["id"], {"onboarding_step": AWAITING_CONSENT})
        return

    if step == AWAITING_CONSENT:
        text = message.get("text", {}).get("body") if msg_type == "text" else None
        if not is_consent_accepted(text):
            wa.send_one(phone, CONSENT_RETRY_PROMPT)
            return
        _send_onboarding_question(wa, phone, ONBOARDING_QUESTIONS[0], user)
        user_service.update_user(user["id"], {"onboarding_step": 0})
        return

    question = current_question(user)
    if question is None:
        # shouldn't normally happen (covered by the states above), but
        # guard rather than crash on an unexpected onboarding_step value
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
        wa.send_one(phone, "Let's finish setting you up first, " + format_prompt(question, user))
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
    raw_body = await request.body()
    if not _verify_meta_signature(raw_body, request.headers.get("x-hub-signature-256")):
        logger.warning("[webhook] Rejected POST with invalid/missing X-Hub-Signature-256")
        raise HTTPException(status_code=403, detail="Invalid signature")

    body = json.loads(raw_body)
    logger.debug(json.dumps(body, indent=2))

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

    if _already_processed(db, message_id):
        return {"status": "ok"}

    # looked up once up front — needed to decide whether this number has
    # ever completed onboarding before dispatching on message type
    try:
        user = UserService(db).get_or_create_user(phone)
    except Exception:
        logger.exception("[webhook] User lookup error")
        sentry_sdk.capture_exception()
        return {"status": "ok"}

    if needs_onboarding(user):
        try:
            _handle_onboarding_turn(db, user, message, msg_type, message_id)
        except Exception:
            logger.exception(f"[webhook] Onboarding error")
            sentry_sdk.capture_exception()
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
            on_gif = lambda url: wa.send_gif(phone, url)
            result = kyroo_brain(user, caption, [], image_base64, image_media_type, on_bubble=on_bubble, on_gif=on_gif)
            _send_remaining_if_needed(phone, result)

            # history/memory writes happen after the reply is already sent
            _background_save(
                _save_image_exchange, conversation_service, user,
                caption or "(sent a photo)", result,
            )
        except Exception:
            logger.exception(f"[webhook] Image error")
            sentry_sdk.capture_exception()
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
                wa.send_one(phone, "I can only read PDFs right now, not that file type, send it as a PDF?")
                return {"status": "ok"}

            downloaded = wa.download_media(media_id, max_bytes=MAX_PDF_BYTES) if media_id else None
            if not downloaded:
                wa.send_one(phone, "That PDF's too big for me to read (or didn't come through), try a smaller file?")
                return {"status": "ok"}
            document_base64, document_media_type = downloaded

            conversation_service = ConversationService(db)

            on_bubble = lambda b: wa.send_one(phone, b)
            on_gif = lambda url: wa.send_gif(phone, url)
            result = kyroo_brain(
                user, caption, [], on_bubble=on_bubble, on_gif=on_gif,
                document_base64=document_base64, document_media_type=document_media_type,
            )
            _send_remaining_if_needed(phone, result)

            _background_save(
                _save_image_exchange, conversation_service, user,
                caption or "(sent a PDF)", result,
            )
        except Exception:
            logger.exception(f"[webhook] Document error")
            sentry_sdk.capture_exception()
        return {"status": "ok"}

    if msg_type == "audio":
        # transcribe then hand off to the exact same pipeline as a typed
        # text message — no separate audio-specific chat logic needed
        audio = message.get("audio", {})
        media_id = audio.get("id")
        audio_mime = audio.get("mime_type", "audio/ogg")

        try:
            wa = WhatsAppClient()
            if message_id:
                wa.send_typing_indicator(message_id)

            downloaded = wa.download_media(media_id) if media_id else None
            transcript = transcribe_audio(downloaded[0], audio_mime, user.get("language", "Hinglish")) if downloaded else None

            if not transcript:
                wa.send_one(phone, "couldn't quite make that out, can you type it or send it again?")
                return {"status": "ok"}

            orchestrator = Orchestrator(db)
            on_bubble = lambda b: wa.send_one(phone, b)
            on_gif = lambda url: wa.send_gif(phone, url)
            _, result = orchestrator.process(phone, transcript, on_bubble=on_bubble, on_gif=on_gif)
            _send_remaining_if_needed(phone, result)

            _background_save(orchestrator.save_exchange, user, transcript, result)
        except Exception:
            logger.exception(f"[webhook] Audio error")
            sentry_sdk.capture_exception()
        return {"status": "ok"}

    if msg_type == "video":
        # WhatsApp delivers a gif sent from the built-in gif picker as a
        # "video" message under the hood (short mp4), not "image" — this
        # used to fall through to the unhandled-type catch-all below and
        # get silently dropped, so the user got no reply at all. No real
        # video-content understanding yet, so this just reacts through the
        # normal chat pipeline the way a friend would react to a gif being
        # sent, rather than actually analyzing the video frames.
        video = message.get("video", {})
        caption = video.get("caption", "")
        default_message = caption or "(sent a gif/video)"

        try:
            wa = WhatsAppClient()
            if message_id:
                wa.send_typing_indicator(message_id)

            conversation_service = ConversationService(db)

            on_bubble = lambda b: wa.send_one(phone, b)
            on_gif = lambda url: wa.send_gif(phone, url)
            result = kyroo_brain(user, default_message, [], on_bubble=on_bubble, on_gif=on_gif)
            _send_remaining_if_needed(phone, result)

            _background_save(
                _save_image_exchange, conversation_service, user,
                default_message, result,
            )
        except Exception:
            logger.exception(f"[webhook] Video error")
            sentry_sdk.capture_exception()
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
            logger.exception(f"[webhook] Sticker error")
            sentry_sdk.capture_exception()
        return {"status": "ok"}

    if msg_type != "text":
        logger.warning(f"[webhook] Unhandled message type from {phone}: {msg_type}")
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
            on_gif = lambda url: wa.send_gif(phone, url)
            _, result = orchestrator.process(phone, combined_text, on_bubble=on_bubble, on_gif=on_gif)
            _send_remaining_if_needed(phone, result)

            # chat history + style/memory writes happen after the reply is
            # already on its way to the user, not before
            _background_save(orchestrator.save_exchange, user, combined_text, result)
        except Exception:
            logger.exception("[webhook] Error")
            sentry_sdk.capture_exception()

    # buffers rapid consecutive messages (someone splitting one thought
    # across 2-3 texts) into a single reply instead of responding to each
    # fragment separately
    await buffer_message(phone, text, message_id, _reply_to_batch)

    return {"status": "ok"}
