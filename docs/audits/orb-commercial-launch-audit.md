# Billing, Pricing and Launch Audit (Phase 10)

**Price:** £9.99/month (`ORB_EXPECTED_PRICE_UNIT_AMOUNT = 999` pence)  
**Billing router:** `routers/orb_billing_routes.py`

---

## Can ORB take payment today?

**Code: Yes. Production: Only with Stripe configuration.**

Required environment variables:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID` (via `orb_residential_stripe_price_id()`)
- `STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`
- `APP_BASE_URL` / `FRONTEND_APP_URL`

Without these: `ORB_CHECKOUT_CONFIG_ERROR = "Checkout is not available yet..."`

**Tests:** `test_orb_stripe_checkout_flow.py`, `test_orb_stripe_production_readiness.py`, `test_orb_stripe_hardening.py`

---

## Can users subscribe today?

**Flow exists:**
1. Signup `POST /orb/standalone/auth/signup`
2. Trial `start_orb_trial()` 
3. Checkout `POST /orb/subscription/checkout` (launch routes) + standalone billing checkout
4. Portal `GET /orb/standalone/billing/portal`
5. Webhook idempotent via `orb_stripe_events`

**Frontend:** `OrbUpgradeScreen`, `/orb/billing`, success/cancel pages.

**Blockers:** Stripe env, production build failure, OAuth callback URLs.

---

## Can usage be limited safely?

**Yes.**

| Mechanism | Service |
|-----------|---------|
| Plan enforcement | `orb_plan_enforcement_service.py` |
| Usage budget | `orb_usage_budget_service.py` |
| Spending cap | `/orb/usage` routes |
| Billing meter | `orb_billing_meter_service.py` |
| 402 on exceed | Tested in streaming access tests |

Tests: `test_orb_plan_enforcement.py`, `test_orb_cost_controls.py`, `test_orb_ai_cost_limits.py`

---

## Can AI cost be controlled?

**Yes.**

| Control | Location |
|---------|----------|
| Model router | `ai_model_router_service.py` |
| Cost policy | `ai_cost_policy_service.py` |
| Execution policy internal-first | `test_orb_execution_policy_internal_first.py` |
| Fast paths | Daily note deterministic fast path |
| Expert depth selection | Cheaper depths for light queries |
| Top-up credits | `orb_usage_credits` |
| AI governance estimate | `/api/ai/governance/estimate` |

---

## Trial flow

- `start_orb_trial()` in signup/billing flow
- Access probe: `GET /orb/standalone/access`
- Trial state in `orb_trials`
- Tests: `test_orb_billing_access_states.py`, `test_orb_production_access_journey.py`

---

## Onboarding flow

1. `/orb/signup` → account creation
2. `/orb/setup` → role, name, preferences (`OrbSetupScreen`)
3. Safety acceptance modal
4. Ready → `/orb`

Tests: `test_orb_onboarding.py`

---

## Upgrade / downgrade / cancellation

| Action | Route | Status |
|--------|-------|--------|
| Upgrade | Stripe checkout | Ready |
| Manage | Stripe customer portal | Ready |
| Cancel | `/orb` launch subscription cancel | Ready |
| Webhook state sync | `update_orb_subscription_state` | Ready |

---

## Terms / privacy / support

| Item | Status |
|------|--------|
| Legal pages | `test_orb_legal_pages.py` — present |
| Safety acceptance | Versioned — `ORB_SAFETY_ACCEPTANCE_VERSION` |
| Customer support route | **Not found as dedicated in-app support** — gap |
| Demo mode | No separate demo mode; trial serves this purpose |

---

## Licence readiness

| Model | Ready? |
|-------|--------|
| Individual user (£9.99/mo) | **Yes** — primary model |
| Provider licence (home-wide) | **No** — not built in ORB Residential |
| Enterprise / multi-home | **No** — OS product separate |

---

## Launch blockers (commercial)

1. **Stripe production configuration** not verified in this environment
2. **Production build fails** — cannot deploy billing UI confidently
3. **No in-app support channel** — email/help link unclear
4. **Provider licensing** — not available for B2B sales motion
5. **21 frontend contract test failures** — billing modal polish

---

## Answers

| Question | Answer |
|----------|--------|
| Can ORB take payment today? | **With Stripe env — yes** |
| Can users subscribe today? | **With Stripe env — yes** |
| Can usage be limited safely? | **Yes** |
| Can AI cost be controlled? | **Yes** |
| What blocks launch? | Stripe prod config, build failure, support route, polish, provider model absent |

---

## Verdict

Commercial **infrastructure is production-intent** with strong test coverage. **Individual subscription launch is feasible** once Stripe is configured and frontend build is fixed. **Provider B2B licensing is a separate product decision** not yet implemented.
