from __future__ import annotations

import json

import pytest

from schemas.orb_dictate import OrbDictateGenerateRequest
from services.ai_gateway_service import AIGatewayResponse, ai_gateway_service
from services.ai_usage_audit_service import ai_usage_audit_service
from services.orb_dictate_edit_service import edit_dictate_document
from services.orb_dictate_service import generate_dictate_note
from schemas.orb_dictate import OrbDictateEditRequest


@pytest.fixture(autouse=True)
def _patch_audit(monkeypatch):
    recorded: list[dict] = []

    def _record(audit):
        recorded.append(audit)

    monkeypatch.setattr(ai_usage_audit_service, "record", _record)
    return recorded


def test_dictate_uses_fallback_when_external_ai_disabled(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="Child appeared anxious before tea; staff offered calm reassurance.",
            note_type="daily_record",
        )
    )
    assert result.professional_note
    assert "review" in result.governance_notice.lower() or "review" in result.professional_note.lower()


def test_dictate_redacts_before_external_call(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    captured: dict = {}

    def _draft(request):
        captured["prompt"] = request.prompt
        return AIGatewayResponse(
            ok=True,
            text=json.dumps(
                {
                    "title": "Daily record",
                    "professional_note": "Professional note body",
                    "summary": "Summary",
                    "actions": [],
                }
            ),
            model="gpt-4.1-mini",
            feature="dictate",
            external_ai_used=True,
            redaction_applied=True,
            estimated_input_tokens=1,
            estimated_output_tokens=1,
            estimated_cost_gbp=0.0,
            governance={},
        )

    monkeypatch.setattr(ai_gateway_service, "draft_text", _draft)
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="John Smith said he was scared. DOB 01/01/2010",
            note_type="daily_record",
        ),
        user_id=9,
    )
    assert result.professional_note
    assert "John Smith" not in captured.get("prompt", "")


def test_dictate_edit_fallback_when_blocked(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    result = edit_dictate_document(
        OrbDictateEditRequest(
            document_text="Child was upset after contact.",
            note_type="daily_record",
            mode="professional_language",
        )
    )
    assert result.revised_text
