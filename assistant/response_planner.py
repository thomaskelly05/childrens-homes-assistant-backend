from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any


GUIDANCE_KEYWORDS = {
    "regulation",
    "regulations",
    "law",
    "legal",
    "policy",
    "guidance",
    "statutory",
    "ofsted",
    "inspection",
    "framework",
    "standard",
    "standards",
    "procedure",
    "quality standard",
    "quality standards",
    "children's homes regulations",
    "childrens homes regulations",
    "guide to the children's homes regulations",
    "guide to the childrens homes regulations",
    "sccif",
    "working together",
    "nms",
    "reg 40",
    "reg 44",
    "reg 45",
    "regulation 40",
    "regulation 44",
    "regulation 45",
}

INSPECTION_TRIGGER_KEYWORDS = {
    "ofsted",
    "inspection",
    "inspection risk",
    "scrutiny",
    "sccif",
    "quality standards",
    "children's homes regulations",
    "childrens homes regulations",
    "reg 40",
    "reg 44",
    "reg 45",
    "regulation 40",
    "regulation 44",
    "regulation 45",
    "what would an inspector pick up",
    "what would ofsted pick up",
    "what would an inspector notice",
    "what would ofsted notice",
    "evidence pack",
    "inspection readiness",
    "audit trail",
    "triangulation",
    "what are we missing",
    "what needs checking",
    "inspection concern",
}

RI_TRIGGER_KEYWORDS = {
    "responsible individual",
    "ri",
    "provider oversight",
    "provider quality",
    "cross-home",
    "compare homes",
    "all homes",
    "governance",
    "assurance",
    "quality assurance",
    "service drift",
    "repeat theme",
    "pattern",
    "theme",
    "trend",
    "triangulation",
    "what would an ri notice",
    "what would ri pick up",
    "weak assurance",
    "oversight gap",
}

LEADERSHIP_TRIGGER_KEYWORDS = {
    "registered manager",
    "manager review",
    "manager oversight",
    "manager brief",
    "leadership",
    "leadership team",
    "escalation",
    "action plan",
    "governance",
    "service issue",
    "operational pressure",
    "oversight",
    "quality assurance",
    "qa",
    "audit",
    "inspection",
    "ofsted",
    "compliance gap",
    "overdue review",
    "weak management response",
    "management drift",
    "what needs immediate action",
    "what needs urgent action",
    "what should the manager do",
}

SAFEGUARDING_TRIGGER_KEYWORDS = {
    "safeguarding",
    "missing",
    "missing from care",
    "missing episode",
    "self-harm",
    "suicidal",
    "assault",
    "violence",
    "restraint",
    "physical intervention",
    "police",
    "allegation",
    "cse",
    "criminal exploitation",
    "sexual exploitation",
    "county lines",
    "harm",
    "risk",
    "neglect",
    "bullying",
    "peer-on-peer",
    "peer on peer",
    "exploitation",
    "child protection",
    "lado",
}

THERAPEUTIC_TRIGGER_KEYWORDS = {
    "therapeutic",
    "trauma-informed",
    "trauma informed",
    "formulation",
    "attachment",
    "relational",
    "relationship-based",
    "relationship based",
    "regulation",
    "emotional regulation",
    "co-regulation",
    "co regulation",
    "what helps",
    "triggers",
    "presentation",
    "lived experience",
    "child voice",
    "young person's voice",
    "young persons voice",
    "identity",
    "belonging",
    "stability",
    "what adults need to hold in mind",
}

RSW_TRIGGER_KEYWORDS = {
    "next shift",
    "handover",
    "what matters today",
    "what matters tonight",
    "what staff need to know",
    "shift brief",
    "staff need to hold in mind",
    "what adults need to do",
    "today",
    "this shift",
    "practical",
}

OS_RECORD_SPECIFIC_KEYWORDS = {
    "record",
    "records",
    "whole record",
    "whole scoped record",
    "across all records",
    "full summary",
    "full overview",
    "chronology",
    "timeline",
    "risk view",
    "what does the record show",
    "what do the records show",
    "what is missing",
    "evidence index",
    "inspection pack",
    "reg 45",
    "reg45",
    "report snapshot",
}

