"""Universal ORB Residential convergence — major entrypoints use the same orchestrator."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.orb_standalone_routes import (
    OrbStandaloneActionRunRequest,
    OrbStandaloneConversationRequest,
    _build_standalone_request_context,
    router as standalone_router,
)
from routers.orb_template_routes import OrbReviewThisRequest, review_this
from services.orb_action_engine_service import orb_action_engine_service
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_brain_route_map_service import orb_brain_route_map_service
from services.orb_brain_visibility_service import (
    build_public_explainability,
    sanitize_orb_brain_metadata_for_user,
)
from services.orb_document_brain_adapter_service import orb_document_brain_adapter_service
from services.orb_document_intelligence_service import orb_document_intelligence_service
from schemas.orb_document_intelligence import OrbDocumentIntelligenceRequest
from schemas.orb_documents import OrbDocumentUnderstanding


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


def test_standalone_conversation_uses_converged_orchestrator(monkeypatch):
    _patch_context_build(monkeypatch)
    payload = OrbStandaloneConversationRequest(message="Help me word a daily note.", mode="Ask ORB")
    ctx = _build_standalone_request_context(payload, route="/orb/standalone/conversation")
    assert ctx["brain_convergence"]["active_brains"]
    assert ctx["brain_convergence"]["standalone_boundary"] is True
    assert ctx["brain_convergence"].get("depth_tier")
    assert ctx["brain_convergence"].get("contract_mode")


def test_streaming_conversation_uses_same_orchestrator(monkeypatch):
    _patch_context_build(monkeypatch)
    payload = OrbStandaloneConversationRequest(message="Help me word a daily note.", mode="Ask ORB")
    sync_ctx = _build_standalone_request_context(payload, route="/orb/standalone/conversation")
    stream_ctx = _build_standalone_request_context(payload, route="/orb/standalone/conversation/stream")
    assert sync_ctx["brain_convergence"]["depth_tier"] == stream_ctx["brain_convergence"]["depth_tier"]
    assert sync_ctx["brain_convergence"]["contract_mode"] == stream_ctx["brain_convergence"]["contract_mode"]


@pytest.mark.asyncio
async def test_response_support_action_uses_converged_orchestrator(monkeypatch):
    calls: list[dict] = []

    original = orb_brain_convergence_orchestrator_service.build_brain_decision

    def tracking_build_brain_decision(*args, **kwargs):
        calls.append(kwargs)
        return original(*args, **kwargs)

    monkeypatch.setattr(
        orb_brain_convergence_orchestrator_service,
        "build_brain_decision",
        tracking_build_brain_decision,
    )

    async def stub_llm(**_kwargs):
        return "Based only on what you have provided — I have not checked live IndiCare OS records.\n\nChecklist."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="what_am_i_missing",
        source_answer="Young person settled after tea.",
        mode="Ask ORB",
    )
    assert calls
    assert calls[0].get("requested_action") == "what_am_i_missing"
    assert calls[0].get("feature") == "action_engine"
    assert result.get("brain_convergence")
    assert result["brain_convergence"]["standalone_boundary"] is True
    assert result.get("explainability", {}).get("public_considerations")


def test_dictate_adapter_uses_converged_orchestrator():
    ctx = orb_document_brain_adapter_service.build_document_brain_context(
        "Young person had a calm evening and went to bed on time.",
        mode="Record This Properly",
        feature="dictate",
        note_type="daily_record",
    )
    assert ctx["orchestrator"] == orb_brain_convergence_orchestrator_service.VERSION
    assert ctx["brain_convergence"].standalone_boundary is True
    assert ctx["brain_convergence"].contract_mode == "recording"
    assert ctx["convergence_block"]
    assert ctx["public_explainability"]["public_considerations"]


@pytest.mark.asyncio
async def test_document_intelligence_uses_converged_orchestrator(monkeypatch):
    async def stub_analyse(*_args, **_kwargs):
        return OrbDocumentUnderstanding(
            title="Daily note",
            plain_english_summary="Summary",
            sources=[],
            citations=[],
        )

    from services.orb_document_understanding_service import orb_document_understanding_service

    monkeypatch.setattr(orb_document_understanding_service, "analyse_document", stub_analyse)
    response = await orb_document_intelligence_service.run(
        OrbDocumentIntelligenceRequest(
            document_text="Daily note about a calm evening.",
            lens="summary",
            mode="Ask ORB",
        )
    )
    meta = response.data.brain_metadata or {}
    convergence = meta.get("brain_convergence") or {}
    assert convergence.get("standalone_boundary") is True
    assert convergence.get("depth_tier")
    assert meta.get("explainability", {}).get("public_considerations")


@pytest.mark.asyncio
async def test_review_this_route_uses_converged_orchestrator():
    with patch(
        "routers.orb_template_routes.shared_institutional_cognition_runtime.build_context",
        return_value={"explainability": {}},
    ):
        result = await review_this(
            OrbReviewThisRequest(content="Daily record draft text.", document_type="daily_record"),
            current_user={"id": 1, "role": "orb_residential"},
        )
    data = result["data"]
    assert data["brain_convergence"]["standalone_boundary"] is True
    assert data["public_explainability"]["public_considerations"]


def test_voice_delegates_to_conversation_stream_documented():
    audit = {item["entrypoint"]: item for item in orb_brain_route_map_service.entrypoint_audit()}
    voice = audit["/orb/voice/* transport"]
    assert voice["uses_converged_orchestrator"] is False
    assert voice["fix_needed"] is False
    assert "conversation/stream" in voice["notes"]


def test_public_explainability_on_non_risk_prompt():
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        "How do I write a better daily note?",
        mode="Record This Properly",
        feature="conversation",
    )
    public = build_public_explainability(
        brain_convergence=orb_brain_convergence_orchestrator_service.convergence_metadata(decision),
        mode="Record This Properly",
    )
    joined = " ".join(public["public_considerations"]).lower()
    assert "residential" in joined or "recording" in joined
    assert "sk-" not in str(public).lower()
    assert "raw_prompt" not in str(public).lower()


def test_founder_admin_debug_internal_only():
    from routers.orb_standalone_routes import _require_orb_brain_route_debug_access

    app = FastAPI()
    app.include_router(standalone_router)
    app.dependency_overrides[_require_orb_brain_route_debug_access] = lambda: {"id": 1, "role": "admin"}

    client = TestClient(app)
    response = client.post(
        "/orb/standalone/brain-route/debug",
        json={"message": "Daily note wording help.", "mode": "Ask ORB"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["response_contract"]
    assert data["active_brains"]


def test_normal_user_never_receives_internal_brain_route_details():
    internal = {
        "brain_convergence": {
            "active_brains": ["safeguarding_brain"],
            "response_contract": ["LADO consideration"],
            "prompt_addendum": "secret routing",
            "knowledge_vaults": ["Safeguarding Vault"],
        },
        "explainability": {"active_brains": ["safeguarding_brain"], "vault_domains": ["x"]},
    }
    sanitized = sanitize_orb_brain_metadata_for_user(internal, {"id": 2, "role": "orb_residential"})
    dumped = str(sanitized).lower()
    assert "brain_convergence" not in sanitized
    assert "prompt_addendum" not in dumped
    assert "vault_domains" not in dumped
    assert sanitized["explainability"]["public_considerations"]


def test_daily_record_activates_recording_contracts():
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        "Draft a daily record for a calm evening.",
        mode="Record This Properly",
        note_type="daily_record",
        feature="dictate",
    )
    contract_text = " ".join(decision.response_contract).lower()
    assert decision.contract_mode == "recording"
    assert "factual" in contract_text or "record" in contract_text
    assert decision.depth_tier in {"standard", "enhanced", "light"}


def test_manager_oversight_activates_leadership_contracts():
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        "Manager oversight note for incident on shift.",
        mode="Manager Copilot",
        requested_action="create_manager_oversight_note",
        feature="action_engine",
    )
    assert decision.contract_mode == "manager_review"
    contract_text = " ".join(decision.response_contract).lower()
    assert "manager" in contract_text or "oversight" in contract_text or "known" in contract_text
    assert decision.depth_tier in {"enhanced", "mandatory"}


def test_ofsted_reg44_activates_inspection_contracts():
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        "Reg 44 visitor report themes and actions.",
        mode="Reg 44 / Reg 45 Prep",
        document_lens="reg44",
        feature="document_intelligence",
    )
    assert decision.contract_mode in {"reg45", "ofsted_view"}
    considerations = " ".join(decision.public_considerations).lower()
    assert "inspection" in considerations or "leadership" in considerations


def test_dictate_standalone_boundary_preserved():
    ctx = orb_document_brain_adapter_service.build_document_brain_context(
        "Transcript text only.",
        feature="dictate",
        note_type="daily_record",
    )
    assert ctx["brain_convergence"].standalone_boundary is True
    assert ctx["public_explainability"]["standalone_only_reasoning"] is True


def test_light_depth_for_general_question():
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        "What is photosynthesis?",
        mode="General Knowledge",
    )
    assert decision.depth_tier == "light"
    assert not decision.scenario_types


def test_entrypoint_audit_map_covers_major_paths():
    audit = orb_brain_route_map_service.entrypoint_audit()
    entrypoints = {item["entrypoint"] for item in audit}
    assert "/orb/standalone/conversation" in entrypoints
    assert "/orb/standalone/actions/run" in entrypoints
    assert any("dictate" in e for e in entrypoints)
    converged = [item for item in audit if item["uses_converged_orchestrator"]]
    assert len(converged) >= 6
