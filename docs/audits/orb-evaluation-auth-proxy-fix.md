# ORB Evaluation Auth & Proxy Fix Audit

**Date:** 2026-06-11  
**Issue:** `GET https://app.indicare.co.uk/api/orb/evaluation/runs` returned `403 not_authenticated` for founder/admin users, blocking `/founder/orb-evaluation`.

## Root cause

1. **Cookie forwarding bug:** `orb-evaluation-api.ts` spread a `Headers` instance (`{...buildFounderProxyHeaders(...)}`), which does not copy cookie/auth headers. Upstream FastAPI received no session cookie and returned `not_authenticated`.
2. **Rewrite bypass risk:** `next.config.ts` rewrote all `/api/*` except `/api/founder/*` to the backend. `/api/orb/evaluation/*` could bypass App Router proxies in some deployments.
3. **Backend role mismatch:** `/orb/admin/evaluation/*` used `require_admin` (admin/super_admin only) instead of `require_founder` (founder/owner/admin).
4. **UI did not load persisted runs:** The evaluation page used in-memory state only and did not hydrate from the proxy on mount.

## Route mapping

| Browser / UI | Next.js handler | Backend route | Auth check | Status |
|---|---|---|---|---|
| `GET /api/orb/evaluation/scenarios` | `app/api/orb/evaluation/scenarios/route.ts` → `handleEvaluationScenariosGet` | `GET /orb/admin/evaluation/scenarios` | `requireFounderSession` → `require_founder` | Fixed |
| `POST /api/orb/evaluation/scenarios/generate` | `app/api/orb/evaluation/scenarios/generate/route.ts` | `POST /orb/admin/evaluation/scenarios` (store) | `requireFounderSession` → `require_founder` + CSRF forwarded | Fixed |
| `GET /api/orb/evaluation/runs` | `app/api/orb/evaluation/runs/route.ts` → `handleEvaluationRunsGet` | `GET /orb/admin/evaluation/overview` + `GET /founder-os/persistence/orb-evaluation-runs` | `requireFounderSession` → `require_founder` | Fixed |
| `POST /api/orb/evaluation/runs` | `app/api/orb/evaluation/runs/route.ts` → `handleEvaluationRunsPost` | `POST /orb/admin/evaluation/runs` | `requireFounderSession` → `require_founder` + CSRF forwarded | Fixed |
| `GET /api/orb/evaluation/runs/[runId]` | `app/api/orb/evaluation/runs/[runId]/route.ts` | `GET /founder-os/persistence/orb-evaluation-runs/{id}` | `requireFounderSession` → `require_founder` | Fixed |
| `POST /api/orb/evaluation/runs/[runId]/retest` | `app/api/orb/evaluation/runs/[runId]/retest/route.ts` | `POST /orb/admin/evaluation/runs/{id}/retest` | `requireFounderSession` → `require_founder` + CSRF forwarded | Fixed |
| `POST /api/orb/evaluation/results/[resultId]/create-fix` | `app/api/orb/evaluation/results/[resultId]/create-fix/route.ts` | Local founder UI action (no backend admin route) | `requireFounderSession` | Fixed |

## Accepted roles

Frontend (`requireFounderSession` / `userHasFounderAccessFromProfile`):

- founder, owner, super_admin, superadmin, admin, administrator
- `is_admin: true`, `isFounder: true`, or `settings:manage` permission

Backend (`require_founder`):

- founder, owner, super_admin, superadmin, admin, administrator

## Proxy behaviour

- Next.js handlers call `requireFounderSession()` before upstream fetch.
- `mergeFounderProxyHeaders()` forwards `cookie`, `authorization` (if present), `x-csrf-token` (POST), and `content-type`.
- Browser client (`orb-evaluation-client.ts`) uses relative `/api/orb/evaluation/*` only, `credentials: 'include'`, and CSRF header on unsafe methods.
- Direct browser calls to `/orb/admin/evaluation/*` are blocked in the client.

## CSRF

POST routes (scenario generate/store, run creation, retest) forward `x-csrf-token` from the browser request. CSRF is not disabled globally.

## UI error handling

- Auth/proxy failure: **"Evaluation data could not be loaded. Please refresh or sign in again."**
- Successful load with no runs: **"No evaluation runs yet."**
- No fabricated runs on auth failure.

## Verification

```bash
cd frontend-next
npm run typecheck
npm run build
node --experimental-strip-types --test lib/orb/evaluation/orb-evaluation-auth-proxy.test.ts lib/orb/evaluation/orb-evaluation.test.ts

cd ..
source .venv/bin/activate
python -m pytest tests/test_orb_evaluation_platform.py -q
```

Manual:

- `/founder/orb-evaluation` loads for founder/admin without 403
- `GET /api/orb/evaluation/runs` returns 200 with `{ success, data: { overview, runs, count } }`
- Unauthenticated → 401; non-founder → 403
