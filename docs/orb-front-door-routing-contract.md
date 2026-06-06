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

1. Auth loading (branded, timeout)
2. Login if unauthenticated
3. Upgrade if signed in without access
4. Product shell only when authenticated + access confirmed

## Sign out

Logout on ORB surfaces redirects to `/orb` (login/front door).
