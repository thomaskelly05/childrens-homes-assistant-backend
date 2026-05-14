import pytest
from fastapi import HTTPException

from schemas.orb import OrbContext, OrbSessionEventRequest, OrbSessionStartRequest
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


def test_retrieval_rejects_cross_home_context_before_fetching_records():
    context = build_shared_assistant_context(
        current_user={"id": 1, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]},
        requested_context={"home_id": 2},
        mode="embedded",
    )

    with pytest.raises(HTTPException) as exc:
        AssistantRetrievalService().retrieve(object(), message="Summarise records", context=context, current_user={"role": "support_worker", "home_id": 1, "allowed_home_ids": [1]})

    assert exc.value.status_code == 403

