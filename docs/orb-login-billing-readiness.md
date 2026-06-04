# ORB Login & Billing Readiness

Date: 2026-06-04

Summary of ORB Residential login, account access, and billing UX for launch. See also [orb-login-billing-readiness-audit.md](./orb-login-billing-readiness-audit.md).

## Auth methods (preserved)

| Method | Entry | Backend |
|--------|-------|---------|
| Microsoft | Login §1 work account | `orb_oauth_routes` |
| Google | Login §1 | Same |
| Apple | Login §1 | Same |
| Email/password | Login §2 → continue → password | `/auth/login` |
| Passkey | Login §3 (existing users) | `passkey_routes` |
| Sign-up | `/orb/signup` | `POST /orb/standalone/auth/signup` |

## Billing flow

1. User signs in → `fetchOrbAccess()` → inactive users routed to `/orb/billing` or soft paywall in app.
2. **Subscribe** → `startOrbCheckout()` → Stripe Checkout → success URL → poll `refreshOrbAccessAfterCheckout`.
3. **Manage** → `openOrbBillingPortal()` when `stripe_customer_id` exists.
4. **Trial** → `POST /orb/standalone/trial/start` when eligible.
5. Webhooks update `orb_subscriptions` (idempotent).

Individual plan: **ORB Residential — Individual**, **£9.99/month**.

## Account states (UI handling)

| State | UI behaviour |
|-------|----------------|
| Signed out | Login page; local profile only in ORB |
| Signed in, inactive | `/orb/billing` “Start ORB Residential”, subscribe + refresh + sign out |
| Trial active | Status pill “Trial active”; full access if safety accepted |
| Subscribed active | Manage subscription in billing modal |
| Past due | Status “Past due”; subscribe/portal messaging |
| Provider-managed | Sign-in hint only; no team billing API |
| Admin bypass | Account chip “Admin · voice enabled” |

States not backed by API are not invented in UI.

## Stripe wiring

- Env: `STRIPE_SECRET_KEY`, `ORB_RESIDENTIAL_STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, optional portal/success/cancel URLs.
- Frontend never embeds secret keys (`orb-billing-client.ts`).
- Checkout disabled when `billing.stripe_configured` is false.

## Passkey flow

1. User enters email (required to discover credentials).
2. `beginOrbPasskeyLogin(email)` → WebAuthn → session cookies.
3. Presented under “Other secure options”, not as primary sign-in.

## Individual vs provider plan

- **Individual:** Fully wired (Stripe price `orb_residential_individual`).
- **Provider/team:** Contact CTA only; `enterprise_provider_later` access state is a placeholder.

## Login UX changes (2026-06-04)

- Left hero: product positioning + trust points.
- Right: grouped work account / email / passkey sections.
- Create account → `/orb/signup`.
- Provider subscribers → work email hint.
- Footer safeguarding disclaimer.

## Billing UX changes (2026-06-04)

- Plan card: ORB Residential — Individual, feature list aligned to product.
- Trust & data short copy block.
- Provider team contact CTA.
- Loading: checkout opening, refresh spinning, plain-English errors.
- Standalone boundary on plan card.

## Tests

### Backend (pytest)

```bash
source .venv/bin/activate
python -m pytest tests/test_orb_login_billing_routes.py \
  tests/test_orb_billing_access_states.py \
  tests/test_orb_stripe_checkout_flow.py \
  tests/test_orb_account_state_contract.py -q
```

### Frontend (node:test)

```bash
cd frontend-next && npm run test -- components/orb-residential/orb-login-billing-readiness.test.ts
```

Also run existing `tests/test_orb_billing.py`, `tests/test_orb_residential_product_wrapper.py`.

## Remaining blockers

1. Production Stripe + webhook URL configuration.
2. OAuth provider credentials in each environment.
3. Dedicated Privacy/Terms pages in Next.js (footer uses disclaimer only).
4. Provider team billing product/API (future).
5. Safety acceptance still required after subscription before `can_use_orb`.

## Files changed (this pass)

- `frontend-next/components/orb-residential/orb-login-screen.tsx`
- `frontend-next/components/orb-standalone/orb-billing-modal.tsx`
- `frontend-next/components/orb-standalone/orb-upgrade-screen.tsx`
- `frontend-next/components/orb-residential/orb-login-billing-readiness.test.ts`
- `tests/test_orb_login_billing_routes.py`
- `tests/test_orb_billing_access_states.py`
- `tests/test_orb_stripe_checkout_flow.py`
- `tests/test_orb_account_state_contract.py`
- `docs/orb-login-billing-readiness-audit.md`
- `docs/orb-login-billing-readiness.md`
