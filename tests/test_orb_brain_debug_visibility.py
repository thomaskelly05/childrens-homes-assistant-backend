"""ORB brain-route metadata visibility — public redaction vs founder/admin debug."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.orb_standalone_routes import (
    OrbStandaloneConversationRequest,
    _build_standalone_request_context,
    _standalone_conversation_response,
    _require_orb_brain_route_debug_access,
    router as standalone_router,
)
from services.orb_brain_visibility_service import (
    build_public_explainability,
    sanitize_orb_brain_metadata_for_user,
    user_can_view_orb_brain_debug,
)

STAFF_USER = {"id": 42, "role": "staff"}
ADMIN_USER = {"id": 1, "role": "admin"}
FOUNDER_USER = {"id": 2, "role": "founder"}

INTERNAL_CONTEXT = {
    "mode": "Ask ORB",
    "standalone_brain": {
        "active_brains": ["orb_standalone_brain_service"],
        "brain_convergence": {
            "active_brains": ["safeguarding_brain"],
            "response_contract": ["LADO consideration"],
            "knowledge_vaults": ["safeguarding_vault"],
            "scenario_types": ["allegation_against_staff"],
        },
    },
    "shared_cognition": {
        "active_brains": ["shared_institutional_cognition_runtime"],
        "routing": {"active_brains": ["safeguarding"]},
        "prompt_blocks": ["secret routing block"],
    },
    "brain_selection_shadow": {"tier": "shadow", "signals": {"risk": "high"}},
    "active_brains": ["safeguarding_brain"],
    "reasoning_lenses": ["mandatory_contract_service"],
    "orb_knowledge_grounding_preview": "raw grounding text",
    "response_contract": ["do not investigate"],
    "vault_domains": ["safeguarding"],
    "scenario_types": ["allegation_against_staff"],
    "risk_level": "high",
    "timing": {"route": "/orb/standalone/conversation", "elapsed_ms": 120},
    "indicare_intelligence_core": {
        "expert_depth": "safeguarding_critical",
        "active_intelligence_layers": ["safeguarding_intelligence"],
        "response_support": ["Safety considered"],
    },
    "answer_quality_gate": {"composite_score": 0.82},
    "learning_ledger": {"outcome": "recorded"},
    "explainability": {
        "active_brains": ["orb_standalone_brain_service"],
        "vault_domains": ["safeguarding"],
        "frameworks_used": ["response_contract"],
        "how_orb_thought": "internal cognition trace",
    },
    "model_routing": {"provider": "openai", "model": "gpt-4.1", "task_type": "safeguarding"},
}


def test_user_can_view_debug_for_founder_and_admin_roles():
    assert user_can_view_orb_brain_debug(ADMIN_USER) is True
    assert user_can_view_orb_brain_debug(FOUNDER_USER) is True
    assert user_can_view_orb_brain_debug(STAFF_USER) is False
    assert user_can_view_orb_brain_debug(None) is False


def test_normal_user_context_redacts_secret_sauce():
    redacted = sanitize_orb_brain_metadata_for_user(INTERNAL_CONTEXT, STAFF_USER)
    forbidden = (
        "standalone_brain",
        "shared_cognition",
        "brain_selection_shadow",
        "active_brains",
        "orb_knowledge_grounding_preview",
        "learning_ledger",
        "answer_quality_gate",
        "timing",
        "scenario_types",
        "vault_domains",
        "response_contract",
    )
    for key in forbidden:
        assert key not in redacted, key
    explain = redacted.get("explainability") or {}
    assert explain.get("public_considerations")
    assert "active_brains" not in explain
    assert "vault_domains" not in explain
    core = redacted.get("indicare_intelligence_core") or {}
    assert "expert_depth" not in core
    assert core.get("response_support") == ["Safety considered"]
    assert "openai" not in str(redacted.get("model_routing") or {})


def test_admin_user_context_retains_debug_fields():
    full = sanitize_orb_brain_metadata_for_user(INTERNAL_CONTEXT, ADMIN_USER)
    assert full.get("standalone_brain")
    assert full.get("active_brains")
    assert full.get("brain_selection_shadow")


def test_public_explainability_uses_safe_labels_only():
    public = build_public_explainability(INTERNAL_CONTEXT["explainability"])
    joined = " ".join(public.get("public_considerations") or []).lower()
    assert "orb_standalone" not in joined
    assert "response_contract" not in joined
    assert "vault" not in joined


def test_standalone_conversation_response_redacts_for_staff(monkeypatch):
    monkeypatch.setattr(
        "routers.orb_standalone_routes.orb_knowledge_retrieval_service.prepare_request_bundle",
        lambda *args, **kwargs: {
            "prompt_tier": "residential",
            "grounding_context": "",
            "source_packs": [],
        },
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes.shared_institutional_cognition_runtime.prompt_addendum",
        lambda **kwargs: "",
    )
    monkeypatch.setattr(
        "routers.orb_standalone_routes.run_brain_selection_shadow",
        lambda *args, **kwargs: {},
    )
    payload = OrbStandaloneConversationRequest(
        message="A child says a staff member touched them inappropriately.",
        mode="Ask ORB",
    )
    ctx = _build_standalone_request_context(payload)
    response = _standalone_conversation_response(
        answer="Immediate child safety. Do not investigate. Notify manager and LADO.",
        mode="Ask ORB",
        conversation_id="conv-1",
        context_used={
            "standalone_brain": ctx["standalone_brain"],
            "shared_cognition": ctx["shared_cognition"],
            "active_brains": ctx["brain_convergence"].get("active_brains"),
            "explainability": {"active_brains": ctx["brain_convergence"].get("active_brains")},
        },
        current_user=STAFF_USER,
    )
    context_used = response.get("context_used") or {}
    assert "standalone_brain" not in context_used
    assert "active_brains" not in context_used
    assert (context_used.get("explainability") or {}).get("public_considerations")


def test_brain_route_debug_endpoint_admin_only():
    app = FastAPI()
    app.include_router(standalone_router)
    client = TestClient(app)

    denied = client.post(
        "/orb/standalone/brain-route/debug",
        json={"message": "Suicidal ideation on shift.", "mode": "Ask ORB"},
    )
    assert denied.status_code in {401, 403}

    app.dependency_overrides[_require_orb_brain_route_debug_access] = lambda: ADMIN_USER
    allowed = client.post(
        "/orb/standalone/brain-route/debug",
        json={"message": "Suicidal ideation on shift.", "mode": "Ask ORB"},
    )
    assert allowed.status_code == 200
    data = allowed.json()["data"]
    assert data["active_brains"]
    assert data["response_contract"]
    assert "sk-" not in str(data).lower()


def test_brain_route_map_endpoint_includes_safety_pack_for_admin():
    app = FastAPI()
    app.include_router(standalone_router)
    app.dependency_overrides[_require_orb_brain_route_debug_access] = lambda: FOUNDER_USER
    client = TestClient(app)
    response = client.get("/orb/standalone/brain-route/map")
    assert response.status_code == 200
    data = response.json()["data"]
    assert data.get("safety_pack", {}).get("scenario_bank")


def test_brain_route_preview_redacted_for_staff():
    app = FastAPI()
    app.include_router(standalone_router)
    from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access

    app.dependency_overrides[require_rich_orb_premium_access] = lambda: STAFF_USER
    client = TestClient(app)
    response = client.post(
        "/orb/standalone/brain-route",
        json={"message": "County lines exploitation concern.", "mode": "Ask ORB"},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert "active_brains" not in data
    assert "scenario_types" not in data
    assert data.get("standalone_boundary") is True
