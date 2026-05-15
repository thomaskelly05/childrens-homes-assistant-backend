from schemas.orb import OrbContext
from services.orb_realtime_conversation_service import OrbRealtimeConversationService
from services.orb_session_store import orb_session_store


def test_realtime_reconnect_state_persists_across_service_instances(monkeypatch):
    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    orb_session_store.reset_for_tests()

    service = OrbRealtimeConversationService()
    started = service.start_session(
        session_id="orb_session_reconnect",
        provider_name="openai_realtime",
        provider_configured=True,
        context=OrbContext(workspace="chronology", home_id=11, selected_young_person_id=3),
    )
    reconnect = service.reconnect(session_id="orb_session_reconnect")

    assert started["transport"] == "webrtc"
    assert reconnect["phase"] == "reconnecting"
    assert reconnect["reconnect_attempts"] == 1

    worker_two = OrbRealtimeConversationService()
    hydrated = worker_two.get("orb_session_reconnect")

    assert hydrated is not None
    assert hydrated.phase == "reconnecting"
    assert hydrated.home_id == 11
    assert hydrated.active_context_references["selected_young_person_id"] == 3


def test_realtime_interruption_clears_speaking_state_and_preserves_context(monkeypatch):
    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    orb_session_store.reset_for_tests()

    service = OrbRealtimeConversationService()
    service.start_session(
        session_id="orb_session_interrupt",
        provider_name="openai_realtime",
        provider_configured=True,
        context=OrbContext(workspace="shift_operations", home_id=1),
    )
    service.assistant_response_started(session_id="orb_session_interrupt")
    service.assistant_response_delta(session_id="orb_session_interrupt", delta="Jamie escalated after dinner.")
    interrupted = service.interrupt(session_id="orb_session_interrupt")

    assert interrupted["phase"] == "interrupted"
    assert interrupted["interrupted_response"] == "Jamie escalated after dinner."
    assert interrupted["partial_assistant_transcript"] == ""


def test_realtime_transcript_reconciliation_and_overlap_smoothing(monkeypatch):
    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    orb_session_store.reset_for_tests()

    service = OrbRealtimeConversationService()
    service.start_session(
        session_id="orb_session_reconcile",
        provider_name="openai_realtime",
        provider_configured=True,
        context=OrbContext(workspace="handover", home_id=1, selected_young_person_id=10),
    )
    service.assistant_response_started(session_id="orb_session_reconcile")
    service.assistant_response_delta(session_id="orb_session_reconcile", delta="The handover still needs")
    overlapped = service.note_event(session_id="orb_session_reconcile", event_type="speech_started")
    service.partial_user_transcript(session_id="orb_session_reconcile", text="Jamie came back")
    reconciled = service.reconcile_user_transcript(session_id="orb_session_reconcile", final_text="calmly after outreach")

    assert overlapped["phase"] == "listening"
    assert overlapped["interrupted_response"] == "The handover still needs"
    assert any(event["type"] == "conversational_overlap_smoothed" for event in overlapped["recent_events"])
    assert reconciled["text"] == "Jamie came back calmly after outreach"
    assert reconciled["changed"] is True
