# Realtime orchestration

Realtime behaviour exists to keep operational awareness accurate, calm and replayable.

Canonical DTO:

- `schemas.operational_state.RealtimeAwarenessEvent`

## Event rules

Events must be:

- schema-versioned
- home-scoped
- permission-filtered
- redacted
- deduped
- stale-event protected
- reconnect-safe
- linked to durable audit or lifecycle history where possible

## Orchestration rule

Write paths should publish canonical events after durable state is written. Frontend refresh should respond to those events or a documented invalidation API, not page-specific polling storms.

## Enterprise hardening update

`/api/realtime/replay` now exposes cursor and timestamp replay over permission-filtered home scope. The current implementation uses the existing bus replay buffer; the durable target is `operational_event_log`.

## Future architecture

Use a durable event log for replay and process-local buffers only for short reconnect windows. Queue reconciliation and lifecycle propagation should share the same event envelope.
