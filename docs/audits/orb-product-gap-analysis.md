# ORB Residential Product Gap Analysis (Phase 2)

**Audit date:** 10 June 2026  
**Method:** Code review, route mapping, frontend contract tests, architecture docs cross-check. No live user session in this audit environment (no running stack with DB + API keys).

---

## Product surface audited

Canonical entry: **`/orb`** → `OrbShell` → `OrbCareCompanion` with station switching via `?station=`.

| Station | Query param | Component |
|---------|-------------|-----------|
| Chat | (default) | `orb-care-companion.tsx` |
| ORB Dictate | `orb_dictate` | `orb-dictate-station.tsx` |
| ORB Voice | `orb_voice` | `orb-voice-station.tsx` |
| ORB Write | `orb_write` | `orb-write-standalone-panel.tsx` |
| Templates | `templates` | `orb-templates-panel.tsx` |
| Saved outputs | `saved` | `orb-saved-outputs-panel.tsx` |
| Shift builder | `shift_builder` | `orb-shift-builder-panel.tsx` |
| Review | `review` | `orb-review-panel.tsx` |
| Knowledge | `knowledge` | In-shell knowledge panel |

---

## Auth and session flow

### Flow
1. User lands `/orb` → `OrbAuthGate` state machine
2. States: loading → login → billing → safety acceptance → onboarding → ready
3. Methods: email/password, Google/Microsoft OAuth, passkeys
4. Post-login: trial or Stripe subscription required for premium surfaces
5. Safety acceptance modal before full product use

### Assessment

| Aspect | Status |
|--------|--------|
| Login on front door | **Working** — embedded login, no separate `/orb/login` page needed |
| OAuth | **Working** when provider env configured |
| Passkeys | **Working** — dedicated client + E2E |
| Session cookies | **Working** — `indicare_session` via backend proxy |
| Billing gate | **Working** — 402 on API, upgrade screen |
| Safety acceptance | **Working** — versioned acceptance stored |
| Onboarding `/orb/setup` | **Working** — role, name, preferences |
| MFA for ORB standalone users | **Partial** — MFA pages proxied to backend; primarily enforced for OS admin/manager roles |

---

## What is fully working?

1. **Converged `/orb` shell** — single product with sidebar station navigation
2. **ORB Chat** — streaming SSE, brain routing, citations, action suggestions
3. **Auth gate chain** — login → billing → safety → ready
4. **Stripe billing flow** — signup, trial, checkout, portal (when `STRIPE_*` configured)
5. **ORB Dictate pipeline** — record → transcribe → analyse → prepare-write → finalise → export
6. **ORB Write workspace** — editor, AI rewrites, template picker, PDF/print export
7. **Templates panel** — browse, generate, export PDF/DOCX
8. **Saved outputs** — persist, reopen, handoff to Write
9. **Projects** — project/chat organisation (backend + UI)
10. **Mobile shell** — dedicated mobile layouts for login, voice, dictate, write
11. **Deep links** — `/orb/write`, `/orb/templates` etc. redirect to `?station=`
12. **Privacy boundary** — standalone does not leak OS provider/child data

---

## What is partially working?

1. **ORB Voice** — WebSocket + browser STT/TTS work; WebRTC offer/ICE endpoints return not-implemented; `mock_voice` in dev
2. **`/orb/ask`** — parallel simpler chat page; Upload/Voice buttons are **stubs** (no handlers)
3. **Shift builder** — functional but less polished than chat/dictate/write
4. **Review panel** — present but feels secondary to Write/Saved
5. **Knowledge panel** — read/search works; admin ingestion not in Residential UI
6. **Intelligence map** — `/orb/intelligence-map` exists; niche power-user surface
7. **Account overlays** — billing/settings modals work but 21 frontend contract tests fail on copy/layout expectations
8. **Error recovery** — retry exists; some error messages still generic

---

## What feels unfinished?

1. **Voice post-session UX** — contract test expects cleaner Dictate copy after voice ends
2. **Billing modal polish** — multiple test failures on feature list, sticky footer, viewport scroll
3. **Login hero/sphere sizing** — desktop clipping issues flagged in tests
4. **OAuth diagnostics wiring** — provider URL contract mismatches in tests
5. **Orphan components** — `OrbSavedScreen`, `OrbTemplatesScreen`, `OrbResidentialHome`, `OrbStandaloneChat` unused
6. **`/orb-residential/*`** — redirect layer only; `OrbResidentialShell` legacy wrapper still present
7. **Production build** — `npm run build` fails on Founder revenue server import (blocks full deploy verification)
8. **ChatGPT parity gaps** — tests explicitly track parity; several assertions still failing

---

## What is confusing?

