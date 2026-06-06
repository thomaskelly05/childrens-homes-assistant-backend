# ORB product bootstrap gating contract

## Rule

**ORB product bootstrap APIs must not run until `OrbAuthGate` `gateState === 'ready'`.**

## Allowed calls by gate state

| Gate state | Allowed network |
|------------|-----------------|
| `checking_auth` | `/auth/me` only |
| `unauthenticated` | `/auth/me`, `/orb/auth/providers`, harmless analytics |
| `checking_access` | `/auth/me`, **one** `/orb/standalone/access` (deduped) |
| `access_retry` | `/auth/me`, access **only** via explicit retry |
| `inactive` | `/auth/me`, billing-safe access reads (upgrade screen) |
| `safety_required` | `/auth/me`, safety/setup routes |
| `ready` | Full product bootstrap |

## Blocked before `ready`

- `/orb/projects`
- `/orb/standalone/config`
- `/orb/voice/session/status`
- `/orb/standalone/outputs/summary`
- `/auth/passkeys/status` (deferred until `ready`)

## Implementation

- `canBootstrapOrbProduct(gateState, access)` in `frontend-next/lib/orb/orb-product-bootstrap-guard.ts`
- `assertOrbProductBootstrapAllowed(reason)` records `lastBlockedBootstrapReason` for `?debugAuth=1`
