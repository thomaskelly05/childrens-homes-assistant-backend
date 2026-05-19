import pytest
from fastapi import HTTPException

from schemas.orb import OrbContext, OrbPreferences, OrbSessionEventRequest, OrbSessionStartRequest
from services.assistant_context_service import build_shared_assistant_context
from services.assistant_retrieval_service import AssistantRetrievalService
from services.orb_voice_session_service import OrbVoiceSessionService


class FakeAssistantResponseService:
    def query(self, conn, *, message, context, current_user):
        return {
            "answer": "Draft daily note content from permitted records.",
            "citations": [{"label": "Daily note #1", "source_type": "chronology", "source_id": "1"}],
            "related_records": [{"source_type": "chronology", "source_id": "1"}],
            "suggested_actions": [],
            "evidence_gaps": [],
            "regulatory_links": [],
        }


class CapturingAssistantResponseService:
    def __init__(self, *, answer="", related_records=None):
        self.answer = answer
        self.related_records = related_records or []
        self.contexts = []

    def query(self, conn, *, message, context, current_user):
        self.contexts.append(context)
        return {
            "answer": self.answer,
            "citations": [{"label": "Scoped chronology", "source_type": "chronology", "source_id": "jamie-note"}],
            "related_records": self.related_records,
            "suggested_actions": [],
            "evidence_gaps": [],
            "regulatory_links": [],
        }


class FailingAssistantResponseService:
    def query(self, *_args, **_kwargs):
        raise AssertionError("live retrieval should be skipped during saturated voice degradation")


@pytest.mark.asyncio
async def test_write_intent_creates_pending_draft_not_silent_save(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(context=OrbContext(workspace="shift_operations", home_id=1), provider="mock_voice"),
        current_user=user,
    )

    response = await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(
            type="user_text",
            text="Create a daily note for Jamie",
            context=OrbContext(workspace="shift_operations", home_id=1, selected_young_person_id=1),
        ),
        conn=object(),
        current_user=user,
    )

    assert response.pending_write_confirmation is not None
    assert response.pending_write_confirmation.requires_confirmation is True
    assert response.pending_write_confirmation.approved_by_user_id is None
    assert response.tool_orchestration["writeback_policy"]["silent_writeback_allowed"] is False
    assert response.memory_snapshot["scope"]["home_id"] == 1
    assert service.summary(start.session_id).records_changed == []


@pytest.mark.asyncio
async def test_interrupt_marks_latest_turn_interrupted(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(context=OrbContext(workspace="shift_operations", home_id=1), provider="mock_voice"),
        current_user=user,
    )
    await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="user_text", text="Summarise Jamie's last 7 days", context=OrbContext(home_id=1, selected_young_person_id=1)),
        conn=object(),
        current_user=user,
    )

    response = await service.interrupt(session_id=start.session_id, current_user=user)

    assert response.state == "interrupted"
    assert service.get_session(start.session_id).state == "interrupted"
    assert service.get_session(start.session_id).transcript[-1].interrupted is True


@pytest.mark.asyncio
async def test_follow_up_memory_preserves_record_context(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(
            context=OrbContext(workspace="chronology", home_id=1, selected_young_person_id=1, selected_record_id="inc-1", selected_record_type="incident"),
            provider="mock_voice",
        ),
        current_user=user,
    )

    first = await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="user_text", text="What happened after contact?", context=OrbContext(home_id=1, selected_young_person_id=1, selected_record_id="inc-1", selected_record_type="incident")),
        conn=object(),
        current_user=user,
    )
    second = await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="user_text", text="Open it", context=OrbContext(home_id=1, selected_young_person_id=1)),
        conn=object(),
        current_user=user,
    )

    assert first.memory_snapshot["last_record"]["source_id"] == "1"
    assert second.tool_orchestration["primary_action"] is not None
    assert second.memory_snapshot["last_record"]["source_id"] == "1"


