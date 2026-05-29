# ORB Login & Payment Audit

Date: 2026-05-29

## What already exists

| Area | Location | Notes |
|------|----------|-------|
| Email/password login | `routers/auth_routes.py` `/auth/login` | JWT session cookies, MFA for admin/manager |
| Current user | `routers/auth_routes.py` `/auth/me` | OS user payload incl. OS billing fields |
| ORB residential auth loader | `auth/orb_residential_auth_loader.py` | Strips OS billing from ORB session context |
| OS Stripe billing | `routers/billing_routes.py` | Uses `STRIPE_PRICE_ID` on `users` table |
| ORB access service | `services/orb_access_service.py` | Premium gating, upgrade payload |
| ORB trials | `db/orb_residential_db.py`, `sql/200_orb_residential_premium.sql` | 7-day trial |
| Plan limits | `services/orb_plan_limits_service.py` | Fair-use caps |
| Usage budget | `services/orb_usage_budget_service.py` | Soft/hard + safeguarding fallback |
| Billing meter | `services/orb_billing_meter_service.py` | Usage/cost summaries |
| Standalone routes | `routers/orb_standalone_routes.py` | Canonical `/orb` API surface |
| Frontend `/orb` | `frontend-next/app/orb/page.tsx` | Single ORB UI |

## What was added in this PR

- Dedicated `orb_subscriptions` table (`sql/203_orb_residential_subscriptions.sql`)
- ORB Stripe checkout/portal/webhook (`routers/orb_billing_routes.py`)
- `services/orb_subscription_plan_service.py` — maps `ORB_RESIDENTIAL_STRIPE_PRICE_ID` → `orb_residential_individual`
- Full access payload on `GET /orb/standalone/access`
- ORB signup `POST /orb/standalone/auth/signup` (role `orb_residential`, no OS home)
- Safety acceptance `orb_safety_acceptances`
- Plan enforcement service wired into standalone conversation
- Frontend login/signup/onboarding/access + billing settings

## Reuse vs rebuild

- **Reused:** existing auth sessions, password hashing, trial tables, plan limits, billing meter, premium dependency pattern
- **Not reused for ORB commercial state:** `users.subscription_*` (IndiCare OS billing) — ORB uses `orb_subscriptions`
- **Not implemented yet:** OAuth provider flows (Google/Microsoft/Apple) — env-gated UI only

## Required env vars

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `ORB_RESIDENTIAL_STRIPE_PRICE_ID` | £9.99/month price |
| `STRIPE_SUCCESS_URL` | Checkout success (optional) |
| `STRIPE_CANCEL_URL` | Checkout cancel (optional) |
| `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID` | Portal config (optional) |
| `FRONTEND_APP_URL` | Checkout/portal return URLs |
| `OAUTH_GOOGLE_CLIENT_ID` | Google OAuth (future) |
| `OAUTH_MICROSOFT_CLIENT_ID` | Microsoft OAuth (future) |
| `OAUTH_APPLE_CLIENT_ID` | Apple OAuth (future) |
| `NEXT_PUBLIC_OAUTH_*_ENABLED` | Frontend OAuth button visibility |

## Standalone vs OS billing separation

- **IndiCare OS:** `users.stripe_*`, `STRIPE_PRICE_ID`, `/billing/*`
- **ORB Residential:** `orb_subscriptions`, `ORB_RESIDENTIAL_STRIPE_PRICE_ID`, `/orb/standalone/billing/*`
- ORB subscription **never** sets `users.subscription_active` or grants OS permissions

## Apple Pay / Google Pay

Stripe Checkout supports wallet payments when enabled in the Stripe Dashboard and supported by the browser/device. No custom wallet UI is implemented in-app.

## Intentionally not implemented

- OAuth sign-in flows (buttons hidden/disabled unless configured)
- Enterprise/provider ORB billing (placeholder access state `enterprise_provider_later`)
- IndiCare OS route exposure to standalone ORB users
