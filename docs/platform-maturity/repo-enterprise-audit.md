# Repo enterprise audit

Date: 2026-05-16

Purpose: consolidate IndiCare OS as an enterprise operational governance and safeguarding intelligence platform. This audit is intentionally architectural; it is not a feature sprint plan and does not recommend duplicate systems.

## Executive summary

IndiCare OS already has mature foundations for chronology, operational state, lifecycle metadata, evidence graph thinking, inspection readiness, assistant governance, ORB separation, realtime awareness and durability recovery. The principal enterprise risk is now schema and workflow drift: similar concepts exist across routers, services, frontend adapters and persistence tables with inconsistent names, trust boundaries and read/write paths.

The next consolidation layer should make transport contracts, tenancy context, audit timelines, lifecycle memory and realtime events canonical before new operational intelligence is added.

## Enterprise risks found

| Risk | Current maturity | Concern | Recommended consolidation |
| --- | --- | --- | --- |
| DTO drift | Early to emerging | Inline router models and loose `dict` payloads coexist with canonical `schemas.operational_state` models. | Version shared DTOs first, then migrate routers and frontend adapters to those contracts. |
| Trust boundary drift | Emerging | Some helper routes and intelligence payload flows accept client-provided records or header-derived user context. | Use auth/session-derived user context and server-assembled operational slices for sensitive data. |
| Audit fragmentation | Emerging | Platform audit, OS audit, AI audit, admin audit and roster audit are separate streams. | Use one audit timeline contract with correlation IDs and replay cursors. |
| Chronology fragmentation | Intermediate | Materialized chronology, dynamic OS chronology and client-supplied chronology analysis can diverge. | Keep one server-side chronology read contract and treat other surfaces as adapters. |
| Realtime ambiguity | Intermediate | Realtime bus is strong, but event names, refresh orchestration and replay semantics are not universal. | Publish canonical event DTOs from write paths and document reconnect/reconciliation contracts. |
| Provider readiness | Emerging | Provider settings exist, but provider-wide queues, audit visibility and role inheritance are not consistently expressed. | Introduce a canonical provider context and provider-safe DTO boundaries. |
| Frontend live/demo boundary | Emerging | Some Next.js detail views can combine live records with demo selectors. | Remove demo linkage from live operational views or gate it with explicit demo mode. |
| Migration sprawl | Emerging | DDL exists across `backend/db/migrations`, `db/migrations`, `migrations` and `sql`. | Consolidate a single migration runner/runbook with CI apply checks. |

## Subsystem audit