@pytest.mark.asyncio
async def test_follow_up_memory_carries_active_child_into_care_context(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    fake = CapturingAssistantResponseService(answer="Jamie engaged with education after staff checked the timetable.")
    service = OrbVoiceSessionService(assistant_response_service=fake)
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(
            context=OrbContext(workspace="chronology", home_id=1, selected_young_person_id=10, current_child={"id": 10, "preferredName": "Jamie"}),
            provider="mock_voice",
        ),
        current_user=user,
    )

    await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="user_text", text="What happened with Jamie?", context=OrbContext(home_id=1, selected_young_person_id=10, current_child={"id": 10, "preferredName": "Jamie"})),
        conn=object(),
        current_user=user,
    )
    await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="user_text", text="What about education?", context=OrbContext(home_id=1)),
        conn=object(),
        current_user=user,
    )

    latest_context = fake.contexts[-1].model_dump() if hasattr(fake.contexts[-1], "model_dump") else fake.contexts[-1]
    assert latest_context["selected_young_person_id"] == 10
    assert latest_context["orb_conversation_memory"]["pinned"]["active_child"]["preferredName"] == "Jamie"


@pytest.mark.asyncio
async def test_handover_recovery_uses_scoped_records_without_cross_child_leak(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    fake = CapturingAssistantResponseService(
        answer="I do not have enough evidence in the records to answer that.",
        related_records=[
            {
                "id": "note-1",
                "home_id": 1,
                "young_person_id": 10,
                "record_type": "daily_note",
                "summary": "Jamie had a settled evening overall and said school felt better after staff checked his timetable. Follow-up is to praise attendance.",
                "status": "open",
            },
            {
                "id": "other-child",
                "home_id": 1,
                "young_person_id": 11,
                "summary": "Noah had a missing episode with police.",
            },
        ],
    )
    service = OrbVoiceSessionService(assistant_response_service=fake)
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(
            context=OrbContext(workspace="handover", home_id=1, selected_young_person_id=10, current_child={"id": 10, "preferredName": "Jamie"}),
            provider="mock_voice",
        ),
        current_user=user,
    )

    response = await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="user_text", text="Give me a handover for Jamie", context=OrbContext(home_id=1, selected_young_person_id=10, current_child={"id": 10, "preferredName": "Jamie"})),
        conn=object(),
        current_user=user,
    )

    assert "Jamie had a settled evening overall" in response.assistant_turn.content
    assert "follow-up" in response.assistant_turn.content
    assert "Noah" not in response.assistant_turn.content


@pytest.mark.asyncio
async def test_voice_turn_degrades_to_recent_context_when_pool_saturated(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    monkeypatch.setattr("services.orb_voice_session_service.db_pool_snapshot", lambda: {"saturated": True, "saturation_pct": 91.0})
    service = OrbVoiceSessionService(assistant_response_service=FailingAssistantResponseService())
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(
            context=OrbContext(workspace="handover", home_id=1, selected_young_person_id=10, current_child={"id": 10, "preferredName": "Jamie"}),
            provider="mock_voice",
        ),
        current_user=user,
    )
    session = service.get_session(start.session_id)
    session.related_records = [
        {
            "id": "note-1",
            "home_id": 1,
            "young_person_id": 10,
            "record_type": "daily_note",
            "summary": "Jamie had a settled evening and staff used his sensory routine before bedtime.",
        }
    ]
    session.citations_used = [{"label": "Daily note #1", "source_type": "daily_note", "source_id": "note-1"}]

    response = await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="user_text", text="Give me a handover for Jamie", context=OrbContext(home_id=1, selected_young_person_id=10, current_child={"id": 10, "preferredName": "Jamie"})),
        conn=object(),
        current_user=user,
    )

    assert response.assistant_turn is not None
    assert "Jamie had a settled evening" in response.assistant_turn.content
    assert response.citations


@pytest.mark.asyncio
async def test_realtime_partial_and_silence_state(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(context=OrbContext(workspace="shift_operations", home_id=1), provider="mock_voice"),
        current_user=user,
    )

    partial = await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="partial_transcript", text="Jamie was upset", context=OrbContext(home_id=1)),
        conn=object(),
        current_user=user,
    )
    silence = await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="silence_timeout", context=OrbContext(home_id=1)),
        conn=object(),
        current_user=user,
    )

    assert partial.realtime_state["partial_user_transcript"] == "Jamie was upset"
    assert silence.state == "idle"
    assert silence.realtime_state["phase"] == "idle"


