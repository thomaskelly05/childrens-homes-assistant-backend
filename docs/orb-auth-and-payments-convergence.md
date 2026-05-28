# ORB Residential — Auth & Payments Convergence

## Objective

Create a frictionless premium onboarding experience for ORB Residential.

ORB Residential should behave like a modern premium AI application:

- fast onboarding
- mobile-first
- low friction
- emotionally supportive
- consumer-grade payments

NOT like enterprise operational software.

---

# Product identity

# ORB Residential

Powered by IndiCare Intelligence.

Premium standalone residential intelligence platform.

### Pricing

# £9.99 per user / month

The entire ORB Residential experience is premium.

---

# Authentication strategy

## Required providers

### Google

Purpose:

- fastest onboarding
- strongest mobile conversion
- broadest adoption

---

### Apple

Purpose:

- iPhone-first onboarding
- App Store readiness
- Apple Pay alignment
- premium UX expectations

---

### Microsoft

Purpose:

- residential workforce alignment
- Office365 adoption
- Teams/Outlook compatibility
- enterprise trust

---

### Email magic link

Purpose:

- fallback authentication
- low-friction sign-in
- accessibility support

---

# Important rule

Do NOT build custom password infrastructure unless required.

Prefer:

- OAuth
- passkeys
- magic links

---

# Recommended providers

## Auth

Recommended:

- Clerk
OR
- Supabase Auth
OR
- Auth.js

Must support:

- Google OAuth
- Apple Sign In
- Microsoft OAuth
- session management
- secure refresh handling
- mobile compatibility

---

# Payment strategy

## Billing provider

# Stripe

Purpose:

- subscriptions
- Apple Pay
- Google Pay
- Link
- card handling
- invoice support later

---

# Payment methods

## Required

- Apple Pay
- Google Pay
- debit/credit card
- Stripe Link

---

# Future enterprise support

IndiCare OS may later support:

- invoice billing
- procurement
- direct debit
- annual contracts
- enterprise seat licensing
- SSO
- Azure AD
- Okta

This is NOT required for ORB Residential launch.

---

# Onboarding flow

## Step 1

Landing page.

Messaging:

# ORB Residential

Powered by IndiCare Intelligence.

The AI companion for adults working in children’s residential care.

---

## Step 2

CTA:

# Start your 7-day trial

---

## Step 3

Continue with:

- Google
- Apple
- Microsoft
- Email

---

## Step 4

Quick personalisation.

Questions:

- role
- work environment
- support style

Goal:

# ORB understands my role.

---

## Step 5

Enter ORB immediately.

First workflow:

- Ask ORB
OR
- Shift Builder

---

# UX rules

Authentication and payments should feel:

- invisible
- calm
- premium
- effortless
- trustworthy

Avoid:

- long forms
- enterprise language
- operational terminology
- complicated onboarding

---

# Runtime convergence

Authentication should integrate with:

- orb_access_service.py
- orb_residential_db.py
- billing_routes.py
- standalone ORB runtime only

ORB Residential authentication must NOT:

- grant IndiCare OS access
- expose operational routes
- expose chronology
- expose provider dashboards

---

# Mobile-first requirements

The majority of ORB Residential usage is expected on:

- iPhone
- Android
- mobile browsers
- during shifts
- during emotional stress

Therefore:

- Apple Pay support is essential
- Google Pay support is essential
- OAuth onboarding must be minimal friction

---

# Strategic outcome

ORB Residential should feel closer to:

- ChatGPT
- Headspace
- Calm
- Claude
- Notion AI

than:

- care management software
- enterprise dashboards
- operational admin systems

This is a critical product distinction.

---

# Provider configuration (implementation)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Subscription webhooks → `users.subscription_*` |
| `STRIPE_PRICE_ID` | £9.99/month price (or dedicated `ORB_RESIDENTIAL_STRIPE_PRICE_ID` when added) |
| `FRONTEND_APP_URL` | Checkout success/cancel redirects |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth (wire via existing auth when enabled) |
| `APPLE_CLIENT_ID` / team keys | Sign in with Apple |
| `MICROSOFT_CLIENT_ID` / secret | Microsoft login |
| Magic link | Use existing email OTP/magic-link auth routes — no password storage |

Payments: Stripe Checkout supports cards, Apple Pay, Google Pay, and Link when enabled in the Stripe Dashboard.

ORB Residential API: `/orb/residential/access`, `/billing/checkout`, `/billing/portal` (reuse existing billing routes).
