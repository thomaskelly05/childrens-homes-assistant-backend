# Operational Memory Replay

Canonical service: `services/operational_memory_replay_service.py`

Replay is now defined as deterministic reads over append-only operational memory tables:

- `operational_lifecycle_history`
- `operational_audit_timeline`
- `operational_event_log`
- `chronology_snapshot_history`
- `evidence_relationship_history`
- `governance_signoff_history`

## Guarantees

- Append-only reads; no historical overwrite.
- Provider/home scope enforced through `ProviderContext` and `policy_engine`.
- Deterministic ordering by `created_at`, `id`, and source table.
- Cursor, timestamp, entity, child, staff, provider, home, and correlation filters.
- Replay export for inspection and governance review.
- Integrity metadata for ordering, duplicate keys, stale events, and table-local gaps.

## APIs

- `GET /api/operational-memory/replay`
- `GET /api/operational-memory/entity-history`
- `GET /api/operational-memory/governance`

## Known limits

Lifecycle transitions are the strongest write path. Comments, some review requests, and legacy write paths still need promotion into every memory plane.
