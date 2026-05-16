# Evidence graph

The evidence graph is a reusable relationship layer across chronology, safeguarding, documents, operational states, inspections, staff oversight, governance, sign-offs and assistant context.

Canonical DTO:

- `schemas.operational_state.EvidenceEdge`

Each edge should explain:

- source type
- source ID
- target type
- target ID
- relationship
- why the records are linked
- confidence or provenance

## Traversal rule

Do not add duplicate linking systems. New evidence relationships should normalize into `EvidenceEdge` and can then be traversed by source or target.

## Explainability rule

Every non-obvious link needs a "why is this linked?" explanation. Prefer operational clarity over visual graph gimmicks.
