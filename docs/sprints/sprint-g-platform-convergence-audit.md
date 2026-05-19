# Sprint G - Platform Convergence Audit

Purpose: audit already-built IndiCare OS systems, stop parallel intelligence paths, and converge ORB, UI, governance and reporting on one operational truth. This is an implementation audit, not a request to create replacement modules.

## Executive source-of-truth decisions

| System area | Chosen single source of truth | Keep | Deprecate / compatibility only | Wire into ORB | Wire into UI | Genuinely missing |
|---|---|---|---|---|---|---|
| ORB / assistant | `POST /api/orb/conversation` and `services/orb_operational_context_service.py` | `/orb/conversation`, `/api/orb/conversation`, `orb_response_composer`, existing cognition services | Legacy SSE assistant routes, unmounted OS assistant bridge, duplicate `/assistant/realtime` scaffolds | Operational context, metadata-first snapshots, care journey, therapeutic/regulatory/cognition/risk layers | `/orb`, embedded ORB panel, voice session text fallback | Migration of all legacy SSE clients to the canonical route |
| Voice ORB | `services/orb_voice_session_service.py` using the same ORB context/response builder for care turns | `/orb/realtime/session`, `/orb/session/{id}/event`, mock and OpenAI provider fallback | Legacy `/assistant/realtime/ws` for AI suite only | Same context, citations, cognition, safety, risk and regulatory layers as text ORB | ORB button/modal and standalone voice surfaces | Full browser voice UX parity on degraded provider states |
| Chronology | `ChronologyWriter` for writes; `/os/chronology` as current UI read; `ChronologyProjectionService` as target projection read | `chronology_events`, `os_chronology_service`, operational-memory projection/replay | Direct `/api/chronology`, young-person timeline direct reads, OS command chronology routers | Chronology records and projection snapshots | Next chronology pages and child chronology pages | Complete page migration to projection-derived reads |
| Documents | `document_engine_routes.py` and document metadata/evidence linkage as target model; current child/statutory/library routes remain bridged | Child documents, statutory workflow, document library, extraction/sign-off services | Duplicate `/document-ai/review`, client-only template catalogue as operational source | Document metadata, linked evidence, review/sign-off state | Documents hub and child documents pages | One persisted cross-store document lifecycle view |
| Governance / inspection | `GovernanceIntelligenceService` and `RegulatoryOntologyService` | `/api/governance-os`, `/inspection/readiness`, evidence repository, Reg 44/45 builders | Unmounted `os_command_*`, static evidence stubs, demo provider routes | Governance summary, evidence matrix, Reg 44/45 context, SCCIF links | Command centre, governance command centre, inspection pages | Reg 44 reader ingestion not mounted into governance lifecycle |
| Workforce | `WorkforceJourneyService` + `WorkforceIntelligenceService` under `/api/workforce-os` | Staff profile, supervision, training matrix, probation, evidence, workforce ORB context | Legacy `/supervision/submissions`, duplicate staff profile/list APIs as write targets | Workforce summary, recording quality, training/supervision evidence | Staff dashboard, staff command centre and workforce pages | Migration plan from staff journal submissions into workforce-os supervision |
| Young people | Child profile bundle via workspace repositories and Next `/young-people/[id]/*` | Profile, journey, chronology, documents, plans/risk/safeguarding routes | Legacy young-people shell monolith and modular shell once Next parity is confirmed | Child profile, care journey, chronology, risk and document metadata | Young people list/profile/workspace pages | Explicit child voice and relationship rollup route |
| UI shell | `frontend-next/components/indicare/app-shell.tsx` + `lib/navigation/operational-navigation.ts` | Sprint F shell, electric-blue navigation, ORB presence | Orphan `os-shell.tsx`, `context-rail.tsx`, old HTML shell links | ORB panel gets unified operational context | One nav: Command Centre, Young People, Daily Care, Chronology, Documents, Workforce, Governance, Inspection, Reports, ORB, Admin | Removal/redirect of legacy backend links |
| Runtime / realtime | `services/realtime_event_bus.py` with ORB WS at `/orb/realtime/ws` | Realtime event bus, operational event bus, notification routes | Duplicate client event buses and `/ws/os-command` as primary operational bus | ORB operational events and voice state | Notification bell, alerts panel, ORB state | Next subscriber wiring after mutations |

