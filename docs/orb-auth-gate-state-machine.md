# ORB auth gate state machine

Canonical states (`frontend-next/lib/orb/orb-auth-state-machine.ts`):

| State | UI | Product mounted? |
|-------|-----|------------------|
| `checking_auth` | Loading | No |
| `unauthenticated` | Login | No |
| `checking_access` | Access loading | No |
| `access_retry` | Retry | No |
| `inactive` | Upgrade | No |
| `safety_required` | Safety prompt | No |
| `ready` | Product children | **Yes** |

`OrbAuthGate` is the **only** product mount point. `setOrbGateState()` syncs module store for bootstrap guards.
