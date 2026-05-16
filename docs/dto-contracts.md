# DTO contracts

## Operational state DTOs

Operational state transport is centralised in `schemas/operational_state.py`.

Primary contracts:

- `OperationalStateDTO`
- `OperationalQueueDTO`
- `OperationalLink`
- `EvidenceRelationshipDTO`
- `OperationalSearchRequest`
- `OperationalSearchResultDTO`
- `AssistantContextBriefDTO`
- `OperationalStateSnapshotDTO`

## Naming conventions

Backend DTOs use snake case over HTTP. The Next.js OS API layer maps them into camel case once in `frontend-next/lib/os-api/platform.ts`.

## Compatibility

Existing routes are not broken. The new `/os/operational-*` routes compose existing repository rows and can degrade with source errors when optional tables are absent.

## Consolidation targets

Next DTO consolidation should cover:

- chronology event envelopes
- inspection readiness, Annex A, Reg 44 and Reg 45 packs
- evidence table registry and citation routing
- staff compliance summaries
- document sign-off history
- provider governance settings
