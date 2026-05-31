from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from services.orb_home_profile_service import orb_home_profile_service
from services.orb_memory_service import orb_memory_service
from services.orb_onboarding_profile_service import orb_onboarding_profile_service
from services.orb_review_this_service import REVIEW_SECTIONS
from services.orb_unified_explainability_service import orb_unified_explainability_service


def test_review_sections_launch_spec():
    assert "Overall View" in REVIEW_SECTIONS
    assert "Child Experience" in REVIEW_SECTIONS
    assert "Outstanding Practice" in REVIEW_SECTIONS
    assert "Suggested Improvements" in REVIEW_SECTIONS
    assert len(REVIEW_SECTIONS) == 12


def test_home_profile_normalisation():
    profile = orb_home_profile_service.get_profile(
        {"preferences": {"home_name": "Oak House", "postcode": "SW1A 1AA"}}
    )
    assert profile["home_name"] == "Oak House"
    assert profile["postcode"] == "SW1A 1AA"


def test_memory_extract_and_patch():
    prefs = {"role_label": "Registered Manager", "preferences": {"favourite_tools": ["Review This"]}}
    memory = orb_memory_service.extract(prefs)
    assert memory["preferred_role"] == "Registered Manager"
    assert "Review This" in memory["favourite_tools"]
    merged = orb_memory_service.merge_patch(prefs, {"favourite_templates": ["incident_record"]})
    updated = orb_memory_service.extract(merged)
    assert "incident_record" in updated["favourite_templates"]


def test_setup_payload_missing_steps():
    payload = orb_onboarding_profile_service.build_setup_payload(
        access={"can_use_orb": False, "onboarding_completed": False},
        preferences={},
        safety_accepted=False,
        oauth_providers={"google": True, "microsoft": False, "apple": False},
        payments={"price_label": "£9.99/month"},
        front_door_url="https://app.indicare.co.uk",
    )
    assert "role" in payload["missing_steps"]
    assert "home_profile" in payload["missing_steps"]
    assert payload["front_door_url"] == "https://app.indicare.co.uk"


def test_unified_explainability_contract():
    explain = orb_unified_explainability_service.build(
        surface="standalone_orb",
        mode="Ask ORB",
        active_brains=["safeguarding_cognition"],
        shared_explainability={
            "standalone_only_reasoning": True,
            "review_this_active": True,
            "template_generation_used": False,
        },
    )
    assert "active_intelligence_layers" in explain
    assert "standalone_boundary" in explain
    assert explain["review_this_active"] is True
    assert explain["standalone_boundary"]["standalone_only"] is True


@patch("routers.orb_launch_routes.get_orb_user_preferences")
@patch("routers.orb_launch_routes.orb_access_service")
@patch("routers.orb_launch_routes.has_orb_safety_acceptance")
def test_get_orb_setup_route(mock_safety, mock_access, mock_prefs):
    from routers.orb_launch_routes import get_orb_setup

    mock_prefs.return_value = {"role_label": "Deputy Manager"}
    mock_safety.return_value = True
    mock_access.build_access_payload.return_value = {
        "can_use_orb": True,
        "onboarding_completed": True,
    }
    conn = MagicMock()
    import asyncio

    result = asyncio.run(
        get_orb_setup(
            conn=conn,
            current_user={"user_id": 1, "email": "test@example.com"},
        )
    )
    assert result["success"] is True
    assert result["data"]["onboarding_complete"] is not None