| Subsystem | Current maturity | Architectural strengths | Architectural weaknesses | Duplicated logic | Scalability concerns | Governance concerns | DTO concerns | Realtime concerns | Security concerns | Frontend concerns | Recommended consolidation | Recommended future architecture |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Backend app shell and routers | Intermediate | Central app factory, router groups, startup migration hook and intentional route conflict inventory. | Router count is high and some domains mount through separate paths. | Compatibility, standalone and OS routes overlap. | Startup mixes migrations, tables and product loops. | Soft failure responses can hide degraded inspection paths. | Inline router models and generic payloads remain common. | Router mutations do not universally emit canonical realtime events. | All sensitive endpoints should use session/JWT auth and tenancy checks. | Multiple frontend surfaces consume different route families. | Classify routes as canonical, adapter or legacy; fail CI on accidental conflicts. | API surface built from versioned domain contracts with explicit adapter deprecation. |
| Services | Emerging | Strong domain vocabulary across operational state, lifecycle, queues, assistant runtime, ORB and reliability. | Large service modules hold multiple bounded contexts. | `document_os_core` exports several unrelated services via thin aliases. | Synchronous and process-local patterns need clear worker/queue ownership. | Governance policy is distributed across gateway, prompts and service helpers. | Service responses often remain ad hoc dicts. | Refresh/recovery semantics split between several services. | Context assembly needs permission filtering at source. | Frontend adapters compensate for backend shape drift. | Split large modules into bounded services behind stable facades. | Service contracts return versioned DTOs and emit durable audit/realtime side effects. |
| Repositories and persistence | Intermediate | Evidence repository, operational writeback repository and scope utilities provide reusable access patterns. | Repository coverage is small relative to router/service count. | Role sets and status normalization appear in multiple places. | Append-heavy audit/history tables need retention and partition strategy. | Audit sinks are fragmented. | Repository outputs are normalized but not consistently typed. | Persistence does not uniformly drive realtime replay. | RLS intent exists but lacks integration proof. | Frontend cannot rely on one stable history API yet. | Route all scoped reads/writes through typed repositories. | Append-only domain event and snapshot repositories become the operational memory spine. |
| Lifecycle and operational state | Intermediate | Canonical lifecycle states, transition normalization, snapshots, sign-off, evidence edges and calm UX language exist. | Raw domain statuses still appear beside lifecycle state. | Feature-specific statuses can bypass lifecycle normalization. | History retrieval is not yet a provider-scale replay service. | Sign-off is represented but not uniformly persisted across domains. | Canonical DTOs needed schema version markers and stricter guards. | Lifecycle propagation needs a canonical realtime event. | Lifecycle reads must be scoped by home/provider/user. | Timeline components differ by page. | Treat lifecycle normalization as the only boundary interpreter. | Durable lifecycle history, replay APIs and one shared timeline renderer. |
| Chronology | Intermediate | OS chronology can assemble broad operational context and SCCIF-style tags. | Multiple chronology tables/read models and client-supplied analysis paths can diverge. | Dynamic union chronology and materialized chronology overlap. | Query fan-out over many source tables will need pagination and snapshotting. | Chronology is inspection-critical and must be audit-linked. | Chronology payloads need canonical IDs, source metadata and schema versions. | Chronology updates need deterministic dedupe/replay. | Client-provided chronology records are not an enterprise trust model. | Several chronology/timeline UIs exist. | Server-assembled chronology slices only; analytics take IDs/filters. | Append-only chronology event stream with snapshots and evidence/governance links. |
| Evidence and inspection | Emerging | Evidence graph foundations, inspection trace DTOs and readiness pages exist. | Stub/static evidence endpoints coexist with real repository-backed surfaces. | Reg44, Reg45, Annex A and readiness contracts are spread across modules. | Evidence coverage queries need indexed, paginated provider views. | Evidence strength, stale evidence and review history need durable governance linkage. | Inspection payloads need unified trace, gap and review DTOs. | Evidence changes should emit canonical inspection/evidence events. | Evidence visibility must be role and home scoped. | Some live inspection flows can depend on generic records. | Replace stubs with repository-backed evidence APIs or gate as demo. | Inspection intelligence reads from evidence lineage, chronology links and lifecycle history. |
| Governance and audit | Emerging | Audit timeline DTO, audit replay service, AI governance status and lifecycle sign-off exist. | Several audit sinks are not yet one enterprise audit plane. | Feature-specific audit renderers and logs can grow separately. | Replay cursors and exports need cross-stream correlation. | Provider governance visibility and AI policy decisions need one review trail. | Audit event envelope needs version, actor, entity, evidence and chronology fields everywhere. | Audit timeline events should be replayable after reconnect. | Audit visibility must not leak staff/child data across scopes. | Governance UX should show configured, needs-review and signed-off states consistently. | Funnel audit sinks into one timeline shape with correlation IDs. | Provider-visible audit replay and export APIs with permission-filtered projections. |
| Assistant runtime and ORB | Intermediate | ORB separation, safe orchestrator wrapper, provider AI settings, retrieval and oversight foundations exist. | Multiple assistant/orchestrator surfaces make explainability inconsistent. | Text assistant, standalone assistant and ORB share concepts without one runtime facade. | Context assembly can become expensive without bounded providers and confidence metadata. | Assistant governance needs citation, retrieval confidence and degraded-context audit linkage. | Assistant-context DTOs need versioned context, citations and why-surfaced metadata. | Assistant context refresh events need dedupe/reconnect handling. | Permission filtering must happen before retrieval and citation assembly. | Some assistant panels appear unused or aspirational. | Build one assistant runtime facade with modality-specific adapters. | Evidence-aware, chronology-aware assistant responses with oversight timeline integration. |
| Provider and tenancy | Emerging | Provider AI settings and access-scope helpers exist. | Single-home assumptions remain in queues, dashboards and some role flows. | Provider/home role literals are duplicated across auth, middleware and repositories. | Provider-wide dashboards need aggregated endpoints, not client fan-out. | Provider-level governance, audit and AI visibility require explicit policy boundaries. | Provider-safe DTOs should always carry provider/home scope metadata. | Provider-wide realtime must reconcile per-home and aggregate events. | Home isolation and provider role inheritance need integration tests. | Provider setup is partly static and not fully backend-driven. | Centralize provider context extraction and scope enforcement. | Provider context object consumed by RBAC, repositories, queues, audit and realtime. |
| RBAC and security | Intermediate | Canonical roles, permissions, aliases, middleware and data-protection tests exist. | Role sets are duplicated in repository utilities and middleware. | Legacy frontend role groups differ from Next.js permissions. | Permission matrices should be generated/consumed consistently. | Governance, audit and provider-only surfaces need explicit access contracts. | Permission-aware empty states need stable frontend contract. | Subscription permission checks exist in bus but not all clients share semantics. | Header-derived user helpers and loose payload endpoints are high-risk. | Client RBAC is UX only and must not be treated as enforcement. | Single role/permission source consumed everywhere. | Central policy decision helpers with fail-closed repository and realtime access. |
| Realtime and refresh orchestration | Intermediate | Event bus supports home scoping, dedupe, throttling, redaction and replay buffer. | Event meanings and refresh orchestration are not yet uniform across write paths and clients. | Legacy event buses, Next SSR refetching and ORB realtime are parallel mechanisms. | Local memory replay is not enough for multi-worker history. | Governance and inspection events need explicit replay/audit ties. | Realtime event DTO needs versioned envelope and stale-event metadata. | Reconnect, stale-event and duplicate-event protection should be universal. | Event payload redaction must include all child/staff sensitive fields. | Next lacks one invalidation channel shared by operational pages. | Publish canonical events from durable writes and reconcile queues on reconnect. | Durable event log + lightweight subscription protocol + permission-filtered replay. |
| Operational queues and durability | Intermediate | Queue service has idempotency, claims, retry decisions and metrics hooks. | Memory fallback can diverge from DB-backed semantics if used inconsistently. | Upload/export/job histories have separate status idioms. | Worker scale requires DB as the single observation source. | Failed saves and retries need audit-visible recovery stories. | Queue DTOs need version, idempotency and lifecycle fields. | Queue state changes should propagate as canonical events. | Retry payloads must be redacted and scoped. | Frontend save states need calm, permission-safe recovery messages. | Persist queue writes by default and use memory only as explicit degraded mode. | Replay-safe queues with reconciliation APIs and operator recovery tooling. |
| Search and query | Emerging | Smart search and unified search foundations exist. | Some search helpers operate over client-supplied in-memory records. | Standalone and OS search APIs overlap. | Provider-scale search needs indexed backend search and ACL filtering. | Search results must show evidence and chronology provenance. | Search result DTOs need stable type, scope and citation fields. | Search updates should react to event-driven invalidation. | Query filters must enforce home/provider scope server-side. | Frontend search should not compensate for backend inconsistencies. | Move regulated search to ACL-aware backend indexes. | Unified query service over chronology, evidence, audit and documents with explainable provenance. |
| Frontend architecture | Emerging | Next shell has permission-gated nav, active-child context and ORB isolation; legacy retains operational hydrators. | Legacy and Next duplicate assistant, inspection, chronology and dashboard stories. | Multiple timeline, card, assistant and event-bus implementations. | Server-rendered dashboards fan out to many APIs. | Governance UX is spread across dashboards, setup and inspection. | Frontend types use `UnknownRecord` in critical paths. | Next lacks global operational invalidation while legacy has fragmented events. | Client permissions are not authoritative. | Some components are unused; live/demo mixing risks trust. | Freeze or retire duplicated legacy surfaces as Next reaches parity. | Calm operational shell backed by aggregated projections, typed DTOs and shared timeline/rendering primitives. |
| Tests | Emerging | Broad unit tests cover lifecycle, chronology, inspection helpers, RBAC, data protection, ORB reconnect and durability services. | Integration coverage for DB migrations, RLS, replay and route permissions is thin. | Manual scripts live beside pytest tests and must be excluded. | Enterprise confidence needs ephemeral Postgres and provider/home matrices. | Governance/audit replay needs cross-stream tests. | DTO validation tests were missing before this sprint. | Realtime security tests are partly misnamed/discoverability-limited. | Cross-home route denial and hidden-data tests need expansion. | Frontend lint config is incomplete; typecheck remains useful. | Add targeted contract and persistence tests before broad UI expansion. | CI tiers: DTO/unit, route-contract, DB/RLS, realtime replay, frontend type/build. |

