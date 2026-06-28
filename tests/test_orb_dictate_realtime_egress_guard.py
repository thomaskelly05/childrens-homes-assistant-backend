"""AST guard: ORB Dictate realtime routes must use governed egress (NR-1 Phase 2C)."""

from __future__ import annotations

import ast
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DICTATE_ROUTES_PATH = REPO_ROOT / "routers" / "orb_dictate_routes.py"
GOVERNANCE_SERVICE_PATH = REPO_ROOT / "services" / "orb_dictate_realtime_governance_service.py"


def test_orb_dictate_routes_do_not_call_realtime_provider_service_directly():
    source = DICTATE_ROUTES_PATH.read_text(encoding="utf-8")
    assert "orb_realtime_provider_service.create_dictate_transcription_session" not in source
    assert "issue_orb_dictate_transcription_realtime_session" in source


def test_orb_dictate_realtime_governance_service_calls_governed_egress():
    source = GOVERNANCE_SERVICE_PATH.read_text(encoding="utf-8")
    assert "ai_governed_egress" in source
    assert "issue_realtime_session" in source
    assert "build_orb_dictate_realtime_governance_context" in source


def test_orb_dictate_realtime_governance_service_has_no_direct_provider_imports():
    source = GOVERNANCE_SERVICE_PATH.read_text(encoding="utf-8")
    tree = ast.parse(source, filename=str(GOVERNANCE_SERVICE_PATH))
    imports = {
        (node.module, alias.name)
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom) and node.module
        for alias in node.names
    }
    banned = {
        ("services.ai_providers.openai_realtime_session_provider", "openai_realtime_session_provider"),
    }
    assert not (imports & banned)
