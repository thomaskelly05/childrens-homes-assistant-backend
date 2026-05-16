# Operational data flow

This document maps the main operational records to storage, APIs, frontend views, chronology, reports and assistant retrieval.

| Source record | Storage layer | API route | Frontend view | Chronology connection | Report/evidence connection | Assistant retrieval |
| --- | --- | --- | --- | --- | --- | --- |
| Daily notes | `daily_notes` table through young person daily note service | `POST /young-people/{id}/daily-notes`, list/archive routes | Recording workflow, daily log workspaces | Young person chronology routes and OS chronology projection | Monthly reviews, Ofsted/report evidence where linked | OS assistant retrieval via `services.os_chronology_service` and workspace context |
| Incidents | Incident service and incident tables | `POST /young-people/{id}/incidents`, list/workflow routes | Incident recording and incident workspaces | Young person chronology routes and OS chronology projection | Incident reports, risk/evidence links, inspection packs | OS assistant retrieval through chronology/workspace/evidence repositories |
| Chronology | Source records plus chronology projections | `/os/chronology`, `/os/chronology/{id}`, `/os/young-people/{id}/chronology` | Global chronology and child chronology pages | Primary timeline view | Source set for reports and evidence review | Retrieved as citable chronology sources |
| Safeguarding/risk | Risk, incident, visibility and safeguarding-related tables | Risk, incident, visibility and action routers | Safeguarding and risk workspaces | Safeguarding filters and flags | Inspection readiness and manager review evidence | Retrieved when scoped and relevant to safeguarding modes |
| Reports | Report repositories and generated draft storage | `/os/reports`, report generation routes, `/reports/*`, Ofsted routes | Reports workspace and detail views | May include chronology source records | Evidence base and missing-evidence flags | Retrieved as report sources and cited where available |
| Documents | Document metadata, file storage and extraction pipeline | `/os/documents`, `/documents/*`, document engine routes | Documents workspace and document detail links | Document uploads can become chronology/evidence context | Evidence links, stale document checks and inspection packs | Retrieved as document sources when in scope |
| Evidence | Evidence repository and coverage helpers | `/os/evidence`, `/os/evidence/attach`, `/evidence/*` | Evidence workspace and linked panels | Evidence IDs on chronology entries | Inspection readiness, Annex A and reports | Retrieved as evidence sources and evidence gaps |
| Actions/handover | Action and handover repositories | `/os/actions`, handover routes | Actions, handover and shift pages | Actions linked to chronology entries | Follow-up and readiness evidence | Suggested actions and related records |
| Operational states | Derived from chronology, actions, evidence, documents and workforce projections | `/os/operational-states`, `/os/operational-queues`, `/os/evidence-graph`, `/os/operational-search` | Command Centre, Young Person, Staff, Safeguarding, Inspection, Governance, Search | Chronology links become review indicators | Evidence graph links states to evidence, documents and regulations | Assistant receives a minimal context brief with highest priority review indicators |

## Save/load flow

1. A frontend workflow posts to `frontend-next/app/api/recording/route.ts`.
2. The route maps the workflow to the correct backend path.
3. Backend services validate payloads, enforce auth and write to storage.
4. Chronology projections and OS workspaces surface the saved records.
5. Reports, evidence and assistants retrieve through scoped repositories.

## Chronology flow

Chronology should pull from daily notes, incidents, safeguarding/risk records, documents, reports and evidence links. The OS chronology API is the live source for Next.js chronology pages, with demo selectors only as fallback data.

## Report/document/evidence flow

Reports should use actual records from chronology, evidence, documents and workspace context. Missing evidence is a review point and must not be filled by generated text.

## Assistant flow

Embedded assistants and Orb build a shared context from the active page, selected child/home/record and visible record IDs. Retrieval then collects scoped chronology, actions, evidence, documents, reports and workspace data before building citations and evidence gaps.

Standalone assistant intentionally skips this operational flow.

## Operational state flow

Operational states are recomputed from permitted source records on read. They are review indicators, not conclusions. Source record changes should invalidate chronology, dashboard and operational queue projections through the refresh events returned by the operational state snapshot.