## Duplicate payload structures and naming drift

- Lifecycle, sign-off and review metadata appear in `schemas.operational_state`, document review routes, sign-off routes, monthly reviews and workflow review routes.
- Assistant context has separate request models for generic assistant, query assistant, standalone assistant and ORB session start.
- Event language is overloaded between chronology events, realtime awareness events, audit events and in-memory demo events.
- User scope keys appear as snake_case and camelCase (`home_id`, `homeId`, `allowed_home_ids`, `allowedHomeIds`) across backend and frontend.
- Statuses use domain-specific values (`submitted`, `review_required`, `approved`, `locked`, `overdue`) beside canonical lifecycle states.

## DTO consolidation completed in this sprint

The existing canonical operational-state DTO module is now schema-versioned rather than duplicated. The initial contract version is `2026-05-16.v1` and covers lifecycle snapshots, history events, sign-offs, audit timeline events, evidence edges, inspection traces, assistant oversight markers, realtime awareness events, durability recovery markers, operational state definitions and assessments.

This is a compatibility-first change: existing payload fields remain, while new `schema_version` markers and validation guards make downstream migrations safer.

## Persistent operational memory gaps

- Lifecycle snapshot DTOs exist, but lifecycle history repositories and replay APIs are not yet uniformly available across all operational domains.
- Audit replay exists for platform audit envelopes, but audit sinks are not yet correlated into one replayable enterprise timeline.
- Chronology and evidence snapshots need persistence contracts that distinguish append-only history from current projection.
- Review/sign-off history exists in DTO form and some document persistence, but needs a shared repository contract for all domains.

