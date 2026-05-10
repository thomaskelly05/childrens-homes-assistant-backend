from __future__ import annotations

"""
assistant/explainability_builder.py

Elite explainability and audit-transparency layer for IndiCare Assistant.

Purpose:
- Provide user-facing transparency without exposing internal chain-of-thought
- Provide audit-facing metadata for governance, QA, and safeguarding review
- Explain what influenced the response
- Surface evidence limitations
- Check citation quality
- Support standalone and OS-embedded behaviour
- Support inspection, Reg 45, management, safeguarding and reflective practice outputs

Important:
This module must never expose private model reasoning.
It provides safe, professional transparency only.
"""

import re
from dataclasses import dataclass, field
from typing import Any


CONFIDENCE_ORDER = {
    "low": 1,
    "working": 2,
    "medium": 3,
    "high": 4,
}

EVIDENCE_STATUS_ORDER = {
    "missing_required_evidence": 0,
    "none": 1,
    "limited": 2,
    "moderate": 3,
    "strong": 4,
}

RECORD_CITATION_PATTERN = re.compile(
    r"\[[A-Za-z][A-Za-z0-9_\-]*:\d+[A-Za-z0-9_\-]*\]"
)

BROKEN_CITATION_PATTERN = re.compile(
    r"\[[A-Za-z][A-Za-z0-9_\-]*:\s*\]"
)


@dataclass
class ExplainabilityPayload:
    detected_mode: str = "guidance"
    response_mode: str = "default"
    assistant_surface: str = "standalone"
    role_profile: str = "staff"
    safeguarding_level: str = "normal"
    evidence_status: str = "none"
    confidence: str = "working"

    what_was_used: list[str] = field(default_factory=list)
    what_was_not_used: list[str] = field(default_factory=list)
    source_basis: list[str] = field(default_factory=list)
    lenses_used: list[str] = field(default_factory=list)
    limitations: list[str] = field(default_factory=list)
    review_points: list[str] = field(default_factory=list)

    citation_quality: dict[str, Any] = field(default_factory=dict)
    user_facing_summary: str = ""
    audit_summary: str = ""
    audit_flags: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"1", "true", "yes", "y", "on"}:
            return True
        if lowered in {"0", "false", "no", "n", "off"}:
            return False
    return bool(value)


