# ORB Residential — style source of truth audit

**Style version:** `orb-style-v1` (`data-orb-style-version`)  
**Voice version:** `living-head-v4` (`data-orb-voice-version`)  
**Login version:** `front-door-v4` (`data-orb-login-version`)  
**Import hub:** `app/orb/layout.tsx` (layout CSS only — voice/login component CSS is co-located)

## Canonical structure

| CSS file | Imported where | What it controls | Status | Surfaces |
|----------|----------------|------------------|--------|----------|
| `app/orb/orb-theme.css` | `app/orb/layout.tsx` | Theme hub: tokens, colours, typography, radius, shadows | **Canonical** | Shell, Chat, Login, all stations |
| `app/orb/orb-components.css` | `app/orb/layout.tsx` | Buttons, cards, modals, inputs, sidebar chrome | **Canonical** | Shell, Chat, Modals |
| `app/orb/orb-shell.css` | `app/orb/layout.tsx` | Sidebar, layout, viewport, workspace chrome | **Canonical** | Shell, Chat, Dictate, Write, Templates, Documents |
| `app/orb/orb-stations.css` | `app/orb/layout.tsx` | Shared station layout polish | **Canonical** | Dictate, Write (shared workspace) |
| `app/orb/orb-login.css` | `app/orb/layout.tsx` | Front-door login layout and hero | **Canonical** | Login |
| `components/orb-residential/orb-voice.css` | `orb-voice-companion.tsx` | Living head companion (hero/mini/preview) | **Canonical** | Voice |
| `components/orb-standalone/orb-voice-studio-layout.css` | `orb-voice-studio-layout.tsx` | Voice studio shell, hero stage, state panel | **Supporting** | Voice |

## Implementation modules (imported via canonical layers — not from layout directly)

| CSS file | Aggregated by | What it controls | Status | Surfaces |
|----------|---------------|------------------|--------|----------|
| `app/orb/orb-premium-tokens.css` | `orb-theme.css` | Design tokens, glass-orb aliases (scoped away from voice companion) | Supporting | Shell, Login, legacy presence |
| `app/orb/orb-brand-asset.css` | `orb-theme.css` | Brand orb presence assets | Supporting | Shell, Chat |
| `components/orb/premium/orb-premium-v2.css` | `orb-components.css` | Premium sidebar and component chrome | Supporting | Shell |
| `app/orb/orb-desktop.css` | `orb-shell.css` | Desktop/tablet layout | Supporting | Shell, Chat, stations |
| `components/orb/premium/orb-premium-studio-v3.css` | `orb-shell.css` | Studio shell framing | Supporting | Shell, Write, Dictate |
| `app/orb/orb-premium-layout-pass.css` | `orb-shell.css` | Residential viewport pass (no voice head rules) | Supporting | Shell, Login layout |
| `app/orb/orb-mobile.css` | `orb-shell.css` | Mobile shell, voice mobile chrome (not hero head) | Supporting | Shell, Voice mobile chrome |
| `app/orb/orb-dictate-studio-polish.css` | `orb-stations.css` | Dictate studio workspace | Supporting | Dictate |
| `app/orb/orb-light-layer-fix.css` | `orb-stations.css` | Non-residential light-layer fix (scoped) | Supporting | Legacy non-residential |

## Global / legacy (must not override station-specific visuals)

| CSS file | Imported where | What it controls | Status | Surfaces |
|----------|----------------|------------------|--------|----------|
| `app/globals.css` | `app/layout.tsx` | Base orb sphere primitives, voice dock | **Legacy** | Global foundation; residential canonical layers override |
| `components/indicare/orb/*` | Not imported by `/orb` | Legacy indicare-ai orb visuals | **Legacy** | Must not be used on `/orb` |

## Visual authority rules

1. **Voice** — `OrbVoiceCompanion` → `orb-voice.css` only. No `GlassOrbMark`, `OrbSphere`, or `orb-living-sphere` in voice station components. Legacy sphere selectors inside `.orb-voice-companion` are `display: none`.
2. **Login** — `OrbLoginScreen` → `orb-login.css` + shell layout pass. Same front door for `/login` redirect, `/orb/login` redirect, and `/orb` unauthenticated gate.
3. **Shell** — `orb-shell.css` hub; generic workspace/flex rules must not set voice hero dimensions.
4. **Write / Dictate** — Use shell + stations layers; must not import voice head CSS.

## Version markers

```html
<span data-orb-style-version="orb-style-v1" />
<span data-orb-build-visual-version="premium-final" />
<!-- Voice companion root -->
<div data-orb-voice-version="living-head-v4" data-orb-voice-visual-authority="OrbVoiceCompanion" />
<!-- Login root -->
<div data-orb-login-version="front-door-v4" data-orb-login-page />
```

Runtime: `applyOrbResidentialTheme()` sets `html[data-orb-style-version]` and related contract markers.

## Contract tests

- `components/orb-residential/orb-css-contract.test.ts` — CSS parse, import allow-list, voice/login authority
- `components/orb-residential/orb-visual-render-audit.test.ts` — render path and audit map
- `components/orb-residential/orb-source-of-truth-audit.test.ts` — voice/login convergence

Run:

```bash
cd frontend-next
npm run typecheck
npm run build
node --experimental-strip-types --test components/orb-residential/orb-css-contract.test.ts \
  components/orb-residential/orb-visual-render-audit.test.ts \
  components/orb-residential/orb-source-of-truth-audit.test.ts
```
