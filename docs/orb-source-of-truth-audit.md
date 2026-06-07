# ORB Residential — Source of Truth Audit

**Date:** 2026-06-07  
**Repo:** `thomaskelly05/childrens-homes-assistant-backend`  
**Voice version:** `living-head-v4`  
**Visual authority:** `OrbVoiceCompanion` (head/bust) — **not** `OrbSphere`

## Executive summary

The Voice studio layout was correct in React, but hero companion visuals were defined in `orb-premium-layout-pass.css` alongside unrelated layout rules. Generic workspace flex selectors (`min-height: 0`, `flex: 1 1 auto`, `overflow: hidden`) could compress the hero column into a thin glow strip when CSS specificity or load order fought the companion rules.

**Root cause:** Duplicate visual authority — `OrbVoiceCompanion` markup in one file, hero sizing in a shared layout-pass stylesheet, with legacy `OrbSphere` / `.orb-presence--voice` rules still present in `orb-premium-tokens.css`.

**Fix:** One canonical visual path with co-located CSS:

```
Voice panel → OrbVoiceStation → OrbVoiceCompanion (hero) + OrbVoiceStudioLayout (chrome)
```

Voice head CSS now lives in `components/orb-residential/orb-voice-companion.css` (imported by the component). Studio grid/hero containment lives in `components/orb-standalone/orb-voice-studio-layout.css`.

---

## 1. Route map

| Route | Page | Layout | Shell | Production component tree |
|-------|------|--------|-------|---------------------------|
| `/orb` | `app/orb/page.tsx` | `app/orb/layout.tsx` | `OrbShell` → `OrbAuthGate` → `OrbCareCompanion` | Auth gate or product shell |
| `/orb/login` | `app/orb/login/page.tsx` | same | redirect → `/orb` | `OrbLoginScreen` via `OrbAuthGate` |
| `/login` | `app/login/page.tsx` | root layout | redirect → `/orb` | `OrbLoginScreen` via `OrbAuthGate` |
| Voice (panel) | *(no `/orb/voice` page)* | same | `OrbCareCompanion` panel `orb_voice` | `OrbVoiceStation` → `OrbVoiceCompanion` |
| `?station=voice` | `/orb?station=voice` | same | deep-link opens voice panel | same as Voice panel |
| `/orb/write`, `/orb/dictate` | dedicated pages redirect/panel | same | workspace panels | separate studios |
| Legacy `/assistant/voice` | `app/assistant/voice/page.tsx` | assistant layout | **not** residential ORB | out of scope |

**Canonical ORB Residential entry:** `/orb` only. Login never renders a separate product tree.

---

## 2. ORB shell — production mount map

| Component | Role | Voice? |
|-----------|------|--------|
| `OrbShell` | Top wrapper | mounts gate |
| `OrbAuthGate` | Auth / front-door verdict | shows `OrbLoginScreen` when unauthenticated |
| `OrbCareCompanion` | Main product (`residentialSurface`) | opens `OrbVoiceStation` when `activePanel === 'orb_voice'` |
| `OrbWorkspaceFrame` | Workspace chrome (back header) | wraps voice when open |
| `OrbVoiceStation` | Voice studio controller | **yes** — desktop + mobile branches |
| `OrbVoiceCompanion` | **Visual authority** — head/bust | hero / mini / mobile-preview sizes |
| `OrbVoiceStudioLayout` | State panel, waveform, trust strip | layout only |
| `OrbPresence` / `OrbSphere` | Chat home, login sphere | **not mounted in Voice station** |

### Voice production tree (desktop)

```
OrbShell
└── OrbAuthGate [ready]
    └── OrbCareCompanion
        └── OrbVoiceStation (open)
            └── OrbWorkspaceFrame [panelId=voice]
                └── OrbVoiceStudioLayout
                    ├── OrbVoiceCompanion size=hero  ← VISUAL AUTHORITY
                    ├── OrbVoiceStatePanel → OrbVoiceCompanion size=mini
                    └── OrbVoiceMobilePreviewStrip → OrbVoiceCompanion size=mobile-preview
```

