# ORB Residential routing audit (2026-05-31)

Audit before ORB front-door sprint. Canonical target routes are listed in the sprint spec.

## Pre-change state

| Route | Purpose | Notes |
|-------|---------|-------|
| `/` | **IndiCare OS home** (`OsHomeClient`) | Wrong default for app.indicare.co.uk launch |
| `/os` | IndiCare OS entry (duplicate of `/`) | OS preserved here |
| `/orb` | Standalone chat (`OrbCareCompanion`) | Heavy sidebar; light theme |
| `/orb/login` | Email + OAuth login | Light theme; OAuth order Google-first |
| `/orb/onboarding` | 4-step onboarding | Redirect target after signup; not `/orb/setup` |
| `/orb/access` | Trial/subscription (`OrbUpgradeScreen`) | Not `/orb/billing` |
| `/orb/signup` | Account creation | |
| `/orb/ask`, `/orb/shift-builder`, etc. | Legacy workflow aliases | |
| `/orb-residential/*` | Redirects to `/orb/*` | Legacy path |
| `/homes`, `/young-people/*` | OS workspaces | Unchanged |
| `/assistant/orb` | OS-linked ORB | Unchanged |
| `/login` | OS login | Separate from ORB |
| `/settings/orb/setup` | OS voice onboarding | Not standalone ORB profile |

## Auth & billing

- OAuth: `/orb/standalone/auth/oauth/{provider}/start?return_url=…` via `orbOAuthStartUrl()`
- Setup API: `GET/POST /orb/setup`, profile `GET/PATCH /orb/profile`
- Billing: `/orb/standalone/access`, checkout `/orb/subscription/checkout`, trial `/orb/standalone/trial/start`
- Post-login (before): onboarding → `/orb/access`; login default `returnUrl=/orb`

## Root layout

- `app/layout.tsx` metadata: "IndiCare OS"
- `OsAppProviders` wraps all routes except `/orb/*` with OS `AppShell`

## Post-change targets

- `/` → ORB Residential front door (no OS shell)
- `/orb/setup`, `/orb/billing`, `/orb/review`, `/orb/templates`, `/orb/learn`, `/orb/saved`
- `/orb/onboarding` → redirect `/orb/setup`
- `/orb/access` → redirect `/orb/billing`
- Metadata default: ORB Residential
