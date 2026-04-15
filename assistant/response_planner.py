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
    "procedure",
    "quality standard",
    "quality standards",
    "children's homes regulations",
    "childrens homes regulations",
    "sccif",
}

LEADERSHIP_TRIGGER_KEYWORDS = {
    "registered manager",
    "manager review",
    "manager oversight",
    "audit",
    "quality assurance",
    "qa",
    "inspection",
    "ofsted",
    "responsible individual",
    "provider oversight",
    "governance",
    "action plan",
    "service issue",
    "pattern",
}

DOCUMENT_HEAVY_MODES = {
    "rewrite",
    "document_review",
    "manager_review",
    "support_planning",
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
}

PLANNING_TASKS = {
    "planning",
}

REFLECTIVE_TASKS = {
    "reflection",
}

REPORT_OUTPUTS = {
    "report",
    "structured_report",
    "email_report",
}

REPORT_MODES = {
    "manager_review",
    "document_review",
}

FAST_OPERATIONAL_MODES = {
    "handover",
    "recording",
    "incident_summary",
    "rewrite",
    "chronology",
    "practical",
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
    should_use_guidance_search: bool = False
    must_lead_with_safety: bool = False
    must_preserve_source_facts: bool = False
    should_distinguish_fact_from_inference: bool = False
    should_be_brief: bool = False
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
    return "balanced"


def _normalise_text(value: Any) -> str:
    return f" {_safe_string(value).lower()} "


def _contains_any(text: str, keywords: set[str]) -> bool:
    lower = _normalise_text(text)
    return any(keyword.lower() in lower for keyword in keywords)


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
        "regulation 45",
        "annual report",
        "annual overview",
        "yearly report",
        "yearly overview",
    }
    return any(term in text for term in report_terms)


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

    if mode in {"recording", "incident_summary", "chronology", "handover", "rewrite"}:
        reasons.append("recording_or_rewrite_mode_prefers_documentation_stance")
        return "documentation", reasons

    if task_type in REVIEW_TASKS or mode == "manager_review":
        reasons.append("review_task_prefers_management_stance")
        return "management", reasons

    if task_type in PLANNING_TASKS or mode == "support_planning":
        reasons.append("planning_task_prefers_management_stance")
        return "management", reasons

    if task_type in REFLECTIVE_TASKS or mode in {"reflective", "supervision"}:
        reasons.append("reflective_task_prefers_reflective_stance")
        return "reflective", reasons

    if role_profile == "provider":
        reasons.append("provider_role_prefers_management_stance")
        return "management", reasons

    if _contains_any(message, GUIDANCE_KEYWORDS):
        reasons.append("guidance_keywords_present_prefers_practice_support")
        return "practice_support", reasons

    reasons.append("default_practice_support_stance")
    return "practice_support", reasons


def _should_use_memory(
    selected_mode: str,
    mode: str,
) -> tuple[bool, list[str]]:
    reasons: list[str] = []

    if selected_mode == "quick":
        reasons.append("quick_mode_disables_memory")
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
) -> tuple[bool, list[str]]:
    reasons: list[str] = []

    if has_document:
        reasons.append("uploaded_document_present_suppresses_background_retrieval")
        return False, reasons

    if selected_mode == "quick":
        reasons.append("quick_mode_disables_retrieval")
        return False, reasons

    if safeguarding_level in {"heightened", "urgent"} and task_type == "recording":
        reasons.append("high_safeguarding_recording_prefers_direct_response_over_retrieval")
        return False, reasons

    if _looks_like_internal_report_request(message, output_type, mode):
        reasons.append("internal_report_like_request_prefers_local_context_over_retrieval")
        return False, reasons

    if _contains_any(message, GUIDANCE_KEYWORDS):
        reasons.append("guidance_keywords_enable_retrieval")
        return True, reasons

    if task_type in (REVIEW_TASKS | PLANNING_TASKS):
        reasons.append("review_or_planning_task_enables_retrieval")
        return True, reasons

    if mode in {"factual", "support_planning", "manager_review", "supervision", "general_practice"}:
        reasons.append("mode_supports_retrieval")
        return True, reasons

    reasons.append("retrieval_not_needed")
    return False, reasons


