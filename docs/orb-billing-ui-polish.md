# ORB Residential billing UI polish

## Overview

ORB Residential subscription lifecycle is live end-to-end:

- Stripe Checkout opens and completes
- Webhooks update `orb_subscriptions`
- Access payloads reflect active subscription state
- ORB UI shows billing status, usage and Stripe Customer Portal entry points

## Subscription management in Stripe

ORB does **not** expose direct Cancel / Resume / Reactivate controls in the product UI.

Users manage payment methods, invoices and subscription changes through **Manage billing**, which opens the **Stripe Customer Portal**.

Acceptable ORB copy:

- Button: **Manage billing**
- Helper: *Manage your payment method, invoices and subscription settings securely in Stripe.*

## Active subscription vs trial display

When `subscription.status === "active"` (paid subscription):

- Header shows **Active**
- Trial chip/row is hidden in billing surfaces
- **Upgrade** is hidden
- **Manage billing** and **Refresh status** remain available

When trial is active without a paid subscription:

- Show **Trial active · X days left**

When trial has ended and there is no active subscription:

- Show **Trial ended** and **Upgrade · £9.99/month**

Paid subscribers must never see both **Active** and a trial chip at the same time.

## Desktop layout standard

Billing modal and Settings → Account & Billing target a compact desktop viewport:

- Modal max height: `min(720px, calc(100vh - 48px))`
- Internal modal body scrolls when needed; header stays visible
- No overlapping action buttons on plan cards
- Two-column plan card on desktop: identity left, price and actions right
- Compact card padding and reduced vertical gaps

### Billing modal sections

1. **Account & plan** — avatar, name, email, plan, status, price, Manage billing, Refresh status
2. **Subscription** — plan, status, billing amount, managed by Stripe
3. **Usage** — requests this period; spending cap / buy-more marked coming soon
4. **Trust & data** — ORB / IndiCare OS boundary
5. **Provider team plans** — **Coming soon** / **Speak to us**

### Settings → Account & Billing

- Profile row with avatar, name, email and role/preferences shortcut
- Two-column billing summary where space allows
- Manage billing and Refresh billing status actions
- No duplicate footer copy when the settings drawer footer already states the boundary

## Sidebar avatar behaviour

The left sidebar account card shows:

- Circular provider avatar when `avatar_url` is available
- Initials fallback when missing or when the image fails to load
- Name, email and subscription headline (e.g. **Active**)

The same `OrbUserAvatar` component is used in:

- Left sidebar account area
- Account menu header
- Settings → Account & Billing profile row
- Billing modal account & plan card

Avatar data comes from the shared account state (`auth.user.avatar_url` via `useOrbAccountState`), not a separate stale sidebar payload.

## IndiCare OS boundary

ORB Residential billing is separate from IndiCare OS. ORB Residential does **not** grant IndiCare OS access.

## Profile avatars

Connected identity providers may supply a safe display image:

| Provider | Source field | Storage |
|----------|--------------|---------|
| Google | `picture` from OIDC userinfo | `orb_oauth_accounts.metadata.avatar_url` |
| Microsoft | `picture` / `photo` when present | same |
| Apple | `picture` when present | same |
| Email/password | — | initials fallback |

### API fields

- `GET /auth/me` → `user.avatar_url`, `user.auth_provider` (when available)
- `GET /orb/front-door/verdict` → `data.user.avatar_url`, `data.user.auth_provider`

Only HTTPS URLs from approved provider hostnames are exposed. OAuth access tokens are never returned to the frontend.

### UI fallback

If `avatar_url` is missing or the image fails to load:

- Show initials in a soft neutral circle
- Do not render broken image placeholders

## Plan labels

Raw plan IDs such as `orb_residential_individual` are mapped to friendly labels (e.g. **ORB Residential — Individual**) in normal UI via `formatOrbPlanLabel`. Raw IDs remain in diagnostics only.

## Tests

Backend:

```bash
python -m pytest tests/test_orb_billing_routes.py tests/test_orb_auth_production_readiness.py tests/test_orb_user_avatar_service.py tests/test_orb_billing_ui_polish.py -q
```

Frontend:

```bash
cd frontend-next
npm run typecheck
npm run build
npm test -- --runInBand
```