DOCUMENT_HEAVY_MODES = {
    "rewrite",
    "document_review",
    "manager_review",
    "support_planning",
    "quality_review",
    "inspection_review",
}

RECORDING_OUTPUTS = {
    "incident_record",
    "chronology_entry",
    "daily_note",
    "handover_note",
    "structured_record",
}

REVIEW_TASKS = {
    "review",
    "document_work",
    "oversight_review",
    "inspection_review",
}

PLANNING_TASKS = {
    "planning",
    "action_planning",
}

REFLECTIVE_TASKS = {
    "reflection",
    "analysis",
}

REPORT_OUTPUTS = {
    "report",
    "structured_report",
    "email_report",
    "reg45_template",
    "children_home_reg45_template",
    "children_home_manager_brief_template",
    "children_home_quality_brief_template",
    "children_home_summary_template",
    "children_home_chronology_template",
}

REPORT_MODES = {
    "manager_review",
    "document_review",
    "quality_review",
    "inspection_review",
}

FAST_OPERATIONAL_MODES = {
    "handover",
    "recording",
    "incident_summary",
    "rewrite",
    "chronology",
    "practical",
    "factual",
}

DOCUMENT_FIDELITY_MODES = {
    "rewrite",
    "document_review",
    "incident_summary",
    "recording",
    "chronology",
    "handover",
}

DEEP_REASONING_MODES = {
    "manager_review",
    "supervision",
    "support_planning",
    "document_review",
    "reflective",
    "quality_review",
    "inspection_review",
}

MINI_MODEL = os.getenv("INDICARE_MODEL_MINI", "gpt-4o-mini")
STRONG_MODEL = os.getenv("INDICARE_MODEL_STRONG", "gpt-4o")


@dataclass
class GuidancePlan:
    enabled: bool = False
    reason: str = ""
    search_query: str = ""


@dataclass
class ModelPlan:
    model: str = MINI_MODEL
    temperature: float = 0.2
    max_tokens: int = 850


@dataclass
class ResponsePlan:
    selected_mode: str = "balanced"
    response_stance: str = "practice_support"
    should_use_memory: bool = True
    should_use_retrieval: bool = False
    should_use_reflection: bool = False
    should_use_supervision: bool = False
    should_use_leadership_lens: bool = False
    should_use_inspection_lens: bool = False
    should_use_ri_lens: bool = False
    should_use_therapeutic_lens: bool = False
    should_use_guidance_search: bool = False
    must_lead_with_safety: bool = False
    must_preserve_source_facts: bool = False
    should_distinguish_fact_from_inference: bool = False
    should_be_brief: bool = False
    assistant_surface: str = "standalone"
    requires_evidence_grounding: bool = False
    guidance_plan: GuidancePlan = field(default_factory=GuidancePlan)
    model_plan: ModelPlan = field(default_factory=ModelPlan)
    reasons: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_mode(value: str) -> str:
    value = _safe_string(value).lower()
    if value in {"quick", "balanced", "deep"}:
        return value
    if value == "slow":
        return "deep"
    return "balanced"


def _normalise_text(value: Any) -> str:
    return f" {_safe_string(value).lower()} "


def _contains_any(text: str, keywords: set[str]) -> bool:
    lower = _normalise_text(text)
    return any(keyword.lower() in lower for keyword in keywords)


def _normalise_surface(value: str | None) -> str:
    surface = _safe_string(value).lower()
    if surface in {"standalone", "os_embedded"}:
        return surface
    return "standalone"


def _looks_like_internal_report_request(message: str, output_type: str, mode: str) -> bool:
    text = _normalise_text(message)

    if output_type in REPORT_OUTPUTS:
        return True

    if mode in REPORT_MODES:
        return True

    report_terms = {
        "monthly report",
        "monthly summary",
        "monthly overview",
        "reg 45",
        "reg45",
        "regulation 45",
        "annual report",
        "annual overview",
        "yearly report",
        "yearly overview",
        "manager brief",
        "quality brief",
        "inspection summary",
        "oversight summary",
    }
    return any(term in text for term in report_terms)


