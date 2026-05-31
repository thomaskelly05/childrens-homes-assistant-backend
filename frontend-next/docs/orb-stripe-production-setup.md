# ORB Residential — Stripe production setup

ORB Residential billing uses Stripe for subscriptions (£9.99/month), usage top-ups, and the customer billing portal. Apple Pay, Google Pay, and cards are surfaced through Stripe Checkout automatic payment methods — do not build separate wallet integrations.

## Required environment variables

```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
ORB_RESIDENTIAL_STRIPE_PRICE_ID=price_...
STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID=bpc_...   # optional but recommended
APP_BASE_URL=https://app.indicare.co.uk
FRONTEND_APP_URL=https://app.indicare.co.uk
```

## Subscription checkout

| Method | Path |
|--------|------|
| POST | `/orb/subscription/checkout` |
| GET | `/orb/subscription` |
| POST | `/orb/subscription/cancel` |
| POST | `/orb/subscription/portal` |

Checkout success URL: `/orb?billing=success`  
Checkout cancel URL: `/orb?billing=cancelled`

`automatic_payment_methods` is enabled on subscription Checkout sessions.

## Usage top-up

| Method | Path |
|--------|------|
| POST | `/orb/usage/top-up-checkout` |
| POST | `/orb/usage/spending-cap` |
| GET | `/orb/usage` |

Supported top-up amounts: £5, £10, £25, £50 (500, 1000, 2500, 5000 pence).

Success URL: `/orb?billing=topup_success`  
Cancel URL: `/orb?billing=topup_cancelled`

Top-ups use Stripe Checkout `payment` mode with dynamic `price_data` when no dedicated top-up price is configured.

## Apple Pay and Google Pay

In the Stripe Dashboard for your live account:

1. **Settings → Payment methods** — enable Card, Apple Pay, and Google Pay.  
2. **Settings → Payment method domains** — verify `app.indicare.co.uk` for Apple Pay.  
3. Ensure your subscription **Product** and **Price** exist for ORB Residential (£9.99/month GBP).  
4. Configure the **Customer portal** and link `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID` if used.  
5. Add a webhook endpoint pointing to `/orb/standalone/billing/webhook` (or your deployed equivalent).

Wallet buttons appear in Checkout when the domain is verified and the customer’s device/browser supports them.

## Webhook events

Ensure the endpoint verifies `STRIPE_WEBHOOK_SECRET` and handles at minimum:

- `checkout.session.completed` (subscription and usage top-up via `purchase_type=usage_topup`)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.updated` (optional reconciliation)

Customer mapping fields: `user_id`, `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `subscription_status`, period dates, `cancel_at_period_end`.

## IndiCare payouts / bank account

Payout bank details are configured only in the **Stripe Dashboard → Settings → Payouts** for the IndiCare Stripe account. Never store bank account numbers in application code or environment variables.

## Database migrations

Apply in order:

- `sql/200_orb_residential_premium.sql`
- `sql/206_orb_commercial_infrastructure.sql` (usage preferences, credits, project sync tables)

## Credits accounting (v1)

Top-up webhooks credit `orb_usage_credits` using pence as the credit unit. Fine-grained token accounting per model call may be added in a follow-up; usage caps are stored in `orb_usage_preferences` and shown in the billing modal without hard-blocking chat unless plan enforcement is already active for the user.

## ORB Voice / realtime (follow-up)

Server routes exist at `/orb/voice/transcribe`, `/orb/voice/speak`, and `/orb/voice/session` as stubs. Production duplex voice should use WebRTC or WebSocket streaming STT/TTS with barge-in and safety logging — see product notes in the Commercial Infrastructure Report.
