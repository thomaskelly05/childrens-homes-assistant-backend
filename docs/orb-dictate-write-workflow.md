# ORB Dictate → ORB Write Workflow

## Overview

ORB Dictate captures and structures a session. ORB Write lets the adult review, edit, finalise, print and export. The adult remains responsible for the final record.

## Flow

1. **Open ORB Dictate** — sidebar Apps, composer mic, or `?station=dictate` deep link.
2. **Select template** — visible in the top bar (General Dictation, Daily Record, Incident, etc.).
3. **Record or paste** — live transcript in the left panel; editable before finalising.
4. **Brain analysis** — right panel uses `/orb/dictate/analyze` and `/orb/dictate/generate` via existing IndiCare Intelligence.
5. **Generate notes** — creates draft professional wording; suggestions require Accept/Reject/Apply.
6. **Suggested outputs** — one transcript can generate multiple output types.
7. **Open in ORB Write** — `/orb/dictate/finalise` prepares structured document; session handoff via `sessionStorage`.
8. **Edit in ORB Write** — rich text editor, AI panel (`/orb/dictate/edit`), print, PDF export, save draft.

## Files

| Area | Key files |
|------|-----------|
| Dictate studio | `orb-dictate-station.tsx`, `OrbDictateStudioWorkspace.tsx`, `OrbDictateTopBar.tsx` |
| Panels | `OrbTranscriptPanel.tsx`, `OrbDictateBrainPanel.tsx`, `orb-resizable-workspace.tsx` |
| ORB Write | `orb-write-station.tsx`, `orb-write-editor.tsx`, `orb-write-ai-panel.tsx` |
| Handoff | `orb-write-handoff.ts` |
| Export | `orb-write-export.ts`, `ai_note_export_service.py` |

## Routes preserved

All existing `/orb/dictate/*` routes remain. New draft-only routes: `POST /analyze`, `POST /finalise`.

## Limitations

- No live IndiCare OS child record submission from Dictate or Write.
- No child profile storage or selection in Dictate.
- No biometric voice identification.
- ORB Write version history is session-local in this pass.
- Collaboration and OS document storage are out of scope.
