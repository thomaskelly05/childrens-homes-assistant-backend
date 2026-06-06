# ORB bootstrap lock

## Purpose

Hard global lock preventing product bootstrap network calls until `OrbAuthGate` reaches `ready`.

## Module

`frontend-next/lib/orb/orb-bootstrap-lock.ts`

## Default

Locked.

## Unlock

`syncOrbBootstrapLock('ready')` via `setOrbGateState` in `orb-gate-state-store.ts`.

## Re-lock

Any non-ready gate state: `unauthenticated`, `checking_auth`, `checking_access`, `access_retry`, `inactive`, `safety_required`, `signing_out`, `error`, `boot`.

Also reset on sign-out (`auth-context.tsx` logout).

## API

- `isOrbBootstrapUnlocked()` — checked by `shouldAllowOrbProductFetch`
- `recordBootstrapBlocked(feature, reason)` — debug counters
- `getOrbBootstrapLockDebugSnapshot()` — `?debugAuth=1` panel

## Protected features

Projects, standalone config, voice session status, saved outputs summary, and any auto-preload using `shouldAllowOrbProductFetch`.
