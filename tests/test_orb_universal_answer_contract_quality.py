"""Universal ORB Residential answer contract quality — golden prompts and streaming cleanup."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from routers.orb_standalone_routes import router as standalone_router
from services.orb_brain_convergence_orchestrator_service import (
    orb_brain_convergence_orchestrator_service,
)
from services.orb_brain_visibility_service import (
    run_contract_quality_pack,
    sanitize_orb_brain_metadata_for_user,
    user_can_view_orb_brain_debug,
)
from services.orb_fast_opening_service import (
    _RESIDENTIAL_DEEP_DEFAULT_OPENING,
    fast_opening_for_message,
    merge_stream_answer,
    strip_streaming_artifacts_from_answer,
)
from services.orb_universal_answer_contract_map_service import (
    GOLDEN_PROMPT_QA_PACK,
    UNIVERSAL_FORBIDDEN_PATTERNS,
    detect_contract_family,
    find_forbidden_patterns,
    sanitize_final_answer,
    validate_contract_answer,
)

GDD_SUPPORT_PLAN_PROMPT = (
    "Give me a template for a child-friendly support plan for a 17-year-old with GDD. "
    "They mainly use widgets to be able to communicate. I want this to give them a plan "
    "they can follow, with dreams and aspirations."
)

SAMPLE_SUPPORT_PLAN_ANSWER = """
## My support plan

### How I communicate
I use widgets on my device to tell people what I need.

### Dreams and aspirations
I want to learn to travel independently and work with animals.

### What matters to me
Being listened to and having time to answer.

### Daily routine
Morning: choose breakfast using widgets.
Evening: calm time with music.

### How adults should support me
Give me time. Show me options on my board.

### Independence / preparing for adulthood
Help me practise college visits with my key worker.

### Review
We will review this using my widget board every month.

