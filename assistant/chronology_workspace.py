from __future__ import annotations

"""Chronology workspace payloads for IndiCare OS assistant.

This module builds a frontend-ready chronology workspace with timeline events,
safeguarding markers, evidence gaps and citation drawer references. It is the
foundation for an AI-native chronology UI.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.chronology_drafting import build_chronology_draft, serialise_chronology_draft
from assistant.multi_agency_chronology import build_multi_agency_chronology, serialise_multi_agency_chronology
from assistant.operational_attention_engine import build_operational_attention, serialise_operational_attention


@dataclass(frozen=True)
class ChronologyTimelineEvent:
    event_id: str
    date: str
    title: str
    summary: str
    significance: str
    citation_ref: str
    markers: list[str] = field(default_factory=list)
    uncertainty: str = ""


@dataclass(frozen=True)
class ChronologyWorkspacePayload:
    workspace_type: str
    timeline: list[ChronologyTimelineEvent] = field(default_factory=list)
    safeguarding_markers: list[str] = field(default_factory=list)
    agency_themes: dict[str, int] = field(default_factory=dict)
    evidence_gaps: list[str] = field(default_factory=list)
    attention: dict[str, Any] = field(default_factory=dict)
    source_modules: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _markers(entry: dict[str, Any]) -> list[str]:
    markers: list[str] = []
    significance = _safe_string(entry.get("significance") or entry.get("safeguarding_significance"))
    if significance == "safeguarding_relevant":
        markers.append("safeguarding")
    if _safe_string(entry.get("uncertainty")):
        markers.append("uncertainty")
    agencies = entry.get("agencies_to_consider")
    if isinstance(agencies, list) and agencies:
        markers.append("multi_agency")
    return markers


def build_chronology_workspace(
    *,
    evidence_index: list[dict[str, Any]] | None,
    mode: str = "standard",
) -> ChronologyWorkspacePayload:
    evidence = evidence_index if isinstance(evidence_index, list) else []

    draft = serialise_chronology_draft(build_chronology_draft(evidence_index=evidence))
    multi_agency = serialise_multi_agency_chronology(build_multi_agency_chronology(evidence_index=evidence))
    attention = serialise_operational_attention(build_operational_attention(evidence_index=evidence))

    source_entries = multi_agency.get("entries") if mode == "multi_agency" else draft.get("entries")
    if not isinstance(source_entries, list):
        source_entries = []

    timeline: list[ChronologyTimelineEvent] = []
    for index, entry in enumerate(source_entries, start=1):
        if not isinstance(entry, dict):
            continue
        citation_ref = _safe_string(entry.get("evidence_ref") or entry.get("citation_ref"))
        timeline.append(
            ChronologyTimelineEvent(
                event_id=f"chronology-event-{index}",
                date=_safe_string(entry.get("date")) or "date not visible",
                title=_safe_string(entry.get("title")) or "Chronology entry",
                summary=_safe_string(entry.get("factual_summary")) or _safe_string(entry.get("summary")),
                significance=_safe_string(entry.get("significance") or entry.get("safeguarding_significance") or "context"),
                citation_ref=citation_ref,
                markers=_markers(entry),
                uncertainty=_safe_string(entry.get("uncertainty")),
            )
        )

    safeguarding_markers = [event.citation_ref for event in timeline if "safeguarding" in event.markers and event.citation_ref]

    warnings: list[str] = []
    for payload in (draft, multi_agency, attention):
        maybe = payload.get("warnings") if isinstance(payload, dict) else []
        if isinstance(maybe, list):
            warnings.extend(_safe_string(item) for item in maybe if _safe_string(item))

    return ChronologyWorkspacePayload(
        workspace_type="multi_agency_chronology" if mode == "multi_agency" else "chronology",
        timeline=timeline,
        safeguarding_markers=safeguarding_markers,
        agency_themes=multi_agency.get("agency_themes", {}) if isinstance(multi_agency.get("agency_themes"), dict) else {},
        evidence_gaps=draft.get("evidence_gaps", []) if isinstance(draft.get("evidence_gaps"), list) else [],
        attention=attention,
        source_modules={
            "chronology_draft": draft,
            "multi_agency_chronology": multi_agency,
            "attention": attention,
        },
        warnings=sorted(set(warnings)),
    )


def serialise_chronology_workspace(payload: ChronologyWorkspacePayload) -> dict[str, Any]:
    return {
        "workspace_type": payload.workspace_type,
        "safeguarding_markers": payload.safeguarding_markers,
        "agency_themes": payload.agency_themes,
        "evidence_gaps": payload.evidence_gaps,
        "attention": payload.attention,
        "warnings": payload.warnings,
        "timeline": [
            {
                "event_id": item.event_id,
                "date": item.date,
                "title": item.title,
                "summary": item.summary,
                "significance": item.significance,
                "citation_ref": item.citation_ref,
                "markers": item.markers,
                "uncertainty": item.uncertainty,
            }
            for item in payload.timeline
        ],
        "source_modules": payload.source_modules,
    }
