import base64
import os
import requests

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


def transcribe_audio(audio_base64: str, mime_type: str = "audio/ogg") -> str | None:
    """Transcribes a WhatsApp voice note via OpenAI's Whisper API. Returns
    the transcript text, or None if transcription failed or isn't
    configured (caller should fall back to a friendly "can't listen to
    voice notes yet" message in that case, not silently ignore it)."""
    if not OPENAI_API_KEY:
        return None

    audio_bytes = base64.b64decode(audio_base64)
    ext = "ogg" if "ogg" in mime_type else "mp4" if "mp4" in mime_type else "mp3"

    try:
        res = requests.post(
            "https://api.openai.com/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
            files={"file": (f"voice.{ext}", audio_bytes, mime_type)},
            data={"model": "whisper-1"},
            timeout=30,
        )
        res.raise_for_status()
        text = res.json().get("text", "").strip()
        return text or None
    except Exception as e:
        print(f"[transcription] error: {e}")
        return None
