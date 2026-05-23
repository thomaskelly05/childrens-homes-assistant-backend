from __future__ import annotations

import asyncio

import pytest

import routers.orb_standalone_routes as orb_standalone_routes
from services.indicare_intelligence_surface_router import (
    indicare_intelligence_surface_router,
    standalone_os_boundary_message,
)


@pytest.mark.parametrize(
    ("intent", "expected_surface", "allowed"),
    [
        ("What is trauma-informed care?", "standalone_orb", True),
        ("Upload a policy document for analysis", "document_understanding", True),
        ("Tell me about child Alex in our home", "operational_orb", False),
        ("Use this child's chronology from last week", "operational_orb", False),
    ],
)
def test_surface_router_intents(intent, expected_surface, allowed):
    decision = indicare_intelligence_surface_router.route(intent)
    assert decision.recommended_surface == expected_surface
    assert decision.allowed_in_standalone is allowed
    assert decision.requires_os_context is (not allowed)


def test_manager_review_routes_to_spine_or_operational():
    decision = indicare_intelligence_surface_router.route("What needs manager review today?")
    assert decision.recommended_surface in {"intelligence_spine", "operational_orb"}
    assert decision.requires_os_context is True


def test_daily_note_can_use_record_hub():
    decision = indicare_intelligence_surface_router.route("Help me write a daily note")
    assert decision.recommended_surface == "record_hub"
    assert decision.allowed_in_standalone is True


def test_ofsted_source_standalone():
    decision = indicare_intelligence_surface_router.route("What does Ofsted expect about child voice?")
    assert decision.recommended_surface == "standalone_orb"
    assert decision.allowed_in_standalone is True


def test_ofsted_live_evidence_requires_os():
    decision = indicare_intelligence_surface_router.route(
        "Does our live evidence meet Ofsted expectations for safeguarding?"
    )
    assert decision.requires_os_context is True
    assert decision.allowed_in_standalone is False


def test_standalone_boundary_message_for_child():
    message = standalone_os_boundary_message("Tell me about Jamie as a child in placement")
    assert message is not None
    assert "/assistant/orb" in message


def test_surface_route_api(fake_state):
    response = asyncio.run(
        orb_standalone_routes.standalone_orb_surface_route(
            orb_standalone_routes.OrbStandaloneSurfaceRouteRequest(
                intent="Analyse this incident trend across the home"
            ),
            current_user=fake_state["user"],
        )
    )
    data = response["data"]
    assert data["requires_os_context"] is True
    assert data["recommended_surface"] in {"intelligence_spine", "operational_orb"}
