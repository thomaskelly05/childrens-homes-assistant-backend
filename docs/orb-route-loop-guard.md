# ORB Route Loop Guard

Module: `frontend-next/lib/orb/orb-route-loop-guard.ts`

## Purpose

Prevent repeated `router.replace` / `router.push` to `/orb`, `/login`, or `/orb/login` within 10 seconds from causing visible bounce on mobile.

## Threshold

- Window: 10 seconds
- Max guarded redirects: 2 (3rd attempt breaks the loop)
- Broken state → `OrbAuthGate` shows embedded login (settles UI)

## Exempt routes (never counted / never blocked)

- `/auth/oauth/*`, `/orb/auth/oauth/*`
- `/mfa`
- `/orb/billing/success`, `/orb/billing/cancel`
- `/api/*`

## Integration

`OrbAuthGate` wraps the Next router via `wrapOrbRouter(router, 'orb-auth-gate')`.

Loop guard clears automatically when gate reaches `ready` state.

## Debug

Redirect attempts recorded in `orb-auth-debug-events` when `?debugAuth=1`.
