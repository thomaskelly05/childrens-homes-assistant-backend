# Frontend UX/UI Audit (Phase 11)

**Surface:** `frontend-next/app/orb/` + `components/orb-*`  
**Screenshots:** Not captured — no running browser stack in audit environment. Contract tests used as proxy.

---

## Platform coverage

| Platform | Assessment | Evidence |
|----------|------------|----------|
| Desktop | **Good core, polish gaps** | 8 failing desktop UX contract tests |
| Tablet | **Adequate** | Breakpoint 1024px; less tested |
| Mobile | **Good structure, copy gaps** | Mobile shell + E2E viewport tests; 32-test suite has failures |

---

## Theme and branding

| Element | Status |
|---------|--------|
| ORB branding | Strong — dedicated CSS token layers (`orb-premium-tokens.css`) |
| Dark/light | Theme root present; light CSS verification script exists |
| ORB sphere/hero | Present; **clipping issues** on login (test failure) |
| Living companion (voice/dictate) | **Contract test failing** on glass orb marks |
| Professional feel | **Above average** for sector; below ChatGPT polish |

---

## Navigation

| Aspect | Status |
|--------|--------|
| Single shell convergence | **Excellent** — no duplicate nav confusion in main product |
| Sidebar stations | Clear icons + labels |
| Deep links | Redirect aliases work |
| Legacy `/orb-residential` | Confusing if encountered — redirects only |
| Breadcrumb | Minimal — station-based |

---

## States

| State | Quality |
|-------|---------|
| Loading | Good — auth skeleton, stream markers |
| Error | Improved — visible CSRF/network errors |
| Empty | Adequate — starter prompts, fallback templates |
| Billing blocked | Good — upgrade screen |

---

## Accessibility basics

| Item | Status |
|------|--------|
| Documented a11y | `docs/orb-accessibility.md` exists |
| Tests | `test_orb_accessible_support_plan_live_quality.py`, tools memory accessibility |
| Focus management | Partial — modal focus not fully audited |
| Screen reader | Not live-tested |
| Colour contrast | Premium tokens; light layer fix CSS suggests past issues |
| Keyboard | Composer keyboard tests present |

---

## Copy quality

| Area | Assessment |
|------|------------|
| Safeguarding disclaimers | Clear, repeated |
| Product voice | Professional, British English |
| Passkey/auth copy | **Test failure** — wording mismatch |
| Voice mobile copy | **Test failure** — "Tap to hear ORB" |
| Billing feature list | **Test failure** — incomplete list in modal |

---

## ChatGPT / Copilot parity

Explicit test suite: `ORB Residential ChatGPT parity` — **failing** (billing modal sections).

| Dimension | vs ChatGPT |
|-----------|------------|
| Streaming | Comparable |
| Markdown rendering | Good |
| Sidebar projects | Comparable |
| Voice | Behind — reliability + polish |
| File upload in chat | **Not in main shell** — stub on `/orb/ask` |
| Plugins/tools | ORB has templates/dictate — different model |
| Visual polish | Behind — sphere clipping, modal overflow |

---

## Residential-specific feel

| Signal | Present? |
|--------|----------|
| Recording framework types | Yes |
| Safeguarding modes | Yes |
| Child voice prompts | Yes |
| Ofsted/Reg 44/45 language | Yes |
| Shift/dictate workflow | Yes — **strong differentiator** |
| Generic AI chat feel | Risk on `/orb/ask` page |

**Verdict:** Main `/orb` shell **feels residential-specific**. `/orb/ask` feels generic.

---

## Failing contract tests (proxy for UX debt)

1. Billing modal — plan, usage, spending cap sections
2. Login hero sphere clipping
3. OAuth provider URL wiring
4. Account/settings/billing overlays
5. Billing CTA bar overflow
6. Voice/dictate glass orb marks
7. Passkey copy
8. Voice "Tap to hear ORB"
9. Post-voice Dictate copy
10. ChatGPT parity billing modal

---

## Verdict

ORB UI is **functionally strong with premium ambition** but **not yet at ChatGPT-tier polish**. Mobile structure is good; **billing/login/voice copy regressions** block confidence in a public launch demo. **Fix 21 failing frontend contract tests** as the UX gate.
