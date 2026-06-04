"""Inventory of direct external AI call sites — documents known bypass paths."""

from __future__ import annotations

from pathlib import Path

# Governed entry points (must remain the convergence targets for new work).
GOVERNED_PATHS = {
    "services/ai_gateway_service.py",
    "assistant/llm_provider.py",
    "services/ai_providers/openai_provider.py",
    "services/ai_model_router_service.py",
}

# Legacy paths that may still import OpenAI lazily (not live product routes).
KNOWN_LEGACY_BYPASSES = {
    "assistant/streaming.py",
}

# Converged to gateway / ai_external_call_governance (no module-level OpenAI client).
CONVERGED_LEGACY_PATHS = {
    "assistant/retrieval.py",
    "routers/documents_routes.py",
    "routers/reports_routes.py",
    "services/ai_notes_service.py",
    "services/document_ai_review_service.py",
    "services/orb_dictate_service.py",
    "services/orb_dictate_edit_service.py",
    "services/orb_embedding_service.py",
    "services/title_service.py",
    "services/ai_reasoning_service.py",
    "services/ai_external_call_governance.py",
}


ADDITIONAL_KNOWN_PATHS = {
    "services/ai_provider_registry.py",
    "services/ai_providers/__init__.py",
    "services/openai_service.py",
    "services/orb_realtime_provider_service.py",
    "services/orb_voice_realtime_config.py",
    "services/orb_voice_profiles.py",
    "services/orb_voice_session_service.py",
    "services/orb_expert_answer_engine_service.py",
    "assistant/prompt_router.py",
    "routers/orb_routes.py",
    "routers/orb_voice_residential_routes.py",
    "schemas/orb_voice_realtime.py",
}


def test_openai_import_sites_are_inventory_complete():
    root = Path(__file__).resolve().parents[1]
    scan_roots = ["services", "assistant", "routers", "scripts"]
    hits: set[str] = set()
    for folder in scan_roots:
        base = root / folder
        if not base.exists():
            continue
        for path in base.rglob("*.py"):
            text = path.read_text(encoding="utf-8", errors="ignore")
            if "from openai" in text or "import openai" in text.lower():
                rel = str(path.relative_to(root)).replace("\\", "/")
                hits.add(rel)
    allowed = (
        GOVERNED_PATHS
        | KNOWN_LEGACY_BYPASSES
        | CONVERGED_LEGACY_PATHS
        | ADDITIONAL_KNOWN_PATHS
        | {"scripts/generate_orb_scenario_variants.py"}
    )
    undocumented = hits - allowed
    assert not undocumented, f"New direct OpenAI sites must be documented or routed via gateway: {undocumented}"


def test_streaming_path_uses_privacy_governance():
    text = Path("assistant/llm_provider.py").read_text(encoding="utf-8")
    assert "evaluate_external_call" in text
    assert "redact_chat_messages" in text
