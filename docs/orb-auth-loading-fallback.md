# ORB Auth Loading Fallback

## Problem

Mobile users sometimes saw a plain "Loading…" screen when session checks stalled.

## Solution

### `OrbAuthLoadingScreen`

- ORB sphere + "Checking your session…"
- After `ORB_AUTH_LOADING_TIMEOUT_MS` (12s): "Taking longer than expected"
- Actions: **Try again** (re-runs `refreshSession`) and **Back to sign in** (`/orb`)

### `auth-context`

- `Promise.race` between `/auth/me` and timeout
- 401 / auth failures → immediate `unauthenticated` → login
- 503 without cached user → `unauthenticated` (not infinite loading)

### `OrbAuthGate`

- Wires retry/back handlers into loading screen
- Separate timeout for `/orb/standalone/access` fetch → safe login message

## Security preserved

- No product shell, sidebar, or chat during loading
- Timeout resolves to login — never bypasses auth gate
- No secrets in loading diagnostics

## Development-only diagnostics

Optional `auth.error` message may surface on embedded login when session check fails (user-safe copy only).
