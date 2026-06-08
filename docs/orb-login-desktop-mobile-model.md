# ORB Residential login — desktop and mobile models

## Live screenshot issue (Safari)

The login page was improved but not launch-ready:

- Desktop left hero was visually offset (too low, excessive empty space).
- ORB sphere overlapped hero copy — “Care. Connect. Empower.” and headline text sat behind the sphere.
- Brand tag competed with the sphere glow (absolute glow + large `orb-presence--hero` sizing).
- Right login card bottom was clipped on short desktop viewports (e.g. 1440×700).
- Passkey and legal footer could sit below the visible area.
- Desktop and mobile shared too much layout logic in one monolithic component.
- Mobile needed a simpler format focused on sign-in actions, not the full desktop hero.

### Layout fix (this pass)

**Desktop left hero** — strict document flow (no absolute overlap):

1. ORB sphere — centred, max **6.5rem** (5.5rem on heights ≤760px), `overflow: hidden` on wrap
2. ORB Residential
3. Powered by IndiCare Intelligence
4. Care. Connect. Empower. (brand tag)
5. AI support for residential children's homes (headline)
6. Record better. Reflect faster. Respond safer.
7. Trust points

Hero starts ~10–16% from viewport top (`clamp(2.25rem, 14vh, 4.25rem)` padding).

**Right card** — short desktop (≤760px height):

- Tighter section margins, smaller inputs/buttons
- Card `max-height` + internal scroll with `scrollbar-gutter: stable`
- Extra bottom/safe-area padding so passkey + legal footer clear dock/chrome
- Create account remains above fold on 1440×760

## Desktop / tablet model

**Layout:** Premium two-column grid (`lg:grid-cols-2`).

**Left hero** (`OrbLoginDesktopHero`):

- Top-aligned at ~10–16% from usable viewport top.
- ORB sphere first in document flow (above all copy).
- Brand block: ORB Residential → Powered by IndiCare Intelligence.
- Brand tag, headline, lead, and trust points follow in normal flow — no overlap with sphere.

**Right card** (`OrbLoginAuthCard`):

- Premium bordered card with internal scroll on short heights.
- `max-height: calc(100svh - spacing)` with `overflow-y: auto` and bottom/safe-area padding.
- Compact desktop mode for heights ≤760px (tighter spacing, smaller hero sphere).
- Conversion order preserved: OAuth → Create account → Email/password → Passkey → Legal footer.

## Mobile model

**Layout:** Single compact column — no desktop hero.

**Header** (`OrbLoginMobileHeader`):

- Small ORB mark only (`PremiumMobileOrb`, ~3.25rem) — no large sphere.
- ORB Residential + Powered by IndiCare Intelligence.

**Main** (`OrbLoginAuthCard` with responsive copy):

- Title: “Sign in to continue” (desktop uses “Sign in to ORB Residential”).
- Lead: Use your work account, email or passkey.
- Same auth actions and order as desktop.
- Passkey collapsible on viewports under 760px height.
- Full-page vertical scroll with safe-area insets for Safari toolbar.

## Why layouts differ

| Concern | Desktop | Mobile |
|--------|---------|--------|
| Primary goal | Premium brand storytelling + efficient sign-in | Fast access to sign-in actions |
| ORB visual | Full hero sphere in left column | Small mark in header only |
| Scroll | Card/panel scroll on short heights | Page scroll |
| Hero copy | Full headline + trust points | Hidden (not duplicated in card) |

Auth form logic remains shared in `OrbLoginAuthCard`; only visual layout components are split.

## Component structure

```
OrbLoginScreen
├── OrbLoginDesktopHero      (lg+ only)
└── OrbLoginAuthCard         (shared auth UI)
    ├── OrbLoginMobileHeader (mobile only)
    └── OrbLoginLegalFooter
```

Files:

- `frontend-next/components/orb-residential/orb-login-screen.tsx` — state, handlers, shell
- `frontend-next/components/orb-residential/orb-login-desktop-hero.tsx`
- `frontend-next/components/orb-residential/orb-login-mobile-header.tsx`
- `frontend-next/components/orb-residential/orb-login-auth-card.tsx`
- `frontend-next/components/orb-residential/orb-login-legal-footer.tsx`
- `frontend-next/app/orb/orb-login.css` — single visual authority

## Legal link handling

Public footer links (login only):

- https://www.indicare.co.uk/privacy
- https://www.indicare.co.uk/terms
- https://www.indicare.co.uk/cookies
- https://www.indicare.co.uk/support

Safeguarding disclaimer:

> ORB supports professional judgement and does not replace safeguarding procedures, managers, emergency services or legal advice.

No proprietary intelligence details are exposed on the login surface.

## Viewports tested

| Viewport | Role |
|----------|------|
| 1440×700 | Short desktop — card scroll, all CTAs reachable |
| 1440×760 | Short desktop — compact mode |
| 1440×900 | Standard desktop — hero alignment |
| 768×1024 | Tablet — two-column |
| 390×667 | Mobile — compact layout |
| 390×844 | Mobile — Safari typical |
| 430×932 | Mobile — large phone |

## Related deploy fixes

- Missing `orb-auth-recovery-diagnostics` module — see `docs/orb-google-oauth-production-diagnostics.md`
- Google OAuth env validation — malformed client ids no longer redirect to Google `invalid_client`

## Tests run

```bash
cd frontend-next
npm run typecheck
npm run build
NEXT_PUBLIC_E2E_TEST_MODE=1 npm run e2e:orb-auth
```

Unit tests:

- `components/orb-residential/orb-login-screen-layout.test.ts`
- `components/orb-residential/orb-mobile-login-layout.test.ts`

E2E:

- `e2e/orb-login-scroll-reachability.spec.ts`
- `e2e/orb-passkey-mobile.spec.ts`
- `e2e/orb-auth-cookie-session.spec.ts`
- `e2e/orb-auth-register-billing.spec.ts`

## Remaining provider-console tasks

- Provider OAuth enablement in production (Google / Microsoft / Apple consoles).
- Stripe billing webhook verification for post-signup flows.
- MFA enforcement UX polish for admin/manager first login.
- Provider AI settings and data-protection copy review in authenticated settings (not login).

## Out of scope (unchanged)

- Backend auth logic, OAuth routes, Stripe/billing, session/cookie security.
- Public routes and ORB Residential / ORB OS boundaries.
