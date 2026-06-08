"""ORB Dictate Studio — AI document editing with preserve-facts guardrails."""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from schemas.data_protection import DataClassification
from schemas.orb_dictate import (
    OrbDictateEditRequest,
    OrbDictateEditResponse,
    OrbDictateQualityChecks,
)
from services.orb_dictate_quality import compute_quality_checks
from services.ai_external_call_governance import (
    FEATURE_DICTATE_EDIT,
    redact_plain_text,
    try_governed_draft_text,
)
from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_dictate_service import STANDALONE_BOUNDARY, _dictate_brain_metadata, _finalize_dictate_text
from services.orb_document_brain_adapter_service import orb_document_brain_adapter_service
from services.recording_intelligence_service import recording_intelligence_service

logger = logging.getLogger("indicare.orb_dictate_edit")

EDIT_MODE_LABELS: dict[str, str] = {
    "spelling_grammar": "Spelling & grammar",
    "therapeutic_rewrite": "Therapeutic rewrite",
    "ofsted_ready": "Ofsted-ready",
    "factual_tone": "Factual tone",
    "professional_language": "Professional language",
    "child_voice": "Child voice",
    "safeguarding_lens": "Safeguarding considerations",
    "manager_oversight": "Manager oversight",
    "chronology_conversion": "Chronology entry",
    "handover_conversion": "Handover",
    "concise_summary": "Concise summary",
    "action_plan": "Action plan",
    "ri_summary": "RI summary",
    "missing_information": "Missing information review",
    "recording_quality_review": "Recording quality review",
    "less_judgemental": "Less judgemental",
    "parent_friendly": "Parent-friendly summary",
    "sccif_lens": "SCCIF lens",
    "professional_curiosity": "Professional curiosity",
    "evidence_of_impact": "Evidence of impact",
    "manager_note": "Manager note",
    "safeguarding_concern": "Safeguarding concern",
    "supervision_reflection": "Supervision reflection",
}

MODE_INSTRUCTIONS: dict[str, str] = {
    "spelling_grammar": (
        "Correct spelling, grammar and punctuation only. Preserve meaning and style. "
        "Do not rewrite tone unless required for correctness. Preserve names, dates and direct quotes exactly. "
        "Flag uncertain proper nouns in warnings rather than changing them."
    ),
    "therapeutic_rewrite": (
        "Use therapeutic, child-centred, non-judgemental language. Soften judgemental wording. "
        "Add prompts for child voice where missing — use placeholders, not invented quotes."
    ),
    "ofsted_ready": (
        "Improve evidence structure for inspection preparation. Add prompts for impact, oversight and child voice. "
        "Do not claim evidence exists if not in the original. Use [evidence needed] placeholders."
    ),
    "factual_tone": (
        "Strengthen factual, observable language. Separate fact from interpretation. "
        "Replace opinion with observable behaviour unless quoting."
    ),
    "professional_language": (
        "Elevate to professional residential childcare recording standards. Clear, respectful, precise wording."
    ),
    "child_voice": (
        "Add or strengthen child voice sections. Use [child's words not stated] where quotes are missing. "
        "Never invent direct quotes."
    ),
    "safeguarding_lens": (
        "Add safeguarding consideration prompts and escalation notes where relevant. "
        "Do not make threshold decisions unless explicitly in the original. Suggest DSL/manager review where appropriate."
    ),
    "manager_oversight": (
        "Add manager oversight, notification and review prompts where relevant. Use placeholders if not stated."
    ),
    "chronology_conversion": (
        "Restructure as a chronology entry with clear sequence and times where known. Neutral tone."
    ),
    "handover_conversion": (
        "Restructure as a concise handover note: key facts, risks, actions, follow-up for incoming staff."
    ),
    "concise_summary": (
        "Make shorter while preserving all factual content. Remove repetition, not facts."
    ),
    "action_plan": (
        "Extract or structure clear actions with owners and timeframes where stated; "
        "use [action owner not stated] placeholders otherwise."
    ),
    "ri_summary": (
        "Create a concise summary suitable for a Responsible Individual — key risks, impact, oversight, follow-up."
    ),
    "missing_information": (
        "Identify gaps and add a 'Follow-up questions for staff' section with specific questions. "
        "Do not fill gaps with invented facts."
    ),
    "recording_quality_review": (
        "Improve recording quality: clarity, chronology, child voice, non-judgemental tone. "
        "Flag weak areas in warnings."
    ),
    "less_judgemental": (
        "Remove or soften judgemental, blaming or emotionally loaded language. Keep facts intact."
    ),
    "parent_friendly": (
        "Where appropriate, produce clearer parent-friendly wording while keeping factual accuracy. "
        "Avoid jargon; do not oversimplify safeguarding thresholds."
    ),
    "sccif_lens": (
        "Add SCCIF/Quality Standards evidence prompts. Do not invent compliance evidence."
    ),
    "professional_curiosity": (
        "Add professional curiosity prompts and reflective questions without inventing analysis."
    ),
    "evidence_of_impact": (
        "Strengthen impact/outcome language where facts support it; add [impact not stated] where missing."
    ),
    "manager_note": "Restructure as a manager oversight note with clear accountability and follow-up.",
    "safeguarding_concern": (
        "Restructure as safeguarding concern wording — factual, neutral, no findings unless stated."
    ),
    "supervision_reflection": "Restructure as supervision reflection — learning, support, actions.",
}

