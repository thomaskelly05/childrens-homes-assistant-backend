# ORB Handoff Convergence

## Problem

Three separate session-storage handoffs existed for ORB Write:

| Module | Storage key | Payload |
|---|---|---|
| `orb-write-content-handoff.ts` | `orb-write-content-handoff-v1` | Text/HTML from Chat, Documents, Saved Outputs |
| `orb-write-handoff.ts` | `orb-write-session-handoff-v1` | Full Dictate session (transcript, brain analysis, generate result) |
| `orb-write-template-handoff.ts` | `orb-write-template-handoff-v1` | Template record type selection |

## Solution

**`frontend-next/lib/orb/write/orb-write-converged-handoff.ts`** — unified entry point that delegates to existing modules. No new storage keys.

### API

| Function | Use |
|---|---|
| `convergedHandoffToOrbWrite(input)` | Text content from Chat, Documents, Saved Outputs |
| `convergedDictateSessionHandoff(payload)` | Dictate → Write (full session) |
| `convergedTemplateHandoff(recordType)` | Templates → Write |
| `buildSavedOutputWriteHandoff(record)` | Build payload from saved output record |
| `handoffSavedOutputToOrbWrite(record)` | Saved Outputs → Write |

### Input shape (`OrbWriteConvergedHandoffInput`)

- `source` — `chat` | `dictate` | `template` | `document` | `saved_output` | `unknown`
- `sourceLabel` — staff-facing label
- `title`, `content`
- `recordTypeId`, `suggestedOutputType`
- `documentId`, `guidanceId` (optional, from metadata)
- `timestamp`

### Surfaces wired

| Surface | Helper | Status |
|---|---|---|
| Chat → Write | `convergedHandoffToOrbWrite` via `openOrbWriteWithContent` | Updated |
| Dictate → Write | `saveOrbWriteHandoff` (via station) | Unchanged route |
| Templates → Write | `convergedTemplateHandoff` | Updated import |
| Documents → Write | `convergedHandoffToOrbWrite` | Via document panel callback |
| Saved Outputs → Write | `handoffSavedOutputToOrbWrite` | **Newly wired** |

### Load order in Write panel

`orb-write-standalone-panel.tsx` checks handoffs in order:

1. Content handoff
2. Dictate session handoff
3. Template handoff
4. Local draft

## Not changed

- Payload schemas and storage keys
- `contentHandoffToOrbWriteDocument`, `handoffToOrbWriteDocument` document builders
- Backend dictate finalise routes
