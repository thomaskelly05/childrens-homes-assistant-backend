# Durability and recovery

Operational workflows must survive failed saves, interrupted workflows, duplicate events, stale UI state and reconnects.

Canonical DTO:

- `schemas.operational_state.DurabilityRecoveryMarker`

## Guarantees to preserve

- idempotent queue writes where queue-backed work is used
- lifecycle transition metadata written with workflow/audit context
- duplicate realtime events deduped
- user-facing recovery hints stay calm and actionable
- assistant and ORB degraded behaviour is explicit

## Integration points

- `services.operational_queue_service`
- `services.retry_reconciliation_service`
- `services.workflow_reliability_service`
- `services.realtime_recovery_service`
- `services.audit_replay_service`
- `repositories.operational_writeback_repository.transition_record`

## Enterprise recovery direction

Durability should be append-first. Failed saves, lifecycle transitions, queue retries, chronology projections, evidence reviews, governance sign-offs and assistant oversight events should remain queryable after interruption or reconnect.

Recovery tooling should validate:

- lifecycle integrity
- chronology integrity
- replay cursor progress
- queue reconciliation
- stale operational state
- duplicate transition protection
- safe retry metadata

Do not commit temporary recovery hacks or frontend-only retry behaviour that hides failed persistence.
