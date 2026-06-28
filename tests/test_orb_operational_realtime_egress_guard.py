"""AST guard: operational ORB realtime route must use governed egress (NR-1 Phase 2C)."""

from __future__ import annotations

import ast
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
ORB_ROUTES_PATH = REPO_ROOT / "routers" / "orb_routes.py"
GOVERNANCE_SERVICE_PATH = REPO_ROOT / "services" / "orb_operational_realtime_governance_service.py"
VOICE_SESSION_SERVICE_PATH = REPO_ROOT / "services" / "orb_voice_session_service.py"


def test_orb_routes_realtime_session_uses_governed_route_flag():
    source = ORB_ROUTES_PATH.read_text(encoding="utf-8")
    assert 'governed_route="POST /orb/realtime/session"' in source
    assert 'governed_route="POST /orb/session/start"' in source
    assert "issue_orb_operational_conversational_realtime_session" not in source


def test_orb_routes_session_start_uses_governed_route_flag():
    source = ORB_ROUTES_PATH.read_text(encoding="utf-8")
    assert 'governed_route="POST /orb/session/start"' in source
    # Legacy alias must not call start_session without governed_route.
    start_block = source.split('@router.post("/session/start")', 1)[1]
    start_block = start_block.split("@router.post", 1)[0]
    assert "governed_route=" in start_block


def test_orb_operational_realtime_governance_service_calls_governed_egress():
    source = GOVERNANCE_SERVICE_PATH.read_text(encoding="utf-8")
    assert "ai_governed_egress" in source
    assert "issue_realtime_session" in source
    assert "build_orb_operational_realtime_governance_context" in source
    assert "issue_orb_operational_conversational_realtime_session" in source


def test_orb_operational_realtime_governance_service_has_no_direct_provider_imports():
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


def test_openai_realtime_provider_uses_governance_when_route_flag_set():
    source = VOICE_SESSION_SERVICE_PATH.read_text(encoding="utf-8")
    assert "issue_orb_operational_conversational_realtime_session" in source
    assert "governed_route" in source
