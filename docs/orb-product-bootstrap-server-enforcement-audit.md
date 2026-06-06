# ORB product bootstrap — server enforcement audit

## Root cause

Production logs still showed ORB product bootstrap APIs firing before the front-door gate stabilised because:

1. **Frontend gating alone is insufficient** — stale bundles, gate remounts, or timing races can still invoke product hooks before `gateState === "ready"`.
2. **`GET /orb/voice/session/status` was auth-only** — returned 200 product probe payloads to any authenticated session, including inactive or safety-blocked users.
3. **`OrbAuthGate` called `/auth/passkeys/status` on every `ready` transition** — duplicate passkey storms on gate remount.
4. **No global bootstrap lock** — `shouldAllowOrbProductFetch` read gate state but had no hard module lock for non-React callers.
5. **No backend bootstrap dependency** — `/orb/projects`, `/orb/standalone/config`, `/orb/standalone/outputs/summary`, and voice status lacked a single `require_orb_product_bootstrap_access` contract.

## Frontend component → route map

| Route | Component / hook | Callable before ready? | Should return |
|-------|------------------|------------------------|---------------|
| `GET /auth/me` | `auth-context.tsx` | Yes | 200 / 401 |
| `GET /orb/standalone/access` | `use-orb-account-state.ts` | Yes (when authenticated) | 200 / 401 |
| `GET /orb/auth/providers` | `orb-login-screen.tsx` | Yes (login) | 200 |
| `GET /orb/projects` | `orb-care-companion.tsx` → `fetchOrbProjectsResilient` | **No** | 401/402/403 |
| `GET /orb/standalone/config` | `orb-care-companion.tsx` → `fetchStandaloneOrbConfig` | **No** | 401/402/403 |
| `GET /orb/voice/session/status` | `orb-care-companion.tsx`, `orb-voice-station.tsx` | **No** | 401/402/403 |
| `GET /orb/standalone/outputs/summary` | `orb-care-companion.tsx` | **No** | 401/402/403 |
| `GET /auth/passkeys/status` | `passkey-status-cache.ts` (settings only) | Login/settings only | 401 when logged out |

## Backend route classification

| Route | Protection | Unauthenticated | Inactive | Safety required | Active |
|-------|------------|-----------------|----------|-----------------|--------|
| `GET /orb/projects` | `require_orb_product_bootstrap_access` | 401 | 402 | 403 | 200 |
| `GET /orb/standalone/config` | `require_orb_product_bootstrap_access` | 401 | 402 | 403 | 200 |
| `GET /orb/voice/session/status` | `require_orb_product_bootstrap_access` | 401 | 402 | 403 | 200 |
| `GET /orb/standalone/outputs/summary` | `require_orb_product_bootstrap_access` | 401 | 402 | 403 | 200 |
| `GET /orb/standalone/access` | Optional auth (unchanged) | 200 guest / 401 invalid | 200 payload | 200 payload | 200 |
| `GET /orb/auth/providers` | Public | 200 | 200 | 200 | 200 |
| `GET /auth/me` | Session auth | 401 | 200 | 200 | 200 |

## Fix summary

- Backend: `auth/orb_product_bootstrap_dependency.py`
- Frontend lock: `frontend-next/lib/orb/orb-bootstrap-lock.ts`
- Passkey dedupe: `frontend-next/lib/auth/passkey-status-cache.ts`
- Blocked response handler: `frontend-next/lib/orb/orb-product-bootstrap-response.ts`
- Debug panel: `?debugAuth=1` shows lock state and blocked counters
