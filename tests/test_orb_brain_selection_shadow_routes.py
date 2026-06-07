"""Route-level tests for brain selection shadow wiring."""

from __future__ import annotations

from routers.orb_standalone_routes import (
    OrbStandaloneConversationRequest,
    _build_standalone_request_context,
)


def test_standalone_request_context_includes_brain_selection_shadow(monkeypatch):
    def stub_prepare_request_bundle(message, **kwargs):
        return {
            "prompt_tier": "residential",
            "grounding_context": "Grounding text",
            "source_packs": [{"id": "pack1", "title": "Test pack"}],
            "indicare_intelligence": {"expert_depth": "residential_standard"},
            "expert_depth": "residential_standard",
        }

    def stub_build_context(**kwargs):
        return {
            "surface": "standalone_orb",
            "active_brains": ["general_assistant"],
            "cognition_display_labels": ["ORB"],
            "citations": [],
            "explainability": {"cognition_display_labels": ["ORB"]},
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

    shadow = ctx.get("brain_selection_shadow") or {}
    assert shadow.get("shadow_mode") is True
    assert shadow.get("tier") in {"quick", "standard", "deep"}
    assert shadow.get("live_prompt_tier") == "residential"
    assert shadow.get("live_expert_depth") == "residential_standard"