def _is_inspection_heavy(message: str, output_type: str, mode: str) -> bool:
    if output_type in {
        "children_home_quality_brief_template",
        "children_home_reg45_template",
        "reg45_template",
    }:
        return True

    if mode in {"quality_review", "inspection_review"}:
        return True

    return _contains_any(message, INSPECTION_TRIGGER_KEYWORDS)


def _is_ri_heavy(message: str, user_role_profile: str) -> bool:
    if user_role_profile == "provider":
        return True
    return _contains_any(message, RI_TRIGGER_KEYWORDS)


def _is_leadership_heavy(message: str, user_role_profile: str, task_type: str) -> bool:
    if user_role_profile in {"manager", "provider"}:
        return True
    if task_type in {
        "review",
        "planning",
        "reflection",
        "document_work",
        "oversight_review",
        "report",
    }:
        return True
    return _contains_any(message, LEADERSHIP_TRIGGER_KEYWORDS)


def _is_safeguarding_heavy(message: str, safeguarding_level: str) -> bool:
    if safeguarding_level in {"urgent", "heightened"}:
        return True
    return _contains_any(message, SAFEGUARDING_TRIGGER_KEYWORDS)


def _is_therapeutic_heavy(message: str, mode: str, task_type: str) -> bool:
    if mode in {"support_planning", "reflective"}:
        return True
    if task_type in {"planning", "reflection", "analysis"}:
        return True
    return _contains_any(message, THERAPEUTIC_TRIGGER_KEYWORDS)


def _is_os_record_specific_request(message: str) -> bool:
    return _contains_any(message, OS_RECORD_SPECIFIC_KEYWORDS)


def _derive_response_stance(
    mode: str,
    task_type: str,
    safeguarding_level: str,
    role_profile: str,
    message: str,
) -> tuple[str, list[str]]:
    reasons: list[str] = []

    if safeguarding_level == "urgent":
        reasons.append("urgent_safeguarding_forces_safeguarding_stance")
        return "safeguarding", reasons

    if safeguarding_level == "heightened":
        reasons.append("heightened_safeguarding_prefers_safeguarding_stance")
        return "safeguarding", reasons

    if _contains_any(message, INSPECTION_TRIGGER_KEYWORDS):
        reasons.append("inspection_keywords_prefer_inspection_stance")
        return "inspection", reasons

    if _contains_any(message, RI_TRIGGER_KEYWORDS) or role_profile == "provider":
        reasons.append("ri_or_provider_context_prefers_management_stance")
        return "management", reasons

    if mode in {"recording", "incident_summary", "chronology", "handover", "rewrite"}:
        reasons.append("recording_or_rewrite_mode_prefers_documentation_stance")
        return "documentation", reasons

    if task_type in REVIEW_TASKS or mode in {
        "manager_review",
        "quality_review",
        "inspection_review",
    }:
        reasons.append("review_or_inspection_task_prefers_management_stance")
        return "management", reasons

    if task_type in PLANNING_TASKS or mode == "support_planning":
        reasons.append("planning_task_prefers_management_stance")
        return "management", reasons

    if task_type in REFLECTIVE_TASKS or mode in {"reflective", "supervision"}:
        reasons.append("reflective_task_prefers_reflective_stance")
        return "reflective", reasons

    if _contains_any(message, THERAPEUTIC_TRIGGER_KEYWORDS):
        reasons.append("therapeutic_keywords_prefer_reflective_stance")
        return "reflective", reasons

    reasons.append("default_practice_support_stance")
    return "practice_support", reasons


