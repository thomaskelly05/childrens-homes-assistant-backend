# ORB Write Standalone Studio — Audit

## Existing files reused

| Area | Files |
|------|-------|
| Document editor | `frontend-next/components/orb-write/orb-write-editor.tsx` |
| Toolbar + zoom | `frontend-next/components/orb-write/orb-write-toolbar.tsx`, `orb-write-zoom-controls.tsx` |
| AI side panel | `frontend-next/components/orb-write/orb-write-ai-panel.tsx` |
| Dictate handoff editor | `frontend-next/components/orb-write/orb-write-station.tsx` |
| Standalone workspace | `frontend-next/components/orb-write/orb-write-standalone-panel.tsx` |
| Start screen | `frontend-next/components/orb-write/orb-write-start-screen.tsx` |
| Types | `frontend-next/lib/orb/write/orb-write-types.ts` |
| Handoff | `frontend-next/lib/orb/write/orb-write-handoff.ts` |
| Export / print | `frontend-next/lib/orb/write/orb-write-export.ts` |
| Zoom preference | `frontend-next/lib/orb/write/orb-write-zoom.ts` |
| Local draft | `frontend-next/lib/orb/write/orb-write-standalone.ts` |
| Recording framework | `frontend-next/lib/orb/recording/orb-recording-framework.ts` |
| Brain analysis UI | `frontend-next/components/orb/dictate/OrbDictateBrainPanel.tsx` |
| Governed intelligence | `editOrbDictateDocument`, `analyzeOrbDictateSession`, `generateOrbDictateNote` |

## Routes preserved

| Route | Purpose |
|-------|---------|
| `POST /orb/dictate/analyze` | Standalone ORB Write analysis |
| `POST /orb/dictate/generate` | Draft generation |
| `POST /orb/dictate/finalise` | Dictate → Write handoff |
| `POST /orb/dictate/edit` | AI side panel revisions |
| `POST /orb/dictate/export` | PDF export |
| `POST /orb/dictate/save` | Save draft to Saved Outputs |

No new brain routes were added.

## Current handoff behaviour (unchanged)

1. Dictate **Open in ORB Write** calls `finaliseOrbDictateDocument`.
2. Payload saved to `sessionStorage` key `orb-write-session-handoff-v1`.
3. `OrbWriteStation` opens with `handoffToOrbWriteDocument`.
4. Standalone ORB Write also checks for handoff on open and loads the document.

## Menu item location

Added to `frontend-next/components/orb-residential/orb-residential-sidebar.tsx`:

- `DESKTOP_MAIN_NAV` — after Dictate, before Shift Builder
- `MOBILE_DRAWER_QUICK_NAV` — same order
- `NAV_ITEMS` — `orb_write` id

Panel id: `orb_write`  
Deep link: `/orb?station=write` or `/orb/write`

## Out of scope (must remain)

- Live IndiCare OS record saving
- Child profile selection
- New AI brain or internal metadata exposure
- Bypassing AIPrivacyDecision / audit paths
- Automatic persistence without adult save/export

## Saved draft behaviour

- **Primary:** `saveOrbDictateNote` → ORB Saved Outputs (existing route)
- **Fallback:** `localStorage` key `orb-write-local-draft-v1` when backend unavailable
- Source tagged `orb_write`; no child profile data stored
