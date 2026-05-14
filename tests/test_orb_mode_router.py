from services.orb_mode_router import route_orb_mode
from schemas.orb import OrbContext


def test_support_worker_recording_question_routes_to_care_brain():
    decision = route_orb_mode(
        message="What should I record after family time?",
        current_user={"role": "support_worker"},
        selected_mode="auto",
        context=OrbContext(route="/shifts/current", workspace="shift_operations"),
    )

    assert decision.brain == "care_brain"
    assert decision.assistant_mode in {"shift_operations", "embedded"}
    assert decision.requires_confirmation_before_write is True
    assert decision.requires_citations is True


def test_manager_ofsted_question_routes_to_inspector_brain():
    decision = route_orb_mode(
        message="What would Ofsted challenge here?",
        current_user={"role": "registered_manager"},
        selected_mode="auto",
        context=OrbContext(route="/ofsted-readiness", workspace="regulatory"),
    )

    assert decision.brain == "inspector_brain"
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


def test_general_question_routes_to_general_brain_without_care_citations():
    decision = route_orb_mode(
        message="Tell me about IndiCare.",
        current_user={"role": "support_worker"},
        selected_mode="auto",
        context=OrbContext(route="/assistant", workspace="standalone_assistant"),
    )

    assert decision.brain == "general_assistant_brain"
    assert decision.requires_citations is False
    assert decision.care_scope_required is False
    assert decision.allow_general_knowledge is True


def test_current_question_routes_to_web_research_and_requires_tool():
    decision = route_orb_mode(
        message="What's the weather today?",
        current_user={"role": "support_worker"},
        selected_mode="auto",
        context=OrbContext(route="/assistant", workspace="standalone_assistant"),
    )

    assert decision.brain == "web_research_brain"
    assert decision.requires_external_tool is True
    assert decision.requires_citations is False


def test_productivity_question_routes_to_productivity_brain():
    decision = route_orb_mode(
        message="Help me write an email to a social worker.",
        current_user={"role": "support_worker"},
        selected_mode="auto",
        context=OrbContext(route="/assistant", workspace="standalone_assistant"),
    )

    assert decision.brain == "productivity_brain"
    assert decision.requires_citations is False


def test_non_manager_ofsted_question_does_not_use_inspector_brain():
    decision = route_orb_mode(
        message="What would Ofsted challenge here?",
        current_user={"role": "support_worker"},
        selected_mode="auto",
        context=OrbContext(route="/ofsted-readiness", workspace="regulatory"),
    )

    assert decision.brain == "care_brain"
    assert "inspector_permission_limited" in decision.safety_flags

