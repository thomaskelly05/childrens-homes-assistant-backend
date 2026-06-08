"""Shared ORB Residential quality layer — child-centred, therapeutic, Ofsted-ready.

Reusable by Voice, Dictate, Chat, Write, Templates and Outputs.
Wraps existing heuristic checks; does not replace professional judgement.
"""

from __future__ import annotations

from typing import Any, Literal

from schemas.orb_dictate import OrbDictateQualityChecks
from services.orb_dictate_quality import compute_quality_checks
from services.orb_dictate_template_registry import get_dictate_template
from services.orb_recording_framework_service import framework_missing_checks, resolve_record_type
from services.orb_recording_contract_service import (
    incident_missing_checklist,
    is_incident_report_draft_request,
)

OrbResidentialSurface = Literal["voice", "dictate", "chat", "write", "template", "output"]

# Shared capture prompts — used when key information is missing before finalising.
SHARED_CAPTURE_PROMPTS: tuple[str, ...] = (
    "What happened?",
    "When did it happen?",
    "Who was present?",
    "What was the child's presentation?",
    "What did the child say?",
    "What was the adult response?",
    "What action was taken?",
    "Were there safeguarding concerns?",
    "Was a manager informed?",
    "Are follow-up actions needed?",
    "Is the record factual?",
    "Is the language respectful?",
    "Is the child central?",
)

_QUALITY_FIELD_PROMPTS: dict[str, str] = {
    "child_voice": "What did the child say, show or communicate? Include direct quotes where possible.",
    "safeguarding": "Were there safeguarding concerns? What was seen, disclosed or suspected?",
    "manager_oversight": "Was a manager informed? Is manager review or sign-off needed?",
    "staff_response": "What was the adult response and support offered?",
    "factual_clarity": "Can you describe observable facts — what was seen and heard, by whom, when?",
    "non_judgemental_language": "Is the wording factual and respectful, without judgemental labels?",
    "chronology_relevance": "What was the sequence of events? Include approximate times.",
    "evidence_of_action": "What actions were taken and who was informed?",
    "follow_up_review_date": "Are follow-up actions or review dates needed?",
    "impact": "What was the outcome or impact at the time?",
    "professional_curiosity": "What questions remain? What might need further exploration?",
    "plan_risk_review": "Does this affect the care plan, placement plan or risk assessment?",
}


def build_missing_capture_prompts(
    quality: OrbDictateQualityChecks,
    *,
    note_type: str = "daily_record",
    include_shared: bool = True,
) -> list[str]:
    """Return prompts for missing quality dimensions and template-required sections."""
    prompts: list[str] = []
    checks = quality.model_dump()

    for field, status in checks.items():
        if field == "recording_quality":
            continue
        if status in {"missing", "weak", "review", "needs_review"}:
            prompt = _QUALITY_FIELD_PROMPTS.get(field)
            if prompt and prompt not in prompts:
                prompts.append(prompt)

    if include_shared and not prompts:
        prompts.extend(SHARED_CAPTURE_PROMPTS[:5])

    if note_type == "incident_record":
        for item in incident_missing_checklist()[:8]:
            if item not in prompts:
                prompts.append(item)

    try:
        template = get_dictate_template(note_type)  # type: ignore[arg-type]
        for section in template.sections:
            if section.required and section.prompts:
                for p in section.prompts[:1]:
                    if p not in prompts:
                        prompts.append(p)
    except (KeyError, ValueError):
        pass

    return prompts[:12]


def ofsted_readiness_summary(quality: OrbDictateQualityChecks, note_type: str) -> dict[str, Any]:
    """Quiet Ofsted-readiness indicators — not a grade prediction."""
    checks = quality.model_dump()
    strengths: list[str] = []
    gaps: list[str] = []

    if checks.get("child_voice") in {"present", "good"}:
        strengths.append("Child voice represented")
    else:
        gaps.append("Child voice missing or weak")

    if checks.get("factual_clarity") in {"present", "good"}:
        strengths.append("Factual clarity present")
    else:
        gaps.append("Strengthen observable facts and chronology")

    if checks.get("safeguarding") in {"present", "good"}:
        strengths.append("Safeguarding thinking visible")
    elif note_type in {"incident_record", "safeguarding_concern_record", "missing_episode_note"}:
        gaps.append("Safeguarding detail needed for this record type")

    if checks.get("manager_oversight") in {"present", "good"}:
        strengths.append("Manager oversight referenced")
    elif note_type in {"manager_oversight_note", "incident_record", "investigation_meeting"}:
        gaps.append("Manager oversight should be documented")

    if checks.get("non_judgemental_language") == "review":
        gaps.append("Review judgemental or loaded language")

    reg_useful = note_type in {
        "reg44_prep_note",
        "ofsted_evidence_summary",
        "manager_oversight_note",
        "placement_progress_summary",
    }

    return {
        "ofsted_ready": len(gaps) == 0 and quality.recording_quality == "good",
        "reg44_reg45_useful": reg_useful,
        "strengths": strengths,
        "gaps": gaps,
        "recording_quality": quality.recording_quality,
    }


def run_residential_quality_check(
    text: str,
    *,
    note_type: str = "daily_record",
    record_type_id: str | None = None,
    template_id: str | None = None,
    surface: OrbResidentialSurface = "dictate",
) -> dict[str, Any]:
    """Run shared quality checks for any ORB Residential surface."""
    body = (text or "").strip()
    quality = compute_quality_checks(body, note_type)
    missing_prompts = build_missing_capture_prompts(quality, note_type=note_type)
    ofsted = ofsted_readiness_summary(quality, note_type)

    record_type = resolve_record_type(
        record_type_id=record_type_id,
        template_id=template_id,
        note_type=note_type,
    )
    framework_gaps = framework_missing_checks(record_type, body) if body else []

    incident_contract_prompts: list[str] = []
    if note_type == "incident_record" or is_incident_report_draft_request(body):
        incident_contract_prompts = incident_missing_checklist()

    manager_prompt: str | None = None
    if quality.manager_oversight in {"missing", "weak"} and note_type in {
        "incident_record",
        "manager_oversight_note",
        "investigation_meeting",
        "missing_episode_note",
    }:
        manager_prompt = _QUALITY_FIELD_PROMPTS["manager_oversight"]

    return {
        "surface": surface,
        "note_type": note_type,
        "quality_checks": quality.model_dump(),
        "missing_prompts": missing_prompts,
        "incident_missing_checklist": incident_contract_prompts,
        "framework_gaps": framework_gaps,
        "ofsted_readiness": ofsted,
        "manager_oversight_prompt": manager_prompt,
        "shared_capture_prompts": list(SHARED_CAPTURE_PROMPTS),
        "child_centred": quality.child_voice in {"present", "good"},
        "therapeutic_ready": quality.non_judgemental_language != "review"
        and quality.recording_tone in {"present", "good"},
    }


orb_residential_quality_service = type(
    "OrbResidentialQualityService",
    (),
    {
        "SHARED_CAPTURE_PROMPTS": SHARED_CAPTURE_PROMPTS,
        "build_missing_capture_prompts": staticmethod(build_missing_capture_prompts),
        "ofsted_readiness_summary": staticmethod(ofsted_readiness_summary),
        "run_residential_quality_check": staticmethod(run_residential_quality_check),
        "compute_quality_checks": staticmethod(compute_quality_checks),
    },
)()
