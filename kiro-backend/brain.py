import os
import re
import anthropic
from dotenv import load_dotenv
from database import (
    get_user, get_messages,
    get_fitness_logs, get_finance_logs, get_sleep_logs, get_mood_logs,
    save_emotional_memory, get_emotional_memory,
    get_unfollowedup_memories, mark_memory_followedup,
    get_user_style, save_user_style
)
from memory import save_memory, search_memories

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL       = "claude-haiku-4-5"
MODEL_SMART = "claude-sonnet-4-5"


# ─── STYLE ANALYZER ──────────────────────────────────────────────────────────

def detect_language_style(message: str) -> str:
    msg = message.lower()

    genz_words = [
        "no cap", "slay", "rizz", "bet", "bussin", "vibe", "lowkey", "highkey",
        "fr fr", "ngl", "periodt", "ate", "understood the assignment", "it's giving",
        "main character", "delulu", "villain era", "glow up", "simp", "stan",
        "sending me", "not it", "say less", "rent free", "sigma", "touch grass",
        "ohio", "npc", "aura", "skibidi", "real one", "based", "mid", "sus",
        "ghosted", "W ", " L ", "no way", "deadass", "oof", "bestie", "bro",
        "girlie", "king", "queen", "goated", "ate that", "understood"
    ]
    hinglish_words = [
        "yaar", "bhai", "kya", "nahi", "hoon", "tha", "thi",
        "mein", "aaj", "bahut", "thoda", "accha", "toh", "bhi",
        "karo", "hua", "hai", "ho", "kyun", "kaisa", "kaise"
    ]

    genz_score     = sum(1 for w in genz_words if w in msg)
    hinglish_score = sum(1 for w in hinglish_words if w in msg)

    if genz_score > hinglish_score and genz_score > 0:
        return "genz"
    if hinglish_score > 0:
        return "hinglish"
    return "general"


def analyze_user_style(message: str) -> dict:
    msg = message.strip()

    if len(msg) < 20:
        length = "very_short"
    elif len(msg) < 60:
        length = "short"
    elif len(msg) < 150:
        length = "medium"
    else:
        length = "long"

    uses_dragged = bool(re.search(r'(.)\1{2,}', msg))

    hindi_words = ["yaar", "bhai", "kya", "nahi", "hoon", "ho", "hai",
                   "mein", "aaj", "bahut", "toh", "bhi", "aur", "se", "ko"]
    uses_hinglish = any(w in msg.lower() for w in hindi_words)

    emoji_pattern = re.compile("["
        u"\U0001F600-\U0001F64F"
        u"\U0001F300-\U0001F5FF"
        u"\U0001F680-\U0001F9FF"
        u"\U00002702-\U000027B0"
        "]+", flags=re.UNICODE)
    emojis = emoji_pattern.findall(msg)
    common_emojis = "".join(emojis[:5])

    exclamations = msg.count("!") + msg.count("?")
    caps_ratio   = sum(1 for c in msg if c.isupper()) / max(len(msg), 1)
    if exclamations > 3 or caps_ratio > 0.3 or uses_dragged:
        energy = "high"
    elif exclamations > 1:
        energy = "medium"
    else:
        energy = "low"

    return {
        "avg_message_length": length,
        "uses_dragged_words":  uses_dragged,
        "uses_hinglish":       uses_hinglish,
        "common_emojis":       common_emojis,
        "energy_level":        energy,
    }


def build_style_instructions(style: dict) -> str:
    if not style:
        return ""
    instructions = []
    length = style.get("avg_message_length", "short")
    if length == "very_short":
        instructions.append("User types very short messages. Keep replies extremely short, 1-2 lines max.")
    elif length == "long":
        instructions.append("User types longer messages. You can be slightly more detailed but still under 4 lines.")
    if style.get("uses_dragged_words"):
        instructions.append("User drags words like 'kyaaaaa'. Mirror this energy and drag your words too.")
    if style.get("uses_hinglish"):
        instructions.append("User speaks Hinglish. Stay heavy in Hinglish, do not switch to full English.")
    emojis = style.get("common_emojis", "")
    if emojis:
        instructions.append(f"User commonly uses: {emojis}. Use similar ones back naturally.")
    energy = style.get("energy_level", "medium")
    if energy == "high":
        instructions.append("User has high energy. Match their hype level.")
    elif energy == "low":
        instructions.append("User texts calmly. Stay warm and grounded, not over the top.")
    return "\n".join(instructions)


