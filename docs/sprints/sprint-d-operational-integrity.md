# Sprint D - Full Platform Operational Integrity

Sprint D is an enterprise integrity sprint for the platform that already exists. It does not introduce a parallel assistant, workflow, chronology, document, reporting, academy, shell or realtime architecture.

## 1. Full platform operational integrity audit

Canonical runtime source: `services/platform_operational_integrity_service.py`.

| Area | Strategic owner | Canonical contract | Compatibility or drift |
| --- | --- | --- | --- |
| Children | Child Journey OS | Daily note gold standard, child record sync, chronology writer | Young people compatibility lifecycle routes |
| Workforce | Workforce OS | Workforce journey service, supervision gold standard | Legacy supervision routes and pages |
| Governance | Governance & Inspection OS | Governance intelligence, Reg 44/45 evidence and action patterns | Static workflow review compatibility routes |
| Inspection | Governance & Inspection OS | Inspection readiness, evidence graph, Ofsted packs | Home inspection compatibility routes |
| Chronology | Unified Operational Frontend OS | `ChronologyWriter`, `ChronologyProjectionService`, `chronology_engine` | `/os/chronology`, direct service reads, startup fallback patches |
| ORB | ORB Operational Intelligence Layer | `orb_context_engine`, shared assistant context, evidence graph | Multiple assistant route families and realtime assistant prefixes |
| Documents/templates | Unified Operational Frontend OS | `document_operational_engine`, template registry, sign-off routes | Legacy document hubs and `document_os_core` paths |
| Reports | Governance & Inspection OS | Reports routes, Ofsted report routes, report fact services | Report lifecycle stubs and mixed chronology reads |
| Academy | Workforce OS | Academy APIs, intelligence service, workbook lifecycle | Legacy-only shell until Next.js migration |
| Alerts/realtime | Unified Operational Frontend OS | `operational_event_bus`, `RealtimeEventBus`, replay service | Legacy browser event bus and duplicate alert routes |
| Frontend shell | Unified Operational Frontend OS | Next.js `AppShell` and `operational-navigation.ts` | Legacy HTML shells served for compatibility |
| Provider oversight | Governance & Inspection OS | Provider operational queue and intelligence routes | Replay/static overview source drift |

## 2. Workflow standardisation audit

Reference workflows are daily notes, supervision and governance/Reg flows. Every operational entity should converge on create, draft, submit, review, approve/sign-off, return, archive, chronology propagation, evidence linkage, ORB retrieval, alerts, reports and audit trails.

Domains that still need deeper standardisation are reports, documents, academy, actions/tasks, inspection and provider oversight.

## 3. Chronology consolidation summary

Chronology is the operational memory plane. New work should route writes through `ChronologyWriter` and reads through `ChronologyProjectionService` via `chronology_engine`.

Remaining migration targets are `/os/chronology`, `services.os_chronology_service`, domain-specific timeline builders and startup chronology fallback patches.

## 4. ORB consolidation summary

ORB is the single operational reasoning layer. The standard context contract is `services.intelligence.orb_context_engine.build_context`, backed by shared assistant context, chronology projection, evidence graph and operational memory replay.

Duplicate assistant route families remain mounted for compatibility and should converge behind the ORB contract.

## 5. Document operationalisation summary

Documents and templates are operational entities. Their standard lifecycle is create, draft, submit, review, approve/sign-off, return and archive, with chronology, evidence, governance, ORB, reporting, alerts, versioning and sign-off linkage.

## 6. Reporting consolidation summary

Reports should source chronology, evidence, risk, operational summaries, ORB intelligence, governance insight, trends and linked operational records. Report stubs and mixed direct chronology/evidence reads remain migration targets.

## 7. Academy migration summary

Academy APIs are mounted through the router registry. Academy remains shell-fragmented because the user experience is still legacy HTML until Next.js parity exists under Workforce OS.

Training completions, workbook submissions, workbook reviews, competency sign-offs and certification expiry must propagate into workforce, governance, chronology, evidence, ORB and compliance.

## 8. Operational event consolidation summary

The propagation standard is `OperationalEvent -> operational_event_bus.publish -> RealtimeEventBus`. Do not add another realtime system.

Direct realtime publishers, legacy browser bus producers and workflow-derived alerts should migrate to the facade.

