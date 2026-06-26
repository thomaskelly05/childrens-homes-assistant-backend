# O3 — Commercial Sustainability Standard

| Field | Value |
|---|---|
| Document ID | O3 |
| Layer | L2 — Operating Principles |
| Version | 0.1 — Phase 2 Batch 2 draft |
| Status | **Drafted — awaiting founder review. Not yet ratified.** |
| Owner | Commercial Owner (interim: Founder, Tom Kelly — **explicit assignment pending**, see O2 §3) |
| Reads with | `00` (value-rank #9), `C1` (Article 7), `O5` (privacy in billing) |
| Evidence base | `constitution/phase-1-discovery/` |

Commercial sustainability is a constitutional concern: IndiCare must be viable and
affordable for children's homes, or it cannot serve children at all. But it is **value-rank
#9** (00 §2b). It sits below safety, professional judgement, truthfulness, privacy, and
trust, and **may never override them.** "We need to ship / save cost / win the deal" is never
a reason to compromise a higher value.

---

## 1. Principles

1. **Affordability is a safety feature.** A tool children's homes cannot afford does not help
   children. Pricing and cost control are part of the product, not separate from it.
   **VERIFIED** as existing doctrine — `ORB_ENGINEERING_PRINCIPLES.md` §10 ("Cost is a
   product feature"); `CLAUDE.md` "Cost-aware AI".
2. **Cost never outranks care.** No cost optimisation may weaken safeguarding, privacy,
   truthfulness, or adult review (00 §2b; C1).
3. **Honesty about cost.** Cost figures are estimates for governance; provider invoices are
   the source of truth. **VERIFIED** — `services/ai_gateway_service.py:29`.

---

## 2. Cost governance (VERIFIED — partially implemented)

- **Soft spend/usage limits exist.** **VERIFIED** — `services/ai_gateway_service.py:25-26`:
  a daily soft limit (`AI_DAILY_SOFT_LIMIT_GBP`, default £5.00) and a per-feature token soft
  limit (`AI_FEATURE_SOFT_LIMIT_TOKENS`, default 12,000), enforced as warnings/guards in the
  gateway (`:127, :187`).
- **Cheap default model.** **VERIFIED** — production default `OPENAI_MODEL=gpt-4o-mini`
  (`render.yaml`, evidence E14), a low-cost model.
- **Usage reporting.** **VERIFIED** — a monthly usage report loop runs in the app lifespan
  (`services/ai_runtime/monthly_usage_report.py`, started in `core/lifespan.py`).
- **Model cost estimates are explicit estimates.** **VERIFIED** —
  `services/ai_gateway_service.py:27-33` (per-1k-token estimates labelled as such).

These are aligned with the cost-aware-AI rules in `ORB_ENGINEERING_PRINCIPLES.md` §10
(token usage, model choice, caching, retry behaviour, avoiding duplicated calls).

---

## 3. Billing and revenue (VERIFIED existence)

- Stripe integration present (`requirements.txt` `stripe>=10.0.0`;
  `routers/orb_billing_routes.py`, `routers/billing_routes.py`).
- Subscription / commercial data: `db/orb_subscription_db.py`,
  `db/orb_usage_commercial_db.py`, `db/orb_stripe_events_db.py`.
- **Privacy applies to billing (binding, O5):** billing identifiers and payment metadata are
  personal data; full card numbers are not stored in the app DB
  (`docs/trust/orb-subprocessors.md`). Commercial features inherit O5.

---

## 4. Decision ownership

The **Commercial Owner** is accountable for this standard. **Honest record:** this role is
**not yet explicitly assigned** (O2 §3); it is held interim by the Founder pending
confirmation. Commercial decisions that touch safety, privacy, or truthfulness are not the
Commercial Owner's to make alone — the relevant binding charter or higher-tier owner governs.

---

## 5. Carried-forward gaps (not hidden)

| Gap | Label | Note |
|---|---|---|
| Commercial Owner not explicitly assigned | UNVERIFIED / open (O2 §3) | Interim Founder. |
| Cost-governance completeness | UNVERIFIED | Soft limits and a usage loop exist; whether all AI egress is metered depends on the unproven gateway-sole-egress question (open-questions §E). |
| Sustainable pricing model | FUTURE VISION | No pricing model is asserted in-repo. |

---

## 6. Current State vs Future Vision

**Current State (VERIFIED).** Real, partial cost governance exists: soft spend/token limits,
a low-cost default model, a monthly usage report, explicit cost-estimate handling, and Stripe
billing infrastructure. Ownership of the commercial role is interim and unconfirmed.

**Future Vision (NOT YET BUILT).** A confirmed Commercial Owner; per-home and per-provider
cost transparency; metering proven to cover all AI egress; a documented, affordable, and
sustainable pricing model for children's homes. None of this is claimed as present today.

---

## 7. What this standard does not claim
- It does **not** claim the product is currently profitable, sustainably priced, or
  fully cost-governed.
- It does **not** permit any cost saving that compromises a higher constitutional value.

---

## Version history

| Version | Date | Status | Notes |
|---|---|---|---|
| 0.1 | 2026-06-26 | Drafted (Phase 2 Batch 2) | Initial draft presented for founder review. Commercial Owner assignment pending. |
