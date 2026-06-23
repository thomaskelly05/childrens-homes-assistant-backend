"""Therapeutic template factory — enriches ORB template registry without duplicating systems."""

from __future__ import annotations

from typing import Any

from services.orb_template_library_registry import ORB_TEMPLATE_REGISTRY, orb_template_library_registry

REVIEW_BEFORE_USE = (
    "Review and adapt before use. This template supports professional judgement — "
    "it does not guarantee compliance or replace local policy."
)

BANNED_TEMPLATE_LANGUAGE = (
    "bad behaviour",
    "non-compliant",
    "attention seeking",
    "kicked off",
    "manipulative",
)

# Required residential playbook template families mapped to registry IDs.
REQUIRED_TEMPLATE_FAMILIES: dict[str, str] = {
    "daily_record": "daily_record",
    "incident_record": "incident_record",
    "missing_from_care_record": "missing_return_conversation",
    "return_home_discussion": "missing_return_conversation",
    "self_harm_emotional_wellbeing_record": "emotional_wellbeing_plan",
    "allegation_against_staff_record": "allegation_chronology",
    "whistleblowing_concern_record": "incident_escalation",
    "exploitation_concern_record": "exploitation_screening",
    "medication_refusal_record": "medication_refusal_record",
    "medication_error_record": "medication_error_record",
    "physical_intervention_record": "physical_intervention_record",
    "consequence_restorative_repair_reflection": "child_debrief",
    "contact_family_time_record": "family_time_plan",
    "education_school_refusal_record": "education_plan",
    "send_autism_communication_record": "behaviour_support_plan",
    "child_voice_gestures_symbols_record": "direct_work_summary",
    "keywork_session_note": "keywork_session",
    "supervision_preparation": "staff_supervision",
    "handover_note": "handover_note",
    "chronology_entry": "chronology_entry",
    "manager_oversight_note": "manager_review_note",
    "reg44_evidence_summary": "reg44_action_tracker",
    "reg45_review_section": "reg45_quality_review",
    "ofsted_sccif_evidence_summary": "ofsted_readiness_review",
    "complaint_record": "complaint_record",
    "advocacy_rights_record": "direct_work_summary",
    "orb_communicate_support_pack": "orb_communicate_support_pack_record",
    "privacy_minimised_safeguarding_record": "privacy_minimised_safeguarding_record",
    # Full residential taxonomy extensions (lifecycle groups A–J)
    "referral_summary": "referral_summary",
    "welcome_plan": "welcome_plan",
    "first_24_hours_record": "first_24_hours_record",
    "self_harm_suicide_concern_record": "self_harm_suicide_concern_record",
    "online_safety_concern_record": "online_safety_concern_record",
    "school_refusal_record": "school_refusal_record",
    "pep_contribution": "pep_contribution",
    "aac_child_voice_record": "aac_child_voice_record",
    "transition_planning_note": "transition_planning_note",
    "quality_standards_evidence_note": "quality_standards_evidence_note",
}

_THERAPEUTIC_EXAMPLES: dict[str, list[str]] = {
    "recording": [
        "They seemed quieter than usual after contact.",
        "Staff offered a calm space and checked in without pressure.",
    ],
    "safeguarding": [
        "The young person said they felt scared — staff recorded their exact words.",
        "Adults responded with curiosity, not blame.",
    ],
    "care_planning": [
        "What helps me feel safe is…",
        "Adults will support me by…",
    ],
    "default": [
        "Record what you saw and heard before interpreting why.",
        "Use the young person's words where you have them.",
    ],
}

_WHAT_TO_AVOID: tuple[str, ...] = (
    "Blame, shame or punitive labels",
    "Invented quotes or assumed intent",
    "Education-only DSL wording outside school contexts",
    "Claims that compliance is guaranteed",
    "Replacing manager, health or safeguarding judgement",
)


def _therapeutic_examples(category: str) -> list[str]:
    return _THERAPEUTIC_EXAMPLES.get(category, _THERAPEUTIC_EXAMPLES["default"])


def enrich_template(template: dict[str, Any]) -> dict[str, Any]:
    category = str(template.get("category") or "recording")
    title = str(template.get("title") or "Template")
    enriched = dict(template)
    enriched.update(
        {
            "purpose": template.get("purpose") or f"Support adults completing: {title.lower()}.",
            "when_to_use": template.get("when_to_use")
            or f"Use when preparing or completing: {title.lower()}.",
            "adult_guidance_before_completing": (
                "Read local policy first. Gather facts, chronology and child voice where available. "
                "Complete in the approved recording system. Escalate safeguarding concerns to the manager/on-call."
            ),
            "what_to_record": template.get("required_sections") or [],
            "child_voice_prompts": [
                template.get("child_voice_prompt")
                or "Where is the child's voice, presentation, wishes or feelings?",
                "What might the young person be communicating through behaviour?",
            ],
            "observation_vs_interpretation_reminder": (
                "Separate what staff saw/heard from adult interpretation. "
                "Use tentative language for hypotheses."
            ),
            "therapeutic_wording_examples": _therapeutic_examples(category),
            "what_to_avoid": list(_WHAT_TO_AVOID),
            "escalation_manager_oversight": template.get("manager_oversight_prompt")
            or "What should a senior or registered manager review, challenge or sign off?",
            "draft_template_sections": template.get("sections") or [],
            "reflective_prompts": [
                template.get("professional_curiosity_prompt")
                or "What might adults be missing or minimising?",
                "What would help the young person next?",
            ],
            "source_chips_practice_anchors": [
                "Recording quality",
                "Child-centred recording",
                "Therapeutic language",
                "Safeguarding responsibilities",
            ],
            "review_before_use": REVIEW_BEFORE_USE,
            "compliance_disclaimer": (
                "Supports practice documentation — does not guarantee regulatory compliance."
            ),
        }
    )
    return enriched


def list_therapeutic_templates(
    *,
    category: str | None = None,
    search: str | None = None,
) -> list[dict[str, Any]]:
    base = orb_template_library_registry.list_templates(category=category, search=search)
    return [
        {
            **item,
            "therapeutic": True,
            "review_before_use": REVIEW_BEFORE_USE,
        }
        for item in base
    ]


def get_therapeutic_template(template_id: str) -> dict[str, Any] | None:
    raw = orb_template_library_registry.get_template(template_id)
    if not raw:
        return None
    return enrich_template(raw)


def verify_required_template_families() -> dict[str, Any]:
    missing = [family for family, tid in REQUIRED_TEMPLATE_FAMILIES.items() if tid not in ORB_TEMPLATE_REGISTRY]
    covered = {family: tid for family, tid in REQUIRED_TEMPLATE_FAMILIES.items() if tid in ORB_TEMPLATE_REGISTRY}
    return {
        "required_families": len(REQUIRED_TEMPLATE_FAMILIES),
        "covered": len(covered),
        "missing_registry_ids": missing,
        "families": covered,
    }


def template_text_is_child_centred(text: str) -> bool:
    lowered = (text or "").lower()
    return "child" in lowered and not any(banned in lowered for banned in BANNED_TEMPLATE_LANGUAGE)


class OrbTherapeuticTemplateFactoryService:
    list_templates = staticmethod(list_therapeutic_templates)
    get_template = staticmethod(get_therapeutic_template)
    enrich = staticmethod(enrich_template)
    verify_families = staticmethod(verify_required_template_families)


orb_therapeutic_template_factory_service = OrbTherapeuticTemplateFactoryService()
