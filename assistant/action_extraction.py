from __future__ import annotations

"""Action extraction for IndiCare OS assistant.

This module extracts visible actions, owners, due dates, follow-up gaps and
completion signals from OS evidence. It is used to support managers, seniors,
RIs and providers with practical operational follow-through.
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any


ACTION_RECORD_TYPES = {
    "task",
    "manager_action",
    "inspection_action",
    "reg44_action",
    "reg45_action",
    "compliance_item",
    "quality_audit",
    "handover",
    "handover_record",
    "monthly_review",
}

ACTION_TERMS = {
    "action",
    "follow up",
    "review",
    "update",
    "complete",
    "complete by",
    "due",
    "owner",
    "assigned",
    "manager to",
    "staff to",
    "senior to",
    "key worker to",
    "ri to",
    "responsible individual",
}

COMPLETED_TERMS = {
    "completed",
    "closed",
    "signed off",
    "actioned",
    "resolved",
    "reviewed and closed",
}

OPEN_OR_OVERDUE_TERMS = {
    "open",
    "pending",
    "awaiting",
    "overdue",
    "not completed",
    "not closed",
    "unresolved",
    "to be completed",
}

OWNER_TERMS = {
    "manager": "Registered Manager",
    "registered manager": "Registered Manager",
    "senior": "Senior / Shift Lead",
    "staff": "Staff team",
    "key worker": "Key worker",
    "social worker": "Social worker / Placing authority",
    "ri": "Responsible Individual",
    "responsible individual": "Responsible Individual",
    "quality lead": "Quality Lead",
}


@dataclass(frozen=True)
class ExtractedAction:
    citation_ref: str
    record_type: str
    label: str
    action: str
    owner: str
    status: str
    due_date: str
    evidence_date: str
    confidence: str
    gaps: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class ActionExtractionResult:
    actions: list[ExtractedAction] = field(default_factory=list)
    evidence_count: int = 0
    open_count: int = 0
    completed_count: int = 0
    gap_count: int = 0
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _parse_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, date):
        return datetime.combine(value, datetime.min.time())
    text = _safe_string(value)
    if not text:
        return None
    for candidate in (text, text.replace("Z", "+00:00"), text[:10]):
        try:
            if len(candidate) == 10 and "-" in candidate:
                return datetime.combine(date.fromisoformat(candidate), datetime.min.time())
            return datetime.fromisoformat(candidate)
        except Exception:
            continue
    return None


def _normalise_date(value: Any) -> str:
    parsed = _parse_datetime(value)
    return parsed.isoformat() if parsed else ""


def _citation_ref(item: dict[str, Any]) -> str:
    citation = _safe_string(item.get("citation_ref"))
    if citation:
        return citation
    record_type = _safe_string(item.get("record_type") or item.get("type"))
    record_id = _safe_string(item.get("record_id") or item.get("id"))
    if record_type and record_id:
        return f"[{record_type}:{record_id}]"
    return ""


def _combined_text(item: dict[str, Any]) -> str:
    return " ".join(
        _safe_string(item.get(key))
        for key in (
            "label",
            "title",
            "excerpt",
            "summary",
            "description",
            "outcome",
            "notes",
            "status",
            "action",
            "action_required",
            "next_steps",
        )
    ).strip()


def _status_from_item(item: dict[str, Any], text: str) -> str:
    explicit = _safe_string(item.get("status") or item.get("task_status") or item.get("action_status")).lower()
    lowered = text.lower()

    if explicit in {"completed", "closed", "done", "resolved", "cancelled", "canceled"}:
        return "completed"
    if explicit in {"open", "pending", "overdue", "in_progress", "in progress", "awaiting"}:
        return "open"
    if any(term in lowered for term in COMPLETED_TERMS):
        return "completed"
    if any(term in lowered for term in OPEN_OR_OVERDUE_TERMS):
        return "open"
    return "unknown"


def _owner_from_text(text: str) -> str:
    lowered = text.lower()
    for term, owner in OWNER_TERMS.items():
        if term in lowered:
            return owner
    return ""


def _action_text(item: dict[str, Any], text: str) -> str:
    for key in ("action", "action_required", "next_steps", "summary", "description", "excerpt", "label", "title"):
        value = _safe_string(item.get(key))
        if value:
            return value[:360]
    return text[:360]


def _looks_like_action(item: dict[str, Any]) -> bool:
    record_type = _safe_string(item.get("record_type") or item.get("type")).lower()
    text = _combined_text(item).lower()
    if record_type in ACTION_RECORD_TYPES:
        return True
    return any(term in text for term in ACTION_TERMS | OPEN_OR_OVERDUE_TERMS | COMPLETED_TERMS)


def _extract_action(item: dict[str, Any]) -> ExtractedAction | None:
    if not isinstance(item, dict) or not _looks_like_action(item):
        return None

    citation_ref = _citation_ref(item)
    if not citation_ref:
        return None

    text = _combined_text(item)
    status = _status_from_item(item, text)
    owner = _safe_string(item.get("owner") or item.get("assigned_to") or item.get("responsible_person")) or _owner_from_text(text)
    due_date = _normalise_date(item.get("due_date") or item.get("target_date") or item.get("review_date") or item.get("next_due_date"))
    evidence_date = _normalise_date(item.get("date") or item.get("event_at") or item.get("updated_at") or item.get("created_at"))

    gaps: list[str] = []
    if not owner:
        gaps.append("owner_not_visible")
    if not due_date and status != "completed":
        gaps.append("due_or_review_date_not_visible")
    if status == "unknown":
        gaps.append("status_not_clear")

    confidence = "high" if not gaps else "working" if len(gaps) <= 2 else "low"

    return ExtractedAction(
        citation_ref=citation_ref,
        record_type=_safe_string(item.get("record_type") or item.get("type") or "record").lower(),
        label=_safe_string(item.get("label") or item.get("title") or "Action"),
        action=_action_text(item, text),
        owner=owner,
        status=status,
        due_date=due_date,
        evidence_date=evidence_date,
        confidence=confidence,
        gaps=gaps,
    )


def extract_actions(
    *,
    evidence_index: list[dict[str, Any]] | None,
    limit: int = 40,
) -> ActionExtractionResult:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    if not evidence:
        return ActionExtractionResult(
            actions=[],
            evidence_count=0,
            warnings=["no_visible_evidence_for_action_extraction"],
        )

    actions = [action for item in evidence if (action := _extract_action(item)) is not None]
    actions = sorted(
        actions,
        key=lambda item: (item.status != "open", item.due_date or "9999", item.evidence_date or ""),
    )[: max(1, min(int(limit), 100))]

    open_count = len([item for item in actions if item.status == "open"])
    completed_count = len([item for item in actions if item.status == "completed"])
    gap_count = sum(len(item.gaps) for item in actions)

    warnings: list[str] = []
    if not actions:
        warnings.append("no_actions_detected_in_visible_evidence")
    if gap_count:
        warnings.append("action_quality_gaps_present")

    return ActionExtractionResult(
        actions=actions,
        evidence_count=len(evidence),
        open_count=open_count,
        completed_count=completed_count,
        gap_count=gap_count,
        warnings=warnings,
    )


def serialise_action_extraction(result: ActionExtractionResult) -> dict[str, Any]:
    return {
        "evidence_count": result.evidence_count,
        "open_count": result.open_count,
        "completed_count": result.completed_count,
        "gap_count": result.gap_count,
        "warnings": result.warnings,
        "actions": [
            {
                "citation_ref": item.citation_ref,
                "record_type": item.record_type,
                "label": item.label,
                "action": item.action,
                "owner": item.owner,
                "status": item.status,
                "due_date": item.due_date,
                "evidence_date": item.evidence_date,
                "confidence": item.confidence,
                "gaps": item.gaps,
            }
            for item in result.actions
        ],
    }


def build_action_extraction_prompt_block(result: ActionExtractionResult) -> str:
    if not result.actions and not result.warnings:
        return ""

    lines = [
        "ACTION EXTRACTION CONTEXT",
        "Use this to support follow-through. Do not invent owners, due dates or completion evidence.",
        f"Open actions: {result.open_count}. Completed actions: {result.completed_count}. Quality gaps: {result.gap_count}.",
        "",
    ]

    if result.actions:
        lines.append("Visible actions:")
        for action in result.actions[:20]:
            owner = action.owner or "owner not visible"
            due = action.due_date or "due/review date not visible"
            gaps = f" Gaps: {', '.join(action.gaps)}." if action.gaps else ""
            lines.append(
                f"- {action.status}: {action.action} Owner: {owner}. Due/review: {due}. {action.citation_ref}.{gaps}"
            )

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
