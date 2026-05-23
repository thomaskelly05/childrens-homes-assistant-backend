from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock

import pytest

from routers import orb_operational_routes
from schemas.orb_operational import OrbOperationalRequest, OrbOperationalResponse, OrbOperationalContextSummary, OrbOperationalPermissionSummary, OrbOperationalSafetyBoundary


@pytest.fixture
def operational_response() -> OrbOperationalResponse:
    return OrbOperationalResponse(
        answer="Manager review themes are summarised for your role.",
        context_summary=OrbOperationalContextSummary(headline="Brief ready"),
        permissions=OrbOperationalPermissionSummary(role="manager", care_record_access=True),
        boundaries=OrbOperationalSafetyBoundary(),
        os_linked=True,
        care_record_access=True,
        standalone_only=False,
        permissioned_context=True,
    )


def test_operational_health_requires_auth_route_registered():
    from app import app
    from fastapi.routing import APIRoute

    paths = {route.path for route in app.router.routes if isinstance(route, APIRoute)}
    assert "/assistant/orb/health" in paths
    assert "/api/assistant/orb/health" in paths


def test_operational_health(fake_state):
    response = asyncio.run(orb_operational_routes.operational_orb_health(current_user=fake_state["user"]))
    assert response["success"] is True
    assert response["data"]["os_linked"] is True
    assert response["data"]["standalone_only"] is False


def test_operational_capabilities(fake_state):
    response = asyncio.run(orb_operational_routes.operational_orb_capabilities(current_user=fake_state["user"]))
    assert "manager_daily_brief" in response["data"]["modes"]
    assert "permissioned" in response["data"]["boundary"].lower()


def test_operational_conversation_shape(fake_state, operational_response, monkeypatch):
    monkeypatch.setattr(
        orb_operational_routes.orb_operational_assistant_service,
        "answer",
        AsyncMock(return_value=operational_response),
    )
    monkeypatch.setattr(
        orb_operational_routes.orb_intelligence_bridge_service,
        "audit_operational_intelligence_use",
        lambda *_args, **_kwargs: "audit-1",
    )

    response = asyncio.run(
        orb_operational_routes.operational_orb_conversation(
            OrbOperationalRequest(message="What needs attention today?", mode="manager_daily_brief"),
            conn=MagicMock(),
            current_user=fake_state["user"],
        )
    )
    assert response["success"] is True
    assert response["data"]["standalone_only"] is False
    assert response["data"]["permissioned_context"] is True


def test_operational_intelligence_bridge_route(fake_state, monkeypatch):
    monkeypatch.setattr(
        orb_operational_routes.orb_intelligence_bridge_service,
        "run_operational_intelligence",
        AsyncMock(
            return_value={
                "success": True,
                "data": {"answer": "ok", "standalone_only": False},
            }
        ),
    )

    response = asyncio.run(
        orb_operational_routes.operational_orb_intelligence(
            OrbOperationalRequest(message="Ofsted evidence?", mode="ofsted_evidence_review"),
            conn=MagicMock(),
            current_user=fake_state["user"],
        )
    )
    assert response["success"] is True
