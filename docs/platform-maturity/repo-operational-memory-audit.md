# Repo Operational Memory Audit

Fresh audit date: 2026-05-16

This audit covers chronology systems, lifecycle persistence, replay, audit sinks, websocket orchestration, operational queues, evidence traversal, governance review paths, provider oversight, frontend rendering/invalidation, assistant chronology and operational-state usage, inspection evidence, signoff persistence, event replay, and reconciliation.

| Subsystem | Maturity | Replay safety | Tenancy safety | Chronology integrity | Trust risk | Frontend fragmentation | Event fragmentation | Durability gaps | Consolidation recommendation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Operational memory tables | Medium | Append-only tables exist, but read surfaces were incomplete. | Provider/home columns exist on memory tables. | Chronology snapshots only written when IDs are present. | Parallel ledgers could diverge from live state. | Not directly rendered. | Lifecycle, audit, event, evidence, signoff tables are written separately. | No canonical replay API before this sprint. | Use `services/operational_memory_replay_service.py` as canonical read/export plane. |
| Lifecycle persistence | Medium-high | Transitions persist to workflow/audit/memory for main writeback path. | Writeback resolves scoped records before update. | Chronology row creation is optional by table availability. | Partial lifecycle contexts cannot always be reconstructed from old rows. | Multiple lifecycle panels exist. | Realtime publish remains separate from DB insert. | Comments/review requests are not fully promoted into memory tables yet. | Route lifecycle reads through memory replay and reconciliation checks. |
| Chronology read planes | Medium | Legacy chronology list is deterministic by timestamp but not replay cursor aware. | Uses scoped SQL helpers. | Multiple source tables and snapshot history coexist. | Duplicate aggregators can show inconsistent timelines. | Next and legacy have separate chronology/timeline renderers. | Chronology, workflow, and audit events propagate independently. | Snapshot history coverage depends on references. | Use `services/chronology_projection_service.py` for canonical projection views. |
| Durable realtime replay | Low-to-medium | Previous `/api/realtime/replay` used process-local buffers. | In-memory replay checked home scope. | No chronology projection linkage. | Reconnect after process restart could miss events. | No shared websocket invalidation primitive. | Redis/local bus and DB event log were separate. | Process-local deque was non-durable. | `/api/realtime/replay` now reads `operational_event_log` through `services/realtime_replay_service.py`. |
| Audit sinks | Medium | `audit_events`, `os_audit_events`, and operational audit timeline all exist. | Some audit reads filter by entity only. | Audit chronology links are uneven. | Duplicate audit contracts risk drift. | Audit cards are placeholder in some workspaces. | Multiple writers use different shapes. | `audit_timeline_repository` was not integrated into app routes. | Treat `operational_audit_timeline` as replay plane and reconcile missing propagation. |
| Evidence traversal | Medium | Evidence relationship history exists. | Memory replay applies provider/home scope. | Evidence links can connect chronology and lifecycle. | Fragmented side panels make why-linked explanations inconsistent. | Evidence cards/panels are duplicated. | Evidence graph event type existed without canonical traversal. | No traversal API before this sprint. | Use `services/evidence_graph_service.py` and canonical traversal DTOs. |
| Provider oversight | Medium | Oversight services could aggregate caller-supplied records only. | ProviderContext foundations are strong. | Queue items did not consistently link chronology. | Empty-provider queues could mask risk. | Management page renders queues/lifecycle in separate patterns. | Provider queues not replay-derived. | No durable provider queue engine. | Use `services/provider_operational_queue_service.py` over replayable memory. |
| Operational queues | Medium | DB queue has retry/reconciliation, but not provider memory queues. | Scope string is weaker than typed tenant columns. | Chronology gap queue derivation was ad hoc. | Stale queues may persist after partial propagation. | Duplicate queue tables/cards exist. | Queue state not tied to event log. | No event-log derived recovery queue. | Reconcile stale queues and derive provider queues from memory events. |
| Governance and signoff | Medium | Signoff metadata persists when lifecycle context includes it. | Governance permission exists in policy engine. | Signoff chronology links are partial. | Document signoff and governance signoff can narrate separately. | Governance panels are not projection-backed. | Signoffs can miss event-log propagation. | Partial coverage outside transition path. | Replay governance through `/api/operational-memory/governance` and reconciliation jobs. |
| Inspection evidence | Medium-high contracts, medium integration | Inspection DTOs are typed. | Routes rely on current auth boundaries. | Inspection evidence can appear in chronology source tables. | Soft failure paths can hide data quality problems. | Readiness panels use separate evidence shapes. | Evidence and inspection events are not reconciled globally. | No canonical evidence traversal API before this sprint. | Link inspection evidence through chronology projections and evidence traversal. |
| Assistant operational trust | Medium | Assistant retrieval uses chronology services but not replay projections. | ProviderContext foundations exist. | Citations can point to chronology, not always projection IDs. | Assistant can operate with degraded or partial operational context. | Standalone and ORB surfaces differ. | Oversight markers DTO exists but is not fully wired. | Replay-safe assistant markers remain partial. | Require canonical projections/traversal for chronology and citation enrichment. |
| Frontend operational rendering | Medium | No replay cursor or ordering guarantee in UI types before this sprint. | Depends on backend scoping. | Multiple timeline renderers sort/synthesise differently. | Demo/live blending can mislead operators. | High: Next and legacy render timelines/evidence/queues differently. | No global invalidation contract. | UI can show stale snapshots after reconnect. | Use canonical operational primitives and typed replay-aware DTOs. |
| Websocket orchestration | Mixed | Orb path is stronger; OS command/connect paths remain query-param room based. | Some legacy websockets are not identity-bound in code. | Websocket events are not projection-derived. | Cross-tenant subscription risk on unauthenticated legacy sockets. | Legacy cache invalidation is prefix-based. | Duplicate websocket listeners and HTTP refresh logic. | Non-durable local replay buffers. | Harden legacy websocket auth and route replay through `operational_event_log`. |
| Reconciliation | Low | Queue retry reconciliation exists, cross-ledger reconciliation did not. | New reconciliation uses scoped memory replay. | Orphan chronology references were not detected. | Missing replay/audit propagation could remain silent. | No frontend recovery state. | Lifecycle/audit/event gaps not checked together. | No repair job registry before this sprint. | Use `services/event_reconciliation_service.py` and `repair/reconciliation_jobs.py`. |

