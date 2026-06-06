# ORB Auth Loading Fallback

## Problem

Mobile users could remain on “Checking your session…” when `/auth/me` or access checks stalled or the loading component remounted.

## Layered fallback (fail closed to login)

### 1. `OrbAuthGate` (primary, 5s)

When `auth.status === 'loading'` longer than `ORB_AUTH_GATE_FALLBACK_MS` (5 seconds):

- Renders embedded `OrbLoginScreen`
- Message: “We could not confirm your session. Please sign in.”
- Does **not** mount product children

Deadline uses `lib/orb/orb-auth-loading-deadline.ts` so remounts cannot reset the timer.

### 2. `OrbAuthLoadingScreen` (branded UX)

- Phase `checking`: sphere + session copy
- Phase `slow` (after gate timeout): retry / back-to-sign-in actions
- Scrollable body, `100dvh`/`100svh`, safe-area padding
- Gate auto-login happens even if the user does nothing

### 3. `auth-context` (8s network ceiling)

- `Promise.race` between `/auth/me` and `ORB_AUTH_CONTEXT_TIMEOUT_MS`
- Outcomes:
  - **401 / 403 auth failure** → `unauthenticated` → login
  - **429** → `unauthenticated` with safe copy
  - **503 / 502 / 504** without cached user → `unauthenticated`
  - **Timeout / network (status 0)** → `unauthenticated`
- Authenticated background refresh does **not** flip status back to `loading`

### 4. Access check (12s)

When authenticated but `/orb/standalone/access` hangs:

- `use-orb-account-state` races fetch with timeout
- `OrbAuthGate` `accessTimedOut` → login with access message
- Inactive-but-signed-in users without access still see `OrbUpgradeScreen` once access resolves

## Constants

| Constant | Value | Owner |
|----------|-------|-------|
| `ORB_AUTH_GATE_FALLBACK_MS` | 5000 | `OrbAuthGate` |
| `ORB_AUTH_CONTEXT_TIMEOUT_MS` | 8000 | `auth-context` |
| `ORB_AUTH_LOADING_TIMEOUT_MS` | 12000 | Loading slow phase, access fetch |

## Security preserved

- No product shell, sidebar, or chat during loading
- Timeout resolves to login — never bypasses auth gate
- No secrets in loading diagnostics

## Mobile test checklist

- [ ] Unauthenticated `/orb` shows login within ~5s without tapping
- [ ] Slow network: loading → login, not infinite “Checking…”
- [ ] Authenticated active user reaches product
- [ ] Authenticated inactive user reaches upgrade/billing
- [ ] Sign out returns to `/orb` login
- [ ] `/` and `/login?returnUrl=%2F` land on `/orb` once
- [ ] Page scrolls on small iPhone with safe-area insets
