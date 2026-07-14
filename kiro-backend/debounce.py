import asyncio
from collections import defaultdict
from typing import Awaitable, Callable

DEBOUNCE_SECONDS = 2.2

_buffers: dict[str, list[str]] = defaultdict(list)
_tasks: dict[str, asyncio.Task] = {}


async def buffer_message(user_id: str, message: str, on_ready: Callable[[str], Awaitable[None]]):
    """Buffers a message for a user. If more messages arrive within
    DEBOUNCE_SECONDS, they're combined into one. Once the user pauses,
    on_ready is called once with all buffered messages joined by newlines.
    This lets a user split one thought across multiple texts (common in
    real chat) without KYROO replying to each fragment separately."""
    _buffers[user_id].append(message)

    existing = _tasks.get(user_id)
    if existing and not existing.done():
        existing.cancel()

    async def _wait_and_fire():
        try:
            await asyncio.sleep(DEBOUNCE_SECONDS)
        except asyncio.CancelledError:
            return
        messages = _buffers.pop(user_id, [])
        _tasks.pop(user_id, None)
        if messages:
            combined = "\n".join(messages)
            await on_ready(combined)

    _tasks[user_id] = asyncio.create_task(_wait_and_fire())
