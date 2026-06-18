"""Unified ORB brain gateway — Phase 1 Dictate proof case tests."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from schemas.orb_dictate import OrbDictateGenerateRequest
from services.ai_gateway_service import AIGatewayResponse, ai_gateway_service
from services.orb_dictate_service import generate_dictate_note
from services.orb_prompt_registry import orb_prompt_registry
from services.orb_unified_brain_gateway import (
    GATEWAY_VERSION,
    orb_unified_brain_gateway,
    resolve_dictate_model,
)


def test_prompt_registry_builds_dictate_generate_prompt():
    request = OrbDictateGenerateRequest(
        input_text="Young person settled after tea.",
        note_type="daily_record",
    )
    bundle = orb_prompt_registry.build_dictate_generate_prompt(request, "daily_record")
    assert "ORB Dictate" in bundle.system
    assert "Rough input / transcript" in bundle.user
    assert bundle.template_key.surface == "dictate"
    assert bundle.prompt_version.startswith("orb-prompt-registry")


def test_gateway_calls_brain_orchestrator_before_generation(monkeypatch):
    calls: list[str] = []

    def _build_ctx(*args, **kwargs):
        calls.append("build_document_brain_context")
        from services.orb_document_brain_adapter_service import orb_document_brain_adapter_service

        return orb_document_brain_adapter_service.build_document_brain_context(*args, **kwargs)

    monkeypatch.setattr(
        "services.orb_unified_brain_gateway.orb_document_brain_adapter_service.build_document_brain_context",
        _build_ctx,
    )
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")

    result = orb_unified_brain_gateway.generate_dictate_draft(
        OrbDictateGenerateRequest(input_text="Test note.", note_type="daily_record"),
        note_type="daily_record",
        transcript_text="Test note.",
    )
    assert calls == ["build_document_brain_context"]
    assert result.brain_decision
    assert result.brain_metadata.get("brain_decision_used_for_generation") is True
    assert result.brain_metadata.get("unified_brain_gateway") == GATEWAY_VERSION


def test_dictate_generate_calls_unified_gateway(monkeypatch):
    captured: dict = {}

    def _gateway_draft(request, *, note_type, transcript_text, provider_id=None, home_id=None, user_id=None):
        captured["note_type"] = note_type
        captured["transcript_text"] = transcript_text
        from services.orb_unified_brain_gateway import OrbUnifiedBrainResponse

        return OrbUnifiedBrainResponse(
            text=json.dumps(
                {
                    "title": "Daily record",
                    "professional_note": "Young person settled after tea.",
                    "summary": "Calm evening.",
                    "actions": [],
                }
            ),
            brain_decision={"route": "test"},
            model_used="test-model",
            brain_metadata={
                "feature": "dictate",
                "brain_adapter": "orb_document_brain_adapter",
                "unified_brain_gateway": GATEWAY_VERSION,
                "brain_decision_used_for_generation": True,
            },
        )

    monkeypatch.setattr(orb_unified_brain_gateway, "generate_dictate_draft", _gateway_draft)
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="Young person settled after tea.",
            note_type="daily_record",
        )
    )
    assert captured["note_type"] == "daily_record"
    assert "settled" in captured["transcript_text"]
    assert result.brain_metadata.get("unified_brain_gateway") == GATEWAY_VERSION
    assert result.brain_metadata.get("brain_decision_used_for_generation") is True


def test_dictate_brain_metadata_not_cosmetic_only(monkeypatch):
    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "false")
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="Young person settled after tea.",
            note_type="daily_record",
        )
    )
    meta = result.brain_metadata or {}
    assert meta.get("brain_adapter") == "orb_document_brain_adapter"
    assert meta.get("unified_brain_gateway")
    assert meta.get("brain_decision_used_for_generation") is True


def test_dictate_service_does_not_hardcode_model():
    text = Path("services/orb_dictate_service.py").read_text(encoding="utf-8")
    assert "ORB_DICTATE_MODEL" not in text
    assert "gpt-4.1-mini" not in text
    assert "try_governed_draft_text" not in text
    assert "orb_unified_brain_gateway" in text


def test_resolve_dictate_model_uses_registry_by_default(monkeypatch):
    monkeypatch.delenv("ORB_DICTATE_MODEL", raising=False)
    model, policy = resolve_dictate_model(depth_tier="standard", note_type="daily_record")
    assert model
    assert policy["source"] == "ai_provider_registry"
    assert policy["temporary"] is False


def test_resolve_dictate_model_env_override_is_temporary(monkeypatch):
    monkeypatch.setenv("ORB_DICTATE_MODEL", "gpt-4.1-mini")
    model, policy = resolve_dictate_model(depth_tier="standard", note_type="daily_record")
    assert model == "gpt-4.1-mini"
    assert policy["source"] == "env_override"
    assert policy["temporary"] is True


def test_dictate_preserves_response_shape(monkeypatch):
    def _draft(request):
        return AIGatewayResponse(
            ok=True,
            text=json.dumps(
                {
                    "title": "Daily record",
                    "professional_note": "Professional note body for review.",
                    "summary": "Summary",
                    "actions": ["Follow up"],
                }
            ),
            model="test-model",
            feature="dictate",
            external_ai_used=True,
            redaction_applied=True,
            estimated_input_tokens=1,
            estimated_output_tokens=1,
            estimated_cost_gbp=0.0,
            governance={},
        )

    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.setattr(ai_gateway_service, "draft_text", _draft)
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="Child appeared anxious before tea.",
            note_type="daily_record",
        )
    )
    assert result.title
    assert result.professional_note
    assert result.summary
    assert result.transcript
    assert result.governance_notice
    assert result.brain_metadata is not None


def test_dictate_investigation_requires_boundary():
    with pytest.raises(ValueError, match="findings"):
        generate_dictate_note(
            OrbDictateGenerateRequest(
                input_text="Investigation debrief notes.",
                mode="investigation_meeting",
                investigation_boundary_confirmed=False,
            )
        )


def test_dictate_gateway_redacts_before_external_call(monkeypatch):
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
            model="test-model",
            feature="dictate",
            external_ai_used=True,
            redaction_applied=True,
            estimated_input_tokens=1,
            estimated_output_tokens=1,
            estimated_cost_gbp=0.0,
            governance={},
        )

    monkeypatch.setenv("AI_EXTERNAL_PROCESSING_ENABLED", "true")
    monkeypatch.setattr(ai_gateway_service, "draft_text", _draft)
    generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="John Smith said he was scared. DOB 01/01/2010",
            note_type="daily_record",
        ),
        user_id=9,
    )
    assert "John Smith" not in captured.get("prompt", "")