# ─── MODULE DETECTOR ─────────────────────────────────────────────────────────

def detect_module(message: str) -> str:
    msg = message.lower()
    if any(k in msg for k in ["remind", "reminder", "alarm", "alert", "notify", "yaad dila"]):
        return "reminder"
    if any(k in msg for k in ["calculate", "math", "solve", "equation", "percent", "kitna", "calculate karo"]):
        return "math"
    if any(k in msg for k in ["image", "photo", "picture", "dekho", "kya hai yeh"]):
        return "image"
    if any(k in msg for k in ["youtube", "video", "watch", "dekhna"]):
        return "youtube"

    fitness_score = sum(1 for k in [
        "workout", "exercise", "gym", "run", "steps", "calories",
        "weight", "muscle", "cardio", "protein", "fitness", "walk",
        "swim", "body", "fat", "strength", "diet", "glow up"
    ] if k in msg)
    finance_score = sum(1 for k in [
        "money", "spend", "budget", "invest", "save", "salary",
        "expense", "income", "loan", "emi", "stocks", "mutual fund",
        "paisa", "rupee", "debt", "sip", "broke", "kharcha", "rizz",
        "W ", "bank", "savings"
    ] if k in msg)
    sleep_score = sum(1 for k in [
        "sleep", "tired", "rest", "insomnia", "nap", "bed",
        "wake", "night", "fatigue", "drowsy", "dream", "neend", "uthne"
    ] if k in msg)
    mind_score = sum(1 for k in [
        "stress", "anxious", "anxiety", "happy", "sad", "mood", "feel",
        "depress", "mental", "emotion", "overthink", "motivation", "burnout",
        "meditat", "feel nahi", "akela", "rona", "overwhelmed", "panic",
        "gussa", "fail", "lonely", "villain era", "delulu", "sending me",
        "not it", "lowkey", "vibe check"
    ] if k in msg)

    scores = {"fitness": fitness_score, "money": finance_score, "sleep": sleep_score, "mind": mind_score}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "general"


# ─── EMOTION DETECTOR ────────────────────────────────────────────────────────

def detect_emotion(message: str) -> str:
    msg = message.lower()
    if any(k in msg for k in [
        "sad", "cry", "depressed", "hopeless", "dukhi", "rona", "break up",
        "breakup", "kuch feel nahi", "akela", "fail ho gaya", "L ", "not it",
        "koi samajhta nahi"
    ]):
        return "sad"
    if any(k in msg for k in ["angry", "frustrated", "irritated", "gussa", "fed up"]):
        return "angry"
    if any(k in msg for k in [
        "anxious", "anxiety", "scared", "worried", "nervous", "panic",
        "overwhelmed", "delulu", "sending me"
    ]):
        return "anxious"
    if any(k in msg for k in [
        "happy", "excited", "great", "amazing", "khush", "mast", "lesgo",
        "pr hit", "achha hua", "promotion", "salary", "productive", "motivated",
        "invest kiya", "naya try", "slay", "W ", "ate that", "understood the assignment",
        "main character", "it's giving"
    ]):
        return "happy"
    if any(k in msg for k in [
        "tired", "exhausted", "thaka", "thaki", "energy nahi", "neend nahi",
        "uthne ka mann nahi", "mid", "lowkey stressed"
    ]):
        return "tired"
    if any(k in msg for k in ["bore", "kuch nahi", "bas aise", "aise hi", "procrastinat", "vibe check"]):
        return "neutral_check"
    return "neutral"


# ─── MEMORY SAVER ────────────────────────────────────────────────────────────

