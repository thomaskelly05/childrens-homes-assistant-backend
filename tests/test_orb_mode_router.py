from services.orb_mode_router import route_orb_mode
from schemas.orb import OrbContext


def test_support_worker_recording_question_routes_to_care_brain():
    decision = route_orb_mode(
        message="What should I record after family time?",
        current_user={"role": "support_worker"},
        selected_mode="auto",
        context=OrbContext(route="/shifts/current", workspace="shift_operations"),
    )

    assert decision.brain == "care_assistant"
    assert decision.assistant_mode in {"shift_operations", "embedded"}
    assert decision.requires_confirmation_before_write is True


def test_manager_ofsted_question_routes_to_inspector_brain():
    decision = route_orb_mode(
        message="What would Ofsted challenge here?",
        current_user={"role": "registered_manager"},
        selected_mode="auto",
        context=OrbContext(route="/ofsted-readiness", workspace="regulatory"),
    )

    assert decision.brain == "inspector"
    assert decision.assistant_mode == "ofsted_evidence_pack"
    assert decision.requires_citations is True


def test_safeguarding_language_sets_sensitive_flag():
    decision = route_orb_mode(
        message="Does this safeguarding incident need manager oversight?",
        current_user={"role": "manager"},
        selected_mode="auto",
        context=OrbContext(route="/safeguarding", workspace="safeguarding"),
    )

    assert "safeguarding_sensitive" in decision.safety_flags