## Provider and multi-tenant readiness gaps

- Provider settings exist for data intelligence and AI governance, but provider-wide operational queues, audit retrieval, safeguarding oversight and inspection readiness are not yet first-class contracts.
- Repository scope helpers fail closed when home scope is absent, but role and provider-level policy definitions are duplicated.
- Frontend provider onboarding and visibility should be driven by backend provider state rather than static checklists.

## RBAC and security hardening gaps

- Central role/permission definitions exist, but duplicated role literals in repository and middleware layers can drift.
- Header-derived user context helpers should be retired or limited to signed internal calls.
- Realtime event visibility is permission-aware, but subscription/replay APIs need the same fail-closed semantics as repository reads.
- Evidence, audit, governance and assistant retrieval must filter before assembling payloads, not only before rendering them.

## Realtime orchestration gaps

- The bus has dedupe, throttle, redaction and local replay, but write paths do not universally publish canonical events.
- Next.js relies mostly on navigation/refetch while legacy has fragmented event dispatchers and timers.
- Durable replay after reconnect should come from persisted event/audit history, not only process-local buffers.

## Inspection intelligence gaps

- Inspection readiness needs one contract for Reg44, Reg45, Annex A, evidence lineage, stale evidence and management review.
- Evidence strength and unresolved inspection gaps should be deterministic read models linked to chronology, safeguarding and governance history.
- Inspection pages should avoid synthetic/live blending and surface evidence lineage clearly.

## Historical and pattern intelligence gaps

- Existing chronology and operational state history can support deterministic pattern intelligence, but the aggregation services should use replayable server-side history.
- Pattern language should remain cautious: “Repeated operational gap”, “Recurring safeguarding concern”, “Repeated unresolved review” and “Pattern may require oversight.”
- Avoid predictive claims; use deterministic counts, age, recurrence and unresolved-state indicators.

## Assistant trust gaps

- Assistant runtime needs canonical citation DTOs covering evidence ID, chronology ID, why surfaced, retrieval confidence, permission scope and degraded-context warning.
- ORB and text assistant should share audit and oversight timeline linkage while preserving ORB runtime separation.
- Provider AI governance settings should be included in assistant context decisions and audit records.

## Durability and recovery gaps

- Queue idempotency and retry logic exist, but stale-state repair, lifecycle integrity validation, chronology integrity validation and replay validation should be callable operational services.
- Failed save UX should remain calm but must not hide persistence failures.
- Migration consolidation is required before enterprise recovery runbooks can be trusted.

## Frontend operational UX gaps

- Consolidate duplicate timeline/card/panel patterns into shared operational primitives.
- Replace `UnknownRecord` usage on inspection/governance surfaces with versioned DTOs.
- Remove or wire unused assistant/sidebar components.
- Keep mobile workflows calm, prioritised and keyboard accessible; show permission-safe empty states rather than hidden operational failure.

## Recommended next sprint

1. Security-first contract consolidation: retire header-derived user helpers, centralize RBAC role sets, and add cross-home/provider denial tests.
2. DTO migration: extend versioned operational DTOs into chronology, evidence, inspection, assistant context, queue and provider DTO modules.
3. Persistent memory: add lifecycle history and chronology/evidence/governance snapshot repositories with replay-safe read APIs.
4. Realtime hardening: emit canonical versioned events from lifecycle/writeback paths and add durable replay/reconciliation.
5. Frontend trust cleanup: remove live/demo blending on chronology evidence links and convert inspection/governance adapters to typed DTOs.
