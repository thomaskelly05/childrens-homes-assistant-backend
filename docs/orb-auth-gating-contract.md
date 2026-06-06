# ORB Auth Gating Contract

## Rules

### Unauthenticated

- Any ORB **product** route (`/orb`, `/orb?station=*`, redirects from `/orb/write`, etc.) shows **only** `OrbLoginScreen`.
- Do not render: sidebar, chat, dictate, voice, write, templates, documents, saved outputs, account product menus, or product data fetches that expose content.

### Loading

- While `useAuth().status === 'loading'` **or** signed-in access is loading, show `OrbAuthLoadingScreen` (`data-orb-auth-loading`).
- Never flash product shell during resolution.

### Authenticated + inactive subscription

- Show `OrbUpgradeScreen` (trial/subscribe/manage billing) — same billing client logic as before.
- `/orb/billing` uses `OrbAuthGate mode="billing"` (login required, subscription not required).

### Authenticated + active

- Render `OrbCareCompanion` and existing safety modal when `safety_accepted === false`.

## Implementation

```
OrbShell → OrbAuthGate(mode=product) → product div → OrbCareCompanion
```

Access signal: `useOrbAccountState().hasConfirmedAccess` (trial, subscription, or `can_use_orb`), with `adminBypass` exception.

## Preserved public routes

`/orb/login`, `/orb/signup`, `/orb/billing/success`, `/orb/billing/cancel`, `/orb/onboarding` remain in `auth-context` public prefixes.

## Direct route protection

| Route | Behaviour when logged out |
|-------|---------------------------|
| `/orb` | Login screen (embedded) |
| `/orb?station=write` | Login; `returnUrl` preserved |
| `/orb/write` | Redirect → `/orb?station=write` → gate |
| `/orb/billing` | Login; `returnUrl=/orb/billing` |

## Limitations

- Middleware does not enforce ORB auth server-side; gate is client-side (required for existing SPA architecture).
- Brief HTML shell may load before hydration; no product components mount until gate passes.
