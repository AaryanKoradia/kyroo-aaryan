import re

# Mirrors kiro-frontend's onboarding form field-for-field, so a WhatsApp-only
# user ends up with the exact same profile shape as a website signup. Each
# question's "options" list is (stored_value, display_title) — stored_value
# becomes the row/button id (and what actually gets saved to the users
# table), display_title is what's shown, kept under WhatsApp's 24-char list
# row title limit even where the underlying value is longer.

NOT_STARTED = -1


def _validate_name(text: str) -> tuple[str | None, str | None]:
    v = text.strip()
    if not v:
        return None, "Enter your name."
    if len(v) < 2 or len(v) > 50:
        return None, "Name should be 2-50 characters."
    if not re.match(r"^[A-Za-z .'-]+$", v):
        return None, "Name should only contain letters."
    return v, None


def _validate_age(text: str) -> tuple[str | None, str | None]:
    digits = re.sub(r"[^0-9]", "", text)
    if not digits:
        return None, "Enter your age as a number."
    age = int(digits)
    if age < 13 or age > 100:
        return None, "Age must be between 13 and 100."
    return str(age), None


def _validate_city(text: str) -> tuple[str | None, str | None]:
    v = text.strip()
    if not v:
        return None, "Enter your city."
    if len(v) < 2 or len(v) > 50:
        return None, "City should be 2-50 characters."
    if not re.search(r"[A-Za-z]", v):
        return None, "Enter a valid city name."
    return v, None


def _validate_email(text: str) -> tuple[str | None, str | None]:
    v = text.strip()
    if not re.match(r"^\S+@\S+\.\S+$", v):
        return None, "Enter a valid email address (e.g. you@email.com)."
    return v, None


ONBOARDING_QUESTIONS = [
    {
        "field": "name",
        "prompt": "heyyy 😊 I'm KYROO, your new AI best friend for fitness, money, mind, and sleep, all in one WhatsApp chat. Let's get to know each other real quick. what should I call you?\n\n(quick note: by chatting with me you're good with getting WhatsApp messages from KYROO, including daily check-ins you can turn off any time — privacy policy's at kyroo.co.in/privacy if you wanna peek)",
        "type": "text",
        "validate": _validate_name,
    },
    {
        "field": "age",
        "prompt": "okay {name}, love that. how old are you?",
        "type": "text",
        "validate": _validate_age,
    },
    {
        "field": "city",
        "prompt": "and which city are you in?",
        "type": "text",
        "validate": _validate_city,
    },
    {
        "field": "email",
        "prompt": "cool cool. drop your email too, just need it for your account",
        "type": "text",
        "validate": _validate_email,
    },
    {
        "field": "fitness_level",
        "prompt": "alright, let's talk fitness. be honest, where are you at right now?",
        "type": "list",
        "options": [
            ("Couch potato", "Couch potato"),
            ("Light mover", "Light mover"),
            ("Moderate", "Moderate"),
            ("Active", "Active"),
            ("Athlete mode", "Athlete mode"),
        ],
    },
    {
        "field": "fitness_goal",
        "prompt": "what do you actually want your body to do rn? pick your main goal",
        "type": "list",
        "options": [
            ("Lose weight", "Lose weight"),
            ("Build muscle", "Build muscle"),
            ("Flexibility", "Flexibility"),
            ("Endurance", "Endurance"),
            ("Stay healthy", "Stay healthy"),
            ("Overall fitness", "Overall fitness"),
        ],
    },
    {
        "field": "sleep_hours",
        "prompt": "how much do you actually sleep most nights, no judgment",
        "type": "list",
        "options": [("4h", "4h"), ("5h", "5h"), ("6h", "6h"), ("7h", "7h"), ("8h", "8h"), ("9h+", "9h+")],
    },
    {
        "field": "stress_level",
        "prompt": "on a scale of 1 to 10, how stressed have you been lately?",
        "type": "list",
        "options": [(str(n), str(n)) for n in range(1, 11)],
    },
    {
        "field": "money_habit",
        "prompt": "real talk, which one sounds most like you and your money?",
        "type": "list",
        "options": [
            ("Money disappears every month", "Money disappears fast"),
            ("Manage okay but no real plan", "Manage, no real plan"),
            ("Track expenses regularly", "Track expenses"),
            ("Financially disciplined", "Financially disciplined"),
        ],
    },
    {
        "field": "diet_type",
        "prompt": "what do you eat, generally speaking?",
        "type": "list",
        "options": [
            ("Vegetarian", "Vegetarian"),
            ("Non-veg", "Non-veg"),
            ("Eggetarian", "Eggetarian"),
            ("Vegan", "Vegan"),
        ],
    },
    {
        "field": "energy_peak",
        "prompt": "when do you actually feel most alive during the day?",
        "type": "list",
        "options": [
            ("Morning person", "Morning person"),
            ("Afternoon peak", "Afternoon peak"),
            ("Night owl", "Night owl"),
        ],
    },
    {
        "field": "language",
        "prompt": "what language should we vibe in?",
        "type": "list",
        "options": [
            ("Hinglish", "Hinglish"), ("English", "English"), ("Hindi", "Hindi"),
            ("Tamil", "Tamil"), ("Telugu", "Telugu"), ("Marathi", "Marathi"),
            ("Bengali", "Bengali"), ("Gujarati", "Gujarati"),
        ],
    },
    {
        "field": "nudge_time",
        "prompt": "last one, promise. what time should I hit you up every morning?",
        "type": "list",
        "options": [("6 AM", "6 AM"), ("7 AM", "7 AM"), ("8 AM", "8 AM"), ("9 AM", "9 AM")],
    },
]