@pytest.mark.asyncio
async def test_standalone_session_sanitizes_os_context_and_avoids_record_retrieval(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    fake = CapturingAssistantResponseService(answer="This should not be called.")
    service = OrbVoiceSessionService(assistant_response_service=fake)
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(
            context=OrbContext(route="/assistant", workspace="standalone_orb", home_id=1, selected_young_person_id=10, current_child={"name": "Jamie"}),
            provider="mock_voice",
            workspace_context={"product_mode": "standalone"},
        ),
        current_user=user,
    )

    response = await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="user_text", text="Summarise Jamie's chronology", context=OrbContext(route="/assistant", workspace="standalone_orb", selected_young_person_id=10)),
        conn=object(),
        current_user=user,
    )

    assert start.identity_metadata.access_scope == "standalone_no_os_access"
    assert response.identity_metadata.retrieval_policy == "static_and_user_supplied_only"
    assert response.mode_decision.care_scope_required is False
    assert response.mode_decision.brain == "general_assistant_brain"
    assert service.get_session(start.session_id).context.selected_young_person_id is None
    assert fake.contexts == []


@pytest.mark.asyncio
async def test_runtime_metadata_exposes_latency_prosody_and_presence_preferences(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}

    start = await service.start_session(
        request=OrbSessionStartRequest(
            context=OrbContext(route="/assistant/voice", workspace="standalone_orb"),
            provider="mock_voice",
            workspace_context={"product_mode": "standalone", "environment_mode": "quiet_hours", "network_quality": "poor"},
        ),
        current_user=user,
    )

    runtime = start.realtime_state["runtime"]
    assert runtime["product_mode"] == "standalone"
    assert runtime["latency_strategy"]["route"] == "caption_text"
    assert runtime["prosody"]["volume_hint"] == "low"
    assert runtime["conversation_timing"]["acknowledgement_ms"] <= 500
    assert runtime["presence_scope"] == "standalone:user:7"
    assert runtime["failure_recovery"]["raw_errors"] is False
    assert runtime["ambient_presence"]["reduced_motion_safe"] is True


@pytest.mark.asyncio
async def test_voice_session_uses_calm_british_defaults_and_text_fallback(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}

    start = await service.start_session(
        request=OrbSessionStartRequest(context=OrbContext(route="/assistant/voice", workspace="standalone_orb"), provider="mock_voice"),
        current_user=user,
    )

    assert start.voice_profile.profile_id == "amelia_british_female_calm"
    assert start.voice_profile.tone_profile == "british_female_calm_care_companion"
    assert start.voice_profile.product_name == "ORB powered by IndiCare"
    assert start.realtime["fallback_text_mode"] is True
    assert start.realtime_state["runtime"]["voice_orchestration"]["voice_profile"] == "british_female_calm"


@pytest.mark.asyncio
async def test_runtime_metadata_adapts_environment_safety_and_companionship(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}

    start = await service.start_session(
        request=OrbSessionStartRequest(
            context=OrbContext(workspace="handover", home_id=1, selected_young_person_id=10, operational_memory={"open_follow_up": True}),
            preferences=OrbPreferences(captions_enabled=True),
            provider="mock_voice",
            workspace_context={
                "care_mode": "child_nearby",
                "ambient_signals": {"failed_attempts": 2, "sensory_overload": True},
                "operational_signals": {"weak_child_voice": True, "prepare_handover": True},
            },
        ),
        current_user=user,
    )

    runtime = start.realtime_state["runtime"]
    prompts = runtime["operational_companionship"]["prompts"]

    assert runtime["environment_mode"] == "child_present"
    assert runtime["presence_scope"].endswith("child:10")
    assert runtime["emotional_state"]["clinical_inference"] is False
    assert runtime["emotional_state"]["recommended_caption_density"] == "simplified"
    assert runtime["emotional_safety"]["diagnosis_made"] is False
    assert runtime["emotional_safety"]["ui_adjustments"]["interface_complexity"] == "reduced"
    assert runtime["prosody"]["pace"] == "slower"
    assert runtime["voice_orchestration"]["emotional_speech_profile"] == "emotional_safety"
    assert runtime["care_environment"]["captions"] == "privacy_sensitive"
    assert runtime["ambient_presence"]["visual_intensity"] == "soft"
    assert runtime["operational_companionship"]["nagging"] is False
    assert {prompt["id"] for prompt in prompts} == {"prepare_handover", "weak_child_voice", "open_follow_up"}
    assert "presence_continuity_notes" in runtime


