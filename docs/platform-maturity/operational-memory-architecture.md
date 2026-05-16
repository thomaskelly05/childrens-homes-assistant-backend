# Operational memory architecture

Operational memory is append-only. Current state may be overwritten in domain tables, but operational history must remain replayable, queryable, exportable, inspection-safe and governance-safe.

## Canonical tables

- `operational_lifecycle_history`
- `operational_audit_timeline`
- `operational_event_log`
- `governance_signoff_history`
- `evidence_relationship_history`
- `chronology_snapshot_history`

Each table includes `provider_id`, `home_id`, `entity_type`, `entity_id`, `actor_id`, `correlation_id`, `schema_version` and `created_at`.

## Write rule

Lifecycle transitions append previous state, next state, transition type, escalation metadata, signoff metadata, evidence references, chronology references, governance references and replay references before clients depend on refreshed operational state.

## Migration notes

`repositories.operational_writeback_repository.transition_record` now appends to operational memory when the new tables exist. Existing workflow, audit and chronology rows should be backfilled into these tables in a later migration rather than overwritten.
