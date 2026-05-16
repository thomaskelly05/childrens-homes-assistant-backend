from __future__ import annotations

from typing import Any

from schemas.operational_memory import EventReconciliationFinding, EventReconciliationReport, OperationalMemoryReplayEvent
from services.operational_memory_replay_service import operational_memory_replay_service


class EventReconciliationService:
    """Detect replay gaps and propagation drift across operational memory planes."""

    def reconcile(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        provider_id: int | None = None,
        home_id: int | None = None,
        limit: int = 1000,
    ) -> EventReconciliationReport:
        replay = operational_memory_replay_service.replay(
            conn,
            current_user=current_user,
            provider_id=provider_id,
            home_id=home_id,
            limit=limit,
            permission="governance:review",
        )
        findings = self.findings_from_events(replay.events)
        repair_jobs = [self._repair_job(finding) for finding in findings]
        return EventReconciliationReport(scope=replay.scope, findings=findings, repair_jobs=repair_jobs)

    def findings_from_events(self, events: list[OperationalMemoryReplayEvent]) -> list[EventReconciliationFinding]:
        findings: list[EventReconciliationFinding] = []
        by_correlation: dict[str, set[str]] = {}
        by_transition: dict[str, list[OperationalMemoryReplayEvent]] = {}
        chronology_snapshots: set[str] = set()
        for event in events:
            by_correlation.setdefault(event.correlation_id, set()).add(event.source_table)
            transition_key = f"{event.entity_type}:{event.entity_id}:{event.transition_type}:{event.correlation_id}"
            by_transition.setdefault(transition_key, []).append(event)
            if event.source_table == "chronology_snapshot_history":
                chronology_snapshots.update(event.chronology_references)
        for correlation_id, tables in by_correlation.items():
            if "operational_lifecycle_history" in tables and "operational_event_log" not in tables:
                source_events = [event.replay_key for event in events if event.correlation_id == correlation_id]
                sample = next(event for event in events if event.correlation_id == correlation_id)
                findings.append(
                    EventReconciliationFinding(
                        finding_id=f"missing-replay:{correlation_id}",
                        severity="critical",
                        finding_type="missing_replay_event",
                        entity_type=sample.entity_type,
                        entity_id=sample.entity_id,
                        correlation_id=correlation_id,
                        description="Lifecycle history exists without a matching operational_event_log replay event.",
                        repair_hint="Rebuild operational_event_log from operational_lifecycle_history for this correlation.",
                        source_event_ids=source_events,
                    )
                )
            if "operational_audit_timeline" not in tables and ("operational_lifecycle_history" in tables or "operational_event_log" in tables):
                sample = next(event for event in events if event.correlation_id == correlation_id)
                findings.append(
                    EventReconciliationFinding(
                        finding_id=f"missing-audit:{correlation_id}",
                        finding_type="failed_audit_propagation",
                        entity_type=sample.entity_type,
                        entity_id=sample.entity_id,
                        correlation_id=correlation_id,
                        description="Operational event is missing from the audit timeline.",
                        repair_hint="Project the lifecycle event into operational_audit_timeline.",
                        source_event_ids=[event.replay_key for event in events if event.correlation_id == correlation_id],
                    )
                )
        for key, grouped in by_transition.items():
            lifecycle_events = [event for event in grouped if event.source_table == "operational_lifecycle_history"]
            if len(lifecycle_events) > 1:
                sample = lifecycle_events[0]
                findings.append(
                    EventReconciliationFinding(
                        finding_id=f"duplicate-transition:{key}",
                        finding_type="duplicate_transition",
                        entity_type=sample.entity_type,
                        entity_id=sample.entity_id,
                        correlation_id=sample.correlation_id,
                        description="Duplicate lifecycle transitions share the same entity, transition and correlation.",
                        repair_hint="Mark later duplicates as superseded in reconciliation metadata; do not delete history.",
                        source_event_ids=[event.replay_key for event in lifecycle_events],
                    )
                )
        for event in events:
            missing = [ref for ref in event.chronology_references if ref not in chronology_snapshots]
            if missing and event.source_table != "chronology_snapshot_history":
                findings.append(
                    EventReconciliationFinding(
                        finding_id=f"orphan-chronology:{event.replay_key}",
                        finding_type="orphan_chronology_reference",
                        entity_type=event.entity_type,
                        entity_id=event.entity_id,
                        correlation_id=event.correlation_id,
                        description="Event references chronology IDs that are not present in chronology_snapshot_history replay.",
                        repair_hint="Backfill chronology_snapshot_history for the referenced chronology IDs.",
                        source_event_ids=[event.replay_key],
                    )
                )
        return findings

    def _repair_job(self, finding: EventReconciliationFinding) -> dict[str, Any]:
        job_type = {
            "missing_replay_event": "replay_recovery",
            "failed_audit_propagation": "lifecycle_repair",
            "duplicate_transition": "queue_repair",
            "orphan_chronology_reference": "chronology_repair",
        }.get(finding.finding_type, "evidence_edge_repair")
        return {
            "job_type": job_type,
            "finding_id": finding.finding_id,
            "correlation_id": finding.correlation_id,
            "dry_run": True,
            "repair_hint": finding.repair_hint,
        }


event_reconciliation_service = EventReconciliationService()
