# ORB Residential v1 — Launch Readiness Report

**Date:** 2026-05-31  
**Front door:** `https://app.indicare.co.uk`  
**Plan:** ORB Residential — £9.99/month (Stripe)

## Executive summary

ORB Residential is **launch-capable** for a controlled first paying cohort: authentication, trial, subscription checkout, onboarding, memory, templates, saved outputs, Review This, Learn-from-answer, and unified explainability are wired on the backend. Remaining work is primarily **frontend convergence** (canonical API paths in the Next.js client), **Stripe domain verification** for Apple Pay / Google Pay, and **database migration** consistency for `orb_saved_outputs`.

---

## Authentication audit

| Capability | Status | Location |
|------------|--------|----------|
| Email signup | ✅ | `POST /orb/standalone/auth/signup` |
| Email login (shared session) | ✅ | `POST /auth/login` |
| Microsoft OAuth | ✅ (env-gated) | `/orb/standalone/auth/oauth/microsoft/*` |
| Google OAuth | ✅ (env-gated) | `/orb/standalone/auth/oauth/google/*` |
| Apple OAuth | ✅ (env-gated) | `/orb/standalone/auth/oauth/apple/*` |
| Passkeys | ✅ | `/auth/passkeys/*` |
| JWT session cookie | ✅ | `auth/tokens.py` |
| Provider discovery | ✅ **new** | `GET /orb/auth/providers` |

**Convergence:** One sign-in surface at `app.indicare.co.uk` using shared IndiCare session cookies. ORB does not duplicate login logic.

**Gaps:** Magic-link email auth not implemented (optional). Connected apps (Drive/OneDrive) remain future work.

---

## Billing audit

| Capability | Status | Location |
|------------|--------|----------|
| £9.99/month plan | ✅ | `ORB_RESIDENTIAL_STRIPE_PRICE_ID` |
| 7-day trial | ✅ | `POST /orb/standalone/trial/start`, `/orb/residential/trial/start` |
| Checkout | ✅ | `POST /orb/standalone/billing/checkout` |
| Canonical checkout | ✅ **new** | `POST /orb/subscription/checkout` |
| Subscription status | ✅ **new** | `GET /orb/subscription` |
| Cancel subscription | ✅ **new** | `POST /orb/subscription/cancel` |
| Customer portal | ✅ | `POST /orb/standalone/billing/portal` |
| Webhook + idempotency | ✅ | `POST /orb/standalone/billing/webhook` |
| Wallet payments (Apple/Google Pay) | ⚙️ Stripe Checkout | `automatic_payment_methods` enabled; **domain verification required** in Stripe Dashboard |

**OS billing** (`/billing/*`) remains separate for IndiCare OS subscribers — not used for ORB Residential.

---

## Onboarding & profile

| Endpoint | Status |
|----------|--------|
| `GET /orb/setup` | ✅ **new** |
| `POST /orb/setup` | ✅ **new** |
| `GET /orb/profile` | ✅ **new** |
| `PATCH /orb/profile` | ✅ **new** |
| Legacy preferences | ✅ | `GET/POST /orb/standalone/onboarding/preferences` |

Onboarding data is stored in `orb_user_preferences.preferences` (no new tables).

**Steps:** Role → Home Profile → Support Style → Favourite Tools → Safety acknowledgement.

---

## Home profile service

| Item | Status |
|------|--------|
| `services/orb_home_profile_service.py` | ✅ **new** |
| Locality / template / memory context | ✅ |
| Live OS records | ❌ never accessed |

---

## ORB memory

| Endpoint | Status |
|----------|--------|
| `GET /orb/memory` | ✅ **new** |
| `PATCH /orb/memory` | ✅ **new** |
| `services/orb_memory_service.py` | ✅ **new** |

Stores: role, support style, favourite tools/templates, learning history, recent reviews (preferences-backed).

---

## Template library

| Endpoint | Status |
|----------|--------|
| `GET /templates` | ✅ **new** |
| `GET /templates/categories` | ✅ **new** |
| `GET /templates/{id}` | ✅ **new** |
| `POST /templates/generate` | ✅ **new** |
| `POST /templates/export/pdf` | ✅ **new** |
| `POST /templates/export/docx` | ✅ **new** |
| Legacy | ✅ | `/orb/standalone/templates/*` |

Categories: Safeguarding, Recording, Care Planning, Ofsted/SCCIF, Leadership, RI, Supervision, Locality, Learning.

---

## Saved outputs

