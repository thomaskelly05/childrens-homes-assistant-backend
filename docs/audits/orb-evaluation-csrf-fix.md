# ORB Evaluation CSRF Fix Audit

**Date:** 2026-06-11  
**Issue:** `POST /api/orb/evaluation/runs` returned `403 csrf_failed` when clicking "Run internal brain high-risk test" on `/founder/orb-evaluation`.

## Root cause

`orb-evaluation-client.ts` read the wrong CSRF cookie name (`csrf_token`) instead of the app-standard `indicare_csrf` / `__Host-indicare_csrf`. Browser POSTs reached the Next.js proxy with session cookies but **no `X-CSRF-Token` header**, so FastAPI `CsrfProtectionMiddleware` rejected the proxied request.

A secondary issue: `scenarios/generate/route.ts` re-wrapped the store request without copying `x-csrf-token` from the browser request.

## Existing CSRF pattern (working routes)

### Backend

| Item | Value |
|------|-------|
| Middleware | `CsrfProtectionMiddleware` in `middleware/security_middleware.py` |
| Cookie names | `indicare_csrf` (dev) / `__Host-indicare_csrf` (production) |
| Session key | `request.session["csrf_token"]` |
| Header name | `x-csrf-token` (case-insensitive) |
| Validation | Double-submit: supplied header must match CSRF cookie (and/or session token) |
| Failure response | `403 {"detail":"csrf_failed","message":"Session security check failed..."}` |

CSRF is **not** disabled for `/orb/admin/evaluation/*`. Routes use `require_founder` like other founder/admin surfaces.

### Frontend browser clients

| Item | Location |
|------|----------|
| Cookie reader | `getCsrfToken()` in `frontend-next/lib/auth/api.ts` |
| Header applier | `applyCsrfHeaders(headers, method)` in same file |
| Shared wrapper | `frontend-next/lib/security/csrf-client.ts` |
| Founder POST client | `founder-api-client.ts` — `getCsrfToken()` + `x-csrf-token` on unsafe methods |
| Standalone ORB | `standalone-client.ts` — `applyCsrfHeaders` + fail-fast if missing |

Pattern for unsafe same-origin fetch:

1. `credentials: 'include'`
2. Relative URL (`/api/...` only — never `/orb/admin/...` from browser)
3. `X-CSRF-Token` header from `getCsrfToken()` (reads `indicare_csrf` cookie)

### Next.js proxy

`mergeFounderProxyHeaders()` in `founder-session.ts`:

- Forwards `cookie` from server `cookies()` (never spread a `Headers` instance)
- Forwards `x-csrf-token` from incoming browser request when present
- Forwards `authorization` when present
- Preserves `content-type`

Used by `/api/founder/*`, `/api/orb/evaluation/*`, and persistence handlers.

## Route mapping (POST / unsafe)

| Browser | Next.js handler | Backend | CSRF |
|---------|-----------------|---------|------|
| `POST /api/orb/evaluation/runs` | `runs/route.ts` | `POST /orb/admin/evaluation/runs` | Browser header → proxy → backend |
| `POST /api/orb/evaluation/runs/[id]/retest` | `retest/route.ts` | `POST /orb/admin/evaluation/runs/{id}/retest` | Same |
| `POST /api/orb/evaluation/scenarios/generate` | `scenarios/generate/route.ts` | `POST /orb/admin/evaluation/scenarios` (store) | CSRF copied to inner request |
| `POST /api/orb/evaluation/results/[id]/create-fix` | `create-fix/route.ts` | Local only (founder gate) | CSRF on browser POST for consistency |

## Fix applied

1. **`csrf-client.ts`** — shared helpers: `buildUnsafeMethodHeaders`, `isCsrfFailedPayload`, evaluation refresh message.
2. **`orb-evaluation-client.ts`** — uses `getCsrfToken()` / `applyCsrfHeaders`; fail-fast before POST if cookie missing; surfaces `csrf_failed` clearly.
3. **`scenarios/generate/route.ts`** — forwards `x-csrf-token` and `authorization` to store step; returns upstream error instead of fake success.
4. **`orb-evaluation-api.ts`** — parses upstream `csrf_failed` JSON into structured proxy response.
5. **`founder-orb-evaluation-page.tsx`** — CSRF failure shows refresh/sign-in message; no success toast.
6. **`orb-evaluation-run-service.ts`** — removes pending in-memory run on CSRF failure (no partial run).

## Stale session UX

On `csrf_failed`:

- Message: **"Session security check failed. Please refresh, sign in again, and retry."**
- No success toast
- No partial run left in dashboard
- Existing persisted runs unchanged

## Verification

```bash
cd frontend-next
npm run typecheck
npm run build
node --experimental-strip-types --test \
  lib/orb/evaluation/orb-evaluation-auth-proxy.test.ts \
  lib/orb/evaluation/orb-evaluation-csrf.test.ts \
  lib/orb/evaluation/orb-evaluation.test.ts

cd ..
source .venv/bin/activate
python -m pytest tests/test_orb_evaluation_platform.py tests/test_orb_evaluation_csrf.py -q
```

Manual (founder/admin):

1. Sign in, refresh `/founder/orb-evaluation`
2. Click **Run internal brain high-risk test**
3. `POST /api/orb/evaluation/runs` → 200, no `csrf_failed`
4. Run appears in table; latest internal-brain panel updates
5. Unauthenticated POST → 401; non-founder → 403