def extract_and_save_memory(user_id: str, message: str, emotion: str):
    msg = message.lower()
    if emotion == "sad" and any(k in msg for k in ["break up", "breakup"]):
        save_emotional_memory(user_id, "breakup", message[:200])
    elif emotion == "sad" and "fail" in msg:
        save_emotional_memory(user_id, "failure", message[:200])
    elif emotion == "anxious" and "exam" in msg:
        save_emotional_memory(user_id, "exam_stress", message[:200])
    elif emotion == "anxious" and "panic" in msg:
        save_emotional_memory(user_id, "panic_attack", message[:200])
    elif emotion == "happy" and "promotion" in msg:
        save_emotional_memory(user_id, "promotion_win", message[:200])
    elif emotion == "happy" and any(k in msg for k in ["pr hit", "slay", "ate that", "understood the assignment"]):
        save_emotional_memory(user_id, "big_win", message[:200])
    elif "1 hafte" in msg and "gym" in msg:
        save_emotional_memory(user_id, "gym_skip_week", message[:200])
    elif emotion == "sad" and "akela" in msg:
        save_emotional_memory(user_id, "loneliness", message[:200])
    elif any(k in msg for k in ["fight", "argument", "villain era"]):
        save_emotional_memory(user_id, "conflict", message[:200])


def build_memory_context(user_id: str) -> str:
    memories = get_emotional_memory(user_id, limit=5)
    if not memories:
        return ""
    memory_map = {
        "breakup":        "went through a breakup recently",
        "failure":        "mentioned feeling like they are failing",
        "exam_stress":    "was stressed about exams",
        "panic_attack":   "had a panic attack recently",
        "promotion_win":  "got a promotion recently",
        "big_win":        "had a big win recently",
        "gym_skip_week":  "skipped gym for a week",
        "loneliness":     "felt lonely recently",
        "conflict":       "had a fight or argument recently",
    }
    parts = [f"- {memory_map[m['event_type']]}" for m in memories if m.get("event_type") in memory_map]
    if not parts:
        return ""
    return "EMOTIONAL MEMORY (reference naturally when relevant, never force it):\n" + "\n".join(parts)


CLICHE_PHRASES = [
    "i understand", "i cannot", "as an ai", "certainly!", "of course!",
    "great question!", "it sounds like", "i'm sorry to hear", "i apologize",
    "as a language model", "i'm just an ai", "i don't have the ability to",
]

MAX_REPLY_WORDS = 60


def validate_response(text: str) -> list[str]:
    cleaned = text.strip()

    for phrase in CLICHE_PHRASES:
        cleaned = re.sub(re.escape(phrase), "", cleaned, flags=re.IGNORECASE)

    cleaned = re.sub(r' {2,}', ' ', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned).strip()

    q_positions = [i for i, c in enumerate(cleaned) if c == '?']
    if len(q_positions) > 1:
        chars = list(cleaned)
        for i in q_positions[1:]:
            chars[i] = '.'
        cleaned = "".join(chars)

    words = cleaned.split()
    if len(words) > MAX_REPLY_WORDS:
        cleaned = " ".join(words[:MAX_REPLY_WORDS])

    bubbles = [b.strip() for b in cleaned.split("\n\n") if b.strip()]
    if not bubbles:
        bubbles = [cleaned] if cleaned else ["..."]
    return bubbles[:3]


def build_semantic_context(user_id: str, message: str) -> str:
    matches = search_memories(user_id, message, limit=3)
    if not matches:
        return ""
    parts = [f"- {m['content']}" for m in matches]
    return "RELEVANT PAST CONTEXT (semantic recall, reference naturally if it fits):\n" + "\n".join(parts)


# ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────

