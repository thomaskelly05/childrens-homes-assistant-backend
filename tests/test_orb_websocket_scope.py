import asyncio

import pytest
from fastapi import HTTPException

from schemas.orb import OrbContext, OrbSessionStartRequest
from services.orb_session_store import orb_session_store
from services.orb_voice_session_service import OrbVoiceSessionService
from services.orb_websocket_gateway import OrbWebSocketGateway


class FakeAssistantResponseService:
    def query(self, conn, *, message, context, current_user):
        return {"answer": "Safe scoped answer.", "citations": [], "related_records": []}


def test_websocket_gateway_accepts_owner_and_home_scope(monkeypatch):
    async def scenario():
        user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
        service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
        started = await service.start_session(
            request=OrbSessionStartRequest(context=OrbContext(home_id=1, selected_young_person_id=5), provider="mock_voice"),
            current_user=user,
        )

        binding = OrbWebSocketGateway().validate_session_access(
            session_id=started.session_id,
            current_user=user,
            requested_home_id=1,
            assistant_scope={"selected_young_person_id": 5},
        )

        assert binding["session_id"] == started.session_id
        assert binding["home_id"] == 1

    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    orb_session_store.reset_for_tests()
    asyncio.run(scenario())


def test_websocket_gateway_rejects_cross_home_and_child_scope(monkeypatch):
    async def scenario():
        user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
        service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
        started = await service.start_session(
            request=OrbSessionStartRequest(context=OrbContext(home_id=1, selected_young_person_id=5), provider="mock_voice"),
            current_user=user,
        )
        gateway = OrbWebSocketGateway()

        with pytest.raises(HTTPException) as home_exc:
            gateway.validate_session_access(session_id=started.session_id, current_user=user, requested_home_id=2)
        with pytest.raises(HTTPException) as child_exc:
            gateway.validate_session_access(
                session_id=started.session_id,
                current_user=user,
                requested_home_id=1,
                assistant_scope={"selected_young_person_id": 6},
            )

        assert home_exc.value.status_code == 403
        assert child_exc.value.status_code == 403

    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    orb_session_store.reset_for_tests()
    asyncio.run(scenario())


def test_websocket_gateway_rejects_unbound_child_subscription(monkeypatch):
    async def scenario():
        user = {"id": 7, "role": "support_worker", "home_id": 1, "allowed_home_ids": [1]}
        service = OrbVoiceSessionService(assistant_response_service=FakeAssistantResponseService())
        started = await service.start_session(
            request=OrbSessionStartRequest(context=OrbContext(home_id=1), provider="mock_voice"),
            current_user=user,
        )

        with pytest.raises(HTTPException) as child_exc:
            OrbWebSocketGateway().validate_session_access(
                session_id=started.session_id,
                current_user=user,
                requested_home_id=1,
                assistant_scope={"selected_young_person_id": 5},
            )

        assert child_exc.value.status_code == 403
        assert "not bound" in child_exc.value.detail

    monkeypatch.setenv("ORB_SESSION_STORE_BACKEND", "memory")
    monkeypatch.setattr("services.orb_voice_session_service.record_audit_event", lambda **kwargs: None)
    orb_session_store.reset_for_tests()
    asyncio.run(scenario())
