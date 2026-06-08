# ORB Stripe Production Readiness

**Date:** 2026-06-04  
See also: [frontend-next/docs/orb-stripe-production-setup.md](../frontend-next/docs/orb-stripe-production-setup.md)

## Checkout session creation

| Item | Implementation |
|------|----------------|
| Route | `POST /orb/standalone/billing/checkout` (alias `POST /orb/subscription/checkout`) |
| Auth | `require_orb_residential_auth` |
| Mode | `subscription` |
| Price | `ORB_RESIDENTIAL_STRIPE_PRICE_ID` via `orb_residential_stripe_price_id()` |
| Customer | Created on first checkout; stored in `orb_subscriptions` |
| Payment methods | `payment_method_types: ["card"]` (no `automatic_payment_methods` on Checkout Session) |
| Metadata | `product: orb_residential`, `user_id`, `orb_plan` |

Missing configuration returns **503** with explicit server messages (no secrets in response).

## Success and cancel URLs

| Source | Default |
|--------|---------|
| Request body | `success_url` / `cancel_url` if valid `http(s)://` |
| Env override | `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL` |
| Fallback | `{FRONTEND_APP_URL}/orb/billing/success` and `/orb/billing/cancel` |

Frontend checkout from upgrade screen passes `window.location.origin` paths.

## Customer portal

| Item | Value |
|------|-------|
| Route | `POST /orb/standalone/billing/portal` |
| Requires | `stripe_customer_id` on subscription row |
| Return URL | `{FRONTEND_APP_URL}/orb` |
| Optional | `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID` |

## Webhook

| Item | Value |
|------|-------|
| Route | `POST /orb/standalone/billing/webhook` |
| Verification | `stripe.Webhook.construct_event` + `STRIPE_WEBHOOK_SECRET` |
| Idempotency | `orb_stripe_events` table |

### Required webhook events

Configure these in the Stripe Dashboard:

| Event | Purpose |
|-------|---------|
| `checkout.session.completed` | Link subscription after checkout; usage top-up branch |
| `customer.subscription.created` | Initial subscription row |
| `customer.subscription.updated` | Status changes, period end |
| `customer.subscription.deleted` | Cancellation |
| `invoice.payment_succeeded` | Confirm active billing period |
| `invoice.payment_failed` | Set `past_due` / restrict access |

Do not subscribe to unsupported event types that the handler does not process.

## Subscription status mapping

| Stripe status | Grants ORB access (`subscription_grants_orb_access`) | `access_state` |
|---------------|------------------------------------------------------|----------------|
| `active` | Yes | `subscription_active` |
| `trialing` | Yes | `subscription_active` |
| `past_due` | No (active flag false) | `subscription_past_due` |
| `canceled` / `cancelled` | Until `period_end` if future | `subscription_cancelled` |
| `incomplete` | No | `subscription_incomplete` |

Trial (non-Stripe): `orb_trials` table, 7 days, separate from Stripe trial if configured on price.

## Post-checkout refresh

1. User lands on `/orb/billing/success`.
2. Frontend calls `refreshOrbAccessAfterCheckout()` (polls access endpoint).
3. If webhook delayed, user uses **Refresh status** (billing modal or success page).
4. Safety acceptance may still be required after subscription confirms.

## Billing modal

- `billing.stripe_configured` from access payload (secret key + price ID present server-side).
- Checkout button shows loading via `checkoutOpening` state.
- Inactive banner when not subscribed.
- Past due: `subscription_past_due` access state.

## Required environment variables (complete list)

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ORB_RESIDENTIAL_STRIPE_PRICE_ID=price_...
STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID=bpc_...   # optional
STRIPE_SUCCESS_URL=https://app.indicare.co.uk/orb/billing/success   # optional
STRIPE_CANCEL_URL=https://app.indicare.co.uk/orb/billing/cancel     # optional
FRONTEND_APP_URL=https://app.indicare.co.uk
APP_BASE_URL=https://app.indicare.co.uk
```

**Never** set Stripe secret keys in `frontend-next` or `NEXT_PUBLIC_*` variables.

## Server diagnostics

`GET /orb/auth/providers` returns `config_warnings.stripe` (non-secret messages).  
`GET /orb/system/health` (admin) reports Stripe key/price/webhook presence.

## Tests

- `tests/test_orb_stripe_checkout_flow.py`
- `tests/test_orb_stripe_hardening.py`
- `tests/test_orb_stripe_production_readiness.py`
