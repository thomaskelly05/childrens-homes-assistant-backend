"""Ensure converged routes use governance; inventory stays complete."""

from __future__ import annotations

from pathlib import Path

from tests.test_no_direct_external_ai_bypass import (
    ADDITIONAL_KNOWN_PATHS,
    GOVERNED_PATHS,
    KNOWN_LEGACY_BYPASSES,
    test_openai_import_sites_are_inventory_complete,
)

# Paths converged in legacy AI route governance work (no direct OpenAI at module level).
CONVERGED_GOVERNED_PATHS = {
    "routers/documents_routes.py",
    "routers/reports_routes.py",
    "services/ai_notes_service.py",
    "services/document_ai_review_service.py",
    "services/orb_dictate_service.py",
    "services/orb_dictate_edit_service.py",
    "services/title_service.py",
    "services/ai_reasoning_service.py",
    "assistant/retrieval.py",
    "services/orb_embedding_service.py",
    "services/ai_external_call_governance.py",
}

# Legacy / script paths that may still import OpenAI lazily or for dev tooling.
REMAINING_DOCUMENTED_PATHS = {
    "assistant/streaming.py",
    "scripts/generate_orb_scenario_variants.py",
}


def test_inventory_includes_converged_and_legacy_paths():
    allowed = (
        GOVERNED_PATHS
        | CONVERGED_GOVERNED_PATHS
        | KNOWN_LEGACY_BYPASSES
        | ADDITIONAL_KNOWN_PATHS
        | REMAINING_DOCUMENTED_PATHS
        | {"scripts/generate_orb_scenario_variants.py"}
    )
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
                hits.add(str(path.relative_to(root)).replace("\\", "/"))
    undocumented = hits - allowed
    assert not undocumented, f"Undocumented OpenAI import sites: {undocumented}"


def test_converged_documents_route_has_no_module_openai_client():
    text = Path("routers/documents_routes.py").read_text(encoding="utf-8")
    assert "from openai" not in text
    assert "governed_draft_text" in text


def test_converged_dictate_has_no_module_openai_client():
    text = Path("services/orb_dictate_service.py").read_text(encoding="utf-8")
    assert "from openai" not in text
    assert "try_governed_draft_text" in text


def test_openai_import_inventory_still_valid():
    # Re-run inventory with converged paths included in allowed set.
    test_openai_import_sites_are_inventory_complete()
