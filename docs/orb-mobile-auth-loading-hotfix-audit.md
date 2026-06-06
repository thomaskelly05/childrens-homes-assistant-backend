# ORB Mobile Auth Loading Hotfix — Audit

## Symptom

On iPhone Safari at `app.indicare.co.uk/orb`, unauthenticated users remained on `OrbAuthLoadingScreen` with:

- “Checking your session…”
- “Securing your ORB Residential access”

The ORB login screen never appeared.

## Root cause

Three interacting gaps in the PR #1498 fallback:

1. **No gate-level auth timeout.** `OrbAuthGate` rendered `OrbAuthLoadingScreen` whenever `auth.status === 'loading'` and waited indefinitely for `auth-context` to resolve. There was no fail-closed path to `OrbLoginScreen` for auth loading.

2. **Loading-screen timeout is UI-only.** `OrbAuthLoadingScreen` switched to a “Taking longer than expected” phase after 12s with manual **Try again** / **Back to sign in** buttons. It did **not** auto-render login. Users who never tapped remained on the branded loader.

3. **Remount-sensitive timer.** The loading screen’s 12s timer lived in component `useState`/`useEffect`. Nested `Suspense` boundaries (`OrbShell` + `OrbAuthGate`), `useSearchParams`, and repeated `refreshSession()` calls that reset `status` to `'loading'` could remount the loading screen and **reset the timer**, keeping the UI in the `checking` phase (“Checking your session…”).

Secondary contributors (ruled in or mitigated):

| Area | Finding |
|------|---------|
| `auth-context` | Had `Promise.race` timeout (12s) but gate did not fail-closed earlier; background `refreshSession` could flip signed-in users back to loading |
| Access check | Hung `/orb/standalone/access` could show the same loading copy; only gate `accessTimedOut` (12s) existed — now also has fetch timeout |
| `/auth/me` rate limits | **Not rate-limited** in `security_rate_limit_service.py`; 429 handling added in auth-context anyway |
| Middleware | `/` → `/orb`, `/login` → `/orb`, `/orb/login` → `/orb` — no `/orb` ↔ `/orb/login` loop |
| CSP report-only | Harmless for auth |
| Service worker | None in `frontend-next` |

## Fix summary

| Layer | Change |
|-------|--------|
| `OrbAuthGate` | Hard 5s `authFallback` → embedded `OrbLoginScreen` |
| `orb-auth-loading-deadline` | Module-level deadline survives remounts |
| `OrbAuthLoadingScreen` | Uses shared deadline; scrollable + safe-area; slow phase at gate timeout |
| `auth-context` | 8s `/auth/me` timeout; 429 → unauthenticated; no loading flip for authenticated refresh |
| `use-orb-account-state` | Access fetch `Promise.race` timeout |

## Security preserved

- Product shell still behind `OrbAuthGate`
- Unauthenticated users never see `OrbCareCompanion`
- Timeout resolves to login, not product bypass
