from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

SENSITIVE_TERMS = [
    "safeguarding",
    "risk",
    "harm",
    "abuse",
    "exploitation",
    "missing",
    "police",
    "restraint",
    "self-harm",
    "child protection",
]

GOVERNANCE_NOTICE = (
    "IndiCare AI supports professional recording and decision-making, but it does not replace "
    "professional judgement, safeguarding procedures, supervision, statutory guidance or manager review."
)


def governance_summary(content: str, action: str | None = None) -> dict[str, Any]:
    text = (content or "").lower()
    sensitive_hits = [term for term in SENSITIVE_TERMS if term in text]
    requires_review = bool(sensitive_hits)

    return {
        "ok": True,
        "action": action or "general_ai_use",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "requires_professional_review": requires_review,
        "sensitive_themes": sensitive_hits[:8],
        "notice": GOVERNANCE_NOTICE,
        "recommended_review": _recommended_review(sensitive_hits),
    }


def audit_event(
    *,
    user_id: str | None,
    project_id: str | None,
    action: str,
    feature: str,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return a structured audit event.

    This is intentionally storage-agnostic for now so it can be called safely from
    frontend-facing routes before a final audit table is introduced.
    """
    return {
        "event_type": "indicare_ai_activity",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "user_id": user_id,
        "project_id": project_id,
        "action": action,
        "feature": feature,
        "metadata": metadata or {},
    }


def _recommended_review(hits: list[str]) -> str:
    if not hits:
        return "No additional governance flag identified. Continue to check accuracy before using outputs."
    if any(term in hits for term in ["safeguarding", "abuse", "exploitation", "child protection"]):
        return "Safeguarding content detected. Ensure DSL/manager review and follow local safeguarding procedures."
    if any(term in hits for term in ["missing", "police", "restraint", "self-harm"]):
        return "High-sensitivity operational content detected. Check chronology, actions, notifications and management oversight."
    return "Sensitive care content detected. Review carefully before saving, sharing or exporting."