def _should_use_memory(
    selected_mode: str,
    mode: str,
    assistant_surface: str,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []

    if selected_mode == "quick":
        reasons.append("quick_mode_disables_memory")
        return False, reasons

    if assistant_surface == "os_embedded":
        reasons.append("os_embedded_assistant_prefers_scoped_context_over_chat_memory")
        return False, reasons

    if mode in FAST_OPERATIONAL_MODES:
        reasons.append("fast_operational_mode_uses_minimal_memory")
        return False, reasons

    reasons.append("memory_enabled_for_contextual_continuity")
    return True, reasons


def _should_use_retrieval(
    selected_mode: str,
    mode: str,
    task_type: str,
    safeguarding_level: str,
    has_document: bool,
    message: str,
    output_type: str,
    assistant_surface: str,
    requires_evidence_grounding: bool,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []

    if has_document:
        reasons.append("uploaded_document_present_suppresses_background_retrieval")
        return False, reasons

    if selected_mode == "quick":
        reasons.append("quick_mode_disables_retrieval")
        return False, reasons

    if requires_evidence_grounding and _is_os_record_specific_request(message):
        reasons.append("os_record_specific_request_uses_scoped_evidence_not_background_retrieval")
        return False, reasons

    if safeguarding_level == "urgent" and task_type == "recording":
        reasons.append("urgent_safeguarding_recording_prefers_direct_response_over_retrieval")
        return False, reasons

    if _looks_like_internal_report_request(message, output_type, mode):
        reasons.append("internal_report_like_request_prefers_local_context_over_retrieval")
        return False, reasons

    if assistant_surface == "os_embedded" and task_type in {"report", "summary"}:
        reasons.append("os_report_or_summary_uses_attached_snapshot_context")
        return False, reasons

    if _contains_any(message, GUIDANCE_KEYWORDS):
        reasons.append("guidance_keywords_enable_retrieval")
        return True, reasons

    if _contains_any(message, INSPECTION_TRIGGER_KEYWORDS | RI_TRIGGER_KEYWORDS):
        reasons.append("inspection_or_ri_keywords_enable_retrieval")
        return True, reasons

    if task_type in (REVIEW_TASKS | PLANNING_TASKS | REFLECTIVE_TASKS):
        reasons.append("review_planning_or_reflective_task_enables_retrieval")
        return True, reasons

    if mode in {
        "factual",
        "support_planning",
        "manager_review",
        "supervision",
        "general_practice",
        "quality_review",
        "inspection_review",
    }:
        reasons.append("mode_supports_retrieval")
        return True, reasons

    reasons.append("retrieval_not_needed")
    return False, reasons


def _should_use_reflection(
    selected_mode: str,
    mode: str,
    task_type: str,
    safeguarding_level: str,
    message: str,
) -> tuple[bool, bool, list[str]]:
    reasons: list[str] = []

    if selected_mode == "quick":
        reasons.append("quick_mode_disables_reflection")
        return False, False, reasons

    if safeguarding_level == "urgent":
        reasons.append("urgent_safeguarding_disables_reflection")
        return False, False, reasons

    if mode == "supervision":
        reasons.append("supervision_mode_enables_reflection_and_supervision")
        return True, True, reasons

    if mode in {"reflective", "manager_review", "quality_review", "inspection_review"}:
        reasons.append("reflective_or_review_mode_enables_reflection")
        return True, selected_mode == "deep", reasons

    if task_type in {"reflection", "review", "planning", "analysis", "oversight_review"}:
        reasons.append("reflective_review_planning_or_analysis_task_enables_reflection")
        return True, selected_mode == "deep", reasons

    if _contains_any(
        message,
        INSPECTION_TRIGGER_KEYWORDS | RI_TRIGGER_KEYWORDS | THERAPEUTIC_TRIGGER_KEYWORDS,
    ):
        reasons.append("inspection_ri_or_therapeutic_keywords_enable_reflection")
        return True, False, reasons

    reasons.append("reflection_not_needed")
    return False, False, reasons


def _should_use_leadership_lens(
    selected_mode: str,
    mode: str,
    task_type: str,
    role_profile: str,
    message: str,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []

    if role_profile == "provider":
        reasons.append("provider_role_enables_leadership_lens")
        return True, reasons

    if role_profile == "manager":
        reasons.append("manager_role_enables_leadership_lens")
        return True, reasons

    if task_type in {
        "review",
        "planning",
        "reflection",
        "document_work",
        "oversight_review",
        "report",
    }:
        reasons.append("review_planning_reflection_document_or_report_enables_leadership_lens")
        return True, reasons

    if selected_mode == "quick":
        enabled = _contains_any(message, LEADERSHIP_TRIGGER_KEYWORDS)
        reasons.append("quick_mode_uses_keyword_trigger_for_leadership_lens")
        return enabled, reasons

    if mode in {
        "manager_review",
        "supervision",
        "support_planning",
        "document_review",
        "reflective",
        "quality_review",
        "inspection_review",
    }:
        reasons.append("mode_enables_leadership_lens")
        return True, reasons

    if _contains_any(message, LEADERSHIP_TRIGGER_KEYWORDS):
        reasons.append("leadership_keywords_enable_leadership_lens")
        return True, reasons

    reasons.append("leadership_lens_not_needed")
    return False, reasons


def _should_use_inspection_lens(
    selected_mode: str,
    mode: str,
    output_type: str,
    message: str,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []

    if selected_mode == "quick" and not _contains_any(message, INSPECTION_TRIGGER_KEYWORDS):
        reasons.append("quick_mode_without_inspection_trigger_disables_inspection_lens")
        return False, reasons

    if _is_inspection_heavy(message, output_type, mode):
        reasons.append("inspection_heavy_request_enables_inspection_lens")
        return True, reasons

    reasons.append("inspection_lens_not_needed")
    return False, reasons


def _should_use_ri_lens(
    selected_mode: str,
    role_profile: str,
    message: str,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []

    if (
        selected_mode == "quick"
        and role_profile != "provider"
        and not _contains_any(message, RI_TRIGGER_KEYWORDS)
    ):
        reasons.append("quick_mode_without_ri_trigger_disables_ri_lens")
        return False, reasons

    if _is_ri_heavy(message, role_profile):
        reasons.append("ri_or_provider_context_enables_ri_lens")
        return True, reasons

    reasons.append("ri_lens_not_needed")
    return False, reasons


def _should_use_therapeutic_lens(
    selected_mode: str,
    mode: str,
    task_type: str,
    message: str,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []

    if selected_mode == "quick" and not _contains_any(message, THERAPEUTIC_TRIGGER_KEYWORDS):
        reasons.append("quick_mode_without_therapeutic_trigger_disables_therapeutic_lens")
        return False, reasons

    if _is_therapeutic_heavy(message, mode, task_type):
        reasons.append("therapeutic_context_enables_therapeutic_lens")
        return True, reasons

    reasons.append("therapeutic_lens_not_needed")
    return False, reasons


def _build_guidance_plan(
    message: str,
    mode: str,
    safeguarding_level: str,
    selected_mode: str,
    output_type: str,
    assistant_surface: str,
    requires_evidence_grounding: bool,
) -> GuidancePlan:
    text = _safe_string(message).lower()

    if selected_mode == "quick":
        return GuidancePlan(enabled=False, reason="quick_mode", search_query="")

    if safeguarding_level == "urgent":
        return GuidancePlan(enabled=False, reason="safeguarding_override", search_query="")

    if requires_evidence_grounding and _is_os_record_specific_request(message):
        return GuidancePlan(
            enabled=False,
            reason="os_record_specific_request_uses_scoped_evidence",
            search_query="",
        )

    if _looks_like_internal_report_request(message, output_type, mode):
        return GuidancePlan(
            enabled=False,
            reason="internal_report_like_request_uses_local_context",
            search_query="",
        )

    if assistant_surface == "os_embedded" and output_type in REPORT_OUTPUTS:
        return GuidancePlan(
            enabled=False,
            reason="os_report_uses_operational_snapshot_context",
            search_query="",
        )

    if mode in {"handover", "recording", "incident_summary", "rewrite", "chronology"}:
        if _contains_any(text, GUIDANCE_KEYWORDS):
            return GuidancePlan(
                enabled=True,
                reason="guidance_keywords_in_operational_task",
                search_query=message,
            )
        return GuidancePlan(
            enabled=False,
            reason="operational_task_without_guidance_need",
            search_query="",
        )

    if _contains_any(text, GUIDANCE_KEYWORDS | INSPECTION_TRIGGER_KEYWORDS):
        return GuidancePlan(
            enabled=True,
            reason="guidance_or_inspection_keywords_present",
            search_query=message,
        )

    return GuidancePlan(
        enabled=False,
        reason="no_guidance_trigger",
        search_query="",
    )


def _build_model_plan(
    message: str,
    mode: str,
    safeguarding_level: str,
    selected_mode: str,
    has_document: bool,
    leadership_lens: bool,
    inspection_lens: bool,
    ri_lens: bool,
    output_type: str,
    assistant_surface: str,
    requires_evidence_grounding: bool,
) -> ModelPlan:
    internal_report_like = _looks_like_internal_report_request(message, output_type, mode)
    inspection_heavy = _is_inspection_heavy(message, output_type, mode)
    ri_heavy = _contains_any(message, RI_TRIGGER_KEYWORDS)
    os_record_specific = requires_evidence_grounding and _is_os_record_specific_request(message)

    if safeguarding_level == "urgent":
        return ModelPlan(model=MINI_MODEL, temperature=0.15, max_tokens=550)

    if selected_mode == "quick":
        if inspection_heavy or ri_heavy or internal_report_like or os_record_specific:
            return ModelPlan(model=STRONG_MODEL, temperature=0.15, max_tokens=900)
        return ModelPlan(model=MINI_MODEL, temperature=0.15, max_tokens=450)

    if selected_mode == "deep":
        if os_record_specific or inspection_heavy or ri_lens or internal_report_like:
            return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1900)
        if has_document and mode in {"document_review", "rewrite"}:
            return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1600)
        return ModelPlan(model=STRONG_MODEL, temperature=0.25, max_tokens=1500)

    if os_record_specific:
        return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1400)

    if inspection_lens or ri_lens:
        return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1300)

    if leadership_lens:
        return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1150)

    if has_document and mode in {"document_review", "rewrite"}:
        return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1100)

    if internal_report_like:
        return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1350)

    if assistant_surface == "os_embedded" and output_type in {
        "manager_review",
        "report",
        "structured_report",
    }:
        return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1300)

    if mode in {"incident_summary", "recording", "chronology", "handover", "factual"}:
        return ModelPlan(model=MINI_MODEL, temperature=0.1, max_tokens=750)

    if mode in DEEP_REASONING_MODES:
        return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1150)

    return ModelPlan(model=MINI_MODEL, temperature=0.2, max_tokens=900)


