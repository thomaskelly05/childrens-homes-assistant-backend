"""ORB Brain Route Convergence Audit — non-invasive guard tests.

Mapping-only regression guards for Phase 1 convergence audit. Does not mount
routes or change runtime behaviour.
"""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import FastAPI

from core.router_loader import (
    RETIRED_COMPATIBILITY_ROUTERS,
    ROUTERS,
    UNMOUNTED_DANGEROUS_ASSISTANT_REALTIME_ROUTERS,
    include_routers,
)
from services.orb_brain_route_convergence_audit_service import (
    CONVERGED_ROUTE_SOURCE_ASSERTIONS,
    NO_RAW_PROVIDER_BYPASS_ROUTES,
    ROUTE_CONVERGENCE_MATRIX,
    orb_brain_route_convergence_audit_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_MATRIX_COLUMNS = frozenset(
    {
        "route",
        "module",
        "active_status",
        "product_surface",
        "access_control",
        "current_brain_orchestrator",
        "context_passed",
        "intent_classification",
        "safety_layer",
        "retrieval_rag",
        "governed_egress",
        "risk_level",
        "recommendation",
        "suggested_phase",
    }
)


@pytest.fixture
def loaded_app(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SESSION_SECRET", "test-secret")
    app = FastAPI()
    include_routers(app)
    return app


def test_route_convergence_matrix_has_required_columns():
    assert len(ROUTE_CONVERGENCE_MATRIX) >= 30
    for row in ROUTE_CONVERGENCE_MATRIX:
        missing = REQUIRED_MATRIX_COLUMNS - set(row)
        assert not missing, f"{row.get('route')} missing columns: {missing}"


def test_audit_doc_exists():
    path = REPO_ROOT / "docs" / "audits" / "orb-brain-route-convergence-audit.md"
    assert path.is_file()
    content = path.read_text(encoding="utf-8")
    assert "Route convergence matrix" in content
    assert "NR-1" in content
    assert "One ORB brain" in content


def test_converged_standalone_routes_reference_orchestrator_in_source():
    for module_rel, required_tokens in CONVERGED_ROUTE_SOURCE_ASSERTIONS.items():
        source = (REPO_ROOT / module_rel).read_text(encoding="utf-8")
        for token in required_tokens:
            assert token in source, f"{module_rel} must reference {token}"


def test_standalone_conversation_does_not_call_raw_openai_client():
    source = (REPO_ROOT / "routers/orb_standalone_routes.py").read_text(encoding="utf-8")
    assert "orb_brain_convergence_orchestrator_service" in source
    assert "orb_converged_general_assistant_service" in source
    assert "OpenAI(" not in source
    assert "AsyncOpenAI(" not in source


def test_dictate_generate_routes_through_unified_brain_gateway():
    source = (REPO_ROOT / "services/orb_dictate_service.py").read_text(encoding="utf-8")
    assert "orb_unified_brain_gateway" in source
    assert "generate_dictate_draft" in source
    router_source = (REPO_ROOT / "routers/orb_dictate_routes.py").read_text(encoding="utf-8")
    assert "generate_dictate_note" in router_source


def test_os_assistants_do_not_use_convergence_orchestrator():
    """OS assistants intentionally use assistant_orchestrator — documented divergence."""
    os_source = (REPO_ROOT / "routers/assistant_os_routes.py").read_text(encoding="utf-8")
    assert "orb_brain_convergence_orchestrator_service" not in os_source
    assert "_legacy_ask_young_person_assistant" in os_source

    routes_source = (REPO_ROOT / "routers/assistant_routes.py").read_text(encoding="utf-8")
    assert "orb_brain_convergence_orchestrator_service" not in routes_source
    assert "assistant_orchestrator" in routes_source

    general_source = (REPO_ROOT / "routers/assistant_general_routes.py").read_text(encoding="utf-8")
    assert "orb_brain_convergence_orchestrator_service" not in general_source
    assert "assistant_general_service" in general_source or "generate_general_assistant_stream" in general_source


def test_legacy_orb_conversation_bypasses_convergence():
    source = (REPO_ROOT / "routers/orb_routes.py").read_text(encoding="utf-8")
    assert "orb_general_assistant_service" in source
    assert "orb_brain_convergence_orchestrator_service" not in source


def test_unmounted_assistant_realtime_not_in_router_registry():
    assert not UNMOUNTED_DANGEROUS_ASSISTANT_REALTIME_ROUTERS & set(ROUTERS)
    for router_path in UNMOUNTED_DANGEROUS_ASSISTANT_REALTIME_ROUTERS:
        assert router_path not in ROUTERS


def test_startup_does_not_mount_assistant_realtime_paths(loaded_app):
    mounted_paths = {getattr(route, "path", "") for route in loaded_app.routes}
    assistant_realtime_paths = [p for p in mounted_paths if p.startswith("/assistant/realtime")]
    assert assistant_realtime_paths == []


def test_young_people_assistant_routes_unmounted():
    assert "routers.young_people_assistant_routes" not in ROUTERS


def test_retired_realtime_registry_entries_remain_skipped():
    retired_realtime = {
        "routers.assistant_realtime_routes",
        "routers.assistant_realtime_compat_routes",
    }
    assert retired_realtime <= RETIRED_COMPATIBILITY_ROUTERS


def test_no_raw_provider_bypass_routes_documented():
    documented = {row["route"] for row in ROUTE_CONVERGENCE_MATRIX}
    for route in NO_RAW_PROVIDER_BYPASS_ROUTES:
        assert route in documented


def test_audit_service_groupings():
    service = orb_brain_route_convergence_audit_service
    converged = service.converged_routes()
    assert "POST /orb/standalone/conversation" in converged
    assert "POST /orb/dictate/generate" in converged

    not_converged = service.not_using_converged_brain()
    assert "POST /assistant/os/young-people/stream" in not_converged
    assert "POST /orb/conversation" in not_converged

    retire = service.legacy_retire_routes()
    assert "POST /orb/conversation" in retire
    assert "POST /assistant-api/young-people/assistant" in retire

    safety = service.by_recommendation("phase_2d_safety")
    routes = {row["route"] for row in safety}
    assert "WS /assistant/realtime/ws" in routes


def test_brain_gaps_and_duplicate_retrieval_documented():
    gaps = orb_brain_route_convergence_audit_service.brain_gaps()
    assert any(g["gap"] == "os_assistants_bypass_convergence" for g in gaps)

    dupes = orb_brain_route_convergence_audit_service.duplicate_retrieval_paths()
    assert len(dupes) >= 2


def test_standalone_stream_uses_same_context_builder_as_sync():
    source = (REPO_ROOT / "routers/orb_standalone_routes.py").read_text(encoding="utf-8")
    assert "_build_standalone_request_context" in source
    # Both conversation handlers should share the context builder
    assert source.count("_build_standalone_request_context") >= 2
