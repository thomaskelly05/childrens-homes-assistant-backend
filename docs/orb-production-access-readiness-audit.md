# ORB Production Access Readiness Audit

**Date:** 2026-06-04  
**Scope:** ORB Residential sign-up, login, subscription, payment, safety acceptance, and legal pages.  
**Legal review:** Privacy and Terms pages are starter copy — counsel review required before production launch.

## Journey map

| Step | User action | Backend | Frontend | Failure / user sees |
|------|-------------|---------|----------|---------------------|
| 1 | Visit `/orb` signed out | `GET /orb/standalone/access` (optional auth) | Redirect to login or read-only shell | Unauthenticated payload; no ORB premium |
| 2 | Create account | `POST /orb/standalone/auth/signup` | `/orb/signup` | 409 if email exists |
| 3 | Sign in | OAuth, `/auth/login`, passkeys | `/orb/login` | OAuth error query; email/password message |
| 4 | Inactive / paywall | Access payload `access_blocker: subscription` | `/orb/billing`, upgrade screen | “Start ORB Residential” |
| 5 | Start trial | `POST /orb/standalone/trial/start` | Upgrade / billing modal | Error if not eligible |
| 6 | Subscribe | `POST /orb/standalone/billing/checkout` | Stripe Checkout redirect | 503 if Stripe env missing |
| 7 | Return from checkout | Webhook + success page poll | `/orb/billing/success` | “Refresh status” if webhook delayed |
| 8 | Access refresh | `refreshOrbAccessAfterCheckout` | Success page, billing modal | Plain English pending copy |
| 9 | Safety required | `safety_accepted: false`, `access_blocker: safety_acceptance` | `OrbSafetyModal` on `/orb` | Modal explains payment is OK |
| 10 | Accept safety | `POST /orb/standalone/safety/accept` | Modal / setup screen | Retry on save error |
| 11 | Enter ORB | `can_use_orb: true` | `OrbShell` / companion | Premium routes 402/403 if blocked |
| 12 | Open billing | Billing modal | In-app modal | Load error with subscribe fallback |
| 13 | Manage subscription | `POST /orb/standalone/billing/portal` | Stripe Customer Portal | Error if no customer id |
| 14 | Webhook sync | `POST /orb/standalone/billing/webhook` | N/A (server) | Idempotent; signature required |
| 15 | Past due / cancelled | `access_state` mapping | Status pills, upgrade copy | Plain English banners |

## Backend-backed vs UI-only

| Concern | Backend-backed | UI-only |
|---------|----------------|---------|
| `can_use_orb` | Yes — DB trial/subscription + safety | Display only |
| Trial eligibility | `orb_trials`, `trial_available` | Button enablement |
| Stripe checkout URL | Stripe API | Loading state on button |
| Subscription status | `orb_subscriptions` + webhooks | Status pill labels |
| Safety gate | `orb_safety_acceptances` | Modal copy |
| OAuth enabled | Env + `GET /orb/auth/providers` | Button visibility |
| Passkey | `passkey_routes` + RP env | WebAuthn client |
| Privacy/Terms | Static Next.js pages | Links only |

## Required environment variables

### Stripe

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | API calls (server only) |
| `ORB_RESIDENTIAL_STRIPE_PRICE_ID` | £9.99/month price |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature |
| `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL` | Optional overrides |
| `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID` | Portal branding |
| `FRONTEND_APP_URL` / `APP_BASE_URL` | Return URLs |

### OAuth

| Provider | Variables |
|----------|-----------|
| Google | `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`, `OAUTH_GOOGLE_REDIRECT_URI` |
| Microsoft | `OAUTH_MICROSOFT_CLIENT_ID`, `OAUTH_MICROSOFT_CLIENT_SECRET`, `OAUTH_MICROSOFT_TENANT`, `OAUTH_MICROSOFT_REDIRECT_URI` |
| Apple | `OAUTH_APPLE_CLIENT_ID`, `OAUTH_APPLE_TEAM_ID`, `OAUTH_APPLE_KEY_ID`, `OAUTH_APPLE_PRIVATE_KEY`, `OAUTH_APPLE_REDIRECT_URI` |

### Passkeys

| Variable | Purpose |
|----------|---------|
| `PASSKEY_RP_ID` | Relying party (production: `app.indicare.co.uk`) |
| `PASSKEY_RP_NAME` | Display name |
| `PASSKEY_ALLOWED_ORIGINS` | Comma-separated origins |
| `PASSKEY_CHALLENGE_MAX_AGE_SECONDS` | Challenge TTL |

### Frontend (non-secret)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_OAUTH_GOOGLE_ENABLED` | Build-time OAuth visibility |
| `NEXT_PUBLIC_OAUTH_MICROSOFT_ENABLED` | Same |
| `NEXT_PUBLIC_OAUTH_APPLE_ENABLED` | Same |

## Stripe Dashboard setup

1. Create Product **ORB Residential — Individual** with recurring Price **£9.99/month** (GBP).
2. Copy Price ID → `ORB_RESIDENTIAL_STRIPE_PRICE_ID`.
3. Webhook endpoint: `https://app.indicare.co.uk/orb/standalone/billing/webhook` (adjust for staging).
4. Enable events: see [orb-stripe-production-readiness.md](./orb-stripe-production-readiness.md).
5. Customer Portal enabled; optional configuration ID in env.
6. Verify domain for Apple Pay / Google Pay in Checkout.

## OAuth redirect URIs (production)

Register in each provider console (exact values must match env):

- **Google:** `OAUTH_GOOGLE_REDIRECT_URI` → typically `https://app.indicare.co.uk/orb/standalone/auth/oauth/google/callback`
- **Microsoft:** `OAUTH_MICROSOFT_REDIRECT_URI` → same pattern for `microsoft`
- **Apple:** `OAUTH_APPLE_REDIRECT_URI` → same pattern for `apple` (form_post callback)

Start URL template: `/orb/standalone/auth/oauth/{provider}/start?return_url=/orb`

## Passkey production settings

| Setting | Production value |
|---------|------------------|
| RP ID | `app.indicare.co.uk` |
| Allowed origins | `https://app.indicare.co.uk` |
| Email | Required on login for credential discovery |

## Key files

| Area | Path |
|------|------|
| Login | `frontend-next/components/orb-residential/orb-login-screen.tsx` |
| Upgrade | `frontend-next/components/orb-standalone/orb-upgrade-screen.tsx` |
| Billing modal | `frontend-next/components/orb-standalone/orb-billing-modal.tsx` |
| Safety modal | `frontend-next/components/orb-residential/orb-safety-modal.tsx` |
| Access service | `services/orb_access_service.py` |
| Billing routes | `routers/orb_billing_routes.py` |
| OAuth | `routers/orb_oauth_routes.py`, `services/orb_oauth_service.py` |
| Privacy / Terms | `frontend-next/app/privacy/page.tsx`, `frontend-next/app/terms/page.tsx` |

## Launch blockers (remaining)

- [ ] Live Stripe keys and webhook on production host
- [ ] OAuth redirect URIs registered for `app.indicare.co.uk`
- [ ] Passkey RP ID and allowed origins for production domain
- [ ] Legal review of `/privacy` and `/terms`
- [ ] End-to-end test: subscribe → safety → ORB chat/voice
- [ ] Provider team billing (out of scope — contact CTA only)

## Safety acceptance rule (unchanged)

`can_use_orb` in the API payload requires **both** an active trial/subscription (or bypass) **and** `safety_accepted`. Subscribed users who have not accepted see `access_blocker: safety_acceptance` — this is intentional and must not be bypassed.
