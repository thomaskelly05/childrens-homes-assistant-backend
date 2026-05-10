from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

PRIORITY_TERMS = {
    "high": ["safeguarding", "child protection", "self-harm", "abuse", "exploitation", "missing", "police"],
    "medium": ["manager", "oversight", "follow-up", "action", "chronology", "risk"],
}


def build_notification(
    *,
    title: str,
    body: str,
    feature: str = "indicare_ai",
    project_id: str | None = None,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    priority = classify_priority(f"{title} {body}")
    return {
        "id": f"indicare-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "title": title,
        "body": body,
        "feature": feature,
        "project_id": project_id,
        "priority": priority,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata or {},
        "read": False,
    }


def classify_priority(text: str) -> str:
    lower = (text or "").lower()
    if any(term in lower for term in PRIORITY_TERMS["high"]):
        return "high"
    if any(term in lower for term in PRIORITY_TERMS["medium"]):
        return "medium"
    return "low"


def reminder_suggestions(content: str) -> list[dict[str, Any]]:
    lower = (content or "").lower()
    suggestions: list[dict[str, Any]] = []

    if "follow" in lower or "action" in lower:
        suggestions.append({
            "title": "Follow-up action",
            "body": "Check whether the follow-up action has been completed and recorded.",
            "suggested_when": "tomorrow",
            "feature": "follow_up",
        })

    if "manager" in lower or "oversight" in lower:
        suggestions.append({
            "title": "Management oversight review",
            "body": "Review whether management oversight has been clearly recorded.",
            "suggested_when": "end_of_shift",
            "feature": "management_oversight",
        })

    if "chronology" in lower or "missing" in lower or "police" in lower:
        suggestions.append({
            "title": "Chronology check",
            "body": "Check the chronology for dates, times, actions, outcomes and notifications.",
            "suggested_when": "today",
            "feature": "chronology",
        })

    if "safeguarding" in lower or "risk" in lower or "abuse" in lower:
        suggestions.append({
            "title": "Safeguarding review",
            "body": "Ensure safeguarding procedure, notifications and manager/DSL review are completed where required.",
            "suggested_when": "now",
            "feature": "safeguarding",
        })

    return suggestions[:5]
