"""Lightweight ORB brain routing audit tests — service-level, mocked where heavy."""

from __future__ import annotations

import pytest

from routers.orb_standalone_routes import _build_standalone_request_context, OrbStandaloneConversationRequest
from services.orb_brain_metadata_service import normalise_brain_metadata


def test_standalone_conversation_context_includes_intelligence_metadata(monkeypatch):
    """Standalone conversation path attaches intelligence metadata in context_used."""

    def stub_prepare_request_bundle(message, **kwargs):
        return {
            "prompt_tier": "residential",
            "grounding_context": "Grounding text",
            "source_packs": [{"id": "pack1", "title": "Test pack"}],
            "indicare_intelligence": {"expert_depth": "residential_standard"},
            "expert_depth": "residential_standard",
        }

    def stub_build_context(**kwargs):
        assert kwargs.get("surface") == "standalone_orb"
        return {
            "surface": "standalone_orb",
            "active_brains": ["general_assistant"],
            "cognition_display_labels": ["ORB", "Safeguarding"],
            "citations": [{"id": "c1"}],
            "explainability": {"cognition_display_labels": ["ORB"], "reasoning_lenses": ["safeguarding"]},
            "prompt_blocks": [],
        }

    def stub_prompt_addendum(**kwargs):
        return ""

    monkeypatch.setattr(
        "routers.orb_standalone_routes.orb_knowledge_retrieval_service.prepare_request_bundle",
        stub_prepare_request_bundle,
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes.shared_institutional_cognition_runtime.build_context",
        stub_build_context,
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes.shared_institutional_cognition_runtime.prompt_addendum",
        stub_prompt_addendum,
    )

    ctx = _build_standalone_request_context(
        OrbStandaloneConversationRequest(message="How should I record a restraint?", mode="Ask ORB")
    )

    assert ctx["shared_cognition"]["surface"] == "standalone_orb"
    assert ctx["indicare_intelligence"].get("expert_depth") == "residential_standard"
    assert "cognition_display_labels" in ctx["shared_cognition"]
    assert ctx["shared_cognition"].get("citations")


def test_standalone_conversation_response_metadata_keys():
    """context_used from standalone routes includes brain + cognition keys when merged."""
    from routers.orb_standalone_routes import _standalone_conversation_response

    payload = _standalone_conversation_response(
        answer="Test",
        mode="Ask ORB",
        conversation_id="c1",
        context_used={
            "standalone_brain": {"active_brains": ["general_assistant"]},
            "shared_cognition": {
                "cognition_display_labels": ["ORB"],
                "explainability": {"reasoning_lenses": ["practice"]},
            },
            "official_source_grounding": True,
        },
    )
    ctx = payload["context_used"]
    assert ctx.get("standalone_brain") is not None or ctx.get("brain_metadata")
    meta = normalise_brain_metadata(payload)
    assert meta is not None
    assert meta["os_records_accessed"] is False


def test_audit_doc_exists():
    import os

    path = os.path.join(os.path.dirname(__file__), "..", "docs", "orb-brain-routing-audit.md")
    assert os.path.isfile(path)
    with open(path, encoding="utf-8") as handle:
        content = handle.read()
    assert "standalone_orb" in content
    assert "os_orb" in content
    assert "IndiCare Intelligence" in content
