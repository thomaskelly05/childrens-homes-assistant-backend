# Event Reconciliation

Canonical service: `services/event_reconciliation_service.py`

Repair entrypoint: `repair/reconciliation_jobs.py`

## Detection

The reconciler detects:

- Missing replay events.
- Failed audit propagation.
- Orphan chronology references.
- Duplicate lifecycle transitions.
- Replay gaps surfaced by operational memory integrity checks.

## API

- `GET /api/operational-memory/reconciliation`

## Repair model

Repair jobs are dry-run plans. They describe lifecycle repair, chronology repair, queue repair, evidence-edge repair, and replay recovery without deleting history.

## Rule

Repair must be append-only or metadata-based. Historical operational memory rows must not be overwritten.
