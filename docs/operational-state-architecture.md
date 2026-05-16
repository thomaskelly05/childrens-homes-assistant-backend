# Operational state architecture

## Purpose

The operational state layer answers: "What needs attention right now?"

It is deterministic-first. It surfaces workflow, chronology, evidence, document, inspection, staff and governance indicators. It does not make safeguarding, clinical, regulatory or HR decisions.

## Backend contract

Canonical DTOs live in `schemas/operational_state.py`:

- `OperationalStateDTO`
- `OperationalQueueDTO`
- `EvidenceRelationshipDTO`
- `OperationalSearchRequest`
- `OperationalSearchResultDTO`
- `AssistantContextBriefDTO`
- `OperationalStateSnapshotDTO`

The read facade is `services/operational_state_service.py`. It consumes existing repository rows from chronology, actions, evidence and documents, then emits one permission-scoped snapshot.

Routes are mounted under `routers/operational_state_routes.py`:

- `GET /os/operational-states`
- `GET /os/operational-queues`
- `GET /os/evidence-graph`
- `POST /os/operational-search`
- `GET /os/assistant/context-brief`

## State rules

States include:

- state type
- category
- severity and priority score
- child, staff, home or document links
- reason
- next action
- evidence links
- chronology links
- regulation relevance
- review required flag
- resolved flag
- refresh events

Language must remain calm: "Needs review", "Follow-up required", "Evidence overdue", "Awaiting sign-off" and "Review recommended".

## Refresh model

Operational states are recomputed from source records on read. The snapshot returns refresh events for dashboard and chronology refresh orchestration. Durable state resolution should be added later when workflow storage is standardised.

## Frontend use

`frontend-next/lib/os-api/platform.ts` maps the snapshot once. The same contract feeds Command Centre, Young Person, Staff, Safeguarding, Inspection, Governance, Evidence Graph and Search surfaces.