1. **Two ORB products** — `/orb` (Residential standalone) vs `/assistant/orb` (OS operational) — easy to conflate in docs/demos
2. **Station naming** — `orb_dictate` vs alias `dictate`; `orb_write` vs `write`
3. **Templates vs recording framework** — two overlapping catalogues (JSON framework vs template library)
4. **Saved vs outputs routes** — `/orb/saved` and `/orb/outputs` both → `?station=saved`
5. **Trial vs subscription states** — multiple access probes (`/access`, `/billing/status`, front-door verdict)
6. **Draft disclaimers** — repeated "draft only" messaging; necessary but can feel bureaucratic mid-shift

---

## What would stop a residential worker using it every shift?

| Blocker | Severity | Detail |
|---------|----------|--------|
| Mic/browser permissions on shared devices | High | Voice/dictate need reliable mic; no offline mode |
| Voice latency / connection drops | High | Shift-end dictation fails if network poor |
| Trust in draft quality | Medium | Workers may re-write entirely if tone wrong |
| No native mobile app | Medium | PWA only; home screen install not guided |
| Login friction on every device | Medium | Passkeys help but not universal in homes |
| Unclear "is this saved?" | Medium | Draft vs saved output distinction |
| Billing interruption | High (if misconfigured) | 402 errors if trial expired mid-shift |

---

## What would impress a registered manager?

1. **Safeguarding-aware answers** — escalation prompts, manager oversight sections, exploitation lens on missing episodes
2. **Recording framework** — structured incident, missing, restraint, Reg 44/45 record types with evidence checks
3. **Therapeutic language coaching** — reframe modes, child voice prompts
4. **Ofsted readiness framing** — inspection lens without grade prediction (quality gate blocks that)
5. **Export to PDF** — professional-looking outputs for file/Ofsted evidence
6. **Quality Lab** (founder/admin) — scenario regression bank shows seriousness about safety
7. **Plan enforcement / usage caps** — commercial maturity signal

---

## What would worry a provider?

1. **AI drafting safeguarding records** — liability if staff treat output as final record without review
2. **Data residency / subprocessors** — OpenAI and voice providers; privacy notices exist but must be prominent
3. **No provider-level admin** — ORB Residential is individual subscription; no home-wide policy injection yet
4. **Standalone boundary** — cannot see live chronology; managers may expect OS integration
5. **Telemetry/content storage** — transcripts and generated reports stored; retention policy not surfaced clearly in UI
6. **Stripe dependency** — payment and access tied to external billing
7. **Test failures in production build** — engineering quality signal for due diligence

---

## What would fail in a live demo?

| Risk | Likelihood | Mitigation needed |
|------|------------|-------------------|
| Stripe not configured → checkout error | High without env | Pre-configure test mode keys |
| OpenAI rate limit / timeout | Medium | Fallback messaging, retry |
| Voice mic blocked | High on demo laptop | Pre-authorise mic; use Dictate fallback |
| OAuth redirect mismatch | Medium | Verify `APP_BASE_URL` and callback URLs |
| Slow first stream token | Medium | Warm cache; use shorter demo prompt |
| Safety modal blocks flow | Low | Pre-accept on demo account |
| WebRTC voice demo | High | Do not demo WebRTC path; use WS/STT path |
| Build/deploy failure | High today | Fix Founder revenue import before investor demo |
| `/orb/ask` stub buttons clicked | Medium | Demo main `/orb` shell only |

---

## Mobile experience

| Area | Assessment |
|------|------------|
| Viewport / safe area | Good — `100dvh`, safe-area insets |
| Login | Good — mobile header, scroll reachability tested |
| Chat composer | Good — sticky actions |
| Dictate | Good — dedicated mobile experience component |
| Voice | Good — mobile experience; audio unlock on tap tested |
| Write | Adequate — mobile toolbar; smaller screen editing harder |
| Billing modal | **Needs work** — overflow/wrap issues in contract tests |
| Tablet | Adequate — breakpoint at 768/1024px |

---

## Empty / loading / error states

| State | Quality |
|-------|---------|
| Auth loading | Good — skeleton, no flash |
| Stream loading | Good — early status tokens, optimistic send |
| Empty chat | Adequate — starter prompts present |
| Empty saved outputs | Adequate |
| Empty templates | Good — fallback categories |
| API 402 billing | Good — upgrade screen |
| API 401 | Good — return to login |
| CSRF errors | Improved — visible error messaging |
| Network split | Tested — retry client exists |
| Route error boundary | Present — `app/orb/error.tsx` |

---

## Summary verdict

**ORB Residential is a real, converged product** with substantial implementation depth across chat, dictate, write, templates, billing, and exports. It is **pilot-ready with caveats** (Stripe, API keys, demo script discipline). It is **not yet demo-polish ready** for executive/investor audiences due to frontend build failure and ~21 UI contract test failures. Daily shift use is credible for **chat + dictate + write**; **voice** is the weakest daily-shift surface.
