from __future__ import annotations

"""Multi-agency chronology intelligence for IndiCare OS assistant.

This module prepares a conservative multi-agency chronology view from visible OS
evidence. It is designed to support professional preparation for social worker,
LADO, police, IRO, strategy meeting or safeguarding review discussions. It does
not replace professional judgement or statutory safeguarding processes.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.chronology_drafting import build_chronology_draft, serialise_chronology_draft
from assistant.risk_trajectory import build_risk_trajectory, serialise_risk_trajectory
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation
from assistant.structured_safeguarding_review import build_structured_safeguarding_review, serialise_structured_safeguarding_review


MULTI_AGENCY_TERMS = {
    "social worker",
    "placing authority",
    "lado",
    "police",
    "strategy meeting",
    "iro",
    "independent reviewing officer",
    "camhs",
    "education",
    "school",
    "health",
    "youth offending",
    "mash",
    "local authority",
}


@dataclass(frozen=True)
class MultiAgencyChronologyEntry:
    date: str
    title: str
    factual_summary: str
    safeguarding_significance: str
    agencies_to_consider: list[str] = field(default_factory=list)
    evidence_ref: str = ""
    uncertainty: str = ""
    professional_questions: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class MultiAgencyChronologyResult:
    chronology_status: str
    evidence_count: int
    entries: list[MultiAgencyChronologyEntry] = field(default_factory=list)
    agency_themes: dict[str, int] = field(default_factory=dict)
    preparation_questions: list[str] = field(default_factory=list)
    source_modules: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _dedupe(items: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
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


def _agency_terms(text: str) -> list[str]:
    lowered = text.lower()
    agencies: list[str] = []
    for term in MULTI_AGENCY_TERMS:
        if term in lowered:
            agencies.append(term)
    return sorted(agencies)


def _questions_for_entry(entry: dict[str, Any], risk_trajectory: str) -> list[str]:
    significance = _safe_string(entry.get("significance"))
    questions: list[str] = []

    if significance == "safeguarding_relevant":
        questions.extend(
            [
                "What was shared with the social worker or placing authority?",
                "Was multi-agency escalation considered or completed?",
                "What was the recorded outcome and next step?",
            ]
        )
    if risk_trajectory == "escalating":
        questions.append("Does the multi-agency plan reflect the apparent escalation in risk?")
    if _safe_string(entry.get("uncertainty")):
        questions.append("What missing information should be confirmed before sharing this chronology externally?")

    return questions[:5]


def build_multi_agency_chronology(
    *,
    evidence_index: list[dict[str, Any]] | None,
    limit: int = 40,
) -> MultiAgencyChronologyResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return MultiAgencyChronologyResult(
            chronology_status="unavailable",
            evidence_count=0,
            preparation_questions=["Attach visible OS evidence before preparing a multi-agency chronology."],
            warnings=["no_visible_evidence_for_multi_agency_chronology"],
        )

    draft = serialise_chronology_draft(build_chronology_draft(evidence_index=evidence, limit=limit))
    safeguarding = serialise_safeguarding_escalation(build_safeguarding_escalation(evidence_index=evidence))
    risk = serialise_risk_trajectory(build_risk_trajectory(evidence_index=evidence))
    review = serialise_structured_safeguarding_review(build_structured_safeguarding_review(evidence_index=evidence))

    risk_trajectory = _safe_string(risk.get("trajectory"))

    entries: list[MultiAgencyChronologyEntry] = []
    agency_counts: dict[str, int] = {}

    for raw in draft.get("entries", [])[:limit] if isinstance(draft.get("entries"), list) else []:
        if not isinstance(raw, dict):
            continue
        text = " ".join(
            [
                _safe_string(raw.get("title")),
                _safe_string(raw.get("factual_summary")),
                _safe_string(raw.get("follow_up")),
            ]
        )
        agencies = _agency_terms(text)
        if raw.get("significance") == "safeguarding_relevant" and not agencies:
            agencies = ["social worker", "placing authority"]

        for agency in agencies:
            agency_counts[agency] = agency_counts.get(agency, 0) + 1

        entries.append(
            MultiAgencyChronologyEntry(
                date=_safe_string(raw.get("date")),
                title=_safe_string(raw.get("title")),
                factual_summary=_safe_string(raw.get("factual_summary")),
                safeguarding_significance=_safe_string(raw.get("significance")) or "context",
                agencies_to_consider=agencies,
                evidence_ref=_safe_string(raw.get("evidence_ref")),
                uncertainty=_safe_string(raw.get("uncertainty")),
                professional_questions=_questions_for_entry(raw, risk_trajectory),
            )
        )

    preparation_questions = [
        "What is the purpose of sharing this chronology and who is the intended professional audience?",
        "Are all dates, outcomes and next steps confirmed from source records?",
        "Is there evidence of what was shared with external professionals and when?",
        "Are safeguarding concerns, actions and management oversight clearly linked?",
    ]

    if safeguarding.get("level") in {"heightened", "urgent"}:
        preparation_questions.append("Has the current safeguarding position been reviewed before this chronology is shared?")
    if risk_trajectory == "escalating":
        preparation_questions.append("Does the chronology show whether the multi-agency response has kept pace with escalation?")

    warnings: list[str] = []
    for payload in (draft, safeguarding, risk, review):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(_safe_string(item) for item in maybe if _safe_string(item))

    return MultiAgencyChronologyResult(
        chronology_status="draft_ready" if entries else "needs_evidence",
        evidence_count=len(evidence),
        entries=entries,
        agency_themes=dict(sorted(agency_counts.items(), key=lambda item: item[1], reverse=True)),
        preparation_questions=_dedupe(preparation_questions),
        source_modules={
            "chronology_draft": draft,
            "safeguarding": safeguarding,
            "risk_trajectory": risk,
            "structured_safeguarding_review": review,
        },
        warnings=sorted(set(warnings)),
    )


def serialise_multi_agency_chronology(result: MultiAgencyChronologyResult) -> dict[str, Any]:
    return {
        "chronology_status": result.chronology_status,
        "evidence_count": result.evidence_count,
        "agency_themes": result.agency_themes,
        "preparation_questions": result.preparation_questions,
        "warnings": result.warnings,
        "entries": [
            {
                "date": item.date,
                "title": item.title,
                "factual_summary": item.factual_summary,
                "safeguarding_significance": item.safeguarding_significance,
                "agencies_to_consider": item.agencies_to_consider,
                "evidence_ref": item.evidence_ref,
                "uncertainty": item.uncertainty,
                "professional_questions": item.professional_questions,
            }
            for item in result.entries
        ],
        "source_modules": result.source_modules,
    }


def build_multi_agency_chronology_prompt_block(result: MultiAgencyChronologyResult) -> str:
    lines = [
        "MULTI-AGENCY CHRONOLOGY CONTEXT",
        "Use this to support professional chronology preparation. Do not invent events, dates, outcomes or agency decisions.",
        f"Chronology status: {result.chronology_status}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.agency_themes:
        lines.append("Agency themes visible:")
        for agency, count in list(result.agency_themes.items())[:10]:
            lines.append(f"- {agency}: {count}")

    if result.entries:
        lines.append("")
        lines.append("Chronology entries:")
        for entry in result.entries[:30]:
            agencies = ", ".join(entry.agencies_to_consider) if entry.agencies_to_consider else "agency not specified"
            uncertainty = f" Uncertainty: {entry.uncertainty}" if entry.uncertainty else ""
            lines.append(
                f"- {entry.date}: {entry.title} — {entry.factual_summary} Significance: {entry.safeguarding_significance}. Agencies: {agencies}. {entry.evidence_ref}.{uncertainty}"
            )

    if result.preparation_questions:
        lines.append("")
        lines.append("Preparation questions:")
        for question in result.preparation_questions[:10]:
            lines.append(f"- {question}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
