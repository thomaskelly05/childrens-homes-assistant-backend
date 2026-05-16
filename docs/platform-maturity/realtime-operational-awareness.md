# Realtime operational awareness

Realtime behaviour is for operational awareness, not chat novelty.

Canonical DTO:

- `schemas.operational_state.RealtimeAwarenessEvent`

Supported maturity event types:

- `operational_state.lifecycle`
- `audit.timeline`
- `inspection.evidence`
- `governance.signoff`
- `evidence.graph`

## Behaviour

Events must be:

- home-scoped
- deduped
- throttled
- redacted
- safe to replay after reconnect

## Integration point

Use `services.realtime_event_bus.RealtimeEventBus.publish`. Do not add page-specific refresh storms or polling loops without a durable reason.
