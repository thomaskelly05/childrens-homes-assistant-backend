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

`OrbAuthGate` is the **only** product mount point. `setOrbGateState()` syncs module store for bootstrap guards and the global bootstrap lock (`orb-bootstrap-lock.ts`).

## Bootstrap lock sync

| Gate state | Bootstrap lock | Product APIs |
|------------|----------------|--------------|
| All except `ready` | Locked | Blocked client-side |
| `ready` | Unlocked | Allowed once |

Backend `require_orb_product_bootstrap_access` enforces the same contract server-side.

## Blocked API responses (no route bounce)

| HTTP | Gate reaction |
|------|---------------|
| 401 | Clear stale session → login |
| 402 | Upgrade screen |
| 403 safety | Safety flow |
| 429 / 500 | Retry screen |

Product hooks must not call `router.replace('/orb')` on bootstrap failures.
