# ORB Front Door Routing Contract

## Canonical rule

`app.indicare.co.uk/orb` is the single ORB Residential front door.

## Redirect matrix

| Source | Target |
|--------|--------|
| `/` | `/orb` |
| `/login` | `/orb` |
| `/login?returnUrl=%2F` | `/orb` |
| `/login?returnUrl=/orb/write` | `/orb?returnUrl=%2Forb%2Fwrite` |
| `/orb/login` | `/orb` (+ safe `returnUrl` when present) |

## returnUrl safety

Implemented in `frontend-next/lib/orb/orb-front-door-routing.ts`:

- Only same-origin relative paths starting with `/orb`
- `/`, `/home`, `/dashboard` → `/orb`
- External URLs (`https://`, `//`) → `/orb`
- Default fallback: `/orb`

## Public paths (no session required)

- `/orb/signup`, `/orb/billing/*`, `/orb/access`, `/orb/onboarding`
- `/auth/*`, `/api/*`, `/backend/*` (OAuth callbacks, Stripe webhooks)
- `/privacy`, `/terms`, `/mfa*`

## Protected ORB product paths

All other `/orb/*` routes render through `OrbAuthGate`:

1. Auth loading (branded, max 5s via `ORB_AUTH_GATE_FALLBACK_MS`)
2. Login if unauthenticated or auth cannot be confirmed
3. Upgrade if signed in without access
4. Product shell only when authenticated + access confirmed

## Auth loading timeout behaviour

| Stage | Max wait | Fallback |
|-------|----------|----------|
| Auth status `loading` | 5s (`OrbAuthGate`) | Embedded login on `/orb` |
| `/auth/me` fetch | 8s (`auth-context`) | `unauthenticated` |
| Access fetch (signed in) | 12s | Login or upgrade per access result |

The gate deadline is stored in `orb-auth-loading-deadline.ts` so `Suspense` / mobile remounts cannot reset it indefinitely.

## Loop prevention

- `/orb` never redirects to `/orb/login` (login is embedded via `OrbAuthGate`)
- `/orb/login` and `/login` redirect once to `/orb`
- `auth-context` skips `router.replace` on ORB surfaces (`isOrbSurfacePath`)
- `OrbAuthGate` does not call `router.replace` or `window.location`

## Sign out

Logout on ORB surfaces redirects to `/orb` (login/front door).
