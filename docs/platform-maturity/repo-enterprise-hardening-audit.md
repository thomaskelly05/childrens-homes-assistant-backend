# Repo enterprise hardening audit

Date: 2026-05-16

Scope: routers, services, repositories, schemas/DTOs, lifecycle, chronology, audit, evidence, governance, provider tenancy, RBAC, realtime/event bus, assistant runtime, frontend adapters, websocket orchestration, operational queues, inspection readiness, durability/recovery, chronology replay, event propagation and assistant trust boundaries.

## Executive summary

IndiCare OS has strong operational foundations, but enterprise risk now sits in drift between otherwise capable subsystems. The highest-risk areas are duplicated role logic, fragmented audit/history stores, provider/home scope assumptions, frontend live/demo ambiguity, non-uniform realtime replay and broad use of generic dict contracts in regulated flows.

## Enterprise audit matrix

| Subsystem | Current maturity | Enterprise risk | Fragmentation risk | Trust risk | Scalability risk | Recommended consolidation | Recommended canonical architecture | Migration notes | Unresolved blockers |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Router surface | Intermediate | Large route surface makes canonical ownership unclear. | Compatibility, OS, standalone assistant and legacy routes overlap. | Some governance/inspection helper routes need explicit auth and scope review. | Startup and route conflict review will become noisy. | Classify every route as canonical, adapter or legacy. | `core.router_loader` remains the route registry and conflict inventory. | Add new canonical routers without changing existing paths. | Full route-by-route auth proof still needed. |
| Services | Emerging | Multi-purpose modules blur bounded contexts. | Assistant, document OS, inspection and lifecycle helpers return ad hoc dicts. | Prompt/context services can assemble too much before filtering. | Provider aggregation over services can fan out heavily. | Stable facades returning versioned DTOs. | Domain services emit audit, memory and realtime side effects through canonical repositories. | Keep working APIs; migrate internals first. | Some large services need later decomposition. |
| Repositories | Intermediate | SQL scope logic is safety-critical and was role-aware in multiple places. | `os_repository_utils`, auth, middleware and services duplicated role/home logic. | Provider/home leakage possible when helper semantics differ. | Append-heavy history needs indexing and retention planning. | Resolve one `ProviderContext` before query composition. | Scoped repositories use `ProviderContext` and policy decisions. | Existing repository signatures stay unchanged. | DB-level RLS coverage remains unproven. |
| Provider tenancy | Emerging | Single-home assumptions remain in user claims and middleware. | Provider dashboards, assistant retrieval and realtime subscriptions resolve scope differently. | Cross-home/provider leakage risk if provider-wide access is implicit. | Provider aggregation needs indexed projections. | Canonical `ProviderContext`. | Session-derived provider, homes, role, permissions and access flags used everywhere. | Existing user dicts are adapted rather than replaced. | True multi-home assignments still require DB source of truth. |
| RBAC/policy | Intermediate | Role literals and role ladders drift across layers. | Auth, repositories, middleware, assistant security and document OS keep local sets. | Route-level role checks can diverge from repository checks. | Permission expansion becomes hard to audit. | Canonical `core.policy_engine`. | All checks evaluate permission + provider/home context. | Preserve current aliases while moving checks. | Middleware/document OS still need full migration. |
| Lifecycle | Intermediate | Snapshots existed without durable append-only memory everywhere. | Status normalization, workflow events and lifecycle DTOs can diverge. | Lifecycle visibility must be home/provider scoped. | Replay/history queries need append-first tables. | Persist transitions to operational memory tables. | Lifecycle transition writes append to lifecycle, audit and event log histories. | `transition_record` now writes memory if tables exist. | Backfill from existing workflow/audit tables not done. |
| Chronology | Intermediate | Multiple chronology tables/readers can fragment inspection story. | `chronology_events`, `os_chronology_events` and dynamic OS chronology overlap. | Client-supplied chronology analysis is not a trust boundary. | Union queries need snapshots/cursors. | Canonical chronology snapshot history. | Chronology IDs link into memory, audit, evidence and inspection DTOs. | New memory tables include `chronology_snapshot_history`. | Read-plane migration still outstanding. |
| Audit | Emerging | Platform audit, OS audit, AI audit and document audit are separate. | Event envelopes differ by source. | Audit replay can leak if not scoped and redacted. | Replay/export needs indexed event timelines. | Canonical `AuditTimelineEvent`. | `operational_audit_timeline` is append-only with correlation IDs and replay metadata. | Existing audit sinks remain while canonical repository is introduced. | Full sink migration is pending. |
| Evidence graph | Emerging | Static/stub evidence routes coexist with repository-backed evidence. | Evidence edge shapes exist in lifecycle DTOs and inspection surfaces. | Evidence visibility must enforce provider/home scope before rendering. | Provider evidence gap retrieval needs indexes. | Canonical evidence relationship history. | Evidence lineage links lifecycle, chronology, audit and inspection contracts. | New memory tables support append-only evidence relationship history. | Stub route retirement is pending. |
| Governance | Emerging | Sign-off and AI governance trails are not one timeline. | Document, inspection and provider governance metadata differ. | Provider governance visibility requires permission gating. | Signoff history needs queryable append tables. | Shared signoff history and audit DTOs. | Governance signoffs append to `governance_signoff_history`. | Lifecycle transitions now capture signoff metadata. | Existing document signoff migration is pending. |
| Inspection readiness | Emerging | Reg44, Reg45, Annex A and SCCIF payloads are fragmented. | Generic dict handling hides payload drift. | Synthetic/demo inspection data can be confused with live readiness. | Provider inspection queues need aggregated projections. | `schemas.inspection_contracts`. | Typed inspection DTOs with chronology, evidence, lifecycle, governance, audit and signoff links. | Contracts added before route/frontend migration. | Frontend consumers still need migration. |
| Realtime/event bus | Intermediate | In-memory replay is insufficient for enterprise reconnect. | Emitters are sparse and refresh logic is duplicated. | Subscription must enforce same scope as reads. | Multi-worker replay needs durable event log. | Canonical replay API and cursor semantics. | `RealtimeAwarenessEvent` plus `/api/realtime/replay` over permission-filtered bus buffers, backed later by event log. | Cursor replay added for current bus. | Durable multi-worker replay storage still pending. |
| Operational queues | Intermediate | Queue states can drift from lifecycle/audit history. | Upload/export/retry paths use separate semantics. | Queue payloads need redaction and provider/home scope. | Worker scale needs DB-backed observation. | Queue reconciliation tied to operational event log. | Queue changes should append event/memory rows and emit realtime events. | Documentation updated; code migration remains targeted. | Full queue replay/reconciliation endpoints pending. |
| Assistant runtime | Intermediate | Multiple assistant surfaces can produce inconsistent citations and oversight. | Embedded, standalone, ORB and legacy adapters share concepts with different contracts. | Retrieval must filter before prompt/citation assembly. | Context assembly needs bounded provider/home retrieval. | Use `ProviderContext` in retrieval and oversight markers. | Deterministic-first retrieval with chronology/evidence/lifecycle citations and degraded-context warnings. | Retrieval scope check now uses canonical context. | Full citation integrity audit remains pending. |
| Frontend adapters | Emerging | Live/demo blending reduces operational trust. | Legacy and Next duplicate timelines, inspection, assistant and realtime patterns. | Client permission gating is UX only. | Server components fan out and lack one invalidation protocol. | Shared typed operational primitives and provenance metadata. | Frontend consumes versioned DTOs and exposes `synthetic` provenance explicitly. | `OsApiSource` now distinguishes `synthetic`. | Component migration/manual UX proof remains pending. |
| Websocket orchestration | Emerging | Legacy WebSocket/SSE and Next ORB realtime diverge. | Reconnect logic differs by stack. | Hidden operational data must not cross realtime channels. | Multi-tab/multi-worker reconnect needs durable cursors. | One invalidation/replay contract per operational event type. | Realtime replay API with cursor/timestamp and home scope. | Current bus replay supports cursor/timestamp. | Legacy listener consolidation pending. |
| Durability/recovery | Intermediate | Recovery primitives exist but not all write paths append durable state. | Queue, audit, lifecycle and realtime recovery can diverge. | Failed partial saves need audit-visible outcomes. | Event ordering and duplicate handling need persistence. | Append-first operational memory. | Event log + lifecycle history + audit timeline + replay references. | New migration adds required append-only tables. | Backfill and repair tooling pending. |

