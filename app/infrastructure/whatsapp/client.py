# app/infrastructure/whatsapp/client.py
import base64
import random
import time

import requests

from app.core.config import settings


class WhatsAppClient:

    BASE_URL = "https://graph.facebook.com/v22.0"

    # Pre-send delay is scaled by message length (see _typing_delay) rather
    # than a flat range — a flat delay meant a long bubble arrived just as
    # "instantly" as a one-word one, which broke the illusion of typing.
    MIN_DELAY = 0.5
    MAX_DELAY = 3.0
    SECONDS_PER_WORD = 0.12

    def download_media(self, media_id: str) -> tuple[str, str] | None:
        """Fetches a WhatsApp media file (image, etc.) and returns (base64_data, mime_type), or None on failure."""
        try:
            meta_resp = requests.get(
                f"{self.BASE_URL}/{media_id}",
                headers={"Authorization": f"Bearer {settings.whatsapp_token}"},
                timeout=10,
            )
            meta = meta_resp.json()
            media_url = meta.get("url")
            mime_type = meta.get("mime_type", "image/jpeg")
            if not media_url:
                return None

            file_resp = requests.get(
                media_url,
                headers={"Authorization": f"Bearer {settings.whatsapp_token}"},
                timeout=15,
            )
            return base64.b64encode(file_resp.content).decode("utf-8"), mime_type
        except Exception as e:
            print(f"[whatsapp] media download error: {e}")
            return None

    def send_typing_indicator(self, message_id: str):
        """Marks the incoming message as read and shows a native "typing..."
        indicator in the user's chat, which Meta keeps showing for up to 25s
        or until we actually send a reply, whichever is first. Call this as
        soon as we start working on a reply (before the LLM call), so the
        user sees something happening during generation instead of silence."""
        try:
            response = requests.post(
                f"{self.BASE_URL}/{settings.phone_number_id}/messages",
                headers={
                    "Authorization": f"Bearer {settings.whatsapp_token}",
                    "Content-Type": "application/json",
                },
                json={
                    "messaging_product": "whatsapp",
                    "status": "read",
                    "message_id": message_id,
                    "typing_indicator": {"type": "text"},
                },
                timeout=10,
            )
            response.raise_for_status()
        except Exception as e:
            # never let a typing-indicator failure block the actual reply
            print(f"[whatsapp] typing indicator error: {e}")

    def _typing_delay(self, message: str) -> float:
        """Longer messages get a longer pre-send pause, so a big bubble
        doesn't land just as fast as a one-word one — scaled by word count
        with a floor and ceiling, plus a little jitter so it's not
        perfectly predictable."""
        words = len(message.split())
        base = self.MIN_DELAY + words * self.SECONDS_PER_WORD
        return min(max(base, self.MIN_DELAY), self.MAX_DELAY) + random.uniform(0, 0.4)

    def send_one(self, phone: str, message: str, delay: float | None = None):
        time.sleep(delay if delay is not None else self._typing_delay(message))
        self._send_single_message(phone, message)

    def send(self, phone: str, messages: list[str]):
        for message in messages:
            self.send_one(phone, message)

    def send_bubbles(self, phone: str, bubbles: list[str], bubble_plan=None):
        for i, bubble in enumerate(bubbles):
            delay = None
            if bubble_plan and i < len(bubble_plan.bubbles):
                delay = bubble_plan.bubbles[i].delay
            self.send_one(phone, bubble, delay)

    def _send_single_message(self, phone: str, message: str):
        response = requests.post(
            f"{self.BASE_URL}/{settings.phone_number_id}/messages",
            headers={
                "Authorization": f"Bearer {settings.whatsapp_token}",
                "Content-Type": "application/json",
            },
            json={
                "messaging_product": "whatsapp",
                "to": phone,
                "type": "text",
                "text": {
                    "body": message[:4096]
                },
            },
            timeout=20,
        )

        response.raise_for_status()