## Duplicated or overlapping systems found

### ORB / assistant

Current services/routes/components found:
- `routers/orb_routes.py`: `/orb/conversation`, `/api/orb/conversation`, `/orb/realtime/session`, `/orb/session/{id}/event`, `/orb/realtime/ws`.
- `routers/assistant_query_routes.py`: `/assistant/query`.
- `routers/assistant_os_routes.py`, `routers/young_people_assistant_routes.py`, `routers/assistant_general_routes.py`, `routers/assistant_realtime_voice_routes.py`, `routers/assistant_realtime_proxy_routes.py`.
- `services/orb_response_composer.py`, `services/orb_voice_session_service.py`, `services/assistant_retrieval_service.py`, `services/assistant_context_service.py`, `services/orb_*reasoning*`, `services/orb_*cognition*`, `services/orb_*safety*`.
- Frontend callers in `frontend-next/lib/os-api/orb.ts`, `frontend-next/lib/orb/*`, `components/indicare/orb/*`, `components/orb-operational/*`, `components/orb-standalone/*`, plus legacy `indicare-ai/realtime/*`.

Duplication:
- Text ORB and voice ORB used different answer builders.
- Legacy SSE assistant routes overlap with ORB operational chat.
- Three realtime assistant/voice route families share similar intent.

Decision:
- Keep `/api/orb/conversation` as canonical text route and `/orb/session/{id}/event` as the voice-session event route.
- Converge voice care turns through the same `build_orb_context` / `build_orb_response` pathway.
- Keep `/assistant/query` for standalone assistant and compatibility, not as the embedded OS intelligence source.

### Chronology

Current services/routes/components found:
- `services/chronology_writer.py`, `services/os_chronology_service.py`, `services/chronology_projection_service.py`, `services/operational_memory_replay_service.py`, `services/intelligence/chronology_cache.py`.
- Routes: `/os/chronology`, `/api/operational-memory/chronology`, `/young-people/{id}/timeline`, `/api/chronology`, `/api/realtime/replay`.
- Next pages: `/chronology`, `/young-people/[id]/chronology`; legacy chronology pages and young-person shell timeline.

Duplication:
- Three read models: federated `/os/chronology`, projection `/api/operational-memory/chronology`, direct `chronology_events`.
- Two chronology tables are active in code: `chronology_events` and `os_chronology_events`.

Decision:
- Keep `ChronologyWriter` as write source.
- Keep `/os/chronology` as current UI compatibility read.
- Promote `ChronologyProjectionService` as target read for ORB/governance/report projections.

### Documents

Current services/routes/components found:
- Routes: `/api/document-system`, `/child-documents`, `/young-people/{id}/statutory-documents`, `/documents/library`, `/api/document-os/*`, `/documents/{type}`, `/os/documents`.
- Services: `document_os_core`, `document_template_service`, `child_documents_service`, `document_signoff_service`, `document_extraction_service`, `document_ai_review_service`, `documents_repository`.
- Next: `/documents/**`, `/young-people/[id]/documents/**`; legacy `document-os.html`, `documents-hub.html`, young-person shell documents feature.

Duplication:
- Four stores: `document_instances`, `child_documents`, `statutory_documents`, `documents`.
- Two template registries and duplicate `/document-ai/review`.

Decision:
- Keep existing stores but make document metadata/evidence/chronology linkage the shared ORB/UI contract.
- Treat `/api/document-system` as the target model and `/os/documents` as current federated UI read.

### Governance / inspection

Current services/routes/components found:
- `GovernanceIntelligenceService`, `RegulatoryOntologyService`, `OfstedEvidenceEngineService`, `inspection_readiness_service`, `inspection_pack_service`, `assistant/reg45_builder.py`.
- Routes: `/api/governance-os/*`, `/inspection/readiness`, `/inspection-pack`, `/os/evidence`, `/os/ofsted-readiness`, `/api/provider/*`, `/provider/intelligence`.
- Next: `/command-centre`, `/governance/command-centre`, `/ofsted-readiness`, `/evidence`, `/regulatory`.

Duplication:
- SCCIF mapping appears in backend ontology, frontend static mapping and legacy young-person shell.
- Provider oversight has multiple named APIs with overlapping dashboard intent.
- Several `os_command_*`, Reg 44 reader and static evidence routers are unmounted.

