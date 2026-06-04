# ORB Login & Billing Readiness Audit

Date: 2026-06-04

## Scope

ORB Residential standalone login, account access, subscription status, and billing UX across `frontend-next` and backend ORB billing/auth routes. IndiCare OS billing (`routers/billing_routes.py`, `users.subscription_*`) is out of scope except where ORB must remain isolated.

## Frontend routes & surfaces

| Surface | Path / component | Role |
|---------|------------------|------|
| Sign-in page | `app/orb/login/page.tsx` → `components/orb-residential/orb-login-screen.tsx` | OAuth, email/password, passkey |
| Sign-up | `app/orb/signup/page.tsx` | `POST /orb/standalone/auth/signup` then email login |
| Billing page | `app/orb/billing/page.tsx` → `orb-upgrade-screen.tsx` | Soft paywall when inactive |
| Billing modal | `components/orb-standalone/orb-billing-modal.tsx` | In-app subscribe / portal / usage |
| Account modal | `components/orb-standalone/orb-account-modal.tsx` | Profile, plan chip, billing shortcut |
| Auth context | `contexts/auth-context.tsx` | Session, `/auth/login`, ORB paths exempt from OS redirects |
| Account state | `hooks/use-orb-account-state.ts` | Merges `/auth/me` + `GET /orb/standalone/access` |

## Auth methods (current)

| Method | Frontend | Backend | Notes |
|--------|----------|---------|-------|
| Microsoft OAuth | `orbOAuthStartUrl('microsoft')` | `routers/orb_oauth_routes.py` | Requires env client IDs |
| Google OAuth | Same pattern | Same | |
| Apple OAuth | Same pattern | Same | |
| Email/password | `useAuth().login` | `routers/auth_routes.py` `/auth/login` | MFA may redirect to `/mfa` |
| Passkey | `beginOrbPasskeyLogin` | `routers/passkey_routes.py` | Email required to discover credentials |
| Sign-up | `/orb/signup` | `POST /orb/standalone/auth/signup` | Role `orb_residential`, no `home_id` |

Provider discovery: `GET /orb/auth/providers` (also fetched on login mount).

## Billing states (backend-backed)

Resolved in `services/orb_access_service._resolve_access_state`:

| `access_state` | Meaning | `can_use_orb` |
|----------------|---------|---------------|
| `unauthenticated` | No session | false |
| `authenticated_no_subscription` | Signed in, no sub/trial | false* |
| `trial_available` | Eligible for trial | false |
| `trial_active` | Trial running | true* |
| `subscription_active` | Paid sub active | true* |
| `subscription_past_due` | Stripe past_due | false |
| `subscription_cancelled` | Cancelled | false |
| `subscription_incomplete` | Incomplete checkout | false |
| `locked` | Generic lock | false |
| `admin_bypass` | Admin override | per rules |
| `founding_plan_bypass` | Founding bypass | per rules |
| `enterprise_provider_later` | Placeholder only | false |
| `access_check_unavailable` | DB read failed | false |

\*Also requires `safety_accepted` for `can_use_orb`.

Frontend derives `hasConfirmedAccess` from `can_use_orb` / `subscription.active` / `trial.active`.

## What works now (backend-backed)

- ORB signup creates standalone users (`orb_residential` role).
- `GET /orb/standalone/access` full commercial payload.
- Stripe checkout `POST /orb/standalone/billing/checkout` and legacy `POST /orb/subscription/checkout`.
- Customer portal `POST /orb/standalone/billing/portal` and `POST /orb/subscription/portal`.
- Stripe webhooks on ORB routes (`orb_billing_routes.py`) with idempotency (`orb_stripe_events`).
- 7-day trial `POST /orb/standalone/trial/start`.
- Usage meter and spending cap APIs.
- OAuth flows when configured.

## UI-only / conditional

- OAuth buttons disabled when provider not configured (env + `/orb/auth/providers`).
- Subscribe/top-up disabled when `billing.stripe_configured` is false.
- Provider team billing UI is signpost-only — no seats/API.
- Privacy/Terms footer links: no dedicated `/privacy` or `/terms` in `frontend-next` (middleware allows `/legal` for legacy static).

## Stripe wiring

| Step | Location |
|------|----------|
| Price ID | `ORB_RESIDENTIAL_STRIPE_PRICE_ID` → `orb_residential_individual` |
| Checkout session | `orb_billing_routes.orb_standalone_checkout` |
| Portal | `orb_standalone_billing_portal` |
| Webhook | `orb_standalone_stripe_webhook` (signature + idempotency) |
| Frontend client | `lib/orb/orb-billing-client.ts` — no secret keys |
| Post-checkout poll | `refreshOrbAccessAfterCheckout` |
| Success/cancel pages | `app/orb/billing/success`, `app/orb/billing/cancel` |

## Passkeys

- Client: `lib/orb/orb-passkey-client.ts` (`beginOrbPasskeyLogin`, `fetchOrbPasskeyStatus`).
- Server: `routers/passkey_routes.py` WebAuthn login/register.
- Login UI: secondary section; email used to locate credentials.

## Account creation & trial

- **Account creation:** Supported at `/orb/signup` (backend `orb_standalone_signup`).
- **Trial:** Supported (`start_orb_trial`, 7 days in upgrade payload).

## Provider / team billing

- **Not implemented.** Access state `enterprise_provider_later` is a placeholder. No seat management or team Stripe price in backend.

## Risks before launch

1. Stripe env vars missing in production → checkout disabled (graceful UI).
2. Webhook delay → user must use “Refresh status” after checkout.
3. Safety acceptance required before `can_use_orb` even with active subscription.
4. IndiCare OS account email linked to ORB OAuth may be rejected (by design).
5. `conftest.py` CSRF fixture issues affect unrelated pytest modules, not ORB routes directly.
6. No public Privacy/Terms pages in Next app — footer uses disclaimer text only.

## Internal metadata exposure

Billing/login surfaces must not show AI brain architecture labels. Billing modal uses user-facing feature names only; access payload may include `usage_meter` but UI does not render internal brain keys.
