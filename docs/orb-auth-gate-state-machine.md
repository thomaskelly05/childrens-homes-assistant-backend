# ORB Auth Gate State Machine

`OrbAuthGate` derives a single gate state via `deriveOrbGateState()` in `frontend-next/lib/orb/orb-auth-state-machine.ts`.

## States

| State | UI |
|-------|-----|
| `boot` | Brief loading |
| `checking_auth` | `OrbAuthLoadingScreen` (session check) |
| `unauthenticated` | Embedded `OrbLoginScreen` (`embeddedGateMode`) |
| `checking_access` | `OrbAuthLoadingScreen` (access verify) |
| `access_retry` | `OrbAccessRetryScreen` |
| `inactive` | `OrbUpgradeScreen` |
| `safety_required` | `OrbAccessRetryScreen` → setup |
| `ready` | Product children |
| `signing_out` | Loading |
| `error` | Loading / retry |

## Events (reducer)

`reduceOrbGateState` handles explicit events (`AUTH_OK`, `ACCESS_401`, `RETRY`, etc.) for tests and future dispatch. Runtime UI uses `deriveOrbGateState` from live auth + access hook values.

## Rules

- Login screen does **not** route when `embeddedGateMode`
- Access hook returns status only — no `router.*`
- Auth context does **not** redirect away from `/orb` when unauthenticated
- Access 401 → clear stale state once → logout → `unauthenticated`
- Loop guard → force `unauthenticated` (login settles)

## Timeouts

- Auth loading: 5s → `unauthenticated` (login)
- Access loading: 7s → `access_retry` (not login)
