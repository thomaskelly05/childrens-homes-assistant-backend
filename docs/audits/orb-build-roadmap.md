# Recommended Build Roadmap (Phase 17)

**Focus:** ORB Residential (`/orb`) only.

---

## Immediate: 0–7 days — critical blockers

1. **Fix production build** — resolve `revenue-server-context.ts` `next/headers` import chain breaking `npm run build`
2. **Stripe production setup** — keys, webhook, price ID, success/cancel URLs on staging then prod
3. **Fix 21 frontend ORB contract tests** — billing modal, login sphere, OAuth URLs, voice copy
4. **Quality Lab live run** — execute 10 regression + 10 GOLD scenarios with live LLM; human review log
5. **Add whistleblowing GOLD scenario** to `orb_expert_scenarios.py`
6. **Privacy page in ORB** — retention, deletion request contact, subprocessors link
7. **In-app support link** — email or help page in account menu
8. **Deprecate `/orb/ask` stubs** — redirect to main shell or wire Upload/Voice

---

## Short term: 2–4 weeks — launch readiness

1. **Voice beta polish** — fix "Tap to hear ORB", post-session Dictate handoff, audio unlock
2. **Mobile billing modal** — viewport scroll, sticky footer, feature list
3. **Write DOCX export** — parity with template DOCX path
4. **Onboarding telemetry** — step events to founder summary
5. **Export telemetry** — `orb_write_exported`, `orb_dictate_completed`
6. **Fix conftest CSRFMiddleware** — restore auth integration tests
7. **CI gates** — `npm run build`, `npm run test:orb`, ORB pytest subset must pass
8. **Pilot demo runbook** — documented golden path: signup → dictate → write → PDF
9. **OAuth staging verification** — Google/Microsoft on real mobile devices
10. **Founder revenue page** — verify live MRR display when Stripe connected

---

## Medium term: 1–3 months — stronger product

1. **Provider policy snippet** — user can paste/upload home policy for brain context
2. **Manager sign-off disclaimer workflow** — "reviewed by" field on export
3. **Branded PDF exports** — ORB letterhead, home name field
4. **Voice reliability** — latency metrics, reconnect UX, optional WebRTC
5. **Offline dictate queue** — record locally, sync when online
6. **Unified template catalogue UX** — single picker language
7. **Quality Lab → improvement ticket** — auto-create `quality_proposal` on fail
8. **Speaker separation in Dictate** — for handover debriefs
9. **Supervision record framework type**
10. **PWA install prompt** — guide workers to home screen

---

## Later: 3–6 months — scale/provider features

1. **Provider licence model** — home-wide subscription, admin dashboard
2. **Home policy library** — RM uploads policies for all staff ORB accounts
3. **ORB ↔ IndiCare OS bridge** — optional chronology write-back for OS customers
4. **Multi-home provider analytics** — anonymised cross-home trends (with consent)
5. **Native iOS/Android shell** — if PWA insufficient
6. **CRM integration** — HubSpot for pilot pipeline
7. **Auto investor evidence packs** — from live anonymised metrics
8. **Reg 40 notification assistant** — structured serious event prep
9. **Academy integration** — NVQ evidence from ORB outputs
10. **Enterprise SSO** — SAML for large providers
