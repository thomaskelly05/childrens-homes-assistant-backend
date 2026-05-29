# ORB Residential Stripe test mode guide

ORB Residential is standalone from IndiCare OS. A successful ORB subscription does **not** grant IndiCare OS access.

## Required environment variables

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_test_…` in test mode) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret from the webhook endpoint (`whsec_…`) |
| `ORB_RESIDENTIAL_STRIPE_PRICE_ID` | Recurring price ID for £9.99/month |
| `FRONTEND_APP_URL` | Next.js origin (e.g. `http://localhost:3001`) |
| `STRIPE_SUCCESS_URL` | Optional override; default `/orb/billing/success` |
| `STRIPE_CANCEL_URL` | Optional override; default `/orb/billing/cancel` |

## Create the ORB Residential product in Stripe

1. Open Stripe Dashboard → **Products** → **Add product**.
2. Name: **ORB Residential — Powered by IndiCare**.
3. Description: standalone ORB for adults working in or around children's homes.
4. Add a recurring price: **£9.99** per month, per user (GBP).
5. Copy the **Price ID** (`price_…`) into `ORB_RESIDENTIAL_STRIPE_PRICE_ID`.

## Webhook endpoint

- URL: `https://<your-api-host>/orb/standalone/billing/webhook`
- Events to enable:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET`.

Webhook processing is idempotent via the `orb_stripe_events` table (`sql/204_orb_stripe_events.sql`).

## Test cards

| Scenario | Card |
|----------|------|
| Successful payment | `4242 4242 4242 4242` |
| Authentication required | `4000 0025 0000 3155` |
| Declined | `4000 0000 0000 0002` |

Use any future expiry, any CVC, and any UK postcode.

## Test checkout success

1. Sign in at `/orb/login` with an ORB Residential account.
2. Start checkout from `/orb/access` or Settings → Billing.
3. Complete payment in Stripe Checkout.
4. You should land on `/orb/billing/success`, which polls `/orb/standalone/access` until access is active.

## Test checkout cancel

1. Start checkout and click **Back** or close the Stripe window.
2. You should land on `/orb/billing/cancel` with **Try again** and **Return to ORB**.

## Test invoice payment failed

Use Stripe CLI or Dashboard to send `invoice.payment_failed` for the test customer. ORB subscription status should move to `past_due` without changing OS billing fields.

## Customer portal

POST `/orb/standalone/billing/portal` (authenticated) returns a portal URL. Return URL is `/orb`.

## Apple Pay / Google Pay

These are offered automatically in Stripe Checkout when enabled on your Stripe account and supported by the browser/device. No separate ORB integration is required.

## Reminder

ORB Residential subscription grants ORB standalone access only. It must never set OS `home_id`, provider scope, or care-record permissions.
