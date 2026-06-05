# ORB Dictate Studio — Premium UI Polish

Audit and implementation notes for the ORB Dictate + ORB Write convergence studio workspace.

## Audit summary (before polish)

| Area | Finding |
|------|---------|
| **Layout** | Top bar stacked title, crowded chip row, large privacy box, and panel presets consumed vertical space before transcript/brain panels. |
| **Record control** | Duplicate Record buttons in top bar and transcript panel; hero action lacked visual weight. |
| **Generate / Write states** | Static “Generate notes” label; ORB Write enabled only by output but not clearly explained. |
| **Templates** | All nine templates rendered as equal chips in a wrapping row — cluttered on laptop widths. |
| **Privacy** | Full GDPR copy always visible in a large box above panels. |
| **Brain panel** | Empty state was a single line; no preview of analysis dimensions before running. |
| **Suggested outputs** | Only shown in preview panel after generation — easy to miss. |
| **Focus mode** | Not present for Dictate; shell sidebar collapse API exists (`writeOrbSidebarCollapsed`) but Dictate runs in workspace frame. |
| **Advanced options** | Already in `<details>` — kept, with clearer `data-orb-dictate-advanced-options` marker. |

## UI changes made

### Part 1 — Studio layout

- Workspace uses `min-height: min(100dvh - 7rem, 100svh - 7rem)` so panels dominate on standard laptop viewports.
- Sticky top bar within the Dictate workspace (`position: sticky` on header).
- Panel layout presets moved into collapsed “Panel layout” details by default.
- Workspace body overflow constrained when studio is active (CSS `:has` rule).

### Part 2 — Top bar

- **ORB Dictate** title + current template subtitle.
- Recording status pill with pulse indicator and tabular timer.
- **Hero Record** button (`orb-dictate-hero-record`) — large gradient CTA; active recording shows pulsing red state with timer.
- Contextual primary action:
  - No transcript → disabled, tooltip “Record or paste a transcript first”.
  - Transcript, no analysis → **Analyse with ORB**.
  - Analysis complete → **Generate draft**.
- **Open in ORB Write** disabled until draft (`output`) exists, with explanatory `title`.

### Part 3 — Template selector

- Extracted `OrbDictateTemplateSelector` with horizontal scroll and pill styling.
- Selected template uses stronger border/background.
- All nine required templates retained.

### Part 4 — Privacy trust strip

- Extracted `OrbDictatePrivacyStrip`: compact line  
  `Session-only transcript · No child profile stored · Adult review required`
- **View privacy detail** expands full ORB_WRITE privacy and safety copy (progressive disclosure).

### Part 5 — Panels

- **Transcript**: clearer empty state, larger editor, duplicate record row removed (record lives in top bar), subtle speaker guidance.
- **Brain**: placeholder chips before analysis; analysis sections in cards; Accept/Reject/Apply unchanged; no internal metadata labels.

### Part 6 — Suggested outputs rail

- Bottom action rail (`data-orb-dictate-action-rail`) when transcript exists.
- Horizontal scroll rail variant with draft-only language.

### Part 7 — Focus mode

- Toggle in top bar (`data-orb-dictate-focus-mode`).
- Persists to `localStorage` key `orb-dictate-focus-mode-v1`.
- On enable, calls `writeOrbSidebarCollapsed(true)` (best-effort shell sidebar collapse).
- CSS hides advanced options and panel presets in focus mode.

**Blocker documented:** Dictate opens inside `OrbWorkspaceFrame`, not the raw chat shell. Shell sidebar collapse depends on the parent `OrbCareCompanion` reading `orb-sidebar-collapsed` from localStorage on next navigation/render — not guaranteed synchronously from within the Dictate panel. Focus mode therefore also maximises in-panel width via `data-orb-dictate-focus-mode="true"`.

### Part 8 — Laptop responsiveness

- `dvh` / `svh` min-heights for workspace and panel stack.
- Primary actions remain in sticky top bar (not below fold).
- Advanced options and panel presets collapsed by default.

### Part 9 — ORB Write entry

- Disabled styling + tooltip until `output` (draft) exists.
- Prominent primary button styling when enabled.

## Files changed

| File | Change |
|------|--------|
| `components/orb/dictate/OrbDictateTopBar.tsx` | Redesigned hierarchy, hero record, contextual actions |
| `components/orb/dictate/OrbDictateStudioWorkspace.tsx` | Focus mode, action rail, analyse/generate flow |
| `components/orb/dictate/OrbTranscriptPanel.tsx` | Premium panel, empty state, no duplicate record |
| `components/orb/dictate/OrbDictateBrainPanel.tsx` | Placeholder chips, card layout |
| `components/orb/dictate/OrbDictateSuggestedOutputs.tsx` | Rail variant |
| `components/orb/dictate/OrbDictatePrivacyStrip.tsx` | **New** — compact trust strip |
| `components/orb/dictate/OrbDictateTemplateSelector.tsx` | **New** — scrollable templates |
| `components/orb/resizable-panels/orb-resizable-workspace.tsx` | Compact presets, svh min-height |
| `lib/orb/dictate/orb-dictate-focus-mode.ts` | **New** — focus preference |
| `app/orb/orb-premium-tokens.css` | Studio polish tokens |
| `components/orb/dictate/orb-dictate-studio-premium-polish.test.ts` | **New** tests |
| `components/orb-standalone/orb-dictate-write-convergence.test.ts` | Updated privacy strip assertions |

## Tests

Run:

```bash
cd frontend-next
node --experimental-strip-types --test components/orb/dictate/orb-dictate-studio-premium-polish.test.ts
node --experimental-strip-types --test components/orb-standalone/orb-dictate-write-convergence.test.ts
```

## Remaining limitations

1. Shell sidebar collapse from Dictate focus mode is best-effort via localStorage — may require leaving/re-entering workspace for full shell effect.
2. Auto brain analysis on transcript debounce was replaced by explicit **Analyse with ORB** click (clearer adult workflow).
3. `:has()` CSS for workspace body overflow requires modern browsers (Safari 15.4+).
4. Very short transcripts (&lt; 20 chars) can still be analysed manually via the Analyse button.

## Routes preserved

No changes to `/orb/dictate/generate`, `/orb/dictate/analyze`, `/orb/dictate/finalise`, ORB Write handoff, voice, chat, templates, billing, or login flows.
