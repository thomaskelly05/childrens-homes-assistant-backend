# ORB Document Studio v3

## Behaviour

ORB Write opens as a **document studio** by default:

- **Header**: title, Analyse with ORB, Generate draft
- **Left**: source panel (rough notes, Dictate/template/draft shortcuts)
- **Centre**: A4 print-style canvas with toolbar (bold, zoom, export PDF, print, save, approve)
- **Right**: ORB brain analysis, guidance checker, AI revision actions
- **Footer**: word count, draft/finalised state, last edited

Empty state shows a structured blank document for the selected record type — not a standalone form screen.

## Handoffs

| Source | Mechanism |
|--------|-----------|
| Dictate | `orb-write-session-handoff-v1` |
| Templates | `orb-write-template-handoff-v1` |
| Chat / documents / saved | `orb-write-content-handoff-v1` via `handoffTextToOrbWrite()` |

## Safety

- HTML sanitised on save/export (`orb-write-sanitize.ts`)
- AI suggestions require adult apply — no silent submission
- Version history appended when ORB revisions are applied

## Routes preserved

All existing `/orb/dictate/*` and write helper paths unchanged.
