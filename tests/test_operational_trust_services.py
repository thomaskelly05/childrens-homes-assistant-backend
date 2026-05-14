from schemas.orb import OrbContext, OrbPreferences
from services.document_intelligence_service import document_intelligence_service
from services.draft_persistence_service import draft_persistence_service
from services.inspection_intelligence_service import inspection_intelligence_service
from services.operational_queue_service import operational_queue_service
from services.orb_conversation_policy import orb_conversation_policy
from services.orb_realtime_conversation_service import OrbRealtimeConversationService
from services.orb_session_store import orb_session_store
from services.realtime_scaling_service import realtime_scaling_service
from services.workflow_reliability_service import workflow_reliability_service


def test_workflow_reliability_reports_truthful_retry_state():
    state = workflow_reliability_service.save_state_for_record(
        {"status": "draft"},
        pending_queue_items=[{"status": "failed", "operation": "save"}],
    )

    assert state.state == "retry_needed"
    assert state.retryable is True
    assert "Nothing has been overwritten" in state.message


def test_draft_persistence_detects_stale_server_version():
    owner = draft_persistence_service.owner_key(home_id=1, user_id=2, young_person_id=3)
    draft = draft_persistence_service.envelope(
        entity_type="daily_note",
        entity_id="note-1",
        owner_key=owner,
        payload={"summary": "Jamie settled after keywork."},
        base_version="v1",
    )

    conflict = draft_persistence_service.conflict_status(draft=draft, latest_server_version="v2")

    assert conflict["conflict"] is True
    assert conflict["state"] == "review_before_save"


def test_operational_queue_uses_stable_idempotency_for_client_token():
    first = operational_queue_service.queue_item(
        operation_type="save",
        payload={"field": "value"},
        scope="home:1:daily-note:2",
        client_token="client-123",
    )
    second = operational_queue_service.queue_item(
        operation_type="save",
        payload={"field": "changed"},
        scope="home:1:daily-note:2",
        client_token="client-123",
    )

    assert first.idempotency_key == second.idempotency_key
    assert first.queue_id == second.queue_id


def test_document_quality_flags_child_voice_and_unsupported_claims():
    quality = document_intelligence_service.analyse_quality(
        text="The placement is improved and safer. Staff will continue to monitor.",
        document_type="reg45",
    )
    indicators = {item["key"]: item["status"] for item in quality["indicators"]}

    assert quality["status"] == "review_recommended"
    assert indicators["child_voice"] == "needs_review"
    assert indicators["unsupported_claims"] == "needs_review"
    assert indicators["weak_outcomes"] == "needs_review"


def test_inspection_intelligence_stays_evidence_led():
    readiness = inspection_intelligence_service.readiness(
        evidence={
            "cards": [],
            "gaps": [{"area": "Child voice", "gap": "No direct work visible."}],
            "judgement_sections": {
                "experiences_and_progress": {"title": "Overall experiences and progress", "cards": []}
            },
        },
        workspace={"manager_oversight": {"review_queue": [{"id": "r1", "title": "Manager review"}]}},
    )

    assert readiness["status"] == "review_recommended"
    assert "No definitive safeguarding conclusions are generated." in readiness["guardrails"]
    assert readiness["quality_patterns"]


def test_orb_cadence_metadata_and_reconnect_continuity(monkeypatch):
    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    orb_session_store.reset_for_tests()

    metadata = orb_conversation_policy.event_metadata(preferences=OrbPreferences(quiet_mode=True))
    chunks = orb_conversation_policy.response_chunks(
        "Based on the records available, I am analysing the chronology. Jamie settled after keywork. Staff recorded his views.",
        preferences=OrbPreferences(),
    )
    service = OrbRealtimeConversationService()
    service.start_session(
        session_id="orb_trust_session",
        provider_name="openai_realtime",
        provider_configured=True,
        context=OrbContext(home_id=1),
    )
    service.note_event(session_id="orb_trust_session", event_type="silence_timeout", metadata=metadata)
    reconnect = service.reconnect(session_id="orb_trust_session")

    assert metadata["partial_transcript_streaming"] is True
    assert metadata["emotional_cadence"]["idle_motion"] == "breathing_slow"
    assert chunks[0]["text"].startswith("From what I can see")
    assert "Give me a second" in chunks[0]["text"]
    assert reconnect["realtime_continuity"]["request_snapshot"] is False
    assert reconnect["silence_awareness"]["recovered_without_losing_context"] is True


def test_realtime_scaling_dedupes_home_scoped_events():
    result = realtime_scaling_service.dedupe_events(
        [
            {"event_id": "evt-1", "type": "record_saved"},
            {"event_id": "evt-1", "type": "record_saved"},
            {"event_id": "evt-2", "type": "record_saved"},
        ],
        home_id=7,
    )

    assert result["dropped"] == 1
    assert [event["dedupe_key"] for event in result["events"]] == ["7:evt-1", "7:evt-2"]
