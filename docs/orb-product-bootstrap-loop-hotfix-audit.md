# ORB product bootstrap loop — hotfix audit

## Root cause

Production `/orb` bounce/loop was caused by **product bootstrap side effects running before `OrbAuthGate` reached a stable state**, compounded by:

1. **Duplicate `useOrbAccountState` instances** — `orb-shell.tsx` and `orb-auth-gate.tsx` each mounted the hook, doubling `/orb/standalone/access` and `/auth/passkeys/status` calls.
2. **No access-request deduplication** — concurrent access checks were not shared; remounts and parallel hooks triggered access storms.
3. **Product hooks keyed only on `account.isSignedIn`** — `OrbCareCompanion` effects could conceptually align with auth flapping; gate `ready` was not required before `/orb/projects`, `/orb/standalone/config`, `/orb/voice/session/status`, or `/orb/standalone/outputs/summary`.
4. **Guest 200 on `/orb/standalone/access`** — logged-out callers with cookies could still hit access (guest JSON 200), appearing as repeated access traffic in logs.
5. **`window.location.assign('/orb')` fallbacks** in loading/retry screens when callbacks were absent — same-path navigation churn on mobile Safari.

## Component / hook audit

| Location | Mounts before gate ready? | API calls | Expected logged-out? |
|----------|---------------------------|-----------|-------------------|
| `orb-shell.tsx` (fixed) | Product only as `OrbAuthGate` child in `ready` | None at shell level | Yes — login only |
| `orb-auth-gate.tsx` | Gate screens only until `ready` | Via shared account provider | `/auth/me` via auth context |
| `use-orb-account-state.ts` | Runs inside provider at gate root | `/orb/standalone/access` when authenticated | No access when signed out |
| `orb-care-companion.tsx` | Only when gate `ready` | Projects, config, outputs, voice | **No** |
| `orb-login-screen.tsx` (embedded) | `unauthenticated` gate | `/orb/auth/providers`, analytics | Yes |
| `auth-context.tsx` | Always (layout) | `/auth/me` | Yes |

## Hooks that fired before gate ready (pre-fix)

- `useOrbAccountState` ×2 (shell + gate)
- `OrbCareCompanion` project/config/output effects (if product leaked or auth flapped)
- Passkey status bundled with every access refresh

## Fix summary

- `OrbAccountStateProvider` — single access lifecycle
- `orb-access-request-cache.ts` — dedupe + short cache
- `orb-product-bootstrap-guard.ts` — block product APIs unless `gateState === 'ready'`
- `OrbProductShell` — product chrome only behind `ready`
- Removed same-path `/orb` redirects from gate children
