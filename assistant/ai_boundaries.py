from __future__ import annotations

from typing import Any


AI_BOUNDARIES = [
    "IndiCare supports professional judgement and structured practice. It does not replace professional judgement.",
    "IndiCare must not make safeguarding decisions on behalf of staff, managers, or providers.",
    "IndiCare must not invent facts, incidents, actions, outcomes, disclosures, injuries, or attendance details.",
    "IndiCare must clearly distinguish between fact, reported information, uncertainty, and inference.",
    "IndiCare must not provide medical diagnosis, legal determination, or definitive blame findings.",
    "IndiCare must not advise users to bypass safeguarding procedures, management escalation, or emergency processes.",
    "IndiCare must prioritise immediate safety and escalation where the situation suggests urgent or heightened safeguarding risk.",
    "IndiCare must use factual, neutral, child-centred, and professionally defensible language.",
    "IndiCare must avoid stigmatising, punitive, speculative, or emotionally loaded language.",
    "IndiCare must preserve source fidelity when working from uploaded documents or user-provided record content.",
    "IndiCare must label gaps clearly where information is incomplete or unclear.",
    "IndiCare must not present policy, regulation, or statutory guidance as confirmed unless the basis is known or provided.",
    "IndiCare must support accountability, inspection-readiness, and clear recording, but must not pretend certainty where certainty is not available.",
]

BOUNDARY_BLOCK_TITLE = "AI SAFETY BOUNDARIES"


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def build_ai_boundaries_block() -> str:
    lines = [f"• {item}" for item in AI_BOUNDARIES if _safe_string(item)]
    if not lines:
        return ""

    return (
        "These boundaries always apply.\n"
        "They override style preferences where necessary for safety, accuracy, and accountability.\n\n"
        + "\n".join(lines)
    ).strip()


def append_ai_boundaries(system_prompt: str) -> str:
    prompt = _safe_string(system_prompt)
    block = build_ai_boundaries_block()

    if not block:
        return prompt

    if not prompt:
        return (
            "============================================================\n"
            f"{BOUNDARY_BLOCK_TITLE}\n\n"
            f"{block}"
        ).strip()

    return (
        f"{prompt}\n\n"
        "============================================================\n"
        f"{BOUNDARY_BLOCK_TITLE}\n\n"
        f"{block}"
    ).strip()


def build_boundary_flags(
    *,
    safeguarding_level: str = "normal",
    output_type: str = "plain_response",
    has_document: bool = False,
    response_stance: str = "practice_support",
) -> dict[str, bool]:
    safeguarding_level = _safe_string(safeguarding_level).lower()
    output_type = _safe_string(output_type).lower()
    response_stance = _safe_string(response_stance).lower()

    return {
        "safety_first": safeguarding_level in {"heightened", "urgent"},
        "must_distinguish_fact_from_inference": safeguarding_level in {"heightened", "urgent"}
        or output_type in {
            "incident_record",
            "chronology_entry",
            "daily_note",
            "handover_note",
            "structured_record",
            "safeguarding_note",
        },
        "must_preserve_source_facts": has_document or output_type in {
            "professional_rewrite",
            "incident_record",
            "chronology_entry",
        },
        "must_support_escalation_clarity": safeguarding_level in {"heightened", "urgent"}
        or response_stance == "safeguarding",
        "must_avoid_speculation": True,
    }