---

## 3. CSS authority map

| File | Imported by | Affects Voice hero? | Affects mini/preview? | Key selectors |
|------|-------------|---------------------|----------------------|---------------|
| `orb-voice-companion.css` | `orb-voice-companion.tsx` | **yes — canonical** | scoped to panel/strip only | `[data-orb-voice-head]`, `.orb-voice-companion__head-material` |
| `orb-voice-studio-layout.css` | `orb-voice-studio-layout.tsx` | containment only | panel/strip layout | `[data-orb-voice-hero-stage]`, `[data-orb-workspace-panel='voice']` |
| `orb-premium-layout-pass.css` | `app/orb/layout.tsx` | **no** (voice rules removed) | no | workspace viewport only |
| `orb-premium-tokens.css` | layout | **neutralised** in voice | no | `.orb-presence--voice` — not used in voice station |
| `orb-brand-asset.css` | layout | no | no | `.orb-living-sphere` for chat/login |
| `globals.css` | root | no | no | `.orb-voice-dock` legacy OS only |

### Collapse mechanism (fixed)

| Selector | File | Effect |
|----------|------|--------|
| `[data-orb-workspace-panel] .orb-workspace-body > *` | layout-pass | `min-height: 0; flex: 1 1 auto; overflow: hidden` on `.orb-voice-room` |
| `.orb-voice-studio__main` | studio-layout | `min-height: 0; overflow: hidden` |
| Unscoped `[data-orb-voice-companion-size='mini']` | *(removed)* | could leak sizing variables |
| `.orb-voice-companion__head-material { height: 62% }` | companion | strip if parent height → 0 |

**Containment fix:** `[data-orb-voice-hero-stage] { min-height: max(18.75rem, 300px) }` + hero explicit `width`/`height` on `[data-orb-voice-head]`.

---

## 4. Debug proof (`?debugVisual=1`)

On `/orb?debugVisual=1` with Voice open, `OrbVisualDebugPanel` shows:

- Build commit / visual version
- Active voice component tree
- `data-orb-voice-visual-authority` (= `OrbVoiceCompanion`)
- Hero `getBoundingClientRect()` width × height
- Computed opacity / transform of `[data-orb-voice-head]`
- Whether `OrbSphere` / `GlassOrbMark` appear inside voice station
- Whether companion CSS bundle is loaded

**Acceptance:** `hero collapsed: no`, hero height ≥ 200px, `OrbSphere in voice: no`.

---

## 5. Files changed

| File | Change |
|------|--------|
| `components/orb-residential/orb-voice-companion.css` | **new** — single voice head visual authority |
| `components/orb-standalone/orb-voice-studio-layout.css` | **new** — studio layout + hero containment |
| `components/orb-residential/orb-voice-companion.tsx` | import CSS, `data-orb-voice-visual-authority` |
| `components/orb-standalone/orb-voice-studio-layout.tsx` | import CSS |
| `app/orb/orb-premium-layout-pass.css` | removed ~850 lines of voice CSS |
| `components/orb-residential/orb-visual-debug-panel.tsx` | computed hero metrics |
| `lib/orb/orb-visual-build.ts` | `living-head-v4`, CSS file constants |
| `components/orb-residential/orb-source-of-truth-audit.test.ts` | **new** acceptance tests |
| `docs/orb-source-of-truth-audit.md` | this document |

**Not changed:** auth, billing, Stripe, OAuth, microphone logic, voice API routes, front-door verdict.

---

## 6. Acceptance criteria

- [x] One voice visual authority: `OrbVoiceCompanion`
- [x] Hero does not render through `OrbSphere` / `.orb-presence--voice`
- [x] Hero sizing contract ≥ 300px height (desktop)
- [x] Mini/mobile-preview rules scoped — cannot override hero
- [x] `/orb` and Voice panel share same component tree
- [x] Login uses `OrbLoginScreen` front door
- [x] No voice companion CSS in `orb-premium-layout-pass.css`
- [x] Debug panel proves live dimensions behind `?debugVisual=1`