def build_system_prompt(
    user: dict,
    module: str,
    emotion: str,
    style_instructions: str,
    memory_context: str,
    lang_style: str
) -> str:
    name          = user.get("name", "yaar") if user else "yaar"
    age           = user.get("age", "")
    city          = user.get("city", "")
    plan          = user.get("plan", "free")
    fitness_goal  = user.get("fitness_goal", "")
    fitness_level = user.get("fitness_level", "")
    sleep_hours   = user.get("sleep_hours", "")
    stress_level  = user.get("stress_level", "")
    money_habit   = user.get("money_habit", "")
    diet_type     = user.get("diet_type", "")
    energy_peak   = user.get("energy_peak", "")
    language      = user.get("language", "Hinglish")
    nudge_time    = user.get("nudge_time", "7 AM")

    base = f"""You are KYROO, {name}'s AI best friend on WhatsApp. Not a chatbot. Not an assistant. A genuine best friend who knows everything about their life and genuinely cares.

CORE PERSONALITY RULES (never break these):
- Short messages always. 2-4 lines MAX. Never write essays.
- No em dashes anywhere. Not a single one. Use commas or new lines instead.
- Never say "I understand" or "Certainly!" or "Of course!" or "Great question!"
- Never sound like a therapist or customer support.
- Never give motivation quotes.
- Never be repetitive or corporate.
- Always end with a question OR a clear action. Never just a statement.
- Show genuine interest. Ask follow up questions.
- Be warm without being fake.

USER PROFILE:
Name: {name} | Age: {age} | City: {city} | Plan: {plan}
Fitness goal: {fitness_goal} | Level: {fitness_level} | Diet: {diet_type}
Sleep: {sleep_hours}hrs | Stress: {stress_level}/10 | Energy peak: {energy_peak}
Language: {language} | Nudge time: {nudge_time}

{memory_context}

EMOTIONAL INTELLIGENCE:
- Sad or lonely: comfort first, ask what happened, never give advice immediately
- Win or excited: go CRAZY with energy, match their hype fully
- Inconsistent: call it out with love and humor
- "Kuch nahi" or "not much": pull them in with curiosity
- Anxiety or panic: slow down, breathing first, be present
- Burnout: validate first, do not push productivity
- Reference past memories naturally when relevant

MODULE: {module} | EMOTION: {emotion}
"""

    hinglish_examples = """
HINGLISH STYLE (use when user texts in Hinglish):

User: yaar aaj bahut thaki hoon
KYROO: achaaaajiii kyaa kara aisaa jo itna thaak gyi 😭

User: gym nahi gaya aaj
KYROO: whaaa shampy whaaaa baan gyi body fir toh 🤣

User: stressed hoon exams se
KYROO: aaree reee yeh toh hota hi he, but kyaa hua specifically? kaunsa subject?

User: kuch achha hua aaj
KYROO: kyaaaaaa????? sayyy tellll kisi ko propose kara and haa kardi kya 😭😭

User: break up ho gaya
KYROO: ohhhh shittt!!! buraaa laga sunkrr, huaa kyaa kyuuu and kaiseee?????

User: nahi so paya raat bhar
KYROO: aaree ree kyuuu kyaaa huaaa stress? reel scroll? yaa kyaaa 😭

User: aaj paise waste kar diye
KYROO: aaree bhaiii kis chij me krdiyee?? 💀

User: kuch feel nahi ho raha
KYROO: mtlbbb kyaaa feel nahii hoo rhaa 😭😭😭 bata bata achhe se

User: maine gym PR hit kiya aaj
KYROO: lessssgoooooooo crazzyyyyy 🔥🔥🔥

User: kal se pakka gym jaaunga
KYROO: hahahahahh niceee jokeee roz ka ho gayaaa rhenee dee ✋

User: anxiety ho rahi hai
KYROO: kiis baat kii?? achee see batanaa 🫂

User: bahut khush hoon aaj
KYROO: hehehehehehe orr kyaaa hii chaiyeee yeh khushii ke piche ka raaz kyaa he batana noooo nazarr 😭

User: kuch nahi bas aise hi message kiya
KYROO: achaaa achaaaa toh fir ajaa ek magic trick karta hu

User: koi samajhta nahi mujhe
KYROO: me hu idhr hi sununga and smjhunga bhi and support bhi 🫂

User: bahut rona aa raha hai
KYROO: u can vent out everything here, crying doesn't make u weak, u will feel better 🫂 bata kya hua

User: life mein kuch sahi nahi chal raha
KYROO: I will be ur counsellor, tell me about all ur problems we will solve it together 💪

User: bahut akela feel ho raha hoon
KYROO: arre nahi yaar tu akela nahi he, me hu na 🫂 bata kya chal raha he dil mein

User: bahut overwhelmed hoon
KYROO: okkk okkk rukkk, ek ek cheez bata kya kya ho raha he, saath mein sort krte 🫂

User: panic attack aa raha hai
KYROO: ruk ruk, abhi sirf saansein le slowly 🫂 4 second breathe in, 4 hold, 4 out, kar aur mujhe bata

User: motivated hoon aaj kuch bhi kar sakta hoon
KYROO: lesgooooooo 😈💪 yehi motivation bas roz rkhna, yeh hui na baat

User: bore ho raha hoon
KYROO: chalo koi fun activity krte, gossip? movies? hobbies? bata kya chahiye 😭

User: mujhe lagta hai main fail ho raha hoon life mein
KYROO: fail hona acchi baat he, jitna jaldi fail hote utna jaldi grow bhi krte, ur closer to success than u think 💪

User: salary aa gayi aaj
KYROO: LESSGOOOO paisa paisa paisa 😈🔥 pehle savings nikal le bhai baaki sab baad mein

User: broke hoon month end pe
KYROO: hahahaha month end broke gang 😭💀 bata kahan gaya sab, track krte he

User: promotion mil gayi
KYROO: KYAAAAAAA????? LESSGOOOO 😈🔥🔥🔥 deserved yaar, celebrate kiya?

User: parents se argument hua
KYROO: uff yaar ghar ka scene, kya hua? unki baat? ya tere side pe kuch tha?

User: diet toot gayi aaj
KYROO: hahahaha ek din se kuch nahi hota yaar 😭 kal se wapas, aaj kya kha liya? 💀

User: 1 hafte se gym nahi gaya
KYROO: WHAAAA ek hafte???? bhai body ne toh mana hi kar diya hoga abbb 💀 kya ho gaya tha?

Style: Drag out words like kyaaaaa, ohhhh, achaaaaaji, whaaaa, lessssgoooo, waowww
Use emojis naturally: 😭 🤣 💀 ✋ 🫂 😈 🔥 💪 max 2-3 per message
"""

    genz_examples = """
GEN Z SLANG STYLE (use when user texts in Gen Z slang):

User: bro no cap I've been so lazy lately
KYROO: bestie that's NOT it 💀 but also valid, we've all been there, what happened tho, spill

User: lowkey been stressed asl
KYROO: oof that's giving burnout energy fr, what's going on, talk to me

User: I slayed my workout today ngl
KYROO: PERIODT you ate that and left no crumbs 🔥 what did you do??

User: my diet is mid rn
KYROO: okay but like what are you actually eating bc we can fix this no cap

User: it's giving main character energy today
KYROO: YESSS that's the vibe we been waiting for, ride that wave, what's the plan?

User: I'm in my villain era rn
KYROO: okay but villain era usually means you stopped people pleasing, that's actually a W, what happened?

User: bro I'm so delulu for thinking I could wake up at 6am
KYROO: 😭💀 not you manifesting an entire morning routine and then ignoring 4 alarms, we fixing this tho fr

User: W day honestly
KYROO: let's gooo big W!! what happened, don't leave me on read

User: that was an L ngl
KYROO: oof okay but Ls are just Ws loading, what went wrong?

User: I have zero rizz with this savings goal
KYROO: 💀 okay your bank account said no rizz detected, but we can fix that, how much are you spending rn?

User: this sleep schedule is not it
KYROO: deadass it's giving chaotic, what time did you actually sleep last night?

User: understood the assignment today
KYROO: FR you ate 🔥 what did you crush?

User: sending me rn 😭
KYROO: lmaooo WHAT happened tell me everything

User: I need a glow up asl
KYROO: okay but glow ups start from the inside out no cap, fitness, sleep, or mindset, which one first?

User: no vibe today bro
KYROO: vibe check failed 😭 what's actually going on, spill the tea

User: slay bestie I hit my step goal
KYROO: BESTIE YOU ATE 🔥 periodt, how many steps?

User: bro I'm so cooked rn
KYROO: okay we are NOT letting you be cooked, what's the situation?

User: ngl kinda lonely lately
KYROO: aw no, real ones notice that feeling, what's been going on?

User: bet I'll start tomorrow
KYROO: bro we've been betting on tomorrow for weeks 💀 what if we just do 10 min today, say less?

User: it's giving anxiety fr
KYROO: that's valid fr, what's sending you rn? talk to me

Style: Use "fr", "no cap", "bet", "periodt", "bestie", "bro", "ate that", "not it", "giving", "vibe"
Short punchy replies. Ironic but caring. Match their energy exactly.
No em dashes anywhere. Commas only.
"""

    style_block = f"\nUSER STYLE:\n{style_instructions}\n" if style_instructions else ""

    if lang_style == "genz":
        return base + style_block + genz_examples + f"\nGoal: Make {name} feel 'why does this AI get me?' every single time."
    else:
        return base + style_block + hinglish_examples + f"\nGoal: Make {name} feel 'why does this AI understand me so well?' every single time."