def _dedupe(items: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []

    for item in items:
        text = _safe_string(item)
        if not text:
            continue

        key = text.lower()
        if key in seen:
            continue

        seen.add(key)
        result.append(text)

    return result


def _count_items(value: Any) -> int:
    if isinstance(value, (list, tuple, set, dict)):
        return len(value)
    return 0


def _normalise_confidence(value: Any) -> str:
    confidence = _safe_string(value).lower()
    if confidence in CONFIDENCE_ORDER:
        return confidence
    return "working"


def _normalise_surface(value: Any) -> str:
    surface = _safe_string(value).lower()
    if surface in {"standalone", "os_embedded"}:
        return surface
    return "standalone"


def _normalise_safeguarding(value: Any) -> str:
    level = _safe_string(value).lower()
    if level in {"normal", "watchful", "heightened", "urgent"}:
        return level
    return "normal"


def _derive_evidence_status(
    *,
    sources: list[dict[str, Any]] | None,
    evidence_index: list[dict[str, Any]] | None,
    requires_evidence_grounding: bool,
) -> str:
    source_count = _count_items(sources)
    evidence_count = _count_items(evidence_index)

    if evidence_count >= 8 or source_count >= 8:
        return "strong"

    if evidence_count >= 3 or source_count >= 3:
        return "moderate"

    if evidence_count > 0 or source_count > 0:
        return "limited"

    if requires_evidence_grounding:
        return "missing_required_evidence"

    return "none"


def _extract_visible_citation_refs(
    *,
    sources: list[dict[str, Any]] | None,
    evidence_index: list[dict[str, Any]] | None,
) -> set[str]:
    refs: set[str] = set()

    for collection in [sources or [], evidence_index or []]:
        for item in collection:
            if not isinstance(item, dict):
                continue

            citation_ref = _safe_string(item.get("citation_ref"))
            if citation_ref:
                refs.add(citation_ref)

            record_type = _safe_string(item.get("record_type") or item.get("type"))
            record_id = _safe_string(item.get("record_id") or item.get("id"))
            if record_type and record_id:
                refs.add(f"[{record_type}:{record_id}]")

    return refs


def _check_citation_quality(
    *,
    answer_text: str,
    sources: list[dict[str, Any]] | None,
    evidence_index: list[dict[str, Any]] | None,
    requires_evidence_grounding: bool,
) -> dict[str, Any]:
    text = _safe_string(answer_text)

    found_citations = RECORD_CITATION_PATTERN.findall(text)
    broken_citations = BROKEN_CITATION_PATTERN.findall(text)
    visible_refs = _extract_visible_citation_refs(
        sources=sources,
        evidence_index=evidence_index,
    )

    unsupported_citations = [
        citation for citation in found_citations
        if visible_refs and citation not in visible_refs
    ]

    evidence_available = bool(sources or evidence_index)

    warnings: list[str] = []

    if broken_citations:
        warnings.append("broken_citation_marker")

    if unsupported_citations:
        warnings.append("citation_not_in_visible_sources")

    if evidence_available and not found_citations:
        warnings.append("evidence_available_but_no_inline_citations")

    if requires_evidence_grounding and not evidence_available:
        warnings.append("evidence_required_but_missing")

    return {
        "has_inline_citations": bool(found_citations),
        "citation_count": len(found_citations),
        "broken_citations": broken_citations,
        "unsupported_citations": unsupported_citations,
        "visible_reference_count": len(visible_refs),
        "warnings": _dedupe(warnings),
    }


def _derive_source_basis(
    *,
    sources: list[dict[str, Any]] | None,
    evidence_index: list[dict[str, Any]] | None,
    runtime: dict[str, Any],
) -> list[str]:
    basis: list[str] = []

    if evidence_index:
        basis.append(f"Structured evidence index: {len(evidence_index)} item(s)")

    if sources:
        source_types: set[str] = set()

        for source in sources:
            if not isinstance(source, dict):
                continue

            source_type = _safe_string(
                source.get("source_type")
                or source.get("type")
                or source.get("record_type")
                or "source"
            )

            if source_type:
                source_types.add(source_type)

        if source_types:
            basis.append("Visible source material: " + ", ".join(sorted(source_types)))
        else:
            basis.append(f"Visible source material: {len(sources)} item(s)")

    regulation_basis = runtime.get("regulation_basis")
    if isinstance(regulation_basis, list) and regulation_basis:
        basis.append(f"Regulation / standards basis: {len(regulation_basis)} reference(s)")

    if _safe_bool(runtime.get("guidance_results_used")):
        basis.append("Live guidance search")

    if _safe_bool(runtime.get("document_attached")):
        basis.append("Uploaded document")

    if not basis:
        basis.append("General children’s homes practice knowledge")

    return _dedupe(basis)


def _derive_what_was_used(
    *,
    source_basis: list[str],
    evidence_status: str,
    assistant_surface: str,
    route: dict[str, Any],
    runtime: dict[str, Any],
) -> list[str]:
    used: list[str] = []

    used.extend(source_basis)

    if assistant_surface == "standalone":
        used.append("Standalone practice support context")

    if assistant_surface == "os_embedded":
        used.append("OS scoped assistant context")

    if evidence_status in {"limited", "moderate", "strong"}:
        used.append(f"Visible evidence level: {evidence_status}")

    if _safe_bool(route.get("should_use_ofsted_lens")):
        used.append("Ofsted / inspection lens")

    if _safe_bool(route.get("should_use_manager_lens")):
        used.append("Manager oversight lens")

    if _safe_bool(route.get("should_use_ri_lens")):
        used.append("Responsible Individual / provider lens")

    if _safe_bool(route.get("should_use_reflective_lens")):
        used.append("Reflective practice lens")

    if _safe_bool(route.get("should_use_recording_lens")):
        used.append("Recording quality lens")

    response_plan = runtime.get("response_plan")
    if isinstance(response_plan, dict):
        if _safe_bool(response_plan.get("use_inspection_lens")):
            used.append("Inspection readiness lens")
        if _safe_bool(response_plan.get("use_leadership_lens")):
            used.append("Leadership lens")
        if _safe_bool(response_plan.get("use_therapeutic_lens")):
            used.append("Therapeutic / relational lens")

    return _dedupe(used)


def _derive_what_was_not_used(
    *,
    assistant_surface: str,
    evidence_status: str,
    runtime: dict[str, Any],
    route: dict[str, Any],
) -> list[str]:
    not_used: list[str] = []

    if assistant_surface == "standalone":
        not_used.append("No automatic access to the home’s full records or chronology")

    if evidence_status in {"none", "missing_required_evidence"}:
        not_used.append("No structured record evidence was visible")

    if _safe_bool(runtime.get("guidance_search_skipped")):
        not_used.append("Live guidance search was skipped")

    if not _safe_bool(runtime.get("document_attached")):
        not_used.append("No uploaded document was attached")

    if not _safe_bool(route.get("should_use_web_guidance")):
        not_used.append("Web guidance was not used as the primary basis")

    return _dedupe(not_used)


def _derive_lenses_used(
    *,
    mode: str,
    response_mode: str,
    role_profile: str,
    runtime: dict[str, Any],
    route: dict[str, Any],
) -> list[str]:
    lenses: list[str] = []

    if role_profile in {"manager", "provider", "quality"}:
        lenses.append("Management oversight")

    if role_profile == "provider":
        lenses.append("Responsible Individual / provider oversight")

    if mode in {"manager_review", "reg45"} or response_mode in {"manager_review", "reg45"}:
        lenses.append("Registered Manager")

    if mode in {"ofsted_view", "reg45"} or response_mode in {"ofsted_view", "reg45"}:
        lenses.append("Ofsted / inspection readiness")

    if mode in {"reflection", "mentor", "supervision"} or response_mode == "reflection":
        lenses.append("Reflective practice")

    if mode in {"recording", "rewrite", "handover", "incident", "chronology"}:
        lenses.append("Recording quality")

    if mode == "safeguarding" or response_mode == "safeguarding":
        lenses.append("Safeguarding")

    response_plan = runtime.get("response_plan")
    if isinstance(response_plan, dict):
        if _safe_bool(response_plan.get("use_ofsted_lens")) or _safe_bool(response_plan.get("use_inspection_lens")):
            lenses.append("Ofsted / inspection readiness")
        if _safe_bool(response_plan.get("use_manager_lens")) or _safe_bool(response_plan.get("use_leadership_lens")):
            lenses.append("Management oversight")
        if _safe_bool(response_plan.get("use_ri_lens")):
            lenses.append("Responsible Individual / provider oversight")
        if _safe_bool(response_plan.get("use_reflective_lens")):
            lenses.append("Reflective practice")
        if _safe_bool(response_plan.get("use_therapeutic_lens")):
            lenses.append("Therapeutic / relational practice")

    if _safe_bool(route.get("should_use_ofsted_lens")):
        lenses.append("Ofsted / inspection readiness")
    if _safe_bool(route.get("should_use_manager_lens")):
        lenses.append("Management oversight")
    if _safe_bool(route.get("should_use_ri_lens")):
        lenses.append("Responsible Individual / provider oversight")
    if _safe_bool(route.get("should_use_reflective_lens")):
        lenses.append("Reflective practice")
    if _safe_bool(route.get("should_use_recording_lens")):
        lenses.append("Recording quality")

    return _dedupe(lenses)


def _derive_limitations(
    *,
    evidence_status: str,
    assistant_surface: str,
    requires_evidence_grounding: bool,
    sources: list[dict[str, Any]] | None,
    evidence_index: list[dict[str, Any]] | None,
    runtime: dict[str, Any],
    citation_quality: dict[str, Any],
) -> list[str]:
    limitations: list[str] = []

    if evidence_status == "missing_required_evidence":
        limitations.append(
            "Scoped record evidence was required, but no structured evidence was visible."
        )

    if evidence_status in {"none", "limited"}:
        limitations.append(
            "The response may need checking against the full record, local policy, or manager knowledge."
        )

    if assistant_surface == "standalone":
        limitations.append(
            "Standalone mode does not automatically access the home’s records, care plans, chronology, risk assessments, or policies."
        )

    if requires_evidence_grounding and not evidence_index and not sources:
        limitations.append(
            "Record-specific conclusions should not be relied on without visible evidence."
        )

    citation_warnings = citation_quality.get("warnings")
    if isinstance(citation_warnings, list):
        for warning in citation_warnings:
            limitations.append(f"Citation quality warning: {warning}")

    quality_flags = runtime.get("answer_quality_flags")
    if isinstance(quality_flags, dict):
        warnings = quality_flags.get("warnings")
        if isinstance(warnings, list):
            for warning in warnings:
                limitations.append(f"Answer quality warning: {warning}")

    if _safe_bool(runtime.get("guidance_search_skipped")):
        limitations.append(
            "Live guidance search was skipped because local/scoped context or task type was prioritised."
        )

    return _dedupe(limitations)


def _derive_review_points(
    *,
    mode: str,
    response_mode: str,
    safeguarding_level: str,
    evidence_status: str,
    role_profile: str,
    citation_quality: dict[str, Any],
) -> list[str]:
    points: list[str] = []

    if safeguarding_level in {"heightened", "urgent"}:
        points.extend(
            [
                "Check immediate safety and escalation have been addressed.",
                "Confirm who has been informed and what actions have been recorded.",
            ]
        )

    if evidence_status in {"missing_required_evidence", "none", "limited"}:
        points.append(
            "Review the response against the full available evidence before treating it as final."
        )

    if citation_quality.get("warnings"):
        points.append("Check citation/source quality before relying on evidence-based claims.")

    if mode in {"recording", "incident", "chronology", "handover"} or response_mode in {
        "record",
        "incident",
        "chronology",
        "handover",
    }:
        points.append("Check the draft only includes facts that are known or clearly reported.")

    if mode in {"manager_review", "ofsted_view", "reg45"} or response_mode in {
        "manager_review",
        "ofsted_view",
        "reg45",
    }:
        points.extend(
            [
                "Check whether actions have a clear owner and review point.",
                "Check whether child impact and evidence limitations are clear.",
            ]
        )

    if role_profile in {"manager", "provider", "quality"}:
        points.append(
            "Consider whether this needs management oversight, audit follow-up, supervision, or provider assurance."
        )

    return _dedupe(points)


def _score_confidence(
    *,
    base_confidence: str,
    evidence_status: str,
    safeguarding_level: str,
    citation_quality: dict[str, Any],
    answer_quality_flags: dict[str, Any] | None,
    requires_evidence_grounding: bool,
) -> str:
    score = CONFIDENCE_ORDER.get(base_confidence, 2)

    evidence_score = EVIDENCE_STATUS_ORDER.get(evidence_status, 1)

    if evidence_score >= 4:
        score += 1
    elif evidence_score <= 1:
        score -= 1

    if requires_evidence_grounding and evidence_status == "missing_required_evidence":
        score -= 2

    if safeguarding_level in {"heightened", "urgent"}:
        score -= 1

    if citation_quality.get("warnings"):
        score -= 1

    if isinstance(answer_quality_flags, dict) and answer_quality_flags.get("warnings"):
        score -= 1

    score = max(1, min(score, 4))

    for label, value in CONFIDENCE_ORDER.items():
        if value == score:
            return label

    return "working"


def _derive_audit_flags(
    *,
    safeguarding_level: str,
    evidence_status: str,
    assistant_surface: str,
    requires_evidence_grounding: bool,
    confidence: str,
    citation_quality: dict[str, Any],
) -> list[str]:
    flags: list[str] = []

    if safeguarding_level in {"heightened", "urgent"}:
        flags.append("safeguarding_priority")

    if evidence_status == "missing_required_evidence":
        flags.append("missing_required_evidence")

    if assistant_surface == "standalone":
        flags.append("standalone_no_record_access")

    if requires_evidence_grounding:
        flags.append("evidence_grounding_required")

    if confidence in {"low", "working"}:
        flags.append("review_recommended")

    if citation_quality.get("warnings"):
        flags.extend([f"citation_{warning}" for warning in citation_quality.get("warnings", [])])

    return _dedupe(flags)


def _build_user_facing_summary(
    *,
    mode: str,
    response_mode: str,
    assistant_surface: str,
    safeguarding_level: str,
    evidence_status: str,
    confidence: str,
    what_was_used: list[str],
    limitations: list[str],
) -> str:
    surface_text = (
        "standalone assistant"
        if assistant_surface == "standalone"
        else "OS-embedded assistant"
    )

    summary = (
        f"This was handled as a {mode} request using the {response_mode} response style. "
        f"It was answered through the {surface_text}. "
        f"Evidence status: {evidence_status}. "
        f"Confidence: {confidence}."
    )

    if safeguarding_level in {"heightened", "urgent"}:
        summary += " Safeguarding priority was treated as elevated."

    if what_was_used:
        summary += " Used: " + "; ".join(what_was_used[:4]) + "."

    if limitations:
        summary += " Limitation: " + limitations[0]

    return summary.strip()


def _build_audit_summary(
    *,
    mode: str,
    response_mode: str,
    assistant_surface: str,
    role_profile: str,
    safeguarding_level: str,
    evidence_status: str,
    confidence: str,
    lenses_used: list[str],
    audit_flags: list[str],
) -> str:
    parts = [
        f"Mode={mode}",
        f"ResponseMode={response_mode}",
        f"Surface={assistant_surface}",
        f"RoleProfile={role_profile}",
        f"Safeguarding={safeguarding_level}",
        f"EvidenceStatus={evidence_status}",
        f"Confidence={confidence}",
    ]

    if lenses_used:
        parts.append("Lenses=" + ",".join(lenses_used))

    if audit_flags:
        parts.append("Flags=" + ",".join(audit_flags))

    return " | ".join(parts)


def build_explainability_payload(
    *,
    message: str = "",
    answer_text: str = "",
    mode: str = "",
    response_mode: str = "",
    runtime: dict[str, Any] | None = None,
    route: dict[str, Any] | None = None,
    sources: list[dict[str, Any]] | None = None,
    evidence_index: list[dict[str, Any]] | None = None,
    assistant_surface: str | None = None,
    role_profile: str | None = None,
    safeguarding_level: str | None = None,
    confidence: str | None = None,
) -> dict[str, Any]:
    runtime = runtime or {}
    route = route or {}

    detected_mode = (
        _safe_string(mode)
        or _safe_string(route.get("mode"))
        or _safe_string(runtime.get("mode"))
        or "guidance"
    )

    resolved_response_mode = (
        _safe_string(response_mode)
        or _safe_string(route.get("response_mode"))
        or _safe_string(runtime.get("response_mode"))
        or _safe_string(runtime.get("output_type"))
        or "default"
    )

    resolved_surface = _normalise_surface(
        assistant_surface
        or route.get("assistant_surface")
        or runtime.get("assistant_surface")
        or "standalone"
    )

    resolved_role = (
        _safe_string(role_profile)
        or _safe_string(route.get("role_profile"))
        or _safe_string(runtime.get("user_role_profile"))
        or "staff"
    )

    resolved_safeguarding = _normalise_safeguarding(
        safeguarding_level
        or route.get("safeguarding_level")
        or runtime.get("safeguarding_level")
        or "normal"
    )

    requires_evidence_grounding = _safe_bool(
        route.get("requires_evidence_grounding")
        if "requires_evidence_grounding" in route
        else runtime.get("requires_evidence_grounding")
    )

    evidence_status = _derive_evidence_status(
        sources=sources,
        evidence_index=evidence_index,
        requires_evidence_grounding=requires_evidence_grounding,
    )

    citation_quality = _check_citation_quality(
        answer_text=answer_text,
        sources=sources,
        evidence_index=evidence_index,
        requires_evidence_grounding=requires_evidence_grounding,
    )

    base_confidence = _normalise_confidence(
        confidence
        or runtime.get("answer_confidence")
        or runtime.get("classification_confidence")
        or "working"
    )

    answer_quality_flags = runtime.get("answer_quality_flags")
    if not isinstance(answer_quality_flags, dict):
        answer_quality_flags = {}

    final_confidence = _score_confidence(
        base_confidence=base_confidence,
        evidence_status=evidence_status,
        safeguarding_level=resolved_safeguarding,
        citation_quality=citation_quality,
        answer_quality_flags=answer_quality_flags,
        requires_evidence_grounding=requires_evidence_grounding,
    )

    source_basis = _derive_source_basis(
        sources=sources,
        evidence_index=evidence_index,
        runtime=runtime,
    )

    lenses_used = _derive_lenses_used(
        mode=detected_mode,
        response_mode=resolved_response_mode,
        role_profile=resolved_role,
        runtime=runtime,
        route=route,
    )

    what_was_used = _derive_what_was_used(
        source_basis=source_basis,
        evidence_status=evidence_status,
        assistant_surface=resolved_surface,
        route=route,
        runtime=runtime,
    )

    what_was_not_used = _derive_what_was_not_used(
        assistant_surface=resolved_surface,
        evidence_status=evidence_status,
        runtime=runtime,
        route=route,
    )

    limitations = _derive_limitations(
        evidence_status=evidence_status,
        assistant_surface=resolved_surface,
        requires_evidence_grounding=requires_evidence_grounding,
        sources=sources,
        evidence_index=evidence_index,
        runtime=runtime,
        citation_quality=citation_quality,
    )

    review_points = _derive_review_points(
        mode=detected_mode,
        response_mode=resolved_response_mode,
        safeguarding_level=resolved_safeguarding,
        evidence_status=evidence_status,
        role_profile=resolved_role,
        citation_quality=citation_quality,
    )

    audit_flags = _derive_audit_flags(
        safeguarding_level=resolved_safeguarding,
        evidence_status=evidence_status,
        assistant_surface=resolved_surface,
        requires_evidence_grounding=requires_evidence_grounding,
        confidence=final_confidence,
        citation_quality=citation_quality,
    )

    user_facing_summary = _build_user_facing_summary(
        mode=detected_mode,
        response_mode=resolved_response_mode,
        assistant_surface=resolved_surface,
        safeguarding_level=resolved_safeguarding,
        evidence_status=evidence_status,
        confidence=final_confidence,
        what_was_used=what_was_used,
        limitations=limitations,
    )

    audit_summary = _build_audit_summary(
        mode=detected_mode,
        response_mode=resolved_response_mode,
        assistant_surface=resolved_surface,
        role_profile=resolved_role,
        safeguarding_level=resolved_safeguarding,
        evidence_status=evidence_status,
        confidence=final_confidence,
        lenses_used=lenses_used,
        audit_flags=audit_flags,
    )

    payload = ExplainabilityPayload(
        detected_mode=detected_mode,
        response_mode=resolved_response_mode,
        assistant_surface=resolved_surface,
        role_profile=resolved_role,
        safeguarding_level=resolved_safeguarding,
        evidence_status=evidence_status,
        confidence=final_confidence,
        what_was_used=what_was_used,
        what_was_not_used=what_was_not_used,
        source_basis=source_basis,
        lenses_used=lenses_used,
        limitations=limitations,
        review_points=review_points,
        citation_quality=citation_quality,
        user_facing_summary=user_facing_summary,
        audit_summary=audit_summary,
        audit_flags=audit_flags,
    )

    return explainability_to_dict(payload)


def explainability_to_dict(payload: ExplainabilityPayload) -> dict[str, Any]:
    return {
        "detected_mode": payload.detected_mode,
        "response_mode": payload.response_mode,
        "assistant_surface": payload.assistant_surface,
        "role_profile": payload.role_profile,
        "safeguarding_level": payload.safeguarding_level,
        "evidence_status": payload.evidence_status,
        "confidence": payload.confidence,
        "what_was_used": payload.what_was_used,
        "what_was_not_used": payload.what_was_not_used,
        "source_basis": payload.source_basis,
        "lenses_used": payload.lenses_used,
        "limitations": payload.limitations,
        "review_points": payload.review_points,
        "citation_quality": payload.citation_quality,
        "user_facing_summary": payload.user_facing_summary,
        "audit_summary": payload.audit_summary,
        "audit_flags": payload.audit_flags,
    }


def build_user_transparency_panel(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Safe UI panel content.

    This is user-facing and must not expose private reasoning.
    """
    return {
        "title": "Why this answer",
        "summary": _safe_string(payload.get("user_facing_summary")),
        "evidence_status": payload.get("evidence_status"),
        "confidence": payload.get("confidence"),
        "what_was_used": payload.get("what_was_used", []),
        "limitations": payload.get("limitations", []),
        "review_points": payload.get("review_points", []),
    }


def build_audit_panel(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Internal/admin-facing audit panel.
    """
    return {
        "audit_summary": payload.get("audit_summary"),
        "audit_flags": payload.get("audit_flags", []),
        "detected_mode": payload.get("detected_mode"),
        "response_mode": payload.get("response_mode"),
        "assistant_surface": payload.get("assistant_surface"),
        "role_profile": payload.get("role_profile"),
        "safeguarding_level": payload.get("safeguarding_level"),
        "evidence_status": payload.get("evidence_status"),
        "confidence": payload.get("confidence"),
        "source_basis": payload.get("source_basis", []),
        "lenses_used": payload.get("lenses_used", []),
        "citation_quality": payload.get("citation_quality", {}),
        "what_was_not_used": payload.get("what_was_not_used", []),
    }


def build_explainability_prompt_block(payload: dict[str, Any]) -> str:
    """
    Prompt-safe block for downstream formatting.

    This must not include hidden chain-of-thought.
    """
    lines = [
        "============================================================",
        "TRANSPARENCY CONTEXT",
        "",
        f"Detected mode: {_safe_string(payload.get('detected_mode'))}",
        f"Response mode: {_safe_string(payload.get('response_mode'))}",
        f"Assistant surface: {_safe_string(payload.get('assistant_surface'))}",
        f"Role profile: {_safe_string(payload.get('role_profile'))}",
        f"Safeguarding level: {_safe_string(payload.get('safeguarding_level'))}",
        f"Evidence status: {_safe_string(payload.get('evidence_status'))}",
        f"Confidence: {_safe_string(payload.get('confidence'))}",
    ]

    for label, key in [
        ("What was used", "what_was_used"),
        ("What was not used", "what_was_not_used"),
        ("Source basis", "source_basis"),
        ("Lenses used", "lenses_used"),
        ("Limitations", "limitations"),
        ("Review points", "review_points"),
        ("Audit flags", "audit_flags"),
    ]:
        values = payload.get(key)
        if isinstance(values, list) and values:
            lines.append("")
            lines.append(f"{label}:")
            for item in values:
                lines.append(f"• {_safe_string(item)}")

    citation_quality = payload.get("citation_quality")
    if isinstance(citation_quality, dict):
        warnings = citation_quality.get("warnings")
        if isinstance(warnings, list) and warnings:
            lines.append("")
            lines.append("Citation quality warnings:")
            for warning in warnings:
                lines.append(f"• {_safe_string(warning)}")

    return "\n".join(lines).strip()
