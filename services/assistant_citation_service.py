from __future__ import annotations

from typing import Any


def _text(value: Any, default: str = "") -> str:
    text = str(value or "").strip()
    return text or default


def route_for_source(source_type: str, source_id: str, source: dict[str, Any] | None = None) -> str:
    source = source or {}
    if source.get("route"):
        return str(source["route"])
    if source.get("source_url"):
        return str(source["source_url"])
    if source_type == "chronology":
        return f"/chronology/{source_id}"
    if source_type in {"daily_log", "care_record"}:
        return f"/daily-logs/{source_id}"
    if source_type == "incident":
        return f"/incidents/{source_id}"
    if source_type in {"safeguarding", "safeguarding_event", "safeguarding_concern"}:
        return f"/safeguarding/{source_id}"
    if source_type in {"risk_assessment", "risk_review"}:
        return f"/risk-assessments/{source_id}"
    if source_type in {"medication", "medication_record"}:
        return f"/medication/{source_id}"
    if source_type in {"health", "health_record"}:
        return f"/health/{source_id}"
    if source_type in {"keywork", "keywork_session", "direct_work"}:
        return f"/keywork/{source_id}"
    if source_type in {"appointment", "meeting"}:
        return f"/appointments/{source_id}"
    if source_type in {"missing_episode"}:
        return f"/incidents/{source_id}"
    if source_type in {"action", "task", "universal_task", "manager_action", "inspection_action", "reg44_report_action"}:
        return f"/actions/{source_id}"
    if source_type in {"evidence", "inspection_evidence_fact", "inspection_evidence_note", "record_evidence_link"}:
        return f"/evidence/{source_id}"
    if source_type in {"document", "statutory_document", "child_document", "reg44_import"}:
        return f"/documents/{source_id}"
    if source_type in {"reg44", "reg44_report", "reg44_finding"}:
        return f"/documents/regulatory/reg44/{source_id}"
    if source_type in {"reg45", "reg45_report", "reg45_section"}:
        return f"/reports/reg45/{source_id}"
    if source_type == "lac_review":
        return f"/reports/lac-review/{source_id}"
    if source_type in {"report", "ai_generated_report", "ofsted_report"}:
        return f"/reports/{source_id}"
    if source_type in {"staff", "staff_record"}:
        return f"/staff/{source_id}/workspace"
    return f"/chronology?source={source_type}:{source_id}"


def citation_label(source: dict[str, Any], index: int) -> str:
    existing = _text(source.get("citation_label") or source.get("label"))
    if existing:
        return existing
    source_type = _text(source.get("source_type"), "record").replace("_", " ").title()
    source_id = _text(source.get("source_id") or source.get("id"), str(index + 1))
    date = _text(source.get("date") or source.get("date_time") or source.get("created_at") or source.get("uploaded_at"))
    return f"{source_type} #{source_id}{f' ({date[:10]})' if date else ''}"


def build_citation(source: dict[str, Any], index: int = 0) -> dict[str, Any]:
    source_type = _text(source.get("source_type") or source.get("type"), "record")
    source_id = _text(source.get("source_id") or source.get("original_id") or source.get("id"), str(index + 1))
    excerpt = _text(source.get("excerpt") or source.get("summary") or source.get("description") or source.get("retrieval_text"))
    return {
        "label": citation_label(source, index),
        "source_type": source_type,
        "source_id": source_id,
        "route": route_for_source(source_type, source_id, source),
        "date": _text(source.get("date") or source.get("date_time") or source.get("created_at") or source.get("uploaded_at")) or None,
        "staff_name": _text(source.get("staff_name") or source.get("created_by_name") or source.get("uploaded_by_name")) or None,
        "young_person_name": _text(source.get("young_person_name")) or None,
        "excerpt": excerpt[:600],
        "confidence": source.get("confidence") or "medium",
        "source_quality": source.get("source_quality") or source.get("quality") or "available",
        "regulation_links": source.get("regulation_links") or [],
        "sccif_links": source.get("sccif_links") or [],
    }


def build_citations(sources: list[dict[str, Any]], *, limit: int = 12) -> list[dict[str, Any]]:
    citations: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for index, source in enumerate(sources):
        citation = build_citation(source, index)
        key = (citation["source_type"], citation["source_id"])
        if key in seen:
            continue
        seen.add(key)
        citations.append(citation)
        if len(citations) >= limit:
            break
    return citations


def related_records_from_sources(sources: list[dict[str, Any]], *, limit: int = 12) -> list[dict[str, Any]]:
    related: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    for source in sources:
        source_type = _text(source.get("source_type"), "record")
        source_id = _text(source.get("source_id") or source.get("original_id") or source.get("id"))
        if not source_id or (source_type, source_id) in seen:
            continue
        seen.add((source_type, source_id))
        related.append(
            {
                "source_type": source_type,
                "source_id": source_id,
                "title": _text(source.get("title"), "Record"),
                "summary": _text(source.get("summary") or source.get("description") or source.get("retrieval_text"))[:320],
                "route": route_for_source(source_type, source_id, source),
                "date": _text(source.get("date_time") or source.get("created_at") or source.get("updated_at") or source.get("uploaded_at")) or None,
            }
        )
        if len(related) >= limit:
            break
    return related
