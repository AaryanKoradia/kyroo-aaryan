# Registration happens on the website only now — this used to also offer a
# WhatsApp-native question flow as a fallback (ask name/age/city/fitness
# level/etc one message at a time), but that's been removed entirely by
# product decision. An unregistered contact just gets pointed at the
# website form on every message until they complete it there, which sets
# onboarding_step to 99 (see kiro-backend's /users/signup) - the only
# thing this module still needs to know.

WEBSITE_SIGNUP_URL = "https://www.kyroo.co.in/onboarding"

# Rule: KYROO never reads as cringe — no forced-cute emoji (😊 and its
# relatives), no exclamation-heavy filler. A single 👋 in a genuine
# greeting is fine, an emoji tacked onto a random sentence is not.
REGISTER_ON_WEBSITE_TEXT = (
    "Hi, I'm KYROO 👋 I'm your AI best friend for fitness, money, mind, and sleep, "
    f"all in one WhatsApp chat. Get set up here first, takes about two minutes: {WEBSITE_SIGNUP_URL}\n\n"
    "Once you're done, just message me here and we're good to go."
)


def needs_onboarding(user: dict) -> bool:
    """99 means fully registered via the website (kiro-backend's
    /users/signup always sets this on completion); anything else - a
    brand new WhatsApp-first contact (-1), or a row left over from the
    old WhatsApp-native flow that never finished - means not registered."""
    step = user.get("onboarding_step")
    if step is None:
        return False
    return step != 99