@pytest.mark.asyncio
async def test_standalone_orb_answers_general_questions_without_os_retrieval(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    fake = CapturingAssistantResponseService(answer="This should not be called.")
    service = OrbVoiceSessionService(assistant_response_service=fake)
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(context=OrbContext(route="/assistant/voice", workspace="standalone_orb"), provider="mock_voice"),
        current_user=user,
    )

    response = await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="user_text", text="What is 5 + 5?", context=OrbContext(route="/assistant/voice", workspace="standalone_orb")),
        conn=object(),
        current_user=user,
    )

    assert "10" in response.assistant_turn.content
    assert response.mode_decision.brain == "general_assistant_brain"
    assert response.mode_decision.care_scope_required is False
    assert fake.contexts == []


@pytest.mark.asyncio
async def test_runtime_presence_continuity_keeps_accessibility_and_unresolved_topics(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
    user = {"id": 44, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}

    await service.start_session(
        request=OrbSessionStartRequest(
            context=OrbContext(workspace="handover", home_id=1, selected_young_person_id=10),
            preferences=OrbPreferences(captions_enabled=True, response_detail="balanced"),
            provider="mock_voice",
            workspace_context={"recent_unresolved_topic": "return interview"},
        ),
        current_user=user,
    )
    second = await service.start_session(
        request=OrbSessionStartRequest(
            context=OrbContext(workspace="night_shift", home_id=1, selected_young_person_id=10),
            provider="mock_voice",
            workspace_context={"environment_mode": "night_shift"},
        ),
        current_user=user,
    )

    runtime = second.realtime_state["runtime"]
    assert runtime["presence_memory"]["caption_preference"] == "on"
    assert runtime["presence_memory"]["reflective_mode"] is True
    assert runtime["environment_settings"]["background_ambience"] == "darker_quiet_gradient"
    assert "Captions are still enabled." in runtime["presence_continuity_notes"]
    assert any("return interview" in note for note in runtime["presence_continuity_notes"])


@pytest.mark.asyncio
async def test_standalone_orb_uses_static_sector_knowledge_without_os_records(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    fake = CapturingAssistantResponseService(answer="This should not be called.")
    service = OrbVoiceSessionService(assistant_response_service=fake)
    user = {"id": 7, "role": "manager", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(context=OrbContext(route="/assistant/voice", workspace="standalone_orb"), provider="mock_voice"),
        current_user=user,
    )

    response = await service.handle_event(
        session_id=start.session_id,
        event=OrbSessionEventRequest(type="user_text", text="Explain SCCIF in plain English.", context=OrbContext(route="/assistant/voice", workspace="standalone_orb")),
        conn=object(),
        current_user=user,
    )

    assert "SCCIF" in response.assistant_turn.content or "Ofsted" in response.assistant_turn.content
    assert response.mode_decision.care_scope_required is False
    assert response.related_records == []
    assert fake.contexts == []


@pytest.mark.asyncio
async def test_orb_session_rejects_cross_user_access(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
    owner = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    other_user = {"id": 8, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(context=OrbContext(workspace="shift_operations", home_id=1), provider="mock_voice"),
        current_user=owner,
    )

    with pytest.raises(HTTPException) as exc:
        await service.handle_event(
            session_id=start.session_id,
            event=OrbSessionEventRequest(type="speech_started", context=OrbContext(home_id=1)),
            conn=object(),
            current_user=other_user,
        )

    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_orb_session_rejects_cross_home_event_scope(monkeypatch):
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
    user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
    start = await service.start_session(
        request=OrbSessionStartRequest(context=OrbContext(workspace="shift_operations", home_id=1), provider="mock_voice"),
        current_user=user,
    )

    with pytest.raises(HTTPException) as exc:
        await service.handle_event(
            session_id=start.session_id,
            event=OrbSessionEventRequest(type="speech_started", context=OrbContext(home_id=2)),
            conn=object(),
            current_user=user,
        )

    assert exc.value.status_code == 403


def test_retrieval_rejects_cross_home_context_before_fetching_records():
    context = build_shared_assistant_context(
        current_user={"id": 1, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]},
        requested_context={"home_id": 2},
        mode="embedded",
    )

    with pytest.raises(HTTPException) as exc:
        AssistantRetrievalService().retrieve(object(), message="Summarise records", context=context, current_user={"role": "support_worker", "home_id": 1, "allowed_home_ids": [1]})

    assert exc.value.status_code == 403

