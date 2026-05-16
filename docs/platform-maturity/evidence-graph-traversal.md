# Evidence Graph Traversal

Canonical service: `services/evidence_graph_service.py`

Evidence traversal is derived from append-only memory relationships so chronology, lifecycle, governance, inspection, and signoff links explain why evidence is connected.

## API

- `GET /api/operational-memory/evidence`

## Traversal outputs

- Nodes for root records, evidence, and chronology references.
- Edges with `relationship` and `why_linked` explanations.
- Chronology-linked evidence.
- Inspection-linked evidence.
- Lifecycle-linked evidence.
- Governance-linked evidence.

## Rule

Evidence panels should render canonical traversal explanations rather than local side-panel heuristics.