## Duplicated contracts and stale architecture found

- Role literals appear in auth permissions, repository utilities, middleware, assistant security, document OS and several routers.
- Audit exists as platform `audit_events`, OS `os_audit_events`, document forensic audit stubs and partner assistant audit.
- Chronology uses multiple source/read tables and dynamic projections.
- Realtime has a good bus, but most write paths do not publish through one durable orchestrator.
- Frontend has Next.js, legacy vanilla, and `indicare-ai` assistant/runtime surfaces with overlapping realtime and assistant concepts.
- `Record<string, unknown>`, `Record<string, any>` and `OsApiResult<any>` remain in live frontend surfaces.
- Demo pages and live OS pages do not yet share explicit provenance semantics.

## Canonical consolidation decisions in this sprint

- Provider/home/user scope resolves through `core.provider_context.ProviderContext`.
- Permission decisions resolve through `core.policy_engine`.
- Append-only operational history tables are introduced for lifecycle, audit, event log, signoff, evidence relationships and chronology snapshots.
- Audit and inspection DTOs are versioned in dedicated contract modules.
- Realtime replay now exposes a permission-filtered `/api/realtime/replay` cursor endpoint.
- Provider oversight endpoints are introduced behind provider policy checks.

## Remaining enterprise blockers

- Multi-home assignments are still inferred from user claims; a DB-backed user-home membership source is required.
- Middleware and document OS still contain duplicated role literals.
- Existing audit sinks need migration into the canonical audit timeline.
- Existing chronology read models need one canonical replay/snapshot strategy.
- Realtime replay is cursor-capable but still process-local until backed by `operational_event_log`.
- Frontend component consolidation and manual UX validation remain incomplete.
