# ORB Login & Auth Gate Audit

Audit date: 2026-06-06. Scope: ORB Residential (`/orb` and deep links).

## Files reviewed

| File | Role |
|------|------|
| `frontend-next/app/orb/page.tsx` | Renders `OrbShell` (product entry) |
| `frontend-next/app/orb/layout.tsx` | Theme/CSS only — no auth |
| `frontend-next/app/orb/write/page.tsx` | Redirects to `/orb?station=write` |
| `frontend-next/components/orb/orb-shell.tsx` | Product wrapper + safety modal |
| `frontend-next/components/orb-residential/orb-auth-gate.tsx` | **New** hard gate |
| `frontend-next/components/orb-residential/orb-login-screen.tsx` | Login UI |
| `frontend-next/components/orb-standalone/orb-care-companion.tsx` | Full product (chat, stations) |
| `frontend-next/contexts/auth-context.tsx` | Session state |
| `frontend-next/hooks/use-orb-account-state.ts` | ORB access/subscription |
| `frontend-next/lib/orb/orb-billing-client.ts` | `/orb/standalone/access` |
| `frontend-next/middleware.ts` | Treats `/orb` as public (no cookie redirect) |

## Findings (before fix)

1. **Unauthenticated users could see full ORB product** at `/orb` because `auth-context` explicitly skips redirect when `pathname === '/orb'`, and `OrbShell` rendered `OrbCareCompanion` without an auth gate.
2. **Product shell rendered before auth resolved** — companion mounted immediately; guest local responses were possible.
3. **Access check was client-only** — middleware marks `/orb` public; gating must happen in React.
4. **No neutral loading gate** — shell showed “Loading ORB…” then product chrome.
5. **Deep links** (`/orb/write`, `?station=…`) funnel to `/orb` but inherited the same gap.
6. **Sign out** existed in account modal but not in a compact top-level menu; logout redirected to `/orb/login`.

## Fixes applied

- `OrbAuthGate` wraps `OrbShell` product tree.
- Loading → `OrbAuthLoadingScreen` only.
- Unauthenticated → `OrbLoginScreen` only (no sidebar/chat/stations).
- Authenticated + inactive → `OrbUpgradeScreen`.
- Authenticated + active → product as before.
- `OrbAccountMenu` popover with Profile, Settings, Billing, Sign out.
- Premium login two-column layout + `returnUrl` preservation.

## What must remain unchanged

- Existing auth context/session (no second auth system).
- Stripe checkout, trial, safety acceptance, billing refresh.
- OAuth, email, passkey, signup routes.
- Provider AI trust settings in settings panel.
