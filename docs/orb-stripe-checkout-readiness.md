# ORB Residential Stripe Checkout Readiness

**Date:** 2026-06-08  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`

## Environment status

Live Stripe configuration is now correct:

| Variable | Status |
|----------|--------|
| `STRIPE_SECRET_KEY` | Live secret key (`sk_live_…`) |
| `ORB_RESIDENTIAL_STRIPE_PRICE_ID` | Resolves in live mode |
| `STRIPE_PRICE_ID` | Resolves in live mode (alias / shared catalog) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key (`pk_…`) on frontend |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret (`whsec_…`) |

Google OAuth and ORB safety acceptance are working in production.

## Live price

| Field | Expected value |
|-------|----------------|
| Currency | `gbp` |
| Amount | `999` pence (£9.99/month) |
| Recurring interval | `month` |
| Price ID prefix | `price_` |

Server-side validation runs before checkout session creation and rejects misconfigured prices with a safe user message (no secrets exposed).

## Checkout failure (resolved)

`POST /orb/subscription/checkout` (alias `POST /orb/standalone/billing/checkout`) failed with:

```
Received unknown parameter: automatic_payment_methods
error_param=automatic_payment_methods
```

Hosted Stripe Checkout in **subscription** mode does not accept the top-level `automatic_payment_methods` parameter on this API/account version.

## Chosen Checkout Session payload

```python
session_kwargs = {
    "mode": "subscription",
    "customer": customer_id,
    "line_items": [{"price": price_id, "quantity": 1}],
    "success_url": success_url,
    "cancel_url": cancel_url,
    "client_reference_id": str(user_id),
    "metadata": {...},
    "subscription_data": {"metadata": {...}},
    "payment_method_types": ["card"],
    "allow_promotion_codes": True,
}
```

`automatic_payment_methods` is **not** included.

## Safe errors

| Condition | HTTP | User message |
|-----------|------|--------------|
| Missing `STRIPE_SECRET_KEY` / price ID env | 503 | Explicit server configuration message |
| Invalid key prefix, price shape, inactive price, wrong currency/amount/interval | 503 | `Checkout is not available yet. Billing configuration needs attention.` |
| Stripe `parameter_unknown` (e.g. legacy bad payload) | 503 | Same safe configuration message |
| Other Stripe checkout errors | 400 | `Could not create checkout session` |

## Tests run

```bash
source .venv/bin/activate
python -m pytest tests/test_orb_billing_routes.py tests/test_orb_auth_production_readiness.py -q

cd frontend-next
npm run typecheck
npm run build
```

Coverage in `tests/test_orb_billing_routes.py`:

1. Checkout payload excludes `automatic_payment_methods`
2. Payload includes `payment_method_types=["card"]`
3. Payload includes `mode=subscription`
4. Payload includes `line_items[0].price` (ORB Residential price ID)
5. Payload includes `success_url` and `cancel_url`
6. Payload includes `customer` (or creates customer on first checkout)
7. Stripe `parameter_unknown` for `automatic_payment_methods` maps to safe error
8. Other Stripe checkout errors return `Could not create checkout session` (no secrets)
9. Valid mocked Stripe response returns `checkout_url`

## Related docs

- [orb-stripe-production-readiness.md](./orb-stripe-production-readiness.md) — webhooks, portal, subscription mapping
- [frontend-next/docs/orb-stripe-production-setup.md](../frontend-next/docs/orb-stripe-production-setup.md) — dashboard setup