JUDGEMENTAL_RE = re.compile(
    r"\b(manipulative|naughty|attention[\s-]?seeking|refused|kicked off|bad behaviour|"
    r"non[\s-]?compliant|chose to behave)\b",
    re.I,
)


def _resolve_mode(request: OrbDictateEditRequest) -> str:
    if request.mode:
        return request.mode
    instruction = (request.instruction or "").lower()
    for keyword, mode in (
        ("spelling", "spelling_grammar"),
        ("grammar", "spelling_grammar"),
        ("therapeutic", "therapeutic_rewrite"),
        ("ofsted", "ofsted_ready"),
        ("sccif", "sccif_lens"),
        ("factual", "factual_tone"),
        ("child voice", "child_voice"),
        ("safeguard", "safeguarding_lens"),
        ("manager", "manager_oversight"),
        ("chronolog", "chronology_conversion"),
        ("handover", "handover_conversion"),
        ("shorter", "concise_summary"),
        ("concise", "concise_summary"),
        ("action plan", "action_plan"),
        ("missing", "missing_information"),
        ("judgemental", "less_judgemental"),
        ("professional", "professional_language"),
    ):
        if keyword in instruction:
            return mode
    return "professional_language"


def _fallback_edit(request: OrbDictateEditRequest, mode: str) -> OrbDictateEditResponse:
    text = (request.document_text or "").strip()
    warnings: list[str] = []
    change_summary: list[str] = []
    revised = text

    if mode == "spelling_grammar":
        change_summary.append("Offline mode: limited spelling check — review manually.")
        warnings.append("Full spelling and grammar check requires ORB connection.")
    elif mode == "missing_information":
        intel = recording_intelligence_service.analyse(text)
        follow_up = "\n".join(f"- {q}" for q in intel.evidence_gaps[:8])
        if not follow_up:
            follow_up = (
                "- What was the child's voice?\n"
                "- What action was taken?\n"
                "- Was the manager informed?\n"
                "- Was the plan updated?\n"
                "- What changed as a result?"
            )
        revised = f"{text}\n\n## Follow-up questions for staff\n\n{follow_up}\n"
        change_summary.append("Added follow-up questions section.")
    elif mode in {"ofsted_ready", "sccif_lens"}:
        revised = (
            f"{text}\n\n## Inspection evidence prompts\n\n"
            "- [Child impact — describe observable impact on the child]\n"
            "- [Oversight — manager review/notification if applicable]\n"
            "- [Evidence link — map to your Quality Standards where relevant]\n"
        )
        change_summary.append("Added inspection evidence placeholders.")
        warnings.append("Placeholders added — do not treat as confirmed evidence.")
    elif mode == "therapeutic_rewrite" and JUDGEMENTAL_RE.search(text):
        revised = JUDGEMENTAL_RE.sub("[review wording]", text)
        change_summary.append("Flagged potentially judgemental phrases for review.")
    elif mode == "child_voice" and '"' not in text and "said" not in text.lower():
        revised = f"{text}\n\n## Child voice\n\n[Child's words not stated — add direct quotes where known]\n"
        change_summary.append("Added child voice placeholder section.")
        warnings.append("No child voice was included in the original note.")
    elif mode == "manager_oversight":
        revised = f"{text}\n\n## Manager oversight\n\n[Manager notification/review — confirm if applicable]\n"
        change_summary.append("Added manager oversight placeholder.")
    elif mode == "safeguarding_lens":
        revised = f"{text}\n\n## Safeguarding considerations\n\n[Document concerns factually — escalate to DSL/manager as per policy]\n"
        change_summary.append("Added safeguarding consideration prompts.")
    elif mode == "concise_summary":
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        revised = "\n".join(lines[: min(len(lines), 40)])
        change_summary.append("Trimmed empty lines; full concise rewrite needs ORB connection.")
    else:
        change_summary.append(f"Applied {EDIT_MODE_LABELS.get(mode, mode)} guidance offline — review carefully.")

    intel_packet = indicare_intelligence_core_service.build_intelligence_packet(
        request.document_text,
        mode=request.note_type,
    )
    revised, intel_meta = _finalize_dictate_text(
        text=revised,
        note_type=request.note_type,
        intel_packet=intel_packet,
    )
    quality = compute_quality_checks(revised, request.note_type)
    return OrbDictateEditResponse(
        revised_text=revised,
        change_summary=change_summary,
        warnings=warnings,
        quality_checks=quality,
        suggested_actions=["Review revised draft before use", "Confirm facts against source transcript"],
        version_label=EDIT_MODE_LABELS.get(mode, mode),
        standalone_boundary=STANDALONE_BOUNDARY,
        brain_metadata=_dictate_brain_metadata(
            note_type=request.note_type,
            transcript_text=request.document_text,
            feature="dictate_edit",
            intelligence_meta=intel_meta,
        ),
    )


