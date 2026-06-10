# ORB Launch Readiness Score (Phase 16)

**Audit date:** 10 June 2026  
**Method:** Code review, test runs, architecture analysis. No live product session with production API keys.

Scores are **honest** — not inflated.

---

## Scores (0–100)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| Product readiness | **62** | Core shell complete; polish gaps; build fails |
| Answer quality | **68** | Strong brain architecture; live prose unverified |
| Safeguarding safety | **65** | Excellent rules/tests; LLM adherence unproven live |
| Ofsted alignment | **64** | Framework + modes; no standalone inspection pack |
| UX/UI polish | **55** | 21 frontend contract failures; sphere/modal issues |
| Dictate readiness | **74** | Strongest feature — full pipeline + tests |
| Voice readiness | **52** | Built but WebRTC stub + failing voice tests |
| Write readiness | **68** | Solid editor; missing DOCX |
| Export readiness | **63** | PDF works; not branded |
| Telemetry readiness | **50** | Core meter live; funnel thin |
| Billing readiness | **58** | Code ready; needs Stripe prod + UI fix |
| Privacy/GDPR readiness | **55** | Good telemetry sanitisation; weak retention UX |
| Commercial readiness | **52** | Individual model only; no provider licence |
| Demo readiness | **58** | Demo-able with script discipline; build blocks deploy |
| Stability | **60** | 3513 tests pass; 210 fail + build fail |

### Overall weighted score: **61 / 100**

---

## Launch blockers (P0)

1. **Production frontend build failure** (`founder/revenue` server import)
2. **Stripe production configuration** not verified
3. **Live safeguarding scenario QA** not in release gate
4. **Privacy retention/deletion UX** absent
5. **Whistleblowing scenario gap** in brain bank

---

## Must fix before public launch

1. Fix `npm run build`
2. Fix 21 frontend ORB contract test failures (billing, login, voice copy)
3. Configure Stripe production + webhook
4. Add privacy/retention policy page in ORB settings
5. Run Quality Lab GOLD scenarios against live LLM with human review
6. Add in-app support/contact route
7. Fix conftest CSRFMiddleware (restore 42 auth integration tests)
8. Remove or complete `/orb/ask` stub buttons

---

## Should fix before first pilot

1. Voice labelled "beta" or hidden from primary nav
2. Mobile billing modal overflow
3. Onboarding funnel telemetry
4. Export/DOCX from Write for managers
5. Demo runbook with pre-provisioned account (trial + safety accepted)
6. Clear "draft not final record" UX on every export
7. OAuth callback URL verification on staging

---

## Nice to have later

1. Provider/home licensing model
2. Provider policy upload
3. Offline dictate queue
4. Branded PDF letterhead
5. Manager sign-off workflow
6. HubSpot/CRM integration
7. Native mobile app
8. WebRTC voice path
9. Auto evidence packs for investors
10. Chronology merge for OS customers

---

## Pilot vs paid launch

| Milestone | Ready? | Recommendation |
|-----------|--------|----------------|
| **Closed pilot** (5–10 homes, supervised) | **Yes with caveats** | Lead with Dictate + Chat; voice beta; written demo script |
| **Open pilot** (self-serve signup) | **Not yet** | Fix billing UI + build + privacy first |
| **Paid public launch** | **No** | Score 61 — needs P0 fixes + live safeguarding QA |
| **Provider B2B launch** | **No** | Product model not built |