TOTAL_QUESTIONS = len(ONBOARDING_QUESTIONS)

WELCOME_TEXT = ONBOARDING_QUESTIONS[0]["prompt"]

COMPLETE_TEXT = "okay {name}, I know you now 😊 this is gonna be good. I'll check in every morning, and I'm always right here whenever you wanna talk. so, what's up?"


def needs_onboarding(user: dict) -> bool:
    step = user.get("onboarding_step")
    if step is None:
        return False
    return step < TOTAL_QUESTIONS


def current_question(user: dict) -> dict | None:
    step = user.get("onboarding_step", NOT_STARTED)
    if step == NOT_STARTED or step >= TOTAL_QUESTIONS:
        return None
    return ONBOARDING_QUESTIONS[step]


def _resolve_list_answer(question: dict, text: str | None, interactive_id: str | None) -> str | None:
    """An interactive tap always wins; a typed reply is matched loosely
    against the option values/titles as a fallback for people who type
    instead of tapping."""
    if interactive_id:
        valid_values = {value for value, _ in question["options"]}
        if interactive_id in valid_values:
            return interactive_id
    if text:
        t = text.strip().lower()
        for value, title in question["options"]:
            if t == value.lower() or t == title.lower():
                return value
    return None


def format_prompt(question: dict, user: dict) -> str:
    return question["prompt"].format(name=user.get("name") or "yaar")


def process_answer(
    user: dict, text: str | None, interactive_id: str | None
) -> tuple[dict | None, str | None]:
    """Validates the incoming message as an answer to the user's current
    onboarding question. Returns (update_dict, error_message) — exactly one
    of the two is set. update_dict always includes the advanced
    onboarding_step alongside the answered field."""
    question = current_question(user)
    if question is None:
        return None, None

    step = user["onboarding_step"]

    if question["type"] == "text":
        value, error = question["validate"](text or "")
        if error:
            return None, error
    else:
        value = _resolve_list_answer(question, text, interactive_id)
        if value is None:
            options_list = ", ".join(title for _, title in question["options"])
            return None, f"Pick one of: {options_list}"

    return {question["field"]: value, "onboarding_step": step + 1}, None