def _should_use_reflection(
    selected_mode: str,
    mode: str,
    task_type: str,
    safeguarding_level: str,
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

    if mode in {"reflective", "manager_review"} or task_type in {"reflection", "review", "planning"}:
        reasons.append("reflective_review_or_planning_task_enables_reflection")
        return True, selected_mode == "deep", reasons

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

    if role_profile == "manager" and task_type in {"review", "planning", "reflection", "document_work"}:
        reasons.append("manager_role_with_review_planning_context_enables_leadership_lens")
        return True, reasons

    if selected_mode == "quick":
        enabled = _contains_any(message, LEADERSHIP_TRIGGER_KEYWORDS)
        reasons.append("quick_mode_uses_keyword_trigger_for_leadership_lens")
        return enabled, reasons

    if mode in {"manager_review", "supervision", "support_planning", "document_review", "reflective", "factual", "general_practice"}:
        reasons.append("mode_enables_leadership_lens")
        return True, reasons

    if _contains_any(message, LEADERSHIP_TRIGGER_KEYWORDS):
        reasons.append("leadership_keywords_enable_leadership_lens")
        return True, reasons

    reasons.append("leadership_lens_not_needed")
    return False, reasons


def _build_guidance_plan(
    message: str,
    mode: str,
    safeguarding_level: str,
    selected_mode: str,
    output_type: str,
) -> GuidancePlan:
    text = _safe_string(message).lower()

    if selected_mode == "quick":
        return GuidancePlan(enabled=False, reason="quick_mode", search_query="")

    if safeguarding_level in {"heightened", "urgent"}:
        return GuidancePlan(enabled=False, reason="safeguarding_override", search_query="")

    if _looks_like_internal_report_request(message, output_type, mode):
        return GuidancePlan(
            enabled=False,
            reason="internal_report_like_request_uses_local_context",
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

    if _contains_any(text, GUIDANCE_KEYWORDS):
        return GuidancePlan(
            enabled=True,
            reason="guidance_keywords_present",
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
    output_type: str,
) -> ModelPlan:
    internal_report_like = _looks_like_internal_report_request(message, output_type, mode)

    if safeguarding_level == "urgent":
        return ModelPlan(model=MINI_MODEL, temperature=0.15, max_tokens=500)

    if selected_mode == "quick":
        if internal_report_like:
            return ModelPlan(model=MINI_MODEL, temperature=0.15, max_tokens=500)
        return ModelPlan(model=MINI_MODEL, temperature=0.15, max_tokens=350)

    if selected_mode == "deep":
        if internal_report_like:
            return ModelPlan(model=STRONG_MODEL, temperature=0.25, max_tokens=1600)
        return ModelPlan(model=STRONG_MODEL, temperature=0.3, max_tokens=1200)

    if leadership_lens:
        return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1000)

    if has_document and mode in {"document_review", "rewrite"}:
        return ModelPlan(model=STRONG_MODEL, temperature=0.2, max_tokens=1000)

    if internal_report_like:
        return ModelPlan(model=MINI_MODEL, temperature=0.2, max_tokens=1200)

    if mode in {"incident_summary", "recording", "chronology", "handover"}:
        return ModelPlan(model=MINI_MODEL, temperature=0.1, max_tokens=600)

    if mode in DEEP_REASONING_MODES:
        return ModelPlan(model=MINI_MODEL, temperature=0.2, max_tokens=1000)

    return ModelPlan(model=MINI_MODEL, temperature=0.2, max_tokens=850)


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
) -> ResponsePlan:
    selected_mode = _normalise_mode(selected_mode)
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
    )
    reasons.extend(retrieval_reasons)

    use_reflection, use_supervision, reflection_reasons = _should_use_reflection(
        selected_mode=selected_mode,
        mode=mode,
        task_type=task_type,
        safeguarding_level=safeguarding_level,
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

    guidance_plan = _build_guidance_plan(
        message=message,
        mode=mode,
        safeguarding_level=safeguarding_level,
        selected_mode=selected_mode,
        output_type=output_type,
    )

    model_plan = _build_model_plan(
        message=message,
        mode=mode,
        safeguarding_level=safeguarding_level,
        selected_mode=selected_mode,
        has_document=has_document,
        leadership_lens=use_leadership_lens,
        output_type=output_type,
    )

    must_lead_with_safety = safeguarding_level == "urgent" or urgency == "urgent"
    if must_lead_with_safety:
        reasons.append("urgent_context_requires_safety_first_response")

    must_preserve_source_facts = has_document or mode in DOCUMENT_FIDELITY_MODES
    if must_preserve_source_facts:
        reasons.append("document_or_recording_context_requires_source_fidelity")

    should_distinguish_fact_from_inference = (
        output_type in RECORDING_OUTPUTS
        or safeguarding_level in {"heightened", "urgent"}
        or mode in {"rewrite", "incident_summary", "recording", "chronology", "handover"}
    )
    if should_distinguish_fact_from_inference:
        reasons.append("recording_or_safeguarding_context_requires_fact_inference_separation")

    should_be_brief = selected_mode == "quick" or output_type in {"handover_note", "chronology_entry"}
    if should_be_brief:
        reasons.append("quick_or_operational_output_prefers_brief_response")

    return ResponsePlan(
        selected_mode=selected_mode,
        response_stance=response_stance,
        should_use_memory=use_memory,
        should_use_retrieval=use_retrieval,
        should_use_reflection=use_reflection,
        should_use_supervision=use_supervision,
        should_use_leadership_lens=use_leadership_lens,
        should_use_guidance_search=guidance_plan.enabled,
        must_lead_with_safety=must_lead_with_safety,
        must_preserve_source_facts=must_preserve_source_facts,
        should_distinguish_fact_from_inference=should_distinguish_fact_from_inference,
        should_be_brief=should_be_brief,
        guidance_plan=guidance_plan,
        model_plan=model_plan,
        reasons=reasons,
    )