### For staff
Use my communication board. Do not rush me.
""".strip()


# --- Streaming cleanup ---


def test_non_risk_support_plan_has_no_safety_fast_opening():
    opening = fast_opening_for_message(
        GDD_SUPPORT_PLAN_PROMPT,
        expert_depth="residential_deep",
    )
    assert opening is None or "safest" not in (opening or "").lower()


def test_residential_deep_non_risk_has_no_generic_fast_opening():
    opening = fast_opening_for_message(
        "Give me a handover template for end of shift",
        expert_depth="residential_deep",
    )
    assert opening is None or _RESIDENTIAL_DEEP_DEFAULT_OPENING not in (opening or "")


def test_merge_stream_strips_generic_opening_from_final_answer():
    model = SAMPLE_SUPPORT_PLAN_ANSWER
    merged = merge_stream_answer(
        fast_opening=_RESIDENTIAL_DEEP_DEFAULT_OPENING,
        model_answer=model,
        streamed_text=f"{_RESIDENTIAL_DEEP_DEFAULT_OPENING}\n\n{model}",
    )
    assert "start with what is safest" not in merged.lower()
    assert "full guidance is on the way" not in merged.lower()
    assert "widgets" in merged.lower()


def test_strip_streaming_artifacts_removes_status_copy():
    polluted = (
        f"{_RESIDENTIAL_DEEP_DEFAULT_OPENING}\n\n{SAMPLE_SUPPORT_PLAN_ANSWER}"
    )
    cleaned = strip_streaming_artifacts_from_answer(
        polluted,
        fast_opening=_RESIDENTIAL_DEEP_DEFAULT_OPENING,
    )
    assert "start with what is safest" not in cleaned.lower()
    assert "full guidance is on the way" not in cleaned.lower()


def test_sanitize_final_answer_removes_broken_placeholders():
    broken = "Intro [A brief introduction about…] and [add dreams here]."
    cleaned = sanitize_final_answer(broken, family_id="accessible_child_support_plan")
    assert "…]" not in cleaned
    assert "[add detail here]" in cleaned or "[add dreams here]" in cleaned


def test_forbidden_patterns_detect_streaming_leakage():
    answer = (
        "Start with what is safest and most practical right now — "
        "the full guidance is on the way.\n\nSome content."
    )
    hits = find_forbidden_patterns(answer)
    assert hits


# --- Contract family detection ---


@pytest.mark.parametrize("item", GOLDEN_PROMPT_QA_PACK, ids=lambda i: i["prompt_id"])
def test_golden_prompt_detects_expected_contract_family(item: dict[str, str]):
    detected = detect_contract_family(
        item["prompt"],
        requested_action=item.get("requested_action"),
        note_type=item.get("note_type"),
        source_surface=item.get("source_surface"),
        feature=item.get("feature"),
    )
    assert detected == item["contract"], f"Expected {item['contract']}, got {detected}"


def test_gdd_support_plan_contract_family():
    family = detect_contract_family(GDD_SUPPORT_PLAN_PROMPT)
    assert family == "accessible_child_support_plan"


def test_gdd_support_plan_depth_tier_standard_not_mandatory():
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        GDD_SUPPORT_PLAN_PROMPT,
        mode="Ask ORB",
    )
    assert decision.contract_family == "accessible_child_support_plan"
    assert decision.depth_tier == "standard"
    assert decision.scenario_types == []


def test_gdd_support_plan_expert_depth_capped():
    from services.indicare_intelligence_core_service import indicare_intelligence_core_service

    depth = indicare_intelligence_core_service.estimate_expert_depth(
        GDD_SUPPORT_PLAN_PROMPT,
        mode="Ask ORB",
    )
    assert depth in {"residential_light", "residential_standard", "general_light"}
    assert depth != "residential_deep"
    assert depth != "safeguarding_critical"


def test_gdd_support_plan_prompt_tier_not_deep():
    from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

    bundle = orb_knowledge_retrieval_service.prepare_request_bundle(
        GDD_SUPPORT_PLAN_PROMPT,
        mode="Ask ORB",
    )
    assert bundle["prompt_tier"] != "deep"


def test_support_plan_answer_validation_passes_clean_sample():
    result = validate_contract_answer(
        SAMPLE_SUPPORT_PLAN_ANSWER,
        family_id="accessible_child_support_plan",
    )
    assert result["passed"] is True
    assert not result["forbidden_patterns"]


def test_support_plan_answer_fails_forbidden_generic_filler():
    bad = (
        "Here's a structured template you can adapt. "
        "It is essential to focus on communication."
    )
    result = validate_contract_answer(bad, family_id="accessible_child_support_plan")
    assert result["passed"] is False
    assert result["forbidden_patterns"]


# --- Public explainability safety ---


def test_public_metadata_strips_secret_sauce():
    raw_context = {
        "active_brains": ["safeguarding_brain"],
        "brain_route": {"route": "residential_specialist"},
        "response_contract": ["internal contract line"],
        "vault_domains": ["safeguarding"],
        "mandatory_contracts": [{"id": "test"}],
        "scenario_types": ["suicide_self_harm"],
        "cognition_display_labels": ["Child-centred planning"],
    }
    sanitized = sanitize_orb_brain_metadata_for_user(raw_context, {"role": "staff"})
    assert "active_brains" not in sanitized
    assert "brain_route" not in sanitized
    assert "response_contract" not in sanitized
    assert "vault_domains" not in sanitized
    assert sanitized.get("cognition_display_labels")


def test_founder_debug_visibility_preserved():
    assert user_can_view_orb_brain_debug({"role": "founder"}) is True
    assert user_can_view_orb_brain_debug({"role": "admin"}) is True


# --- Golden QA pack runner ---


def test_contract_quality_pack_passes_routing_qa():
    report = run_contract_quality_pack()
    assert report["total"] == 20
    assert report["failed"] == 0
    assert report["passed"] == 20


def test_qa_run_endpoint_restricted_to_founder_admin():
    app = FastAPI()
    app.include_router(standalone_router)
    client = TestClient(app)

    # Unauthenticated / non-debug should not reach QA pack
    response = client.post("/orb/standalone/brain-route/qa-run")
    assert response.status_code in {401, 403, 422, 404}


# --- Streaming vs non-streaming contract parity ---


def test_stream_and_sync_share_contract_family_for_support_plan():
    from routers.orb_standalone_routes import (
        OrbStandaloneConversationRequest,
        _build_standalone_request_context,
    )

    payload = OrbStandaloneConversationRequest(message=GDD_SUPPORT_PLAN_PROMPT, mode="Ask ORB")

    def _stub_bundle():
        return {
            "prompt_tier": "residential",
            "grounding_context": "Grounding",
            "source_packs": [],
            "indicare_intelligence": {"expert_depth": "residential_standard"},
            "expert_depth": "residential_standard",
        }

    import routers.orb_standalone_routes as routes_mod

    original = routes_mod.orb_knowledge_retrieval_service.prepare_request_bundle
    routes_mod.orb_knowledge_retrieval_service.prepare_request_bundle = lambda *a, **k: _stub_bundle()
    try:
        sync_ctx = _build_standalone_request_context(payload, route="/orb/standalone/conversation")
        stream_ctx = _build_standalone_request_context(
            payload,
            route="/orb/standalone/conversation/stream",
        )
    finally:
        routes_mod.orb_knowledge_retrieval_service.prepare_request_bundle = original

    sync_family = sync_ctx["brain_convergence"].get("contract_family")
    stream_family = stream_ctx["brain_convergence"].get("contract_family")
    assert sync_family == "accessible_child_support_plan"
    assert stream_family == sync_family


def test_universal_forbidden_patterns_list_covers_streaming_leakage():
    joined = " ".join(UNIVERSAL_FORBIDDEN_PATTERNS).lower()
    assert "start with what is safest" in joined
    assert "full guidance is on the way" in joined
