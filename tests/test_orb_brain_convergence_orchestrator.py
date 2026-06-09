"""ORB brain convergence orchestrator — routing parity, contracts and debug visibility."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.orb_standalone_routes import (
    OrbStandaloneConversationRequest,
    _build_standalone_request_context,
    router as standalone_router,
)
from services.orb_brain_convergence_orchestrator_service import (
    orb_brain_convergence_orchestrator_service,
)
from services.orb_brain_route_map_service import orb_brain_route_map_service
from services.orb_mandatory_response_contract_service import (
    orb_mandatory_response_contract_service,
)
from services.orb_multi_scenario_detector_service import orb_multi_scenario_detector_service

REPO_ROOT = Path(__file__).resolve().parents[1]
ROUTES = REPO_ROOT / "routers" / "orb_standalone_routes.py"


def _stub_retrieval_bundle():
    return {
        "prompt_tier": "residential",
        "grounding_context": "Grounding text",
        "source_packs": [{"id": "pack1", "title": "Test pack"}],
        "indicare_intelligence": {"expert_depth": "residential_standard"},
        "expert_depth": "residential_standard",
    }


def _patch_context_build(monkeypatch):
    monkeypatch.setattr(
        "routers.orb_standalone_routes.orb_knowledge_retrieval_service.prepare_request_bundle",
        lambda *args, **kwargs: _stub_retrieval_bundle(),
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes.shared_institutional_cognition_runtime.prompt_addendum",
        lambda **kwargs: "shared-runtime-block",
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes.run_brain_selection_shadow",
        lambda *args, **kwargs: {},
    )


def test_conversation_and_stream_use_same_brain_route_builder(monkeypatch):
    _patch_context_build(monkeypatch)
    payload = OrbStandaloneConversationRequest(
        message="A young person returned from missing and smells of cannabis.",
        mode="Ask ORB",
    )
    sync_ctx = _build_standalone_request_context(
        payload,
        route="/orb/standalone/conversation",
    )
    stream_ctx = _build_standalone_request_context(
        payload,
        route="/orb/standalone/conversation/stream",
    )
    assert sync_ctx["brain_convergence"]["scenario_types"] == stream_ctx["brain_convergence"]["scenario_types"]
    assert sync_ctx["brain_route"] == stream_ctx["brain_route"]
    assert sync_ctx["brain_convergence"]["active_brains"] == stream_ctx["brain_convergence"]["active_brains"]


def test_safeguarding_prompt_activates_safeguarding_layers():
    message = "I have a safeguarding concern about exploitation on shift."
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(message, mode="Ask ORB")
    brains = " ".join(decision.active_brains).lower()
    layers = " ".join(decision.active_intelligence_layers).lower()
    assert "safeguarding" in brains or "safeguarding" in layers
    assert decision.risk_level in {"high", "critical", "medium"}
    assert "safeguarding_intelligence" in decision.active_intelligence_layers or "safeguarding_brain" in decision.active_brains


def test_allegation_against_staff_activates_lado_contract():
    message = "A child says a staff member touched them inappropriately last night."
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(message, mode="Ask ORB")
    assert "allegation_against_staff" in decision.scenario_types
    contract_text = " ".join(decision.response_contract).lower()
    assert "lado" in contract_text or "designated officer" in contract_text
    assert "do not investigate" in contract_text


def test_missing_from_home_activates_missing_contract():
    message = "She returned from missing and smells of cannabis. What should I do?"
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(message, mode="Ask ORB")
    assert "missing_return_substance_risk" in decision.scenario_types
    contract_text = " ".join(decision.response_contract).lower()
    assert "welfare" in contract_text
    assert "missing" in contract_text
    assert "return" in contract_text or "rhi" in contract_text


def test_self_harm_prompt_activates_urgent_contract():
    message = "He says he is going to hurt himself tonight and has a blade."
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(message, mode="Ask ORB")
    assert "suicide_self_harm" in decision.scenario_types
    contract_text = " ".join(decision.response_contract).lower()
    assert "immediate safety" in contract_text
    assert "do not leave alone" in contract_text


def test_multi_scenario_prompt_splits_types():
    message = (
        "Returned after missing and smells of cannabis. "
        "Also historic sexual abuse disclosure. "
        "Suicidal ideation. "
        "Angry parent demanding to take child. "
        "Allegation against staff."
    )
    multi = orb_multi_scenario_detector_service.detect(message)
    assert multi["multi_scenario"] is True
    assert len(multi["scenario_types"]) >= 4
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(message, mode="Ask ORB")
    assert decision.multi_scenario is True
    assert "separate safeguarding situations" in decision.prompt_addendum.lower()


def test_brain_debug_payload_shape():
    message = "Staff allegation and missing return with cannabis smell."
    payload = orb_brain_convergence_orchestrator_service.build_debug_payload(
        message,
        mode="Ask ORB",
    )
    for key in (
        "surface",
        "mode",
        "risk_level",
        "multi_scenario",
        "scenario_types",
        "active_brains",
        "active_cognition",
        "active_intelligence_layers",
        "knowledge_vaults",
        "response_contract",
        "boundaries",
        "standalone_boundary",
    ):
        assert key in payload
    assert payload["standalone_boundary"] is True


def test_debug_payload_redacts_secrets():
    payload = orb_brain_convergence_orchestrator_service.build_debug_payload(
        "Safeguarding reflection",
        mode="Ask ORB",
    )
    dumped = str(payload).lower()
    assert "sk-" not in dumped
    assert "api_key" not in dumped
    assert "bearer " not in dumped


def test_mandatory_marker_validation_flags_missing_lado():
    good = (
        "Immediate child safety. Do not investigate. Notify manager and consider LADO / designated officer. "
        "Record exact words. Social worker and police as required."
    )
    bad = "Be supportive and document what happened."
    good_result = orb_mandatory_response_contract_service.validate_answer_markers(
        good,
        ["allegation_against_staff"],
    )
    bad_result = orb_mandatory_response_contract_service.validate_answer_markers(
        bad,
        ["allegation_against_staff"],
    )
    assert good_result["passed"] is True
    assert bad_result["passed"] is False


def test_no_duplicate_new_brain_service_introduced():
    services_dir = REPO_ROOT / "services"
    brain_like = [
        path.name
        for path in services_dir.glob("orb_*brain*.py")
        if path.name not in {
            "orb_brain_route_service.py",
            "orb_brain_metadata_service.py",
            "orb_brain_selection_service.py",
            "orb_brain_selection_shadow_service.py",
            "orb_document_brain_adapter_service.py",
            "orb_expert_brain_orchestrator_service.py",
            "orb_human_practice_brain_service.py",
            "orb_inspector_brain_service.py",
            "orb_operating_brain_service.py",
            "orb_quality_standards_brain_service.py",
            "orb_residential_brain_catalog_service.py",
            "orb_standalone_brain_service.py",
            "orb_brain_route_map_service.py",
            "orb_brain_convergence_orchestrator_service.py",
        }
    ]
    assert not any("standalone_brain" in name or "safeguarding_brain" in name for name in brain_like)


def test_canonical_route_map_documents_flow():
    trace = orb_brain_route_map_service.trace_live_route(route="/orb/standalone/conversation")
    step_ids = [step["id"] for step in trace["steps"]]
    assert "orb_brain_convergence_orchestrator" in step_ids
    assert "shared_institutional_cognition_runtime" in step_ids
    assert trace["canonical"] is True


def test_brain_route_debug_endpoint_exists_in_router():
    text = ROUTES.read_text(encoding="utf-8")
    assert '@router.post("/brain-route/debug")' in text
    assert "standalone_orb_brain_route_debug" in text


def test_brain_route_debug_endpoint_response():
    from routers.orb_standalone_routes import _require_orb_brain_route_debug_access

    app = FastAPI()
    app.include_router(standalone_router)
    app.dependency_overrides[_require_orb_brain_route_debug_access] = lambda: {"id": 1, "role": "admin"}

    client = TestClient(app)
    response = client.post(
        "/orb/standalone/brain-route/debug",
        json={"message": "Allegation against staff and suicidal ideation.", "mode": "Ask ORB"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["standalone_boundary"] is True
    assert data["active_brains"]
    assert data["response_contract"]
