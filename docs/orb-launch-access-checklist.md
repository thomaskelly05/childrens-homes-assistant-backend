# ORB Launch Access Checklist

Use before enabling ORB Residential production access for paying users.

## Stripe

- [ ] `ORB_RESIDENTIAL_STRIPE_PRICE_ID` set (live £9.99/month price)
- [ ] `STRIPE_SECRET_KEY` set (live, server only)
- [ ] `STRIPE_WEBHOOK_SECRET` set
- [ ] Webhook endpoint configured on production URL
- [ ] Webhook events selected: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- [ ] Success URL checked (`/orb/billing/success` or `STRIPE_SUCCESS_URL`)
- [ ] Cancel URL checked (`/orb/billing/cancel` or `STRIPE_CANCEL_URL`)
- [ ] Customer portal enabled; `STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID` if used
- [ ] Apple Pay / Google Pay domain verified in Stripe Dashboard

## OAuth

- [ ] Microsoft OAuth redirect URI configured
- [ ] Google OAuth redirect URI configured
- [ ] Apple OAuth redirect URI configured
- [ ] `FRONTEND_APP_URL` matches production domain

## Passkeys

- [ ] `PASSKEY_RP_ID` set to `app.indicare.co.uk`
- [ ] `PASSKEY_ALLOWED_ORIGINS` includes `https://app.indicare.co.uk`

## Legal and safety

- [ ] Privacy page live at `/privacy`
- [ ] Terms page live at `/terms`
- [ ] Login page links to Privacy and Terms
- [ ] Safety acceptance tested after subscription
- [ ] Legal counsel review scheduled (starter pages are not final legal text)

## Functional tests

- [ ] Trial tested (eligible user)
- [ ] Subscription tested (Stripe Checkout → success → refresh)
- [ ] Past due scenario understood (banner + portal)
- [ ] Webhook tested (subscription appears without manual DB edit)
- [ ] Refresh status tested after delayed webhook
- [ ] ORB chat / voice / dictate / documents / templates smoke tested after access granted

## Documentation

- [ ] [orb-production-access-readiness-audit.md](./orb-production-access-readiness-audit.md) reviewed
- [ ] [orb-stripe-production-readiness.md](./orb-stripe-production-readiness.md) reviewed
- [ ] [orb-auth-production-readiness.md](./orb-auth-production-readiness.md) reviewed