Decision:
- Governance OS is the command-centre source.
- Regulatory ontology is the SCCIF/QS/regulation source.
- Frontend should render backend matrix/summary, not recompute operational SCCIF coverage as truth.

### Workforce

Current services/routes/components found:
- `/api/workforce-os/*`, `/staff-journal/*`, `/supervision/submissions`, `/staff/*`, `/academy/*`.
- `WorkforceJourneyService`, `WorkforceIntelligenceService`, `staff_profile_service`, `staff_journal_service`, `staff_development_service`.
- Next `/staff/**`; legacy staff journal/supervision pages and young-person shell team/training features.

Duplication:
- Formal supervision exists in workforce-os and legacy supervision submissions.
- Training appears in workforce-os matrix and academy competency/compliance.
- Staff profile/list APIs have multiple shapes.

Decision:
- Workforce OS is operational source.
- Academy remains learning/competency product surface.
- Staff journal remains reflective input and should feed workforce supervision/evidence rather than parallel management truth.

### Young people, child voice, relationships, impact and safeguarding

Current services/routes/components found:
- Workspace repositories, child profile bundle pages, chronology, plans/risk/safeguarding/missing/health/education/family contact/keywork routes, risk intelligence services, child documents.
- ORB care journey, therapeutic reasoning, risk intelligence and chronology services already exist.

Duplication:
- Legacy young-person shell and Next child workspace overlap.
- Child voice appears in documents/keywork/wishes-feelings style fields but no single extracted rollup.
- Relationship intelligence is distributed across family contact, keywork, emotional safety, workforce consistency and therapeutic reasoning.

Decision:
- Keep Next child workspace and existing child profile bundle as UI source.
- Feed ORB from profile, chronology, documents, risk, safeguarding and evidence metadata.
- Missing: a persisted child voice / relationship rollup; until then ORB must state when child voice is weak.

### UI shell and runtime

Current services/routes/components found:
- Canonical Next shell: `frontend-next/app/layout.tsx`, `components/indicare/app-shell.tsx`, `lib/navigation/operational-navigation.ts`.
- Legacy shells: `os-command-runtime.html`, `young-people-shell.html`, `os-dashboard.html`, `documents-hub.html`, `document-os.html`, legacy shell JS and nav files.
- Runtime: `services/realtime_event_bus.py`, operational event bus, ORB websocket, assistant websocket proxy, connect websocket, notification routes.

Duplication:
- Multiple shells and nav systems.
- Four ORB component namespaces.
- Several client-only event buses.

Decision:
- Sprint F Next shell and operational navigation are UI source.
- Keep legacy shells only as compatibility while backend links migrate.
- Use server realtime event bus as source; client event helpers should subscribe to that, not become separate truth.

## Deprecation and redirect candidates

- Compatibility wrappers to keep: `/api/orb/*`, `/orb/realtime/session/*`, `/assistant/query`, `/assistant/general/stream`, `/assistant/realtime/ws` for legacy AI suite.
- Deprecate toward canonical ORB: `/young-people/assistant`, `/home/assistant`, `/quality/assistant`, legacy `/assistant/os/*/stream`.
- Do not mount without explicit decision: `backend/os_assistant_bridge_router.py`, `routers/indicare_ai_realtime_routes.py`, `backend/os_command_*`, `backend/reg44_*`, static `routes/provider_intelligence.py`.
- Backend legacy hrefs to replace: `/young-people-shell`, `/os-dashboard`, `/care-os#*`, `/documents-hub`.

## Sprint G convergence completed in this branch

- Implemented the previously incomplete `services/orb_operational_context_service.py`.
- Added metadata-first context construction in `services/orb_metadata_first_context_service.py`.
- Kept `/api/orb/conversation` as canonical and made it return the required ORB intelligence payload.
- Routed ORB voice care turns through the same context and response builder while preserving existing voice session lifecycle and provider fallback.
- Updated the Next ORB adapter type to describe the converged response fields.

## Remaining gaps

- Legacy assistant SSE routes still need staged frontend migration.
- Chronology projection route is not yet the primary Next UI read.
- Document lifecycle is still federated across several stores.
- Child voice and relationship intelligence need a persisted rollup sourced from existing records.
- Legacy shell links should be redirected to Next routes once product parity is confirmed.
