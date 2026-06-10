# Founder OS Route & Access Audit

**Audit date:** June 2026  
**Scope:** All `/founder` pages and `/api/founder` routes  
**Status:** Launch-ready with documented defence-in-depth gaps

---

## Executive summary

| Layer | Mechanism | Founder role enforced? |
|-------|-----------|------------------------|
| Middleware | Session cookie required for `/founder/*` | No — any authenticated user passes |
| Page layout | `app/founder/layout.tsx` — no guard | No |
| Page guard | `FounderGuard` on every page | Yes — client-side |
| API routes | `requireFounderSession()` | Yes — server-side 403 |
| FastAPI backend | `require_founder` on `/founder-os/*` | Yes — second gate |

All **25** founder pages wrap content in `FounderGuard`. Staff/provider navigation does **not** expose `/founder` routes.

---

## Accepted founder roles

Defined in `lib/founder/access.ts`:

| Mechanism | Values |
|-----------|--------|
| Role names | `founder`, `owner`, `super_admin`, `superadmin`, `admin`, `administrator` |
| Flags | `isFounder: true`, `is_admin: true` |
| Permission | `settings:manage` (frontend only — backend does not grant via permission alone) |

---

## `/founder` page coverage

| Route | FounderGuard | Notes |
|-------|:------------:|-------|
| `/founder` | Yes | Command centre dashboard |
| `/founder/orb` | Yes | ORB Founder |
| `/founder/team` | Yes | Founder Team |
| `/founder/operating-loop` | Yes | Operating Loop |
| `/founder/operating-loop/[runId]` | Yes | Run detail |
| `/founder/intelligence` | Yes | Intelligence Centre |
| `/founder/intelligence/briefings` | Yes | Briefings list |
| `/founder/intelligence/briefings/[briefingId]` | Yes | Briefing detail |
| `/founder/memory` | Yes | Founder Memory |
| `/founder/evidence` | Yes | Evidence packs |
| `/founder/evidence/[packId]` | Yes | Pack detail |
| `/founder/relationships` | Yes | Relationships |
| `/founder/relationships/[relationshipId]` | Yes | Relationship detail |
| `/founder/revenue` | Yes | Revenue intelligence |
| `/founder/revenue/forecast` | Yes | Revenue forecast |
| `/founder/quality-lab` | Yes | Quality Lab |
| `/founder/actions` | Yes | Founder actions |
| `/founder/approvals` | Yes | Approval Centre |
| `/founder/content` | Yes | Content drafts |
| `/founder/build-briefs` | Yes | Build briefs |
| `/founder/telemetry` | Yes | Telemetry |
| `/founder/audit` | Yes | Audit trail |
| `/founder/briefing` | Yes | Daily briefing |
| `/founder/agents/[agent]` | Yes | Agent detail |
| `/founder/team/[role]` | Yes | Team role detail |

---

## `/api/founder` route coverage

| API route | Auth gate | Notes |
|-----------|-----------|-------|
| `/api/founder/bootstrap` | `requireFounderSession` | Single batched load |
| `/api/founder/session` | `getRequestAuthProfile` only | Returns `founder: boolean` — no 403 |
| `/api/founder/live/[target]` | `requireFounderSession` | Proxies live sources |
| `/api/founder/quality-lab/*` | `requireFounderSession` | Proxies ORB Quality Lab |
| `/api/founder/persistence/*` | `requireFounderSession` | All CRUD + decisions |
| `/api/founder/operating-loop/*` | `requireFounderSession` | Run + list |
| `/api/founder/intelligence/*` | `requireFounderSession` | Snapshot + briefings |
| `/api/founder/relationships/*` | `requireFounderSession` | CRM |
| `/api/founder/revenue/*` | `requireFounderSession` | Revenue + forecasts |
| `/api/founder/telemetry/summary` | `requireFounderSession` | Telemetry aggregate |
| `/api/founder/telemetry/event` | `requireAuthenticatedSession` | Any authed user (by design) |
| `/api/founder` (health) | None | `{ ok: true }` health check |

---

## Auth redirect behaviour

| Surface | Unauthenticated | Non-founder |
|---------|-----------------|-------------|
| Pages (middleware) | Redirect to `/orb?returnUrl=…` | Page bundle delivered; `FounderGuard` shows Access denied |
| Pages (FounderGuard) | Redirect to `/orb?returnUrl={deep path}` | Access denied UI |
| API (`requireFounderSession`) | 401 `{ error: 'Unauthorised' }` | 403 `{ error: 'Founder access required' }` |

---

## Staff/provider navigation exposure

| Area checked | `/founder` links? |
|--------------|:-----------------:|
| `lib/navigation/operational-navigation.ts` | No |
| `lib/navigation/scope-navigation.ts` | No |
| `components/indicare/app-shell.tsx` | No — Command Centre = `/command-centre` |
| `components/founder/founder-nav-header.tsx` | Yes — founder-internal only |
| Legacy `frontend/js/core/permissions.js` | `/founder-hq` only (separate legacy surface) |

**Conclusion:** Staff/provider OS navigation does not expose `/founder`.

---

## Remaining gaps (documented, acceptable for V1)

1. **No server-side founder role check on pages** — middleware checks session only; `FounderGuard` blocks UI client-side.
2. **Layout lacks `FounderGuard`** — all current pages guard individually; new pages must follow convention.
3. **`GET /api/founder` unauthenticated** — health JSON only; no sensitive data.
4. **`/api/founder/telemetry/event` — auth only** — intentional for platform-wide event capture.
5. **Frontend `settings:manage` grants founder access** — may cause UI/API mismatch for permission-only users.

---

## Fixes applied in stabilisation V1

- `FounderGuard` now preserves deep-link `returnUrl` (e.g. `/founder/revenue` not always `/founder`).
- Quality Lab routed through `/api/founder/quality-lab/*` — no direct browser `/orb/admin/` calls.
