from __future__ import annotations

import pytest
from fastapi import HTTPException

from routers.reports_routes import IncidentRequest, generate_incident_report
from services.ai_gateway_service import AIGatewayResponse, ai_gateway_service
from services.ai_usage_audit_service import ai_usage_audit_service


@pytest.fixture(autouse=True)
def _patch_audit(monkeypatch):
    recorded: list[dict] = []

    def _record(audit):
        recorded.append(audit)

    monkeypatch.setattr(ai_usage_audit_service, "record", _record)
    return recorded


def test_report_drafting_requires_feature_flag(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.setenv("REPORT_AI_DRAFTING_ENABLED", "false")
    with pytest.raises(HTTPException) as exc:
        generate_incident_report(
            IncidentRequest(description="Minor incident in lounge"),
            current_user={"user_id": 1, "provider_id": 1, "home_id": 1},
        )
    assert exc.value.status_code == 403


def test_report_drafting_marks_draft_only(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.setenv("REPORT_AI_DRAFTING_ENABLED", "true")

    def _draft(_request):
        return AIGatewayResponse(
            ok=True,
            text="Draft report body",
            model="gpt-4o-mini",
            feature="report_drafting",
            external_ai_used=True,
            redaction_applied=True,
            estimated_input_tokens=1,
            estimated_output_tokens=1,
            estimated_cost_gbp=0.0,
            governance={},
        )

    monkeypatch.setattr(ai_gateway_service, "draft_text", _draft)
    payload = generate_incident_report(
        IncidentRequest(description="Child became distressed; staff offered co-regulation"),
        current_user={"user_id": 2, "provider_id": 1, "home_id": 3},
    )
    assert payload["draft_only"] is True
    assert payload["human_review_required"] is True
    assert payload["report"] == "Draft report body"
