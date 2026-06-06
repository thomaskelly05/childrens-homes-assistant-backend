# ORB Access Gating Contract

## Purpose

Define how ORB Residential resolves **access verification** after auth succeeds. Loading must always terminate in exactly one safe state.

## Terminal states

| State | When | UI |
|-------|------|-----|
| Login | `auth.status === 'unauthenticated'` or auth gate timeout | `OrbLoginScreen` (embedded) |
| Upgrade / billing | Signed in, no `can_use_orb`, access 402 or payment_required | `OrbUpgradeScreen` |
| Safety acceptance | Entitled user, `safety_accepted === false` | Redirect `/orb/setup` or safety retry |
| Product | `hasConfirmedAccess` or `adminBypass` | Gate children (product shell) |
| Safe retry | Access timeout, 429, 5xx, network | `OrbAccessRetryScreen` |

**Never:** infinite loading, product shell during access load, login while authenticated.

## Loading copy

| Phase | Message | Max wait |
|-------|---------|----------|
| Auth | “Checking your session…” | 5s (`ORB_AUTH_GATE_FALLBACK_MS`) |
| Access | “Verifying your ORB access…” | 7s (`ORB_ACCESS_GATE_FALLBACK_MS`) |
| Access network | `useOrbAccountState` race | 12s (`ORB_AUTH_LOADING_TIMEOUT_MS`) |

After access timeout (authenticated):

- Message: “We could not verify your ORB access. Try again or manage billing.”
- Actions: Try again, Back to sign in, Manage billing

## HTTP mapping (`GET /orb/standalone/access`)

| Status | Frontend `accessFailureKind` | Action |
|--------|------------------------------|--------|
| 200 + guest | N/A (unsigned) | Login on auth unauthenticated |
| 200 + user payload | `none` | Upgrade or product per payload |
| 401 | `unauthorized` | `auth.logout()` → login |
| 402 | `payment_required` | Upgrade |
| 403 + safety code | `safety_required` | Setup / safety flow |
| 429 | `rate_limited` | Retry screen |
| 5xx / 504 | `unavailable` / `timeout` | Retry screen |

## Access endpoint rules (backend)

- **Does not** use `require_rich_orb_premium_access` (no circular dependency)
- No session → 200 guest JSON
- Invalid session token → 401 JSON
- Valid session → 200 user access JSON
- Always JSON — no HTML redirect

## Deadline reset

`orb-access-loading-deadline.ts` resets on:

- Successful access fetch
- Sign in / sign out
- Manual “Try again”
- Leaving ORB surface paths

## Implementation

- `frontend-next/components/orb-residential/orb-auth-gate.tsx`
- `frontend-next/hooks/use-orb-account-state.ts`
- `frontend-next/lib/orb/orb-access-loading-deadline.ts`
- `routers/orb_billing_routes.py` — `GET /access`