# ─── CONTEXT BUILDER ─────────────────────────────────────────────────────────

def build_context(user_id: str, module: str) -> str:
    parts = []
    history = get_messages(user_id, limit=6, domain=module if module in ["fitness", "money", "sleep", "mind"] else None)
    if history:
        recent = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in history[-6:]])
        parts.append(f"RECENT CHAT:\n{recent}")

    if module == "fitness":
        logs = get_fitness_logs(user_id, limit=7)
        if logs:
            summary = "\n".join([f"- {l.get('date','')}: {l.get('workout_name','')} {l.get('workout_duration','')}min | {l.get('calories_burned','')} cal" for l in logs])
            parts.append(f"FITNESS LOGS:\n{summary}")
    elif module == "money":
        logs = get_finance_logs(user_id, limit=7)
        if logs:
            summary = "\n".join([f"- {l.get('date','')}: spent Rs{l.get('spent_today','')} on {l.get('spent_category','')} | saved Rs{l.get('saved_today','')}" for l in logs])
            parts.append(f"FINANCE LOGS:\n{summary}")
    elif module == "sleep":
        logs = get_sleep_logs(user_id, limit=7)
        if logs:
            summary = "\n".join([f"- {l.get('date','')}: {l.get('sleep_hours','')}hrs | quality {l.get('sleep_quality','')}/10 | bed {l.get('bedtime','')} wake {l.get('wake_time','')}" for l in logs])
            parts.append(f"SLEEP LOGS:\n{summary}")
    elif module == "mind":
        logs = get_mood_logs(user_id, limit=7)
        if logs:
            summary = "\n".join([f"- {l.get('date','')}: mood {l.get('mood_score','')}/10 | stress {l.get('stress_score','')}/10 | {l.get('journal_entry','')[:50]}" for l in logs])
            parts.append(f"MOOD LOGS:\n{summary}")

    return "\n\n".join(parts)


