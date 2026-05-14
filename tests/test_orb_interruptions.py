from schemas.orb import OrbContext
from services.orb_conversation_policy import orb_conversation_policy
from services.orb_realtime_conversation_service import OrbRealtimeConversationService
from services.orb_session_store import orb_session_store


def test_conversation_policy_suppresses_ai_phrasing_and_shortens_interrupted_turn(monkeypatch):
    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")

    shaped = orb_conversation_policy.shape_response(
        "As an AI assistant, I can confirm that Jamie's chronology indicates he escalated after dinner. "
        "Staff redirected him twice. The missing episode was later recorded.",
        interrupted=True,
    )

    assert "AI assistant" not in shaped
    assert shaped == "Jamie's chronology indicates he escalated after dinner."


def test_interruption_state_prevents_double_speaking_after_reconnect(monkeypatch):
    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    orb_session_store.reset_for_tests()
    service = OrbRealtimeConversationService()
    service.start_session(
        session_id="orb_session_double_speak",
        provider_name="openai_realtime",
        provider_configured=True,
        context=OrbContext(home_id=1),
    )

    service.assistant_response_started(session_id="orb_session_double_speak")
    service.assistant_response_delta(session_id="orb_session_double_speak", delta="A long answer in progress.")
    service.interrupt(session_id="orb_session_double_speak")
    reconnected = service.reconnect(session_id="orb_session_double_speak")

    assert reconnected["phase"] == "reconnecting"
    assert reconnected["interrupted_response"] == "A long answer in progress."
    assert reconnected["partial_assistant_transcript"] == ""
