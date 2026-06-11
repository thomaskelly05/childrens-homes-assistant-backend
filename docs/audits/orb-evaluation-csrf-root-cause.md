# ORB Evaluation CSRF Root Cause

**Date:** 2026-06-11  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Symptom:** `POST /api/orb/evaluation/runs` returns `403 {"detail":"csrf_failed"}` while `GET /api/orb/evaluation/runs` succeeds.

## Executive summary

GET evaluation routes only need a valid founder session cookie. POST routes additionally require **double-submit CSRF**: the `x-csrf-token` request header must match the `indicare_csrf` / `__Host-indicare_csrf` cookie when the proxied request reaches FastAPI.

The production failure was caused by the Next.js evaluation proxy forwarding session cookies but **not reliably forwarding a matching CSRF header**. Browser clients attempted to attach the header, but when it was absent the server proxy did not fall back to reading the CSRF cookie server-side.

## Correct auth check route

| Context | Route | Notes |
|---------|-------|-------|
| Browser (production) | `GET /backend/auth/me` via `authFetch('/auth/me')` | Same-origin proxy to FastAPI |
| Next.js server (founder routes) | `GET {INTERNAL_API_BASE_URL}/auth/me` | Used by `getRequestAuthProfile()` |
| **Not valid** | `GET /api/auth/me` | Returns 404 — no such Next.js route |

`FounderGuard` and `auth-context.tsx` use `/auth/me` (resolved to `/backend/auth/me` in production).

## CSRF contract (FastAPI)

| Item | Value |
|------|-------|
| Middleware | `CsrfProtectionMiddleware` in `middleware/security_middleware.py` |
| Cookie names | `indicare_csrf` (dev) / `__Host-indicare_csrf` (production `COOKIE_SECURE=true`) |
| Cookie HttpOnly | **false** — readable by browser JavaScript |
| Session key | `request.session["csrf_token"]` (hydrated on first valid match) |
| Header read by backend | `request.headers.get("x-csrf-token")` — case-insensitive |
| Accepted browser header spellings | `X-CSRF-Token`, `x-csrf-token`, `X-CSRFToken`, `x-csrftoken`, `X-XSRF-TOKEN` |
| Validation | `supplied` header must equal CSRF cookie (double-submit); session token hydrated if missing |
| Failure | `403 {"detail":"csrf_failed","message":"Session security check failed. Please refresh and try again."}` |
| CSRF exempt | `/auth/login`, `/auth/logout`, webhooks, etc. — **not** `/orb/admin/evaluation/*` |

## Working POST patterns

### Browser → `/backend/*` (authFetch)

```typescript
// lib/auth/api.ts
applyCsrfHeaders(headers, method) // sets X-CSRF-Token from document.cookie
fetch(resolveAuthApiPath(path), { credentials: 'include', headers })
```

Used by: login follow-ups, `/orb/privacy/requests`, standalone ORB messaging.

### Browser → `/api/founder/*` (founder-api-client)

```typescript
const csrf = getCsrfToken()
if (csrf) headers.set('x-csrf-token', csrf)
fetch('/api/founder/...', { credentials: 'include', headers })
```

Used by: persistence create/update, operating-loop run, quality-lab evaluate.

### Next.js server proxy (founder-session)

```typescript
// buildFounderProxyHeaders
headers.set('cookie', cookieHeader)
const csrf = resolveProxyCsrfToken(request, cookieHeader, cookieStore)
if (csrf) headers.set('x-csrf-token', csrf)
```

`resolveProxyCsrfToken` prefers the incoming browser header, then reads CSRF from server-side `cookies()`.

## ORB evaluation route chain

| Step | Component |
|------|-----------|
| 1 | Browser `postEvaluationRun()` → `POST /api/orb/evaluation/runs` with `credentials: include` + CSRF header |
| 2 | `app/api/orb/evaluation/runs/route.ts` → `handleEvaluationRunsPost()` |
| 3 | `requireFounderSession()` → cached `GET /auth/me` |
| 4 | `mergeFounderProxyHeaders()` forwards Cookie + `x-csrf-token` |
| 5 | FastAPI `POST /orb/admin/evaluation/runs` → CSRF middleware → `require_founder` |
| 6 | Run persisted; `GET /api/orb/evaluation/runs` merges overview + persistence |

## Root cause

1. **Primary:** `buildFounderProxyHeaders` only forwarded `x-csrf-token` when the browser request already carried it. If the header was missing (cookie timing, header casing edge cases, or client pre-check blocking), the upstream FastAPI request had cookies but **no CSRF header** → `csrf_failed`.

2. **Secondary (fixed earlier):** `orb-evaluation-client.ts` previously read a non-existent `csrf_token` cookie instead of `indicare_csrf`.

3. **Not the cause:** Founder auth — GET worked, so session cookies and `/auth/me` parsing were fine. `/api/auth/me` 404 is unrelated.

## Fix

1. `lib/security/csrf-server.ts` — shared server-side CSRF resolution from cookies / headers.
2. `buildFounderProxyHeaders` — `resolveProxyCsrfToken()` falls back to server-readable CSRF cookies.
3. `orb-evaluation-api.ts` — passes `cookieStore` into `mergeFounderProxyHeaders`.
4. `orb-evaluation-client.ts` — uses `applyCsrfHeaders` from `lib/auth/api.ts` (same as working routes).
5. Debug routes: `GET/POST /api/orb/evaluation/debug/security*` (founder-only, no full tokens).
6. UI surfaces extended CSRF message; success toast only after persisted run confirmed.

## Diagnostics

- `GET /api/orb/evaluation/debug/security` — cookie/header booleans and expected names
- `POST /api/orb/evaluation/debug/security-post` — CSRF probe via same proxy path as runs
- Browser snippet: `docs/audits/orb-evaluation-browser-debug-snippet.md`

## Verification checklist

1. Sign in as founder/admin, refresh `/founder/orb-evaluation`
2. `GET /api/orb/evaluation/debug/security` → `founderSessionResolved: true`, CSRF cookie present
3. `POST /api/orb/evaluation/debug/security-post` → `{ success: true, csrfPassed: true }`
4. Click **Run internal brain high-risk test** → `POST /api/orb/evaluation/runs` → 200
5. Run appears in table; latest internal-brain panel updates