| Endpoint | Status |
|----------|--------|
| `GET /saved-outputs` | ✅ **new** |
| `POST /saved-outputs` | ✅ **new** |
| `DELETE /saved-outputs/{id}` | ✅ **new** |
| Rich CRUD (archive/export) | ✅ | `/orb/standalone/outputs/*` |

**Risk:** Two migration shapes for `orb_saved_outputs` (`sql/075` vs `sql/200`) — verify production schema before launch.

---

## Review This

| Document types | Status |
|----------------|--------|
| Incidents, daily records, care plans, risk assessments, chronologies, supervisions, safeguarding, Reg 44/45, locality | ✅ |

**Output sections (12):** Overall View, Strengths, Missing Information, Child Voice, Child Experience, Safeguarding, Professional Curiosity, Impact, Leadership, Ofsted Lens, Outstanding Practice, Suggested Improvements.

**Route:** `POST /orb/standalone/review-this` (+ full answer via `POST /orb/standalone/conversation`).

---

## ORB Learn

| Capability | Status |
|------------|--------|
| Micro-session | ✅ | `POST /orb/standalone/learn/micro-session` |
| From any answer | ✅ **new** | `POST /orb/learn/from-answer` |

Formats: micro-learning, staff briefing, knowledge check, reflective exercise, CPD note.

No separate academy domain.

---

## Explainability

| Item | Status |
|------|--------|
| `services/orb_unified_explainability_service.py` | ✅ **new** |
| Wired into standalone conversation | ✅ |

Every ORB answer exposes: intelligence layers, reasoning lenses, evidence basis, source anchors, standalone boundary, locality/ISN/template/outstanding flags.

---

## Home screen model

Expected cards (frontend): **Ask ORB**, **Review This**, **Templates**, **Learn**, **Saved Outputs**.

Backend does not enforce UI layout; capabilities are exposed via `/orb/standalone/capabilities` and product routes.

---

## Test scenarios (documented)

| Scenario | How to verify |
|----------|----------------|
| Review incident | `POST /orb/standalone/review-this` + conversation with `document_type=incident` |
| Review care plan | Same with `care_plan` |
| Missing-from-care | Conversation prompt; Review This flags Missing Information section |
| Locality risk | Template `locality_risk_assessment` + home profile with postcode |
| Template generation | `POST /templates/generate` |
| Learning session | `POST /orb/learn/from-answer` |
| RI challenge | Conversation mode Manager / RI-level support style |
| Ofsted preparation | Ofsted Lens tool + template category `ofsted_sccif` |
| Safeguarding concern | Safeguarding Lens + `safeguarding_record` review type |
| Child voice review | Review sections include Child Voice + Child Experience |

**Automated:** `pytest tests/test_orb_launch_routes.py` (+ existing ORB test suite).

---

## Remaining gaps before first paying users

1. **Frontend API paths** — Point `standalone-client.ts` at `/orb/setup`, `/orb/memory`, `/saved-outputs`, `/templates` where appropriate.
2. **Stripe domain verification** — Register `app.indicare.co.uk` for Apple Pay / Google Pay in Stripe.
3. **`orb_saved_outputs` schema** — Run correct migration; avoid dual-shape tables.
4. **Production env** — `ORB_RESIDENTIAL_STRIPE_PRICE_ID`, OAuth client IDs, `APP_BASE_URL=https://app.indicare.co.uk`.
5. **MFA** — ORB residential role may skip OS admin MFA; confirm policy for managers using ORB only.
6. **Academy / subdomain removal** — Confirm DNS and marketing only reference `app.indicare.co.uk`.

---

## Recommendations

1. Run a **paid pilot** with 5–10 homes after Stripe live-mode checkout smoke test.
2. Monitor `orb_usage_events` and billing meter for cost control.
3. Do **not** add new intelligence engines before launch — polish onboarding → trial → ORB value loop.
4. Unify saved-output storage in a follow-up release if archive/export UX is required on canonical `/saved-outputs`.

---

## Files created / updated (this release)

**New**

- `routers/orb_launch_routes.py`
- `routers/orb_templates_launch_routes.py`
- `routers/orb_saved_outputs_launch_routes.py`
- `services/orb_home_profile_service.py`
- `services/orb_memory_service.py`
- `services/orb_unified_explainability_service.py`
- `tests/test_orb_launch_routes.py`
- `docs/orb-residential-launch-readiness-report.md`

**Updated**

- `core/router_loader.py`
- `services/orb_review_this_service.py`
- `routers/orb_billing_routes.py` (Stripe wallets)
- `routers/orb_standalone_routes.py` (unified explainability)
