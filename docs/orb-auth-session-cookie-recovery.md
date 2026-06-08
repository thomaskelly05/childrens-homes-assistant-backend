# ORB Residential auth session and cookie recovery

## Live issue observed (Safari)

Returning users who were previously signed in sometimes landed on the login screen while the app still behaved as if a session existed. Browser console showed:

```
Failed to load resource: the server responded with a status of 401
Route: /orb/front-door/verdict
```

This indicated stale or mismatched auth state between the browser and backend:

- Frontend local/session storage or in-memory auth could imply a signed-in user
- `GET /orb/front-door/verdict` returned **401** with `clear_session: true` for invalid cookies
- The verdict client previously used `authFetch`, which **threw** on 401 before the gate could read `clear_session`
- Users were sent to the access **retry** screen instead of a clean login, and sometimes had to delete cookies manually

## Root cause

| Layer | Behaviour before fix |
|-------|----------------------|
| Backend | Invalid session cookie → HTTP **401** + `{ success: false, data: { verdict: "unauthenticated", clear_session: true } }` |
| `fetchOrbFrontDoorVerdict` | Threw `AuthApiError` on 401 — payload never parsed |
| `OrbAuthGate` | Catch block → `access_retry` screen |
| Browser storage | Partially cleared only when `/auth/me` returned 401, not on verdict 401 |

Cookies are **not** deleted by the verdict endpoint (by design — logout route clears them). Login overwrites cookies on success.

## Fix behaviour

### Verdict 401 (`/orb/front-door/verdict`)

1. Client uses `authFetchResponse` and parses **401** JSON bodies
2. Returns unauthenticated verdict payload to the gate
3. `clearStaleOrbSessionState('verdict_401')` clears ORB/auth browser storage
4. Gate shows embedded `OrbLoginScreen` — no retry loop
5. Safe diagnostics recorded (`auth_state`, `verdict_status`, `cookie_present`, `reason: verdict_401`)

### Auth 401 (`/auth/me`)

- `refreshSession()` → `clearStaleOrbSessionState('auth_me_401')`, unauthenticated status, `sessionExpired` where appropriate

### Access 401 (`/orb/standalone/access`)

- `OrbAuthGateAccessPhase` watches `accessFailureKind === 'unauthorized'`
- Clears stale state, calls `auth.logout()`, reloads verdict

### Logout

- `POST /auth/logout` revokes server session and clears cookies
- Frontend clears ORB caches, passkey cache, verdict cache/store, local/session storage
- Residential sign-out uses `window.location.replace('/orb')` for full remount

### Failed login / OAuth error

- Shows error only — no partial auth state
- Diagnostics: `reason: failed_login` or `oauth_error`
- Retry without manual cookie deletion

## Cookie/session recovery rules

| Cookie | Dev name | Prod name | Notes |
|--------|----------|-----------|-------|
| Session JWT | `indicare_session` | `__Host-indicare_session` | HttpOnly; set on login |
| CSRF | `indicare_csrf` | `__Host-indicare_csrf` | Readable by JS for `X-CSRF-Token` |

- Same-origin via Next `/backend/*` proxy in production (`app.indicare.co.uk` → API)
- `SameSite` / `Secure` / `__Host-` prefix controlled by `COOKIE_SECURE` / `COOKIE_SAMESITE`
- Diagnostics expose `cookie_present: true/false` only — never values

## Files changed

- `frontend-next/lib/orb/orb-front-door-verdict-client.ts` — 401 parsing
- `frontend-next/lib/orb/orb-stale-session-clear.ts` — recovery reasons
- `frontend-next/lib/orb/orb-auth-recovery-diagnostics.ts` — safe debug metadata
- `frontend-next/components/orb-residential/orb-auth-gate.tsx` — stale verdict/access recovery
- `frontend-next/contexts/auth-context.tsx` — logout verdict cache reset

## Tests run

```bash
cd frontend-next
npm run typecheck
node --experimental-strip-types --test \
  lib/orb/orb-front-door-verdict-client.test.ts \
  components/orb-residential/orb-stale-session-*.test.ts \
  components/orb-residential/orb-access-verification-hotfix.test.ts \
  components/orb-residential/orb-mobile-no-router-bounce.test.ts
NEXT_PUBLIC_E2E_TEST_MODE=1 npm run e2e:orb-auth
# 50 passed (orb-auth-register-billing, orb-auth-cookie-session, orb-passkey-mobile, orb-login-scroll-reachability)
```

## Remaining provider-console tasks

- Provider admin session policies UI (separate from ORB Residential front door)
- Cross-subdomain cookie diagnostics in production (`app.` vs `api.`) via support tooling only
- Optional: server `Set-Cookie` delete on verdict 401 (not required — login/logout already overwrite)