def _should_be_brief(
    selected_mode: str,
    output_type: str,
    mode: str,
    message: str,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []
    text = _normalise_text(message)

    if (
        " no more than " in text
        or " in 180 words " in text
        or " concise " in text
        or " briefly " in text
        or " keep it short " in text
    ):
        reasons.append("user_requested_brief_output")
        return True, reasons

    if selected_mode == "quick":
        reasons.append("quick_mode_prefers_brief_output")
        return True, reasons

    if output_type in {"handover_note"}:
        reasons.append("handover_note_prefers_brief_output")
        return True, reasons

    if mode == "handover" and not _looks_like_internal_report_request(message, output_type, mode):
        reasons.append("handover_mode_prefers_brief_output")
        return True, reasons

    reasons.append("brief_output_not_required")
    return False, reasons


def build_response_plan(
    *,
    message: str,
    mode: str,
    task_type: str,
    output_type: str,
    safeguarding_level: str,
    urgency: str,
    user_role_profile: str,
    selected_mode: str,
    has_document: bool,
    assistant_surface: str = "standalone",
    requires_evidence_grounding: bool = False,
) -> ResponsePlan:
    selected_mode = _normalise_mode(selected_mode)
    assistant_surface = _normalise_surface(assistant_surface)
    reasons: list[str] = []

    response_stance, stance_reasons = _derive_response_stance(
        mode=mode,
        task_type=task_type,
        safeguarding_level=safeguarding_level,
        role_profile=user_role_profile,
        message=message,
    )
    reasons.extend(stance_reasons)

    use_memory, memory_reasons = _should_use_memory(
        selected_mode=selected_mode,
        mode=mode,
        assistant_surface=assistant_surface,
    )
    reasons.extend(memory_reasons)

    use_retrieval, retrieval_reasons = _should_use_retrieval(
        selected_mode=selected_mode,
        mode=mode,
        task_type=task_type,
        safeguarding_level=safeguarding_level,
        has_document=has_document,
        message=message,
        output_type=output_type,
        assistant_surface=assistant_surface,
        requires_evidence_grounding=requires_evidence_grounding,
    )
    reasons.extend(retrieval_reasons)

    use_reflection, use_supervision, reflection_reasons = _should_use_reflection(
        selected_mode=selected_mode,
        mode=mode,
        task_type=task_type,
        safeguarding_level=safeguarding_level,
        message=message,
    )
    reasons.extend(reflection_reasons)

    use_leadership_lens, leadership_reasons = _should_use_leadership_lens(
        selected_mode=selected_mode,
        mode=mode,
        task_type=task_type,
        role_profile=user_role_profile,
        message=message,
    )
    reasons.extend(leadership_reasons)

    use_inspection_lens, inspection_reasons = _should_use_inspection_lens(
        selected_mode=selected_mode,
        mode=mode,
        output_type=output_type,
        message=message,
    )
    reasons.extend(inspection_reasons)

    use_ri_lens, ri_reasons = _should_use_ri_lens(
        selected_mode=selected_mode,
        role_profile=user_role_profile,
        message=message,
    )
    reasons.extend(ri_reasons)

    use_therapeutic_lens, therapeutic_reasons = _should_use_therapeutic_lens(
        selected_mode=selected_mode,
        mode=mode,
        task_type=task_type,
        message=message,
    )
    reasons.extend(therapeutic_reasons)

    guidance_plan = _build_guidance_plan(
        message=message,
        mode=mode,
        safeguarding_level=safeguarding_level,
        selected_mode=selected_mode,
        output_type=output_type,
        assistant_surface=assistant_surface,
        requires_evidence_grounding=requires_evidence_grounding,
    )

    model_plan = _build_model_plan(
        message=message,
        mode=mode,
        safeguarding_level=safeguarding_level,
        selected_mode=selected_mode,
        has_document=has_document,
        leadership_lens=use_leadership_lens,
        inspection_lens=use_inspection_lens,
        ri_lens=use_ri_lens,
        output_type=output_type,
        assistant_surface=assistant_surface,
        requires_evidence_grounding=requires_evidence_grounding,
    )

    must_lead_with_safety = safeguarding_level == "urgent" or urgency == "urgent"
    if must_lead_with_safety:
        reasons.append("urgent_context_requires_safety_first_response")

    must_preserve_source_facts = has_document or mode in DOCUMENT_FIDELITY_MODES
    if requires_evidence_grounding:
        must_preserve_source_facts = True
        reasons.append("os_evidence_grounding_requires_source_fidelity")
    elif must_preserve_source_facts:
        reasons.append("document_or_recording_context_requires_source_fidelity")

    should_distinguish_fact_from_inference = (
        output_type in RECORDING_OUTPUTS
        or safeguarding_level in {"heightened", "urgent"}
        or mode in {
            "rewrite",
            "incident_summary",
            "recording",
            "chronology",
            "handover",
            "quality_review",
            "inspection_review",
        }
        or requires_evidence_grounding
        or _contains_any(
            message,
            INSPECTION_TRIGGER_KEYWORDS | LEADERSHIP_TRIGGER_KEYWORDS | RI_TRIGGER_KEYWORDS,
        )
    )
    if should_distinguish_fact_from_inference:
        reasons.append("context_requires_fact_inference_separation")

    should_be_brief, brief_reasons = _should_be_brief(
        selected_mode=selected_mode,
        output_type=output_type,
        mode=mode,
        message=message,
    )
    reasons.extend(brief_reasons)

    return ResponsePlan(
        selected_mode=selected_mode,
        response_stance=response_stance,
        should_use_memory=use_memory,
        should_use_retrieval=use_retrieval,
        should_use_reflection=use_reflection,
        should_use_supervision=use_supervision,
        should_use_leadership_lens=use_leadership_lens,
        should_use_inspection_lens=use_inspection_lens,
        should_use_ri_lens=use_ri_lens,
        should_use_therapeutic_lens=use_therapeutic_lens,
        should_use_guidance_search=guidance_plan.enabled,
        must_lead_with_safety=must_lead_with_safety,
        must_preserve_source_facts=must_preserve_source_facts,
        should_distinguish_fact_from_inference=should_distinguish_fact_from_inference,
        should_be_brief=should_be_brief,
        assistant_surface=assistant_surface,
        requires_evidence_grounding=requires_evidence_grounding,
        guidance_plan=guidance_plan,
        model_plan=model_plan,
        reasons=reasons,
    )