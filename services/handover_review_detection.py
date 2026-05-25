"""Handover review requirement detection — shared, no service circular imports."""

from __future__ import annotations

from typing import Any


def detect_review_requirements(source_context: dict[str, Any] | None) -> dict[str, Any]:
    """Infer manager/safeguarding review flags from intelligence source_context only."""
    ctx = source_context or {}
    manager_required = bool(ctx.get("manager_review_required"))
    safeguarding_required = bool(ctx.get("safeguarding_review_required"))
    reasons: list[str] = []

    flags = ctx.get("flags") or {}
    if isinstance(flags, dict):
        manager_required = manager_required or bool(flags.get("manager_review_required"))
        safeguarding_required = safeguarding_required or bool(
            flags.get("safeguarding_review_required")
        )

    for key in ("intelligence_items", "items", "high_risk_items"):
        for item in ctx.get(key) or []:
            if not isinstance(item, dict):
                continue
            if item.get("manager_review_required") or item.get("safeguarding_sensitive"):
                manager_required = True
            if item.get("safeguarding_sensitive") or item.get("safeguarding_review_required"):
                safeguarding_required = True

    counts = ctx.get("counts") or {}
    if isinstance(counts, dict):
        if int(counts.get("safeguarding") or 0) > 0:
            safeguarding_required = True
            manager_required = True
        if int(counts.get("urgent") or 0) > 0:
            manager_required = True

    if safeguarding_required:
        reasons.append("Safeguarding-sensitive intelligence linked to this handover.")
    if manager_required and not reasons:
        reasons.append("Manager review required for linked high-risk themes.")
    if ctx.get("recording_alert_count", 0) or ctx.get("isn_count", 0):
        if not manager_required:
            manager_required = bool(ctx.get("recording_alert_count", 0) > 0)

    reason = "; ".join(reasons) if reasons else None
    return {
        "manager_review_required": manager_required,
        "safeguarding_review_required": safeguarding_required,
        "review_required_reason": reason,
    }
