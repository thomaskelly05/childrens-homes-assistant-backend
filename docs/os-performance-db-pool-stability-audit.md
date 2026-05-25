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
