# Assistant Operational Trust

Assistant operational context must use canonical platform primitives:

- `ProviderContext` for tenancy.
- `policy_engine` for permissions.
- `chronology_projection_service` for chronology context.
- `evidence_graph_service` for evidence traversal and why-linked explanations.
- Operational memory replay for replay-safe oversight markers.

## Trust requirements

- Never expose hidden provider data.
- Never bypass ProviderContext.
- Never invent operational conclusions from missing context.
- Emit degraded-context warnings when replay/projection/evidence context is incomplete.
- Prefer chronology-linked, lifecycle-linked, and evidence-linked citations.

## Remaining work

Existing assistant retrieval still reads chronology directly through legacy aggregation services. It should be migrated to canonical projections before new assistant chronology features are added.