## 9. Frontend shell consolidation summary

Next.js is the strategic shell. Desktop `AppShell` and mobile navigation now share `operational-navigation.ts`, and child workspace pills share `childWorkspaceNavigation`.

Legacy HTML shells are compatibility-only until parity is complete.

## 10. Operational graph linkage summary

No graph database is required. Operational linkage is formalised through entity link contracts over chronology, evidence and replay sources for children, workforce, incidents, safeguarding, governance, chronology, documents, reports, ORB, evidence, actions, alerts and inspections.

## 11. Explainability implementation summary

ORB outputs must carry evidence references, chronology references, linked records, operational rationale, confidence visibility and audit-safe reasoning. The runtime contract is `orb_context_engine.explainability_contract`.

## 12. Platform integrity matrix summary

The live matrix validates: Domain, Workflow, Chronology, ORB, Evidence, Reports, Alerts, Dashboard and Documents.

Covered domains are children, workforce, governance, safeguarding, inspections, documents, academy, provider oversight, ORB, reports, templates, chronology, alerts, actions/tasks and realtime events.

## 13. Production hardening summary

Hardening focus is consumer convergence rather than new infrastructure: stale retrieval reduction, duplicate adapter removal, shell consistency, audit integrity, operational refresh consistency, role-aware visibility and provider-safe isolation.

## 14. Deprecated pathway registry

| Pathway | Replacement | Status |
| --- | --- | --- |
| `/os/chronology` | `/api/operational-memory/chronology` | Deprecated read path |
| `backend/os_command_*` routers | Next.js shell plus OS live gateways | Unmounted deprecated stack |
| `services.os_chronology_service` direct reads | `ChronologyProjectionService` | Deprecated service path |
| Report compatibility lifecycle stubs | Intelligence-aware report lifecycle | Stubbed deprecated behaviour |
| Legacy staff nav fallback links | `operational-navigation.ts` | Deprecated navigation contract |

## 15. Compatibility-only registry

| Surface | Examples | Retirement dependency |
| --- | --- | --- |
| Legacy HTML/JS shell | `os-command-runtime.html`, `young-people-shell.html`, `academy.html` | Next.js parity |
| Young people compatibility routes | Missing episodes, documents, safeguarding, remaining lifecycle | Canonical child route parity |
| Assistant partner/chat routes | `/v1/assistant`, `/chat` | External client migration |
| Home inspection compatibility routes | Inspection compatibility APIs | Inspection OS parity |

## 16. Files changed

- `services/intelligence/contracts.py`
- `services/platform_operational_integrity_service.py`
- `core/router_loader.py`
- `frontend-next/components/indicare/app-shell.tsx`
- `tests/test_platform_operational_integrity_service.py`
- `tests/test_router_loader_grouping.py`
- `tests/test_workforce_journey_os.py`
- `docs/sprints/sprint-d-operational-integrity.md`

## 17. Services added

No new disconnected services were added. Existing central services were extended and wired.

## 18. Routes migrated

- `routers.academy_routes`
- `routers.academy_intelligence_routes`

Both are now in the canonical router registry.

## 19. Tests added

- Platform integrity matrix now validates the Documents pillar and Sprint D registries.
- Router loader tests now validate academy route mounting.
- Workforce shell smoke tests now validate the shared operational navigation contract.

## 20. Hidden unfinished areas

- Academy still needs a Next.js strategic shell surface.
- Document sign-off is not consistently append-only lifecycle memory across all sources.
- Report compatibility lifecycle endpoints remain stubs.
- Multiple assistant route families remain mounted.
- Multiple chronology read paths remain active.

## 21. Remaining operational risks

- Route shadowing can make ORB/realtime behaviour depend on mount order.
- Runtime compatibility DDL can hide schema drift.
- Missing operational memory tables can degrade replay silently.
- Legacy browser event bus does not reconcile with server replay.

## 22. Recommended next maturity phase

Consumer convergence:

- Migrate reporting and assistant reads to chronology projection and evidence graph.
- Wire academy workbook/training events into workforce chronology and governance evidence.
- Replace duplicate assistant handlers with ORB context engine entrypoints.
- Add writeback integration coverage for save, memory, chronology, ORB and report retrieval.
- Move academy from legacy HTML to the Next.js operational shell.
