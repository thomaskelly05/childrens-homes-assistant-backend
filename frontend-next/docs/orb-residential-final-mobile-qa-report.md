# ORB Residential — Final Mobile QA Report

**Sprint:** ORB Residential Final Mobile QA — Theme Isolation, Premium Identity and Answer Quality  
**Date:** 2026-05-31

## Summary

ORB Residential mobile now enforces a locked dark premium shell, restores a single-sphere empty state, fixes washed-out answer/locality screens, improves general Ofsted answer closers, and polishes station panels, sidebar, settings, composer safe-area, and safety modal behaviour.

---

## 1. Theme leakage fixed

- `html[data-orb-residential="1"]` and `.orb-residential-root` on experience wrapper and care companion layout.
- Residential surface **always** uses `effectiveTheme = 'dark'` — OS/light appearance cannot override.
- `orb-premium-tokens.css` blocks `orb-theme-light` overrides on residential routes (sidebar, panels, markdown, empty state, overlays).
- Document `body` gets midnight background while on `/orb`.

## 2. Empty state fixed

- `PremiumMobileOrb` is now **one sphere** (`premium-mobile-orb__sphere`) — removed separate glow + core layers that looked like two blue balls.
- Mobile shows one compact orb; desktop uses larger variant via `md:` breakpoint only.
- Brand stack: ORB Residential + Powered by IndiCare Intelligence + personalised greeting + practice subline.

## 3. ORB identity restored

- Single luminous radial-gradient sphere with subtle breathing animation (reduced-motion safe).
- No square halo artefact; size capped at 5.5rem on mobile.

## 4. Ofsted response improved

- `orb_grounded_answer_style_service` inspection depth block now structures answers for **children's homes** (RM, RI, SCCIF, Quality Standards, child voice, Inspection evidence preparation).
- General “Tell me about Ofsted” no longer steered toward generic schools/regulator copy in prompt depth.

## 5. Generic closer logic fixed

- Inspection topic closer: *“ORB can help you turn this into an Inspection evidence preparation checklist, Reg 44/45 preparation note, or evidence review.”*
- Threshold/safeguarding closers stripped for general Ofsted and inspection topics unless safeguarding risk terms are present.
- Templates and learning topics get dedicated closers.
- Python test: `test_general_ofsted_sanitize_strips_threshold_closer_and_adds_inspection_closer`.

## 6. Locality / light-screen bug fixed

- Forced dark theme on residential surface prevents `orb-theme-light` + `text-slate-900` empty/answer washout.
- Markdown headings use `var(--orb-foreground)` with residential CSS forcing `#f7faff` on dark backgrounds.
- Chat thread and assistant bubbles stay readable on midnight background.

## 7. Station panel errors fixed

- Saved Outputs and Knowledge Library already route auth failures through `OrbStationAuthError` (“Reconnect to continue”) — verified in structure tests.
- Empty states copy matches product spec.

## 8. Sidebar controls checked

- Rename / Pin / Archive / Delete via `OrbSidebarChatList` + `orb-sidebar-chat-menu` (structure tests).
- Sidebar and dropdown menus forced dark under `data-orb-residential`.
- Chat row menu buttons no longer use bright white pill on mobile.

## 9. Settings / profile checked

- Active nav item uses `orb-settings-nav-item--active` dark glass (not white block).
- Profile passkey copy: Face ID / Touch ID / device passkey; authenticator fallback wording present in login/profile tests.

## 10. Tests / build result

| Command | Result |
|---------|--------|
| `npm run test:orb` | **206/206 pass** |
| `npm run typecheck` | **Pass** |
| `npm run build` | **Pass** |
| `pytest tests/test_orb_professional_curiosity_depth.py` (Ofsted closer) | **Pass** |

New/updated structure tests in `orb-residential-mobile-ux.test.ts` cover single orb, theme isolation, markdown headings, station auth UX, safety modal error state, sidebar dark theme.

## 11. Remaining issues / manual iPhone checks

These require **physical Safari** verification on device:

1. Live empty-state animation feel (breathing glow intensity).
2. Composer vs Safari toolbar overlap on smallest iPhones.
3. Safety modal accept after real API save (network-dependent).
4. Sidebar three-dot menu sheet position on long chat lists.
5. Full “Tell me about Ofsted” answer content quality from live LLM (post-processing verified; model wording may vary).

---

## Manual test scenario notes

| # | Scenario | Expected | Code status |
|---|----------|----------|-------------|
| 1–2 | `/orb` empty state | One premium ORB | ✅ Single sphere component |
| 3–5 | “Tell me about Ofsted” | Residential-specific; no threshold closer | ✅ Sanitizer + prompt depth |
| 6–7 | Locality risk assessment | Dark, readable | ✅ Forced dark + markdown CSS |
| 8–10 | Sidebar + chat menu | Dark; Rename/Pin/Archive/Delete | ✅ CSS + structure tests |
| 11–14 | Saved / Knowledge auth | Friendly reconnect card | ✅ OrbStationAuthError |
| 15–16 | Settings selected row | Dark premium | ✅ CSS + tests |
| 17–18 | Safety modal | No stuck Saving | ✅ finally resets; error + retry |

---

## Target achieved (engineering)

Premium · Simple · Dark · Readable · No forced setup · No dashboard clutter · No cheap light-mode leaks · Context-aware closers for Ofsted vs safeguarding.