## Duplicate and stale paths identified

- Duplicate chronology renderers: `frontend-next/components/indicare/chronology-foundation.tsx`, `frontend-next/components/indicare/ui.tsx` `RecordTimeline`, workspace timelines, and legacy `frontend/js/young-people-shell/features/timeline.js`.
- Duplicate lifecycle rendering: aggregate lifecycle panel, workspace lifecycle panel, and management queue tables.
- Duplicate event propagation: writeback memory inserts, local realtime bus publish, audit sinks, and legacy websocket listeners.
- Stale refresh risk: Next pages rely on fresh server navigation; legacy cache invalidation is prefix based and not replay cursor aware.
- Replay inconsistency: previous realtime replay came from in-memory buffers while durable audit replay lived elsewhere.
- Unsafe generic records: management queues and workspace generic records still use broad records in places.
- Frontend drift: demo chronology/detail fallbacks coexist with live OS chronology responses.

## Consolidation outcome of this sprint

- Canonical operational replay service added.
- Canonical chronology projection service added.
- Durable realtime replay service added over `operational_event_log`.
- Canonical evidence traversal service added.
- Provider-wide replay-derived operational queue service added.
- Event reconciliation service and dry-run repair job entrypoint added.
- Frontend replay-aware operational DTOs and canonical primitives added.

## Remaining trust risks

- Some write paths outside lifecycle transitions still do not persist to every operational memory plane.
- Legacy unauthenticated websocket entrypoints still need hardening.
- Frontend pages must be progressively migrated to canonical primitives.
- Existing database migrations do not add tenant columns to old operational queue tables.
- Assistant runtime still needs full projection/traversal adoption for every citation path.
