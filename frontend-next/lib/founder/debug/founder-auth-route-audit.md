# Founder auth route audit

## Summary

Production 403s on `/api/founder/persistence/*` were caused by **Next.js rejecting requests before the FastAPI backend was reached**. `requireFounderSession()` parsed `/auth/me` incorrectly and always treated the caller as non-founder.

## Why 403 was happening

`GET /auth/me` returns:

```json
{ "ok": true, "user": { "id": 1, "email": "...", "role": "admin", "permissions": [...] }, "mfa_mandatory": false }
```

`requireFounderSession()` (pre-fix) cast the **entire response** as the user object and read `user.role` at the top level. That field is always `undefined`, so `userHasFounderAccess(undefined)` returned false and Next.js responded with **403 Forbidden**.

The browser UI still loaded for admins because `FounderGuard` uses `useAuth()` → `/backend/auth/me`, which correctly reads `response.user.role`.

## Which session/cookie is missing

| Symptom | Missing / broken piece | Layer |
|--------|-------------------------|-------|
| 401 Unauthorised | `indicare_session` / `__Host-indicare_session` not present on the app origin | Next.js `requireFounderSession` |
| 403 Founder access required (admin user) | Role not extracted from `/auth/me` `user` envelope (fixed) | Next.js |
| 403 csrf_failed on POST | `x-csrf-token` header or CSRF cookie mismatch | FastAPI `CsrfProtectionMiddleware` |
| CORS / access-control console noise | Browser calling `/orb/admin/*` or cross-origin `api.indicare.co.uk` instead of same-origin `/api/founder/*` | Client fetch paths |

Session cookies must be set on the **app host** (`app.indicare.co.uk`). Next.js proxies forward `Cookie` to `api.indicare.co.uk` server-side; the browser must never call the API host directly for founder pages.

## Backend vs Next.js rejection

| Route | Gate 1 (Next.js) | Gate 2 (FastAPI) |
|-------|------------------|------------------|
| `/api/founder/persistence/*` | `requireFounderSession()` → `/auth/me` | `require_founder` on `/founder-os/persistence/*` |
| `/api/founder/telemetry/summary` | `requireFounderSession()` | `require_founder` on `/founder-os/telemetry/summary` |
| `/api/founder/telemetry/event` | `requireAuthenticatedSession()` | `require_authenticated_user` |
| `/api/founder/live/*` | `requireFounderSession()` | Upstream admin/provider routes |
| `/api/founder/operating-loop/*` | `requireFounderSession()` | Local Node handlers (no backend hop) |

Before this fix, persistence 403s were **always from Next.js** for authenticated admins.

## Route chains

### GET `/api/founder/persistence/memories`

1. Browser → `GET https://app.indicare.co.uk/api/founder/persistence/memories` (`credentials: include`)
2. Next.js `app/api/founder/persistence/[entity]/route.ts` → `proxyToBackend()`
3. `requireFounderSession()` → cached `GET {INTERNAL_API_BASE_URL}/auth/me` with forwarded cookies
4. Role check via `userHasFounderAccessFromProfile(user)` (role, roles, permissions, `is_admin`, `isFounder`)
5. `GET {INTERNAL_API_BASE_URL}/founder-os/persistence/memories` with `Cookie`, `Accept`
6. FastAPI `require_founder` → list records → `{ success: true, data: { items, count } }`
7. Next.js sanitises payload → 200 JSON to browser

Empty store: step 6 may 404; Next.js normalises to `{ items: [], count: 0 }` with 200.

### POST `/api/founder/persistence/approvals`

1. Browser → `POST /api/founder/persistence/approvals` with JSON body, session cookies, `x-csrf-token`
2. Next.js `proxyToBackend()` → `requireFounderSession()` (same as above)
3. `POST {INTERNAL_API_BASE_URL}/founder-os/persistence/approvals` with `Cookie`, `Content-Type`, `x-csrf-token`
4. FastAPI CSRF middleware validates token, then `require_founder`, then create record
5. Sanitised JSON returned with upstream status

## `next.config.ts` rewrite exclusion

`/api/((?!founder(?:/|$)).*)` rewrites non-founder API traffic to the backend. `/api/founder/*` stays on Next.js App Router proxies so cookies, CSRF and founder role checks remain on the app origin.

## Accepted founder roles

`founder`, `owner`, `super_admin`, `superadmin`, `admin`, `administrator` — plus `settings:manage` permission and `is_admin` / `isFounder` flags from `/auth/me`.

## Auth/me storm mitigation

`getRequestAuthProfile()` is wrapped in React `cache()` so multiple founder handlers in the same request share one `/auth/me` call. Client pages should use `/api/founder/session` or batch fetches via `founderGet()` rather than probing auth per entity.