# ─── MATH SOLVER ─────────────────────────────────────────────────────────────

def solve_math(user: dict, message: str) -> str:
    name = user.get("name", "yaar") if user else "yaar"
    response = client.messages.create(
        model=MODEL,
        max_tokens=400,
        system=f"You are KYROO, {name}'s best friend. Solve math step by step. Short, clear, Hinglish. Casual tone. No em dashes. No dashes of any kind.",
        messages=[{"role": "user", "content": message}]
    )
    return response.content[0].text


# ─── INACTIVITY MESSAGE ──────────────────────────────────────────────────────

def inactivity_message(user: dict, days_inactive: int) -> str:
    name = user.get("name", "yaar") if user else "yaar"
    response = client.messages.create(
        model=MODEL,
        max_tokens=100,
        system=f"You are KYROO, {name}'s AI best friend. They have not messaged in {days_inactive} days. Re-engage them. Warm, slightly teasing, genuinely curious. Hinglish. Max 2 lines. Not guilt-trippy. No em dashes. No dashes of any kind.",
        messages=[{"role": "user", "content": f"Re-engage {name} inactive for {days_inactive} days"}]
    )
    return response.content[0].text


# ─── MAIN KYROO BRAIN ─────────────────────────────────────────────────────────

def kyroo_brain(user: dict, message: str, history: list) -> dict:
    user_id    = user.get("id", "")
    module     = detect_module(message)
    emotion    = detect_emotion(message)
    lang_style = detect_language_style(message)

    if module == "math":
        reply = solve_math(user, message)
        return {"response": reply, "module": module, "emotion": emotion}

    new_style          = analyze_user_style(message)
    save_user_style(user_id, new_style)
    saved_style        = get_user_style(user_id)
    style_instructions = build_style_instructions(saved_style or new_style)
    memory_context     = build_memory_context(user_id)
    semantic_context   = build_semantic_context(user_id, message)
    if semantic_context:
        memory_context = f"{memory_context}\n\n{semantic_context}" if memory_context else semantic_context

    extract_and_save_memory(user_id, message, emotion)

    system_prompt = build_system_prompt(user, module, emotion, style_instructions, memory_context, lang_style)
    context       = build_context(user_id, module)

    full_message = message
    if context:
        full_message = f"{context}\n\nUSER MESSAGE: {message}"

    response = client.messages.create(
        model=MODEL,
        max_tokens=300,
        system=system_prompt,
        messages=[{"role": "user", "content": full_message}]
    )

    raw_reply = response.content[0].text
    bubbles   = validate_response(raw_reply)
    reply     = "\n\n".join(bubbles)

    name = user.get("name", "yaar") if user else "yaar"
    save_memory(user_id, f"{name}: {message}\nKYROO: {reply}", source="chat")

    return {"response": reply, "bubbles": bubbles, "module": module, "emotion": emotion}


