from __future__ import annotations

"""AI-assisted chronology drafting for IndiCare OS assistant.

This module prepares draft chronology entries from visible OS evidence. It does
not invent events or fill gaps. It separates factual entries, uncertainty,
evidence gaps and manager follow-up prompts.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.chronology_synthesiser import build_chronology_synthesis, serialise_chronology_synthesis
from assistant.safeguarding_escalation import build_safeguarding_escalation, serialise_safeguarding_escalation
from assistant.action_extraction import extract_actions, serialise_action_extraction


@dataclass(frozen=True)
class DraftChronologyEntry:
    date: str
    title: str
    factual_summary: str
    significance: str
    evidence_ref: str
    uncertainty: str = ""
    follow_up: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ChronologyDraftResult:
    draft_status: str
    evidence_count: int
    entries: list[DraftChronologyEntry] = field(default_factory=list)
    evidence_gaps: list[str] = field(default_factory=list)
    source_modules: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _significance(event: dict[str, Any], safeguarding_refs: set[str]) -> str:
    ref = _safe_string(event.get("citation_ref"))
    tags = event.get("tags") if isinstance(event.get("tags"), list) else []
    if ref in safeguarding_refs:
        return "safeguarding_relevant"
    if any(_safe_string(tag) in {"safeguarding_relevant", "risk_relevant", "police", "missing", "self_harm", "exploitation"} for tag in tags):
        return "safeguarding_relevant"
    if any(_safe_string(tag) in {"action_relevant", "daily_care_relevant"} for tag in tags):
        return "operationally_relevant"
    return "context"


def _uncertainty(event: dict[str, Any]) -> str:
    if not _safe_string(event.get("date")):
        return "Date is not visible in the supplied evidence."
    if not _safe_string(event.get("excerpt")):
        return "Record exists but no detailed excerpt is visible."
    return ""


def _follow_up_for_event(event: dict[str, Any], action_refs: set[str]) -> list[str]:
    ref = _safe_string(event.get("citation_ref"))
    follow_up: list[str] = []
    if ref in action_refs:
        follow_up.append("Check linked action ownership, due date and completion evidence.")
    if _significance(event, set()) == "safeguarding_relevant":
        follow_up.append("Check whether risk assessment, care plan and management oversight were reviewed.")
    if not _safe_string(event.get("date")):
        follow_up.append("Confirm the event date before using this in a formal chronology.")
    return follow_up


def build_chronology_draft(
    *,
    evidence_index: list[dict[str, Any]] | None,
    limit: int = 30,
) -> ChronologyDraftResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return ChronologyDraftResult(
            draft_status="unavailable",
            evidence_count=0,
            evidence_gaps=["No visible OS evidence was supplied for chronology drafting."],
            warnings=["no_visible_evidence_for_chronology_drafting"],
        )

    chronology = serialise_chronology_synthesis(build_chronology_synthesis(evidence_index=evidence, limit=limit, reverse=False))
    safeguarding = serialise_safeguarding_escalation(build_safeguarding_escalation(evidence_index=evidence))
    actions = serialise_action_extraction(extract_actions(evidence_index=evidence))

    safeguarding_refs = {
        _safe_string(item.get("citation_ref"))
        for item in safeguarding.get("indicators", [])
        if isinstance(item, dict) and _safe_string(item.get("citation_ref"))
    }
    action_refs = {
        _safe_string(item.get("citation_ref"))
        for item in actions.get("actions", [])
        if isinstance(item, dict) and _safe_string(item.get("citation_ref"))
    }

    entries: list[DraftChronologyEntry] = []
    for event in chronology.get("events", []):
        if not isinstance(event, dict):
            continue
        ref = _safe_string(event.get("citation_ref"))
        if not ref:
            continue
        entries.append(
            DraftChronologyEntry(
                date=_safe_string(event.get("date")) or "date not visible",
                title=_safe_string(event.get("label")) or _safe_string(event.get("record_type")) or "Chronology entry",
                factual_summary=_safe_string(event.get("excerpt")) or "Record is visible but no excerpt was supplied.",
                significance=_significance(event, safeguarding_refs),
                evidence_ref=ref,
                uncertainty=_uncertainty(event),
                follow_up=_follow_up_for_event(event, action_refs),
            )
        )

    gaps: list[str] = []
    if not entries:
        gaps.append("No usable cited chronology entries were found in visible evidence.")
    if any(entry.date == "date not visible" for entry in entries):
        gaps.append("Some entries have no visible date and need confirmation before formal use.")
    if actions.get("gap_count", 0):
        gaps.append("Some linked actions have owner, status or due-date gaps.")

    warnings: list[str] = []
    for payload in (chronology, safeguarding, actions):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(_safe_string(item) for item in maybe if _safe_string(item))

    return ChronologyDraftResult(
        draft_status="draft_ready" if entries else "needs_evidence",
        evidence_count=len(evidence),
        entries=entries,
        evidence_gaps=gaps,
        source_modules={
            "chronology": chronology,
            "safeguarding": safeguarding,
            "actions": actions,
        },
        warnings=sorted(set(warnings)),
    )


def serialise_chronology_draft(result: ChronologyDraftResult) -> dict[str, Any]:
    return {
        "draft_status": result.draft_status,
        "evidence_count": result.evidence_count,
        "evidence_gaps": result.evidence_gaps,
        "warnings": result.warnings,
        "entries": [
            {
                "date": item.date,
                "title": item.title,
                "factual_summary": item.factual_summary,
                "significance": item.significance,
                "evidence_ref": item.evidence_ref,
                "uncertainty": item.uncertainty,
                "follow_up": item.follow_up,
            }
            for item in result.entries
        ],
        "source_modules": result.source_modules,
    }


def build_chronology_draft_prompt_block(result: ChronologyDraftResult) -> str:
    lines = [
        "CHRONOLOGY DRAFTING CONTEXT",
        "Use this to draft a chronology from visible evidence only. Do not invent events, dates or outcomes.",
        f"Draft status: {result.draft_status}. Evidence count: {result.evidence_count}.",
        "",
    ]

    if result.entries:
        lines.append("Draft entries:")
        for entry in result.entries[:30]:
            uncertainty = f" Uncertainty: {entry.uncertainty}" if entry.uncertainty else ""
            follow_up = f" Follow-up: {'; '.join(entry.follow_up)}" if entry.follow_up else ""
            lines.append(
                f"- {entry.date}: {entry.title} — {entry.factual_summary} Significance: {entry.significance}. {entry.evidence_ref}.{uncertainty}{follow_up}"
            )

    if result.evidence_gaps:
        lines.append("")
        lines.append("Evidence gaps:")
        for gap in result.evidence_gaps:
            lines.append(f"- {gap}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:12]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
