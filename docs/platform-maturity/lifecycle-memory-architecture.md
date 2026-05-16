# Lifecycle memory architecture

Lifecycle memory is the durable history of operational states, not a replacement for existing domain records.

Canonical DTOs:

- `schemas.operational_state.OperationalStateLifecycleSnapshot`
- `schemas.operational_state.OperationalStateHistoryEvent`
- `schemas.operational_state.GovernanceSignOff`
- `schemas.operational_state.DurabilityRecoveryMarker`

## Contract

Every lifecycle-aware record should expose:

- schema version
- entity type and entity ID
- current lifecycle state
- transition history
- evidence links
- chronology links
- governance links
- audit timeline
- recovery metadata

## Persistence direction

Use append-only lifecycle history repositories for transitions. Current-state columns may remain as projections, but they must not be the only source of operational memory.

## Replay rule

Replay APIs should return the history that produced the current state, not only the current state. Inspection, governance and assistant surfaces should consume the same lifecycle memory contract.
