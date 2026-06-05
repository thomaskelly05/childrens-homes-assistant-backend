# ORB Dictate Studio — Top Weight Reduction

## Audit summary (before)

The desktop Dictate studio stacked too many layers before the transcript/Brain workspace:

1. Workspace modal title + subtitle (`OrbWorkspaceFrame`)
2. Large `OrbDictateSelectedTemplateCard` (full width)
3. `OrbDictateTopBar` with duplicate “ORB Dictate” + template label
4. Full horizontal template chip row (9 templates)
5. Privacy strip inside the top bar
6. Collapsible “Panel layout” row above panels
7. Full-width “Advanced options” below panels

The selected template appeared in the modal header area, the large card, the top bar subtitle, and the chip row.

## Changes made

### Part 1 — Single studio stack

**Target order:**

1. Compact studio bar (`OrbDictateTopBar`)
2. Compact trust strip (`OrbDictatePrivacyStrip`)
3. Transcript + Brain panels (`OrbResizableWorkspace`)

Modal chrome uses `compactChrome` on desktop capture (back button only) so the workspace title is not duplicated.

### Part 2 — Template in top bar

- Removed `OrbDictateSelectedTemplateCard` from `OrbDictateStudioWorkspace`.
- `OrbDictateTemplateSelector` (`variant="compact"`): dropdown with all templates, one-line purpose, info button for `OrbDictateSelectedTemplateDetails` popover.

### Part 3 — Compact template selector

- Option A: dropdown lists all `ORB_DICTATE_STUDIO_TEMPLATES` (9 record types from the recording framework).
- `variant="chips"` retained for mobile/legacy if needed.

### Part 4 — Brain empty state

- `OrbDictateBrainPanel` shows selected record type, what ORB will check, suggested outputs, and **Analyse transcript with ORB** when a transcript exists.

### Part 5 — Layout controls

- `OrbDictatePanelLayoutControl` in the top bar (popover).
- `OrbResizableWorkspace` with `hidePresetToolbar` — no visible “Panel layout” row by default.
- Presets unchanged: 70/30, 50/50, 30/70, Transcript, Brain, Preview.

### Part 6 — Advanced options

- Moved into transcript panel footer via `footerSlot` (collapsed `<details>`).

### Part 7 — Panel height

- Workspace `minHeight`: `100dvh - 4.5rem` (was ~7rem offset).
- Panels: `min(74dvh, calc(100svh - 8.5rem))`.
- Transcript textarea: `min-h-[16rem]` / `18rem` on `sm+`.

### Part 8 — Mobile

- `compactChrome` only when `!isMobile`.
- Mobile continues to use `OrbDictateMobileExperience` (unchanged path).

## Files changed

| File | Change |
|------|--------|
| `OrbDictateTopBar.tsx` | Compact single row; template dropdown; layout control |
| `OrbDictateTemplateSelector.tsx` | Dropdown + details popover |
| `OrbDictateSelectedTemplateCard.tsx` | Split details component; card kept for tests/disclosure |
| `OrbDictatePanelLayoutControl.tsx` | **New** — layout preset popover |
| `OrbDictateStudioWorkspace.tsx` | Reordered stack; panel layout state; no large card |
| `OrbDictateBrainPanel.tsx` | Framework-aware empty state + analyse CTA |
| `OrbDictatePrivacyStrip.tsx` | Tighter padding |
| `OrbTranscriptPanel.tsx` | Taller editor; `footerSlot` for advanced options |
| `orb-resizable-workspace.tsx` | Controlled layout; `hidePresetToolbar`; taller panels |
| `orb-workspace-frame.tsx` | `compactChrome` header mode |
| `orb-app-modal.tsx` | Pass-through `compactChrome` |
| `orb-dictate-station.tsx` | Enable compact chrome on desktop capture |
| `orb-dictate-top-weight-reduction.test.ts` | **New** regression tests |
| `orb-dictate-studio-premium-polish.test.ts` | Updated expectations |
| `orb-dictate-write-convergence.test.ts` | Updated template visibility test |

## Tests

```bash
cd frontend-next && npm run typecheck
node --import tsx --test components/orb/dictate/orb-dictate-top-weight-reduction.test.ts
node --import tsx --test components/orb/dictate/orb-dictate-studio-premium-polish.test.ts
node --import tsx --test components/orb-standalone/orb-dictate-write-convergence.test.ts
```

## Remaining limitations

- Suggested outputs rail still appears below panels when a transcript exists (intentional; compact styling only).
- Workspace frame body remains scrollable; very small viewports may still need vertical scroll for the action rail.
- Legacy `OrbDictateSelectedTemplateCard` component remains in the codebase for progressive disclosure and source tests, not default UI.

## Preserved behaviour

- Recording framework and all 9 templates
- `/orb/dictate/generate`, `analyze`, `finalise` client flows (unchanged)
- ORB Write handoff (`data-orb-dictate-finalise`)
- Privacy/GDPR copy and expandable detail
- Mobile Dictate path
- No child profile selector; no internal brain metadata in UI
