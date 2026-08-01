import asyncio
from collections import defaultdict
from typing import Awaitable, Callable

DEBOUNCE_SECONDS = 2.2

_buffers: dict[str, list[tuple[str, str]]] = defaultdict(list)
_tasks: dict[str, asyncio.Task] = {}


async def buffer_message(user_id: str, message: str, message_id: str, on_ready: Callable[[str, list[str]], Awaitable[None]]):
    """Buffers a message for a user. If more messages arrive within
    DEBOUNCE_SECONDS, they're combined into one. Once the user pauses,
    on_ready is called once with all buffered messages joined by newlines,
    plus the WhatsApp ids of EVERY message in the batch (used to mark each
    one read individually — marking only the last one left earlier
    messages in a burst stuck without a blue tick even after KYROO had
    already replied, since each message id needs its own read-receipt
    call to Meta's API). This lets a user split one thought across
    multiple texts (common in real chat) without KYROO replying to each
    fragment separately."""
    _buffers[user_id].append((message, message_id))

    existing = _tasks.get(user_id)
    if existing and not existing.done():
        existing.cancel()

    async def _wait_and_fire():
        try:
            await asyncio.sleep(DEBOUNCE_SECONDS)
        except asyncio.CancelledError:
            return
        buffered = _buffers.pop(user_id, [])
        _tasks.pop(user_id, None)
        if buffered:
            combined = "\n".join(m for m, _ in buffered)
            message_ids = [mid for _, mid in buffered if mid]
            await on_ready(combined, message_ids)

    _tasks[user_id] = asyncio.create_task(_wait_and_fire())
