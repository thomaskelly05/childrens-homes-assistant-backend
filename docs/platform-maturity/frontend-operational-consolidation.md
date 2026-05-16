# Frontend Operational Consolidation

Canonical frontend files:

- `frontend-next/lib/operational-memory/types.ts`
- `frontend-next/components/indicare/operational/canonical-operational-primitives.tsx`

## Consolidation target

Operational UI should render typed backend projections and traversals:

- Chronology timelines use `ChronologyProjection`.
- Operational queues use `ProviderOperationalQueueItem`.
- Evidence side panels use `EvidenceTraversal`.
- Replay cursor and source event IDs remain visible to the component layer.

## Drift removal rule

Live operational flows must not fall back to synthetic queues, fake chronology, or generic record rendering. Demo data can remain only in explicit demo routes or previews.

## Migration sequence

1. Adopt canonical primitives in chronology and management pages.
2. Replace evidence side-panel heuristics with canonical evidence traversal.
3. Thread replay cursor metadata through websocket invalidation and refresh flows.
4. Remove duplicate queue rendering once provider queue API adoption is complete.
