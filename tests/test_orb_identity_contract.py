from schemas.orb_identity import OrbProductMode
from services.orb_assistive_behaviour_service import orb_assistive_behaviour_service
from services.orb_care_environment_mode_service import orb_care_environment_mode_service
from services.orb_emotional_safety_service import orb_emotional_safety_service
from services.orb_failure_state_service import orb_failure_state_service
from services.orb_identity_service import orb_identity_service
from services.orb_interaction_preference_service import orb_interaction_preference_service
from services.orb_presence_memory_service import orb_presence_memory_service
from services.orb_product_mode_service import orb_product_mode_service
from services.orb_role_contract_service import orb_role_contract_service
from services.orb_voice_orchestration_service import orb_voice_orchestration_service


def test_identity_contract_separates_embedded_and_standalone_metadata():
    embedded = orb_identity_service.build_metadata(
        product_mode="os_embedded",
        current_user={"role": "support_worker"},
        active_child_id=123,
    )
    standalone = orb_identity_service.build_metadata(product_mode="standalone")

    assert embedded.product_language == "IndiCare OS with ORB"
    assert embedded.access_scope == "active_child_only"
    assert embedded.retrieval_policy == "active_child_rbac_only"
    assert standalone.product_language == "ORB powered by IndiCare."
    assert standalone.access_scope == "standalone_no_os_access"
    assert standalone.retrieval_policy == "static_and_user_supplied_only"


def test_standalone_product_mode_detects_and_sanitizes_os_context():
    context = {"route": "/assistant", "selected_young_person_id": 7, "current_child": {"name": "Jamie"}}

    assert orb_product_mode_service.normalise(None, "/assistant") == OrbProductMode.STANDALONE
    assert set(orb_product_mode_service.standalone_context_violations(context)) >= {"selected_young_person_id", "current_child"}
    sanitized = orb_product_mode_service.sanitize_for_standalone(context)
    assert sanitized["selected_young_person_id"] is None
    assert sanitized["current_child"] == {}


def test_role_contract_blocks_standalone_os_access_and_silent_writes():
    standalone = orb_role_contract_service.contract_for("standalone")
    embedded = orb_role_contract_service.contract_for("os_embedded")

    assert standalone.can_access_os_records is False
    assert standalone.can_retrieve_active_child is False
    assert standalone.can_create_without_confirmation is False
    assert embedded.can_access_os_records is True
    assert embedded.can_create_without_confirmation is False


def test_presence_memory_scopes_embedded_child_and_standalone_separately():
    orb_presence_memory_service.remember(
        product_mode="os_embedded",
        user_id=1,
        home_id=10,
        active_child_id=99,
        preferences={"prefers_brief_answers": True, "recent_active_workflow": "handover"},
    )
    standalone = orb_presence_memory_service.remember(
        product_mode="standalone",
        user_id=1,
        preferences={"prefers_brief_answers": True, "active_child_id": 99, "recent_active_workflow": "handover"},
    )

    assert "child:99" in orb_presence_memory_service.scope_key(product_mode="os_embedded", user_id=1, home_id=10, active_child_id=99)
    assert standalone.scope_key == "standalone:user:1"
    assert "active_child_id" not in standalone.preferences


def test_voice_emotional_environment_and_failure_layers_are_safe():
    voice = orb_voice_orchestration_service.plan(profile="safeguarding_cautious", realtime_configured=True)
    emotional = orb_emotional_safety_service.evaluate(text="I am stuck, help me again")
    care_mode = orb_care_environment_mode_service.resolve("child_nearby")
    failure = orb_failure_state_service.message_for("realtime_provider_unavailable")

    assert voice["provider_route"] == "openai_realtime_ephemeral"
    assert voice["browser_api_key_exposure"] is False
    assert emotional["diagnosis_made"] is False
    assert emotional["ui_adjustments"]["response_length"] == "short"
    assert care_mode["captions"] == "privacy_sensitive"
    assert "OpenAI" not in failure["message"]


def test_accessibility_preferences_and_assistive_behaviour_are_gentle():
    prefs = orb_interaction_preference_service.normalise({"reduced_motion": True, "prefers_step_by_step": True})
    suggestions = orb_assistive_behaviour_service.suggest(signals={"weak_child_voice": True})

    assert prefs["voice_caption_mode"] == "caption_supported"
    assert "step-by-step" in orb_interaction_preference_service.response_instruction(prefs)
    assert suggestions[0]["dismissible"] is True
    assert suggestions[0]["tone"] == "gentle_non_punitive"

