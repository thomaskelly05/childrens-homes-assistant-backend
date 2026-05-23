from __future__ import annotations

from routers import ai_privacy_governance_routes
from schemas.ai_privacy import AiRedactionRequest


def test_privacy_dashboard_route(fake_state):
    response = ai_privacy_governance_routes.privacy_dashboard(
        period="7d",
        surface=None,
        home_id=None,
        limit=25,
        current_user=fake_state["user"],
        conn=None,
    )
    assert response["success"] is True
    assert "summary" in response["data"]


def test_redact_preview_route(fake_state):
    response = ai_privacy_governance_routes.redact_preview(
        AiRedactionRequest(text="John Smith test@example.com", mode="strict"),
        current_user=fake_state["user"],
    )
    assert response["success"] is True
    assert "test@example.com" not in response["data"]["text"]
