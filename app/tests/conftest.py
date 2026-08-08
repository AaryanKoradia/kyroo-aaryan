import os
import sys
import types
from unittest.mock import MagicMock

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, REPO_ROOT)

os.environ.setdefault("SUPABASE_URL", "https://fake.supabase.co")
os.environ.setdefault("SUPABASE_KEY", "fake-key")
os.environ.setdefault("ANTHROPIC_API_KEY", "fake-key")


def stub_webhook_dependencies():
    """webhook.py pulls in the whole brain/onboarding/whatsapp-client stack —
    stubbing all of it out is what lets test_webhook_security.py exercise
    just the signature/dedup logic without a real Supabase/Anthropic/Meta
    connection. Returns the stubbed modules dict so tests can configure
    specific mock behavior (e.g. what kyroo_brain() returns)."""
    stubs = {}
    for name in [
        "app.api.dependencies.database", "app.core.config", "app.engine.orchestrator",
        "app.infrastructure.whatsapp.client", "app.brain.kyroo_brain", "app.brain.debounce",
        "app.brain.stickers", "app.brain.onboarding_flow", "app.brain.transcription",
        "app.services.user_service", "app.services.conversation_service", "sentry_sdk",
    ]:
        mod = types.ModuleType(name)
        sys.modules[name] = mod
        stubs[name] = mod

    stubs["sentry_sdk"].capture_exception = MagicMock()
    stubs["app.api.dependencies.database"].get_db = lambda: None
    stubs["app.core.config"].settings = types.SimpleNamespace(verify_token="x", whatsapp_app_secret="")
    stubs["app.engine.orchestrator"].Orchestrator = MagicMock

    mock_wa_instance = MagicMock()
    stubs["app.infrastructure.whatsapp.client"].WhatsAppClient = MagicMock(return_value=mock_wa_instance)
    stubs["_mock_wa_instance"] = mock_wa_instance

    stubs["app.brain.kyroo_brain"].validate_response = lambda r: [r]
    stubs["app.brain.kyroo_brain"].kyroo_brain = MagicMock(
        return_value={"response": "hi", "bubbles": ["hi"], "already_sent": False}
    )
    stubs["app.brain.kyroo_brain"].finalize_chat_turn = MagicMock()

    async def _fake_buffer_message(*a, **k):
        return None
    stubs["app.brain.debounce"].buffer_message = _fake_buffer_message

    stubs["app.brain.stickers"].is_sticker_war_trigger = lambda *a, **k: False
    stubs["app.brain.stickers"].pick_random_mood = lambda: "x"
    stubs["app.brain.stickers"].pick_random_sticker = lambda *a, **k: None
    stubs["app.brain.stickers"].STICKER_MEDIA_IDS = {}

    ob = stubs["app.brain.onboarding_flow"]
    ob.needs_onboarding = lambda user: False
    ob.REGISTER_ON_WEBSITE_TEXT = "register at kyroo.co.in/onboarding"

    stubs["app.brain.transcription"].transcribe_audio = lambda *a, **k: ""

    mock_user_service_instance = MagicMock()
    mock_user_service_instance.get_or_create_user.return_value = {
        "id": "u1", "phone": "919999999999", "onboarding_step": 99,
    }
    stubs["app.services.user_service"].UserService = MagicMock(return_value=mock_user_service_instance)
    stubs["_mock_user_service_instance"] = mock_user_service_instance

    stubs["app.services.conversation_service"].ConversationService = MagicMock()

    return stubs
