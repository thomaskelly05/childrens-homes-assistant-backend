from __future__ import annotations

from typing import Any

from services.event_reconciliation_service import event_reconciliation_service


def plan_reconciliation_jobs(
    conn: Any,
    *,
    current_user: dict[str, Any],
    provider_id: int | None = None,
    home_id: int | None = None,
) -> dict[str, Any]:
    """Return dry-run repair jobs for lifecycle, chronology, queue, evidence and replay recovery."""

    report = event_reconciliation_service.reconcile(
        conn,
        current_user=current_user,
        provider_id=provider_id,
        home_id=home_id,
    )
    return report.model_dump(mode="json")
