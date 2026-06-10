# Executive Summary — IndiCare Intelligence + ORB Residential Audit

**To:** Thomas Kelly, Founder/CEO  
**From:** System Audit (Cursor Cloud Agent)  
**Date:** 10 June 2026  
**Repository:** `thomaskelly05/childrens-homes-assistant-backend`

---

## What is built

You have a **real product**, not a prototype. ORB Residential at `/orb` is a converged children's homes AI companion with:

- **ORB Chat** — streaming conversation with IndiCare Intelligence brain, citations, safeguarding depth selection
- **ORB Dictate** — record → transcribe → analyse → generate professional records (the strongest launch feature)
- **ORB Write** — document workspace with therapeutic/child-voice rewrites and PDF export
- **ORB Voice** — realtime voice sessions (beta quality)
- **Templates, saved outputs, shift builder, projects**
- **Commercial stack** — signup, trial, Stripe billing, usage metering, spending caps
- **Quality Lab** — 50+ GOLD safeguarding scenarios, regression bank, answer quality gates
- **Founder OS** — honest telemetry, quality runs, evidence packs (ORB launch support)

The brain (`IndiCare Intelligence`) is architecturally mature: operating rules, Reg 44/45, Working Together, SCCIF quality standards, recording framework with 20+ record types, and explicit "must not" safety boundaries.

---

## What works

1. **End-to-end standalone product** — auth → billing → safety → chat/dictate/write
2. **Safeguarding architecture** — quality gates block grade prediction and invented facts; TTS blocks auto-speech on critical safeguarding
3. **Test depth** — 263 ORB backend test files; 1001 frontend ORB tests passing
4. **Standalone boundary** — ORB does not leak IndiCare OS child/provider data (correct for Residential product)
5. **Stripe billing code** — checkout, portal, webhook idempotency tested
6. **Mobile structure** — dedicated shells for login, dictate, voice, write

---

## What is impressive

- **Recording framework** — every output type has child voice, safeguarding, and manager oversight checks baked in
- **Expert scenario bank** — missing from home, CSE, allegations, restraint, medication refusal — the scenarios a registered manager would stress-test
- **Converged `/orb` shell** — one product, not fragmented apps
- **Honest Founder telemetry** — sanitised, empty when no data, no fake metrics
- **Dictate → Write pipeline** — genuinely saves shift time for support workers

---

## What is risky

1. **Live LLM safeguarding quality unverified** in this audit — regression tests check orchestration, not final prose in production
2. **Production build fails** — cannot deploy frontend confidently today
3. **21 frontend polish regressions** — billing modal, login, voice copy
4. **Voice not launch-grade** — WebRTC stub, failing E2E contracts
5. **No privacy retention/deletion UX** — GDPR gap for public launch
6. **Whistleblowing scenario missing** from brain bank
7. **210 backend test failures** — conftest debt signals engineering drag
8. **Draft outputs could be mistaken for final records** — disclaimers exist but human behaviour risk remains

---

## What is missing

| Gap | Impact |
|-----|--------|
| Provider/home licensing | Cannot sell B2B to providers yet |
| Provider policy injection | Answers cannot reference home-specific policy |
| DOCX from Write | Managers expect Word |
| In-app support route | Users stranded on billing issues |
| Live funnel telemetry | Cannot optimise conversion |
| OS chronology bridge | Standalone users cannot write back to IndiCare OS |
| Manager sign-off workflow | Governance gap |

---

## What blocks launch

### Paid public launch (blockers)
1. Fix `npm run build`
2. Stripe production configuration
3. Live safeguarding scenario QA with human review
4. Privacy/retention policy in product
5. Fix billing UI contract tests

### Pilot (manageable)
- Demo script avoiding voice and `/orb/ask`
- Pre-provisioned accounts with trial + safety accepted
- Supervised rollout with "draft only" training

---

## What to build next (priority order)

1. **Build fix** (1–2 days)
2. **Stripe prod + billing polish** (week 1)
3. **Quality Lab live scenario gate** (week 1)
4. **Privacy page** (week 1)
5. **Dictate-led pilot** with 5–10 homes (week 2–4)
6. **Voice beta** — do not market as primary (week 2–4)
7. **Write DOCX** for managers (week 3–4)

---

## Biggest commercial value

**ORB Dictate + IndiCare Intelligence brain for safeguarding-aware record drafting** is the clearest value proposition:

- Saves real shift time (support workers)
- Builds manager trust (structured incident/missing/restraint records)
- Differentiates from ChatGPT (children's homes recording framework, not generic chat)
- £9.99/month individual model is simple to sell for pilot

Long-term commercial value is **provider licensing + OS integration** — not built yet.

---

## Pilot readiness

| Question | Answer |
|----------|--------|
| Ready for closed pilot? | **Yes** — 5–10 homes, supervised, dictate-led, with demo script |
| Ready for open self-serve pilot? | **Not yet** — fix build + billing UI + privacy first |
| Ready for paid public launch? | **No** — score 61/100 |
| Ready for provider B2B? | **No** — product model not built |

---

## Honest recommendation

**Proceed with a closed pilot immediately** focusing on **Dictate + Chat + Write** for support workers and registered managers. Position ORB Voice as beta. Do not run a public paid launch or investor demo on the current frontend build.

Invest 0–7 days in P0 blockers (build, Stripe, privacy, live safeguarding QA), then recruit 5 pilot homes with weekly Quality Lab review of real anonymised scenario outputs.

The child must remain central: the recording framework and safeguarding brain show you have built for that purpose. The gap is not vision — it is **launch discipline**: deploy reliability, live safety verification, and privacy transparency.

---

## Audit pack index

| Document | Phase |
|----------|-------|
| `indicare-orb-system-audit.md` | 1 — System map |
| `orb-product-gap-analysis.md` | 2 — Product audit |
| `orb-brain-knowledge-audit.md` | 3 — Brain audit |
| `orb-output-quality-audit.md` | 4 — Output quality |
| `orb-voice-audit.md` | 5 — Voice |
| `orb-dictate-audit.md` | 6 — Dictate |
| `orb-write-document-audit.md` | 7 — Write |
| `data-privacy-safeguarding-audit.md` | 8 — Privacy |
| `live-data-telemetry-audit.md` | 9 — Telemetry |
| `orb-commercial-launch-audit.md` | 10 — Commercial |
| `orb-ui-ux-audit.md` | 11 — UX/UI |
| `backend-reliability-audit.md` | 12 — Backend |
| `test-coverage-audit.md` | 13 — Tests |
| `founder-os-support-audit.md` | 14 — Founder OS |
| `indicare-orb-gap-matrix.md` | 15 — Gap matrix |
| `orb-launch-readiness-score.md` | 16 — Scores |
| `orb-build-roadmap.md` | 17 — Roadmap |
| `cursor-fix-prompts.md` | 18 — Fix prompts |
| `audit-verification-results.md` | 19 — Verification |
| `indicare-orb-executive-summary.md` | 20 — This document |
