"""Stream status for structured plan / action plan requests."""

from services.orb_stream_status_service import stream_status_sequence


def test_action_plan_stream_includes_structuring_status():
    seq = stream_status_sequence("residential_standard", message="Create a Reg 44 action plan")
    messages = [event.get("message") for event in seq]
    assert "Structuring this safely…" in messages
