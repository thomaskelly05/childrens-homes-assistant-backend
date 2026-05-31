# ORB Residential Billing

Product: **ORB Residential — Powered by IndiCare**  
Price: **£9.99/month** (`orb_residential_individual`)

## Stripe setup

1. Create product "ORB Residential — Powered by IndiCare"
2. Create recurring price £9.99/month
3. Set `ORB_RESIDENTIAL_STRIPE_PRICE_ID=price_...`
4. Configure webhook endpoint: `POST /orb/standalone/billing/webhook`
5. Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`
6. **Apple Pay / Google Pay:** In Stripe Dashboard → Settings → Payment methods, enable wallets. Register and verify `app.indicare.co.uk` under Payment method domains. Checkout uses `automatic_payment_methods`.

## API routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/orb/standalone/access` | Optional | Full access payload |
| GET | `/orb/standalone/billing/status` | Yes | Access + subscription + meter |
| GET | `/orb/standalone/billing/meter` | Yes + premium | Usage meter |
| POST | `/orb/subscription/checkout` | Yes | Stripe Checkout session (canonical) |
| POST | `/orb/standalone/billing/checkout` | Yes | Legacy alias |
| POST | `/orb/subscription/cancel` | Yes | Cancel at period end (default) |
| GET | `/orb/subscription` | Yes | Access + subscription |
| POST | `/orb/standalone/billing/portal` | Yes | Customer portal |
| POST | `/orb/standalone/billing/webhook` | Stripe sig | Subscription sync |
| POST | `/orb/standalone/trial/start` | Yes | 7-day trial |

## Checkout metadata

```json
{ "product": "orb_residential", "user_id": "123", "orb_plan": "orb_residential_individual" }
```

## Access states

`unauthenticated`, `authenticated_no_subscription`, `trial_available`, `trial_active`, `subscription_active`, `subscription_past_due`, `subscription_cancelled`, `subscription_incomplete`, `locked`, `admin_bypass`, `founding_plan_bypass`, `enterprise_provider_later`

## Trial

- One trial per user (`orb_trials`)
- Does not grant OS access
- After expiry → locked until subscription

## Migrations

Apply `sql/203_orb_residential_subscriptions.sql` after `sql/200_orb_residential_premium.sql`.