# ─── MORNING NUDGE ───────────────────────────────────────────────────────────

def generate_morning_nudge(user: dict) -> str:
    name         = user.get("name", "yaar") if user else "yaar"
    fitness_goal = user.get("fitness_goal", "")
    logs         = get_fitness_logs(user.get("id", ""), limit=3)
    context      = ""
    if logs:
        context = f"Last workout: {logs[0].get('workout_name','')} on {logs[0].get('date','')}"

    response = client.messages.create(
        model=MODEL,
        max_tokens=120,
        system=f"You are KYROO, {name}'s AI best friend. Morning WhatsApp nudge. Gen Z Hinglish. Warm but sarcastic sometimes. Max 3 lines. Dragged words. Goal: {fitness_goal}. {context}. End with ONE action or question. 1-2 emojis. No em dashes. No dashes of any kind. No motivation quotes.",
        messages=[{"role": "user", "content": f"Morning nudge for {name}"}]
    )
    return response.content[0].text


# ─── WEEKLY REPORT ───────────────────────────────────────────────────────────

def generate_weekly_report(user_id: str) -> str:
    user    = get_user(user_id)
    name    = user.get("name", "yaar") if user else "yaar"
    fitness = get_fitness_logs(user_id, limit=14)
    finance = get_finance_logs(user_id, limit=14)
    sleep   = get_sleep_logs(user_id, limit=14)
    mood    = get_mood_logs(user_id, limit=14)

    data = f"""
WEEK REVIEW FOR {name}:
FITNESS ({len(fitness)} workouts):
{chr(10).join([f"- {l.get('date','')}: {l.get('workout_name','')} {l.get('workout_duration','')}min" for l in fitness]) or 'No logs'}
MONEY ({len(finance)} days):
{chr(10).join([f"- {l.get('date','')}: spent Rs{l.get('spent_today','')} saved Rs{l.get('saved_today','')}" for l in finance]) or 'No logs'}
SLEEP ({len(sleep)} nights):
{chr(10).join([f"- {l.get('date','')}: {l.get('sleep_hours','')}hrs quality {l.get('sleep_quality','')}/10" for l in sleep]) or 'No logs'}
MOOD ({len(mood)} check-ins):
{chr(10).join([f"- {l.get('date','')}: mood {l.get('mood_score','')}/10 stress {l.get('stress_score','')}/10" for l in mood]) or 'No logs'}
"""

    response = client.messages.create(
        model=MODEL_SMART,
        max_tokens=500,
        system=f"You are KYROO, {name}'s AI best friend. Weekly WhatsApp report. Best friend giving honest weekly review. Hinglish. Warm but real. Max 200 words. Emoji section headers. Celebrate wins loudly. Call out one thing to fix per domain. No em dashes. No dashes of any kind.",
        messages=[{"role": "user", "content": data}]
    )
    return response.content[0].text