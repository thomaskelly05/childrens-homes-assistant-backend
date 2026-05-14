import asyncio

import pytest
from fastapi import HTTPException

from schemas.orb import OrbContext, OrbSessionEventRequest, OrbSessionStartRequest
from services.orb_session_store import orb_session_store
from services.orb_voice_session_service import OrbVoiceSessionService


class FakeAssistantResponseService:
    def query(self, conn, *, message, context, current_user):
        return {"answer": "Jamie settled after staff redirected him.", "citations": [], "related_records": []}


def test_orb_session_hydrates_from_shared_store_and_keeps_owner_isolation(monkeypatch):
    async def scenario():
        owner = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
        other = {"id": 8, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
        service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
        started = await service.start_session(
            request=OrbSessionStartRequest(context=OrbContext(workspace="shift_operations", home_id=1), provider="mock_voice"),
            current_user=owner,
        )

        service.sessions.clear()
        hydrated = service.summary(started.session_id, current_user=owner)

        assert hydrated.session_id == started.session_id
        with pytest.raises(HTTPException) as exc:
            service.summary(started.session_id, current_user=other)
        assert exc.value.status_code == 403

    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    orb_session_store.reset_for_tests()
    asyncio.run(scenario())


def test_orb_session_rejects_hidden_cross_home_reuse_after_hydration(monkeypatch):
    async def scenario():
        user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
        service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
        started = await service.start_session(
            request=OrbSessionStartRequest(context=OrbContext(workspace="shift_operations", home_id=1), provider="mock_voice"),
            current_user=user,
        )

        service.sessions.clear()
        with pytest.raises(HTTPException) as exc:
            await service.handle_event(
                session_id=started.session_id,
                event=OrbSessionEventRequest(type="speech_started", context=OrbContext(home_id=2)),
                conn=object(),
                current_user=user,
            )
        assert exc.value.status_code == 403

    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    orb_session_store.reset_for_tests()
    asyncio.run(scenario())
