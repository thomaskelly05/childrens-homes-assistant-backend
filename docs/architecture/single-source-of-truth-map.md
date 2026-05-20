# Single Source of Truth Map

This map names the operational source of truth for IndiCare OS. New work should extend these paths rather than create parallel systems.

## ORB single source of truth

| Concern | Source of truth | Compatibility / notes |
|---|---|---|
| Live conversation route | `POST /api/orb/conversation` in `routers/orb_routes.py` | `POST /orb/conversation` remains equivalent; legacy assistant routes should wrap or migrate to this pathway for embedded OS answers. |
| Operational context builder | `build_orb_context` in `services/orb_operational_context_service.py` | Uses projection snapshots and metadata first, then live deltas only when useful and safe. |
| Response composer | `build_orb_response` plus `OrbResponseComposer` | Produces answer, summary, citations, actions, guardrails, cognition and reasoning fields. |
| Voice pathway | `OrbVoiceSessionService.handle_event` | Voice care turns now call the same ORB context/response builder; provider fallback remains in the existing session service. |
| Memory pathway | `orb_memory_service` and `orb_presence_memory_service` | Session memory supports voice continuity; it must not become a separate record truth. |
| Retrieval pathway | ORB context builder + existing repositories and snapshots | `assistant_retrieval_service` remains the standalone/shared assistant retrieval layer. |
| Citation pathway | ORB source normalisation in `build_orb_context` | Sources include record type, id, route, summary and citation refs. |
| Safety / guardrail pathway | `assistant_prompt_policy`, ORB emotional safety/state services and ORB guardrails | ORB is decision support only and must not predict grades or replace professional judgement. |

## Chronology single source of truth

| Concern | Source of truth | Compatibility / notes |
|---|---|---|
| Chronology writer | `ChronologyWriter.upsert_event` into `chronology_events` | Domain write hooks should flow through this writer or documented sync hooks. |
| Chronology reader | Current UI: `/os/chronology`; target projection: `/api/operational-memory/chronology` | Direct `/api/chronology` and `/young-people/{id}/timeline` are compatibility reads. |
| Chronology projection | `ChronologyProjectionService.project` | Target read model for ORB, reports and governance. |
| Chronology cache | `services/intelligence/chronology_cache.py` and OS read cache middleware | Cache must be invalidated by projection coordinator/write hooks. |
| Shared route | `/os/chronology` until projection migration completes | UI, ORB, reports and governance should not invent new chronology readers. |

## Documents single source of truth

| Concern | Source of truth | Compatibility / notes |
|---|---|---|
| Document model | `document_instances` via `/api/document-system` as target model | `child_documents`, `statutory_documents` and `documents` remain existing stores during federation. |
| Template model | Backend document template services | Client templates are UX helpers, not operational truth. |
| Sign-off state | `document_signoff_service` and document engine review/signature services | Statutory approvals must link to the same lifecycle concept. |
| Evidence linkage route | Document engine link routes and `/os/evidence` federation | Evidence links should flow into chronology and governance matrix. |
| Child document route | `/child-documents` and `/young-people/{id}/documents` compatibility | Child pages should show child impact, evidence, chronology, review owner and next review date. |
| Statutory document route | `/young-people/{id}/statutory-documents` | Keep lifecycle; converge metadata into document evidence model. |

## Governance single source of truth

| Concern | Source of truth | Compatibility / notes |
|---|---|---|
| Governance command centre | `GovernanceIntelligenceService.build_command_centre` via `/api/governance-os/command-centre` | `/command-centre` composes governance and workforce summaries. |
| SCCIF evidence matrix | `GovernanceIntelligenceService.build_evidence_matrix` + `RegulatoryOntologyService` | Frontend SCCIF maps are display/reference only. |
| Reg 44 lifecycle | `governance_reg44_visits` + `build_reg44_workflow` | Reg 44 reader/trend routers are unmounted until explicitly bridged. |
| Reg 45 builder/context | `assistant/reg45_builder.py` through Governance OS | Provides evidence context, not final judgement or grade prediction. |
| Provider oversight path | Governance OS provider summary plus `/provider/intelligence` for provider dashboard | Static demo provider routes are not operational truth. |

## Workforce single source of truth

| Concern | Source of truth | Compatibility / notes |
|---|---|---|
| Workforce profile service | `/api/workforce-os/staff` and `/staff/{id}/profile` via `WorkforceJourneyService` | Legacy staff routes remain compatibility. |
| Supervision service | `/api/workforce-os/supervision` and workflow transitions | `/supervision/submissions` should feed or migrate into workforce-os. |
| Training matrix service | `/api/workforce-os/training-matrix` | Academy remains learning/competency, not the operational matrix. |
| Probation service | `/api/workforce-os/probation` | Must link evidence, supervision and review states. |
| Workforce intelligence path | `WorkforceIntelligenceService.orb_context` and command centre methods | Feeds ORB, governance, provider oversight and inspection readiness. |

## Young People single source of truth

| Concern | Source of truth | Compatibility / notes |
|---|---|---|
| Child profile bundle | Workspace repositories and Next `/young-people/[id]` pages | Legacy shell remains compatibility only. |
| Care journey context | `OrbCareJourneyService` over chronology, documents, evidence, risk and profile metadata | No separate care journey intelligence store should be added. |
| Daily care route set | Existing daily notes, handover, incidents, keywork, health, education and safeguarding routes | All relevant records should write/link into chronology. |
| Chronology route | `/os/chronology` now; projection route as target | Child chronology pages should share the same reader. |
| Plans/risk/safeguarding route set | Existing support plan, risk assessment, missing episode, safeguarding and incident services | ORB must use cautious evidence-window language. |

## UI single source of truth

| Concern | Source of truth | Compatibility / notes |
|---|---|---|
| App shell | `frontend-next/components/indicare/app-shell.tsx` | Legacy HTML shells remain interim only. |
| Navigation config | `frontend-next/lib/navigation/operational-navigation.ts` | Primary nav: Command Centre, Young People, Daily Care, Chronology, Documents, Workforce, Governance, Inspection, Reports, ORB, Admin. |
| ORB workspace | `/orb` and embedded ORB panel | `/assistant/orb` redirects to `/orb`; standalone assistant remains product boundary. |
| Command centre | `/command-centre` composing platform, governance and workforce context | Slice pages remain drill-downs, not duplicate command centres. |
| Card/tile/widget system | `components/indicare/ui.tsx`, operational cognition widgets and action/evidence panels | Use consistent empty, loading, evidence and source panels. |
| Page loading pattern | Existing Next server adapters in `frontend-next/lib/os-api/*` | Pages must handle no data, partial data, degraded DB pool, unavailable voice and missing projections. |

## Cost and AI usage principle

ORB must attempt this order before any model call:

1. Projection snapshots.
2. Operational cognition payloads.
3. Regulatory ontology.
4. Extracted metadata.
5. Chronology projections.
6. Evidence links.
7. Document metadata.
8. Lifecycle states.
9. Cached summaries.
10. Live DB deltas only when needed.
11. Model calls only when useful.

Current implementation records this in `metadata_used` and `context_used.metadata_strategy` on ORB responses.