def _build_edit_prompt(request: OrbDictateEditRequest, mode: str) -> tuple[str, str]:
    mode_instruction = MODE_INSTRUCTIONS.get(mode, request.instruction or "Improve the document professionally.")
    intel = recording_intelligence_service.analyse(request.document_text)
    intel_block = recording_intelligence_service.build_prompt_block(request.document_text)
    doc_ctx = orb_document_brain_adapter_service.build_document_brain_context(
        request.document_text,
        mode=request.note_type,
        feature="dictate_edit",
        note_type=request.note_type,
    )
    intelligence_block = doc_ctx.get("intelligence_summary", {})
    if intelligence_block:
        intel_block += (
            "\n\nIndiCare Intelligence context (use for quality — do not invent facts):\n"
            + str(intelligence_block)
        )

    investigation_rules = ""
    if request.note_type == "investigation_meeting":
        investigation_rules = (
            "\nInvestigation rules: neutral language; no findings of fact unless explicitly stated; "
            "retain direct quotes; avoid conclusions."
        )

    preserve = (
        "Preserve all factual content from the original. "
        "Do not add events, disclosures, injuries, actions or decisions that were not provided. "
        "Use British English. Use [not stated] or similar placeholders where information is missing. "
        "Distinguish fact from interpretation. Keep language non-judgemental. "
        "This is draft wording for adult review — not a formal submission."
    )
    if request.preserve_facts:
        preserve += " Never invent facts, quotes, times, names or outcomes."

    system = (
        "You are ORB Dictate Studio for UK residential children's homes. "
        "Revise professional recording documents according to the instruction. "
        "Return JSON only with keys: revised_text (string), change_summary (array of strings), "
        "warnings (array of strings), suggested_actions (array of strings). "
        f"{preserve}"
        f"{investigation_rules}"
    )
    user = (
        f"Edit mode: {EDIT_MODE_LABELS.get(mode, mode)}\n"
        f"Note type: {request.note_type}\n"
        f"Instruction: {request.instruction or mode_instruction}\n\n"
        f"Mode guidance:\n{mode_instruction}\n\n"
        f"{intel_block}\n\n"
        f"Evidence gaps to consider (do not invent answers):\n"
        + "\n".join(f"- {g}" for g in intel.evidence_gaps[:6])
        + "\n\n"
        f"Document to revise:\n\n{request.document_text[:100_000]}"
    )
    return system, user


def edit_dictate_document(
    request: OrbDictateEditRequest,
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
) -> OrbDictateEditResponse:
    text = (request.document_text or "").strip()
    if not text:
        raise ValueError("document_text is required.")

    mode = _resolve_mode(request)
    system, user = _build_edit_prompt(request, mode)
    redacted_user, _ = redact_plain_text(user, mode="strict")

    gateway_response = try_governed_draft_text(
        feature=FEATURE_DICTATE_EDIT,
        system_prompt=system,
        prompt=redacted_user,
        model=os.environ.get("ORB_DICTATE_MODEL", "gpt-4.1-mini"),
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=DataClassification.CONFIDENTIAL_CHILD,
        metadata={"route": "orb_dictate_edit_service.edit_dictate_document", "mode": mode},
    )
    if gateway_response is None:
        return _fallback_edit(request, mode)

    try:
        raw = gateway_response.text or "{}"
        parsed: dict[str, Any] = json.loads(raw)
    except Exception:
        logger.exception("ORB Dictate edit failed — using fallback")
        return _fallback_edit(request, mode)

    revised = str(parsed.get("revised_text") or parsed.get("document") or "").strip()
    if not revised:
        return _fallback_edit(request, mode)

    change_summary = [str(s).strip() for s in (parsed.get("change_summary") or []) if str(s).strip()][:12]
    warnings = [str(w).strip() for w in (parsed.get("warnings") or []) if str(w).strip()][:12]
    suggested_actions = [
        str(a).strip() for a in (parsed.get("suggested_actions") or []) if str(a).strip()
    ][:10]

    if not change_summary:
        change_summary = [f"Applied {EDIT_MODE_LABELS.get(mode, mode)}"]

    intel_packet = indicare_intelligence_core_service.build_intelligence_packet(
        request.document_text,
        mode=request.note_type,
    )
    revised, intel_meta = _finalize_dictate_text(
        text=revised,
        note_type=request.note_type,
        intel_packet=intel_packet,
    )
    quality: OrbDictateQualityChecks = compute_quality_checks(revised, request.note_type)

    return OrbDictateEditResponse(
        revised_text=revised,
        change_summary=change_summary,
        warnings=warnings,
        quality_checks=quality,
        suggested_actions=suggested_actions or ["Review revised draft before saving"],
        version_label=EDIT_MODE_LABELS.get(mode, mode),
        standalone_boundary=STANDALONE_BOUNDARY,
        brain_metadata=_dictate_brain_metadata(
            note_type=request.note_type,
            transcript_text=request.document_text,
            feature="dictate_edit",
            intelligence_meta=intel_meta,
        ),
    )
