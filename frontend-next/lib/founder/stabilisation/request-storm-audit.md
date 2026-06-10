# Founder OS Request Storm Audit

**Audit date:** June 2026  
**Goal:** No page fires 10+ founder data requests on load; bootstrap-first hydration.

---

## Bootstrap architecture

`/api/founder/bootstrap` (server, 20s cache):

1. `GET /founder-os/bootstrap?days=30` — persistence + telemetry + operating-loop runs
2. Five live upstream fetches (concurrency 3): providers, homes, inspection-readiness, orb-billing-usage, orb-feedback-summary
3. Merges into `persistence`, `telemetrySummary`, `liveSummary`, `dataSourceStatus`, `sectionErrors`

Client (`loadFounderBootstrap`): 20s session cache + in-flight dedup.

`FounderPersistenceHydrator` (layout): one bootstrap call hydrates all stores on every founder page.

---

## Per-page load requests (after stabilisation)

| Page | Bootstrap | Auth/me | Page-specific | Total (approx) |
|------|:---------:|:-------:|:-------------:|:--------------:|
| `/founder` | 1 (cached) | 1 | 0 — metrics from bootstrap | **~2** |
| `/founder/orb` | cached | 1 | 0 | **~2** |
| `/founder/team` | cached | 1 | 0–1 loop runs if not in bootstrap | **~2–3** |
| `/founder/operating-loop` | cached | 1 | 0–1 loop runs | **~2–3** |
| `/founder/intelligence` | cached | 1 | 1 snapshot | **~3** |
| `/founder/memory` | cached | 1 | 0 | **~2** |
| `/founder/evidence` | cached | 1 | 0 | **~2** |
| `/founder/relationships` | cached | 1 | 0 | **~2** |
| `/founder/revenue` | cached | 1 | 2 (snapshot + pricing) | **~4** |
| `/founder/quality-lab` | cached | 1 | 1 overview | **~3** |
| `/founder/actions` | cached | 1 | 0 | **~2** |
| `/founder/approvals` | cached | 1 | 0 | **~2** |
| `/founder/content` | cached | 1 | 0 | **~2** |
| `/founder/build-briefs` | cached | 1 | 0 | **~2** |
| `/founder/telemetry` | cached | 1 | 0 | **~2** |
| `/founder/audit` | cached | 1 | 1 audit tail | **~3** |

**No page exceeds 10 requests on load.**

---

## Issues found and fixed

### Critical (fixed)

| Issue | Fix |
|-------|-----|
| `refreshFounderDashboardData` re-fetched all live endpoints after bootstrap | `buildLiveMetricsFromBootstrap` + `seedLiveMetricsFromBootstrap` |
| Probe-then-fetch double round-trip (~12 live calls) | Removed probe phase when bootstrap available; sync availability from bootstrap |
| Triple billing fetch (users + aiUsage + billing adapters) | Single billing usage blob shared in bootstrap metrics builder |
| Telemetry/team/operating-loop triple-dip (dashboard + hydrate + summary) | Bootstrap seeds telemetry; removed redundant hydrates on load |
| Quality Lab direct `/orb/admin/quality-lab/*` browser calls | Proxied via `/api/founder/quality-lab/*` |

### Medium (fixed)

| Issue | Fix |
|-------|-----|
| `operatingLoopRepository.list()` extra call during sync | Uses `bootstrap.operatingLoopRuns` when present |
| Redundant page-level hydrates (memory/evidence/relationships) | Layout hydrator sufficient; pages read stores |

### Remaining (acceptable)

| Issue | Notes |
|-------|-------|
| `/founder/audit` fetches audit tail | Not in bootstrap; single GET acceptable |
| `/founder/intelligence` fetches snapshot | Domain-specific; not duplicated elsewhere |
| `/founder/revenue` fetches snapshot + pricing | Revenue domain; 2 calls acceptable |

---

## Rules enforced

- Use `/api/founder/bootstrap` where possible ✓
- Use cache/hydrator where possible ✓
- No page fires 10+ founder data requests on load ✓
- No direct browser calls to backend admin routes ✓
- No repeated auth/me storm (React auth context dedupes) ✓
- No repeated billing/feedback/readiness storm ✓
- Optional live source failure shows degraded state, not full failure ✓
