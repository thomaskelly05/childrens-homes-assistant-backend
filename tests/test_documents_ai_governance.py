from __future__ import annotations

import json

import pytest
from fastapi import HTTPException

from routers import documents_routes
from services.ai_external_call_governance import FEATURE_DOCUMENT_GENERATION
from services.ai_gateway_service import AIGatewayResponse, ai_gateway_service
from services.ai_usage_audit_service import ai_usage_audit_service


@pytest.fixture(autouse=True)
def _patch_audit(monkeypatch):
    recorded: list[dict] = []

    def _record(audit):
        recorded.append(audit)

    monkeypatch.setattr(ai_usage_audit_service, "record", _record)
    return recorded


def test_document_generation_blocks_when_external_ai_disabled(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    with pytest.raises(HTTPException) as exc:
        documents_routes.safe_model_text(
            "Child John Smith had an incident",
            current_user={"user_id": 1, "home_id": 2, "provider_id": 3},
            document_type="incident",
        )
    assert exc.value.status_code == 403


def test_document_generation_redacts_before_gateway(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    captured: dict = {}

    def _draft(request):
        captured["prompt"] = request.prompt
        return AIGatewayResponse(
            ok=True,
            text="Draft incident report",
            model="gpt-4o-mini",
            feature=FEATURE_DOCUMENT_GENERATION,
            external_ai_used=True,
            redaction_applied=True,
            estimated_input_tokens=1,
            estimated_output_tokens=1,
            estimated_cost_gbp=0.0,
            governance={},
        )

    monkeypatch.setattr(ai_gateway_service, "draft_text", _draft)
    text = documents_routes.safe_model_text(
        "Child John Smith DOB 01/02/2010 at SW1A 1AA",
        current_user={"user_id": 1, "home_id": 2},
        document_type="safeguarding",
    )
    assert text == "Draft incident report"
    assert "John Smith" not in captured.get("prompt", "")


def test_document_json_generation_records_usage(monkeypatch, _patch_audit):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")

    def _draft(_request):
        return AIGatewayResponse(
            ok=True,
            text=json.dumps({"risks": [{"hazard": "trip", "who": "all", "harm": "fall", "likelihood": "low", "severity": "low", "controls": "lighting", "further_controls": "review"}]}),
            model="gpt-4o-mini",
            feature=FEATURE_DOCUMENT_GENERATION,
            external_ai_used=True,
            redaction_applied=True,
            estimated_input_tokens=1,
            estimated_output_tokens=1,
            estimated_cost_gbp=0.0,
            governance={},
        )

    monkeypatch.setattr(ai_gateway_service, "draft_text", _draft)
    risks = documents_routes.safe_model_json(
        "Wet floor in corridor",
        current_user={"user_id": 1},
        document_type="risk",
    )
    assert len(risks) >= 1
    assert _patch_audit
