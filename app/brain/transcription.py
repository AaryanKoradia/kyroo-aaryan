import base64
import os
import requests

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# Whisper auto-detects language when none is given, and Hindi audio gets
# misdetected as Urdu very easily (the two are nearly identical spoken,
# differing mainly in script) — this was the actual cause of KYROO
# transcribing/replying in Urdu for Hindi/Hinglish voice notes. Always
# passing an explicit hint avoids that misdetection. Maps KYROO's
# onboarding language choices to ISO-639-1 codes Whisper expects; Hinglish
# isn't a real code, so it's pointed at "hi" (closer than leaving it
# undetected, since it's Hindi-based code-switching).
_LANGUAGE_HINTS = {
    "hinglish": "hi", "hindi": "hi", "english": "en", "tamil": "ta",
    "telugu": "te", "marathi": "mr", "bengali": "bn", "gujarati": "gu",
}


def transcribe_audio(audio_base64: str, mime_type: str = "audio/ogg", user_language: str = "Hinglish") -> str | None:
    """Transcribes a WhatsApp voice note via Groq's hosted Whisper API. Returns
    the transcript text, or None if transcription failed or isn't
    configured (caller should fall back to a friendly "can't listen to
    voice notes yet" message in that case, not silently ignore it)."""
    if not GROQ_API_KEY:
        return None

    audio_bytes = base64.b64decode(audio_base64)
    ext = "ogg" if "ogg" in mime_type else "mp4" if "mp4" in mime_type else "mp3"
    language = _LANGUAGE_HINTS.get((user_language or "").strip().lower(), "hi")

    try:
        res = requests.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": (f"voice.{ext}", audio_bytes, mime_type)},
            data={"model": "whisper-large-v3-turbo", "language": language},
            timeout=30,
        )
        res.raise_for_status()
        text = res.json().get("text", "").strip()
        return text or None
    except Exception as e:
        print(f"[transcription] error: {e}")
        return None
