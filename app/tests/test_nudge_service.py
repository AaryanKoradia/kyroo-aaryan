"""Covers _slot_target_time — each domain's check-in time comes from that
specific user's own column, never a shared fixed time, and only falls back
to a default when the user hasn't set one (or KYROO hasn't picked one up
from conversation) yet."""
from datetime import time as dtime

from app.services.nudge_service import _slot_target_time


def test_slot_target_time_uses_this_users_own_stored_time():
    user = {"fitness_nudge_time": "7 AM"}
    assert _slot_target_time(user, "fitness_nudge") == dtime(hour=7, minute=0)


def test_slot_target_time_different_users_get_different_times_for_same_domain():
    morning_person = {"fitness_nudge_time": "6 AM"}
    night_person = {"fitness_nudge_time": "9:30 PM"}
    assert _slot_target_time(morning_person, "fitness_nudge") == dtime(hour=6, minute=0)
    assert _slot_target_time(night_person, "fitness_nudge") == dtime(hour=21, minute=30)


def test_slot_target_time_falls_back_to_default_when_unset():
    user = {}
    assert _slot_target_time(user, "money_nudge") == dtime(hour=13, minute=0)


def test_slot_target_time_falls_back_to_default_when_unparseable():
    user = {"study_nudge_time": "whenever I feel like it"}
    assert _slot_target_time(user, "study_nudge") == dtime(hour=21, minute=0)


def test_slot_target_time_mind_domain_reads_the_pre_existing_nudge_time_column():
    user = {"nudge_time": "8 AM"}
    assert _slot_target_time(user, "mind_nudge") == dtime(hour=8, minute=0)
