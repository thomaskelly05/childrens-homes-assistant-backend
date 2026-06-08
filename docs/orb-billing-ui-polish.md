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

## Billing layout

Billing modal and Settings → Account & Billing use a calmer, card-based layout:

1. Top plan card — status, price, boundary note, primary actions
2. Subscription — plan, status, renewal period, Stripe note
3. Usage — requests this period
4. Trust & data — ORB / IndiCare OS boundary
5. Provider team plans — **Coming soon** / **Speak to us**

Spending cap and buy-more packs are marked **coming soon** until backed by live product flows.

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
