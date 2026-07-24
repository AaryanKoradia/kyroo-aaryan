from app.services.user_service import UserService
from app.services.conversation_service import ConversationService
from app.brain.kyroo_brain import kyroo_brain, finalize_chat_turn


class Orchestrator:

    def __init__(self, db=None):
        self.user_service = UserService(db)
        self.conversation_service = ConversationService(db)
        self.db = self.conversation_service.db

    def process(
        self,
        phone_number: str,
        message: str,
        on_bubble=None,
        on_gif=None,
    ) -> tuple[dict, dict]:
        """Process a user message through the full brain pipeline. Returns
        (user, result). If on_bubble is given, bubbles from the main LLM
        path are streamed to it as they're ready and result["already_sent"]
        will be True — otherwise (or for the crisis/math paths) the caller
        still needs to send result["bubbles"] itself. Saving the exchange is
        deliberately NOT done here; call save_exchange() after the reply has
        actually been sent, so the user isn't waiting on writes their reply
        doesn't depend on."""

        # 1. Get or create user
        user = self.user_service.get_or_create_user(phone_number)

        # 2. Get recent raw history for the brain
        history = self.conversation_service.get_history_raw(
            user["id"], limit=10
        )

        # 3. Run through THE brain
        result = kyroo_brain(
            user=user,
            message=message,
            history=history,
            on_bubble=on_bubble,
            on_gif=on_gif,
        )

        return user, result

    def save_exchange(self, user: dict, message: str, result: dict) -> None:
        """Persists the exchange (chat history + style/memory) — call this
        after the reply has already been sent to the user."""
        module = result.get("module", "general")
        self.conversation_service.add_exchange(user, message, result["response"], module)
        finalize_chat_turn(user, message, result, self.db)
