import random
import re

CLICHE_PHRASES = [
    "i understand", "i cannot", "as an ai", "certainly!", "of course!",
    "great question!", "it sounds like", "i'm sorry to hear", "i apologize",
    "as a language model", "i'm just an ai", "i don't have the ability to",
]

MAX_REPLY_WORDS = 60
MAX_REPLY_WORDS_LIST = 500

_LIST_LINE = re.compile(r'^\s*(\d+[.)]|[-•*])\s', re.MULTILINE)

# Safety net for leaked internal reasoning/meta-commentary (the model
# narrating its own instruction-following instead of just replying).
_LEAK_SIGNATURES = [
    "the instructions", "the system prompt", "staying in character",
    "i need to continue the conversation", "i need to re-read",
    "let me re-read", "let me check what i'm doing", "what i'm doing wrong",
    "staying in character as kyroo", "i'm doing wrong", "core personality rules",
    "user just said", "user just sent", "in response to my latest message",
]


def _is_leaked_reasoning(bubble: str) -> bool:
    low = bubble.lower()
    return any(sig in low for sig in _LEAK_SIGNATURES)


_EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"
    "\U0001F300-\U0001F5FF"
    "\U0001F680-\U0001F9FF"
    "\U00002702-\U000027B0"
    "\U0001FA00-\U0001FAFF"
    "]",
    flags=re.UNICODE,
)

MAX_EMOJIS_PER_BUBBLE = 1

# Even the single emoji the persona is "allowed" gets stripped this often,
# on top of the model's own restraint — the prompt alone wasn't cutting
# actual emoji frequency down enough, so this is a second, code-level lever
# that works regardless of what the model generates.
EMOJI_SUPPRESS_PROBABILITY = 0.6


def _cap_emojis(bubble: str, max_emojis: int = MAX_EMOJIS_PER_BUBBLE) -> str:
    """Hard backstop for the 'strict max 1 emoji per message' persona rule —
    the model doesn't always follow it, so enforce it in code too. Also
    randomly suppresses the one allowed emoji most of the time, to push
    actual emoji frequency down further than prompting alone achieves."""
    matches = list(_EMOJI_PATTERN.finditer(bubble))
    if not matches:
        return bubble

    if len(matches) <= max_emojis:
        if max_emojis > 0 and random.random() < EMOJI_SUPPRESS_PROBABILITY:
            keep_n = 0
        else:
            return bubble
    else:
        keep_n = max_emojis

    keep = {m.start() for m in matches[:keep_n]}
    chars = [c for i, c in enumerate(bubble) if not (_EMOJI_PATTERN.match(c) and i not in keep)]
    return re.sub(r' {2,}', ' ', "".join(chars)).strip()


STREAM_BUBBLE_MAX_WORDS = 50
STREAM_BUBBLE_MAX_WORDS_LIST = 500
MAX_STREAMED_BUBBLES = 8


def clean_streamed_bubble(text: str, seen_question_mark: bool, max_emojis: int = MAX_EMOJIS_PER_BUBBLE) -> tuple[str, bool]:
    """Per-bubble equivalent of validate_response()'s cleanup, for when
    bubbles are sent progressively as they stream in rather than all at once
    after the full reply is known. Mirrors the same rules (cliche-phrase
    stripping, at most one question mark across the whole reply, leaked-
    reasoning filtering, a length backstop, emoji cap), just applied one
    bubble at a time — seen_question_mark carries the "have we already used
    our one question mark in an earlier bubble THIS reply" state across
    calls. Returns ("", seen_question_mark) for a bubble that should be
    dropped entirely (e.g. leaked reasoning)."""
    cleaned = text.strip()
    if not cleaned:
        return "", seen_question_mark

    for phrase in CLICHE_PHRASES:
        cleaned = re.sub(re.escape(phrase), "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r' {2,}', ' ', cleaned).strip()
    if not cleaned or _is_leaked_reasoning(cleaned):
        return "", seen_question_mark

    is_list = bool(_LIST_LINE.search(cleaned))
    if not is_list:
        chars = list(cleaned)
        for i, c in enumerate(chars):
            if c == '?':
                if seen_question_mark:
                    chars[i] = '.'
                else:
                    seen_question_mark = True
        cleaned = "".join(chars)

    # list/structured bubbles (task-mode content — a solved problem, an
    # explanation, extracted text) get the same much higher word budget
    # validate_response() already gave list-type replies — this bubble-level
    # path was missing that exception entirely, silently truncating
    # anything long and structured to ~50 words mid-sentence.
    word_limit = STREAM_BUBBLE_MAX_WORDS_LIST if is_list else STREAM_BUBBLE_MAX_WORDS
    words = cleaned.split()
    if len(words) > word_limit:
        hard_cut = " ".join(words[:word_limit])
        last_sentence_end = max(hard_cut.rfind("."), hard_cut.rfind("!"), hard_cut.rfind("?"))
        cleaned = hard_cut[:last_sentence_end + 1] if last_sentence_end > len(hard_cut) * 0.4 else hard_cut

    cleaned = _cap_emojis(cleaned, max_emojis)
    return cleaned, seen_question_mark


def validate_response(text: str, max_emojis: int = MAX_EMOJIS_PER_BUBBLE) -> list[str]:
    """Validate and split a raw model reply into WhatsApp-ready bubbles."""
    cleaned = text.strip()

    for phrase in CLICHE_PHRASES:
        cleaned = re.sub(re.escape(phrase), "", cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r' {2,}', ' ', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()

    is_list = len(_LIST_LINE.findall(cleaned)) >= 2

    if not is_list:
        q_positions = [i for i, c in enumerate(cleaned) if c == '?']
        if len(q_positions) > 1:
            chars = list(cleaned)
            for i in q_positions[1:]:
                chars[i] = '.'
            cleaned = "".join(chars)

    word_limit = MAX_REPLY_WORDS_LIST if is_list else MAX_REPLY_WORDS
    words = cleaned.split()
    if len(words) > word_limit:
        hard_cut = " ".join(words[:word_limit])
        last_sentence_end = max(hard_cut.rfind("."), hard_cut.rfind("!"), hard_cut.rfind("?"))
        # prefer cutting at a sentence boundary if it doesn't lose too much content
        if last_sentence_end > len(hard_cut) * 0.4:
            cleaned = hard_cut[:last_sentence_end + 1]
        else:
            cleaned = hard_cut

    bubbles = [b.strip() for b in cleaned.split("\n\n") if b.strip()]
    bubbles = [b for b in bubbles if not _is_leaked_reasoning(b)]
    bubbles = [_cap_emojis(b, max_emojis) for b in bubbles]
    if not bubbles:
        bubbles = ["hmm one sec, my brain glitched, say that again?"]
    return bubbles[:4]
