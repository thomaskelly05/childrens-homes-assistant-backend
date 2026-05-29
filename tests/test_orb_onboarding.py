from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from db.orb_subscription_db import ORB_SAFETY_ACCEPTANCE_VERSION


def test_onboarding_preferences_schema_fields():
    from schemas.orb_residential_premium import OrbOnboardingPreferencesRequest

    payload = OrbOnboardingPreferencesRequest(
        role_label="NVQ assessor",
        work_environment="children's home · 8-17",
        preferred_support_style="warm professional",
        onboarding_completed=True,
        preferences={"common_needs": ["autism", "trauma"], "answer_length": "balanced"},
    )
    assert payload.role_label == "NVQ assessor"
    assert payload.onboarding_completed is True


def test_safety_acceptance_version_constant():
    assert ORB_SAFETY_ACCEPTANCE_VERSION.startswith("2026")


@patch("routers.orb_billing_routes.upsert_orb_user_preferences")
@patch("routers.orb_billing_routes._record_analytics")
def test_onboarding_route_marks_completed(mock_analytics, mock_upsert):
    from routers.orb_billing_routes import update_standalone_onboarding_preferences
    from schemas.orb_residential_premium import OrbOnboardingPreferencesRequest

    mock_upsert.return_value = {"user_id": 1, "onboarding_completed_at": "now"}
    conn = MagicMock()
    payload = OrbOnboardingPreferencesRequest(role_label="NVQ learner", onboarding_completed=True)
    import asyncio

    result = asyncio.run(
        update_standalone_onboarding_preferences(
            payload,
            conn=conn,
            current_user={"user_id": 1},
        )
    )
    assert result["success"] is True
    mock_analytics.assert_called()
