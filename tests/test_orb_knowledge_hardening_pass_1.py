"""ORB Residential Knowledge Hardening Pass 1 — internal markers and OpenAI avoidance."""

from __future__ import annotations

from services.orb_brain_visibility_service import sanitize_orb_brain_metadata_for_user
from services.orb_execution_policy_service import (
    OFSTED_PREPARATION_DETERMINISTIC_ANSWER,
    REG45_REVIEW_DETERMINISTIC_ANSWER,
    orb_execution_policy_service,
)
from services.orb_knowledge_gap_audit_service import ORB_KNOWLEDGE_GAP_DOMAINS
from services.orb_universal_answer_contract_map_service import (
    get_contract_family,
    validate_contract_answer,
)


def _policy_and_answer(prompt: str) -> tuple[dict, str | None]:
    policy = orb_execution_policy_service.resolve(prompt)
    det = orb_execution_policy_service.try_deterministic_answer(prompt, policy=policy)
    return policy.to_dict(), (det or {}).get("answer")


def test_hardened_domains_include_internal_markers():
    families = (
        "daily_record",
        "keywork_session",
        "incident_record",
        "manager_oversight_note",
        "reg44_visitor",
        "accessible_child_support_plan",
        "missing_return_record",
    )
    for family_id in families:
        family = get_contract_family(family_id)
        assert family is not None
        markers = family.get("required_markers") or []
        assert markers, f"{family_id} should define required markers"


def test_daily_note_structure_without_openai():
    prompt = "Help me write a daily note"
    policy, answer = _policy_and_answer(prompt)
    assert policy["execution_policy"] in {"deterministic_only", "internal_template_plus_validator"}
    assert policy["openai_allowed"] is False
    assert answer
    assert "structure" in answer.lower() or "daily note" in answer.lower()


def test_keywork_headings_without_openai():
    prompt = "Give me headings for a key-work session"
    policy, answer = _policy_and_answer(prompt)
    assert policy["selected_contract"] == "keywork_session"
    assert policy["openai_allowed"] is False
    assert answer
    assert "child voice" in answer.lower()
    assert "key-work" in answer.lower() or "keywork" in answer.lower()


def test_manager_oversight_checklist_without_openai():
    prompt = "What should a manager oversight note include?"
    policy, answer = _policy_and_answer(prompt)
    assert policy["selected_contract"] == "manager_oversight_note"
    assert policy["openai_allowed"] is False
    assert answer
    assert "oversight" in answer.lower()
    assert "manager" in answer.lower()


def test_reg44_evidence_checklist_without_openai():
    prompt = "Give me a Reg 44 evidence checklist"
    policy, answer = _policy_and_answer(prompt)
    assert policy["selected_contract"] == "reg44_visitor"
    assert policy["openai_allowed"] is False
    assert answer
    assert "reg 44" in answer.lower()
    assert "evidence" in answer.lower()


def test_gdd_communication_support_markers():
    family = get_contract_family("accessible_child_support_plan")
    markers = [m.lower() for m in (family or {}).get("required_markers") or []]
    assert "widget" in markers or "widgets" in " ".join(markers)
    assert "yes" in markers
    assert "stop" in markers
    assert "help" in markers
    assert "pain" in markers
    assert "worried" in markers or "worry" in " ".join(markers)


def test_reg45_review_structure_markers():
    prompt = "What should a Reg 45 manager review cover?"
    policy, answer = _policy_and_answer(prompt)
    assert policy["openai_allowed"] is False
    assert answer
    lowered = answer.lower()
    for term in (
        "reg 45",
        "quality of care",
        "safeguarding",
        "leadership",
        "improvement plan",
        "feedback",
    ):
        assert term in lowered


def test_ofsted_preparation_does_not_predict_grades():
    validation = validate_contract_answer(
        OFSTED_PREPARATION_DETERMINISTIC_ANSWER,
        family_id="ofsted_preparation",
    )
    assert validation["passed"] is True
    lowered = OFSTED_PREPARATION_DETERMINISTIC_ANSWER.lower()
    assert "do not predict" in lowered
    assert "outstanding grade" not in lowered
    assert "will be rated" not in lowered
    assert "do not predict" in REG45_REVIEW_DETERMINISTIC_ANSWER.lower()


def test_safeguarding_still_mandatory_for_missing_from_home():
    prompt = "A young person is missing from the home right now — what do I do?"
    policy = orb_execution_policy_service.resolve(prompt)
    assert policy.execution_policy == "openai_mandatory_safeguarding"
    assert policy.openai_allowed is True
    markers = " ".join(policy.internal_knowledge_markers).lower()
    assert "missing" in markers
    assert "welfare" in markers


def test_normal_user_cannot_see_secret_sauce():
    policy = orb_execution_policy_service.resolve("Help me write a daily note")
    context = {
        "execution_policy": policy.to_dict(),
        "internal_knowledge_markers": policy.internal_knowledge_markers,
        "optimisation_gap": "deterministic template available",
    }
    staff_view = sanitize_orb_brain_metadata_for_user(context, {"role": "staff"})
    assert "execution_policy" not in staff_view
    assert "optimisation_gap" not in staff_view
    admin_view = sanitize_orb_brain_metadata_for_user(context, {"role": "founder"})
    assert admin_view.get("execution_policy")


def test_audit_domains_cover_hardening_priorities():
    domains = {item["domain"] for item in ORB_KNOWLEDGE_GAP_DOMAINS}
    for name in (
        "Daily recording",
        "Key-work sessions",
        "Manager oversight",
        "Reg 44",
        "Reg 45",
        "GDD / communication support",
        "Safeguarding concern",
        "Missing from home",
    ):
        assert name in domains
