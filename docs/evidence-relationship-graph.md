# Evidence relationship graph

## Purpose

Evidence should show how records connect operationally, not just that a file exists.

The first graph foundation is read-only and deterministic. It links existing evidence rows, chronology IDs, action evidence IDs, document evidence IDs, regulations and operational states.

## Contract

`EvidenceRelationshipDTO` in `schemas/operational_state.py` carries:

- relationship type
- source type, ID and label
- target type, ID and label
- regulation relevance
- chronology event IDs
- operational state IDs
- inspection readiness usage flag
- deterministic confidence marker

## Route

`GET /os/evidence-graph` returns:

- `relationships`
- `summary.relationship_count`
- `summary.used_in_inspection_readiness`
- `summary.chronology_linked`

## Frontend

`app/evidence/page.tsx` renders graph relationships as a calm operational panel. The goal is traceability: what the evidence supports, where it came from and whether it is used in inspection readiness.

## Later refactor

Persisted graph edges should be added once the repository registry for source table, source type, citation route and inspection weighting is consolidated.
