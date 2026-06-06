# ORB Mobile Redirect Loop — Final Hotfix Audit

## Root cause

Mobile `/orb` bounced because **two independent redirect owners fought each other**:

1. **`OrbAuthGate`** held the user on `/orb` and showed embedded login, loading, retry, or product based on auth + access state.
2. **`OrbLoginScreen`** auto-redirected whenever `auth.status === 'authenticated'`, calling `fetchOrbAccess()` and `router.replace('/orb')` even when already embedded inside the gate on `/orb`.

On mobile Safari this produced a loop:

- Stale or slow session → gate shows loading/retry/login
- Auth briefly reads as authenticated → login effect fires `router.replace('/orb')`
- Gate re-evaluates → access still pending or 401 → back to loading/login
- Repeat within seconds → visible bounce

PR #1499 and #1500 fixed auth/access **timeouts** but not the **dual redirect ownership** problem.

## Fix summary

| Layer | Change |
|-------|--------|
| `OrbLoginScreen` | `embeddedGateMode` disables auto-redirect; gate owns post-login transitions |
| `OrbAuthGate` | Explicit state machine (`deriveOrbGateState`) — single UI owner |
| `orb-route-loop-guard` | Breaks >2 guarded redirects in 10s |
| `orb-stale-session-clear` | Clears local ORB state on 401 before logout |
| `orb-auth-debug-events` | Safe diagnostics via `?debugAuth=1` |
| Access contract | `contract_version: orb_access_v2` — mismatch → retry, not loop |
| `auth-context` | No `router.replace('/orb')` when already on `/orb` during logout |

## Security preserved

- Product UI never renders before `ready` gate state
- Billing and safety flows unchanged
- OAuth / Stripe callback routes exempt from loop guard
- No tokens, cookies, or emails in debug output

## Deploy notes

Deploy **backend and frontend together** so `contract_version` matches. Mismatched deploy shows retry screen (safe), not a loop.
