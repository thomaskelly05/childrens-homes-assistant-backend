# OS performance and DB pool stability audit

Urgent stability pass: protect the shared PostgreSQL pool (max 25) from dashboard and menu badge thundering herds, add short TTL caches, section time budgets, and fail-soft degraded responses.

| Endpoint | Current caller | Current risk | DB usage pattern | Cache available? | Timeout available? | Proposed fix | Implemented fix | Remaining limitation |
|----------|----------------|--------------|------------------|------------------|-------------------|--------------|-----------------|----------------------|
| `/api/governance-os/command-centre` | Command centre page, governance routes, assistant retrieval | 156s builds; holds pool; 503 on auth | Multiple intelligence services + short-lived DB for workforce/Reg44 | Projection snapshot (30s) | Per-section 300–700ms; total 3.5s | Memory cache + budgets + stale fallback | `os_cache_service` 45s TTL, `os_time_budget_service` sections, pool-pressure stale serve | Evidence matrix still CPU-heavy in-process |
| `/intelligence/governance/ai/dashboard` | AI governance UI | Blocks on many aggregates when pool busy | Event summary queries per section | None (before) | Degraded path only | 60s cache; skip build when pool full | `os_cache_service` + early degraded return | Full metrics still need DB when pool free |
| `/api/notifications/operational-feed` | `notification-bell.tsx`, notifications page | Parallel collectors; full alert list | Recording alerts, ISN, brief, optional governance/workforce | None (before) | Optional sections budgeted | 15s cache; cap sources when limit small | `build_feed_cached`, optional sources skipped when `limit≤15` or pool pressure | `build_summary` still calls full feed |
| `/recording-alerts/badge-summary` | `recording-alert-nav-badge.tsx`, top pill | Duplicate with feed; limit 500 | Full open alert list | None (before) | Route-level fallback | 20s cache; limit 80; dedupe via feed counts in AppShell | Route cache + frontend `os-operational-counts` | Standalone badge fetch if feed not loaded yet |
| `/api/connect/unread` | Notification bell (parallel) | Extra request on every poll | Connect service DB | Client dedupe 20s | N/A | Client `fetchWithOsCache` | Implemented in `notification-bell.tsx` | Still separate endpoint |
| `/auth/me` | `auth-context.tsx`, AppShell gate | 503 when pool exhausted by dashboards | Single user lookup | N/A | Pool wait 2s | No dashboard work on auth; audit skip when busy | `is_pool_under_pressure` audit fast-skip | Auth still needs one connection when pool full |
| `/auth/login` | Login page | Same as `/auth/me` | Credential verify + session | N/A | Pool wait 2s | Same as auth/me | Audit skip when pool busy | Same |

## Observability

Structured logs (no raw bodies) on:

- `governance_command_centre` — `total_ms`, `cache_status`, `degraded`, `section_count`, `timeout_count`, `warning_count`
- `operational_notification_feed` — `total_ms`, `cache_status`, `degraded`, `warning_count`
- `recording_alerts_badge_summary` — `total_ms`, `cache_status`, `degraded`
- `ai_governance_dashboard` — `total_ms`, `degraded`, `warning_count`

## Manual verification URLs

- https://app.indicare.co.uk/command-centre
- https://app.indicare.co.uk/notifications
- https://app.indicare.co.uk/intelligence/governance/ai
- AppShell menu open/close (notification bell + recording badge)

## Second hardening pass

### React #130 / workspace recovery

- **Root cause:** `CareHubStartHero` rendered Lucide icons from `iconByLabel[action.label]` but `CARE_HUB_HERO_ACTIONS` includes **Safeguarding concern**, which was missing from the map. React error #130 (`Element type is invalid … got: undefined`) surfaced through `app/error.tsx` as “Workspace recovery required”.
- **Fix:** Shared `care-hub-action-icons.ts` with every hero label, `SafeLucideIcon` fallback, and `WorkspaceRecoveryPanel` for database-busy / recovery states (no undefined component renders).

### Circuit breaker behaviour

- In-memory `services/os_circuit_breaker_service.py` per key (`governance_command_centre`, `ai_governance_dashboard`, notification optional sources, recording badge, inspection/reg45 dashboards).
- Opens after repeated failures; half-open after cooldown; closes on success.
- Open circuits return stale cache or lightweight degraded payloads with `circuit_open: true` — no heavy DB builders.

### Auth protection

- `/auth/me` and `/auth/login` unchanged semantically; audit writes still skip when `is_pool_under_pressure()`.
- Dashboard routes use `acquire_optional_dashboard_connection(timeout=0.1)` so menu/governance calls fail fast instead of waiting the full pool timeout.

### Governance command centre fail-fast

- Pool pressure or open circuit → stale memory/projection cache or `build_fast_degraded_command_centre` in under ~500ms.
- No projection snapshot writes under pressure; route no longer wraps a threaded 9s build.

### AI governance dashboard fail-fast

- Pool pressure / circuit → stale cache or `_degraded_dashboard` without events-table probe or aggregate queries.
- Route dropped `Depends(get_db)` hold for the full build; optional fast acquire only when pool has capacity.

### Child workspace fallback

- `UnknownWorkspaceCard` for unmapped workspace section types; AppShell shows `WorkspaceRecoveryPanel` when child preload returns 503/database busy.

### AppShell dedupe

- `APPSHELL_REQUEST_DEDUPE_KEYS` documents high-churn paths; `fetchWithOsCache` / `osRequestDedupeKey` used for workforce dashboard and inspection readiness widgets (no heavy governance fetch from AppShell).

### Remaining limitations

- Manager/workspace intelligence sections still perform full builds when the pool is healthy (by design).
- `os_time_budget` threaded sections may still run briefly after timeout until the worker finishes; fast path avoids starting them under pressure.
- Legacy `/os/young-people/{id}/workspace` preload still needs one connection when the pool is free.

## Scope-first workspace pass (May 2026)

| Surface | Before | After |
|---------|--------|-------|
| Post-login landing | `/command-centre` | `/select-scope` |
| AppShell menu | Global operational nav + badges | Scoped nav only; badges via `GET /api/os/menu-summary` |
| Session scope | Implicit from URL only | `GET/POST /api/os/scope/*` + local storage fallback |
| Auth on 503 | Could clear session | Preserves cookie/session; shows temporary unavailable |
| Heavy prefetch | Default Next.js prefetch on some links | `prefetch={false}` on scope menu heavy routes |

See [scope-first-home-child-workspace-flow.md](./scope-first-home-child-workspace-flow.md).
