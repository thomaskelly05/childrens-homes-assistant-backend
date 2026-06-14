# ORB Desktop Convergence Audit

Prepared as foundation for the next desktop convergence pass. No full redesign in this document — safe alignment only.

## Current desktop shell

| Area | Primary files | Status |
|------|---------------|--------|
| Shell layout | `components/orb/orb-shell.tsx`, `components/orb/orb-layout.tsx` | Sidebar + main column; residential uses `OrbResidentialSidebar` |
| Composer | `components/orb-standalone/orb-standalone-composer.tsx` | Desktop uses `OrbComposerPlusMenu` in action rail (plus dropdown) |
| Plus menu | `components/orb-standalone/orb-composer-plus-menu.tsx` | Camera / Photos / Files + ORB tools + Privacy in More |
| Settings | `components/orb-standalone/orb-standalone-settings-panel.tsx` | Grouped Apple-like rows; single scroll container |
| Privacy | `components/orb-residential/orb-privacy-data-settings-section.tsx` | Settings → Privacy & data; plus menu → Privacy & responsibility |
| Voice | `components/orb-standalone/orb-voice-station.tsx` | Shared `OrbVoiceStationContent` + desktop split panel |
| Dictate | `components/orb-standalone/orb-dictate-station.tsx` | Mobile-first polish; desktop uses same station |
| ORB Write | `components/orb-write/orb-write-standalone-panel.tsx` | Converged handoff from chat/voice/dictate |
| Documents / search / saved | `orb-document-panel`, `orb-knowledge-library`, `orb-saved-outputs-panel` | Desktop panels via sidebar/tools |

## Composer structure comparison

| Mobile residential | Desktop residential (target language) |
|--------------------|---------------------------------------|
| Plus (sheet) · input · waveform/send | Plus menu · input · mic/send (quick actions row optional) |
| No shield in rail | No shield in rail (privacy in settings + plus) |
| Inline speech with Dictate fallback | Mic opens Voice/Dictate; inline speech optional on narrow desktop |

## Shared tokens already converged

- `app/orb/orb-liquid-glass.css` — glass surfaces, composer, panels
- `app/orb/orb-premium-tokens.css` — living sphere, presence sizes
- `components/orb-residential/ui/orb-presence.tsx` — single ORB visual source
- `app/orb/orb-desktop.css` — residential empty-state ORB sizing

## Quick wins (safe, next pass)

1. **Composer parity** — Show desktop residential the same `orb-liquid-composer` row concept (action rail · input · send/voice) without duplicating mobile sheet logic.
2. **Plus menu labels** — Already shared via `ORB_COMPOSER_UPLOAD_PLUS_ACTIONS`; verify desktop dropdown order matches mobile sheet: Camera, Photos, Files, Tools.
3. **Settings / privacy** — Extend `orb-liquid-panel` and grouped rows to any desktop modals still using flat borders.
4. **ORB hero sizing** — Desktop empty home already uses larger `--orb-presence-size`; apply same aura tokens from liquid glass pass to voice/dictate desktop heroes.
5. **Voice failure copy** — Desktop now receives calm speech-notice subline; verify in wide layout it stays subordinate to headline.
6. **Private compute copy** — Surface `safePublicCopy` from `lib/orb/orb-private-compute-framework.ts` in Privacy & data (truthful, no Apple PCC claims).

## Regressions to avoid

- Do not reintroduce `OrbResidentialPrivacyGuidanceIcon` in composer action rail.
- Do not add a second plus menu or duplicate voice/dictate entry points.
- Do not hide desktop document/tools actions that mobile routes through the plus sheet.
- Preserve Render-safe build (`scripts/render-safe-next-build.mjs`).

## Not in scope yet

- Full desktop sidebar redesign
- Separate desktop-only voice/dictate/privacy systems
- Claiming on-device-only ORB brain or Apple Private Cloud Compute equivalence
