"""ORB Voice protocol progression — avoid repeating answered slots."""

from __future__ import annotations

from services.orb_voice_protocol_progression_service import (
    refine_voice_reply_for_progression,
    update_protocol_slots,
)


def test_bullying_progresses_after_people_involved_known():
    transcript = "Two young people involved within the home."
    memory = {"protocolSlots": {}}
    slots = update_protocol_slots(memory, transcript=transcript, intent="bullying_or_peer_conflict")
    assert slots.get("peopleInvolvedKnown") is True
    memory["protocolSlots"] = slots

    repeated = (
        "Who was involved, what was actually seen or heard, "
        "and what did adults do immediately to keep both young people safe?"
    )
    refined = refine_voice_reply_for_progression(
        repeated,
        intent="bullying_or_peer_conflict",
        memory=memory,
    )
    assert "Who was involved" not in refined
    assert "seen or heard" in refined.lower()


def test_bullying_opening_when_no_slots_filled():
    memory = {"protocolSlots": {}}
    reply = refine_voice_reply_for_progression(
        "",
        intent="bullying_or_peer_conflict",
        memory=memory,
    )
    assert "Who was involved" in reply
