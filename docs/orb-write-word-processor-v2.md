# ORB Write Word Processor v2

## Overview

ORB Write is ORB Residential's professional document editor. v2 upgrades the layout from a flat form into a **three-column document studio** while preserving all existing generation, handoff, export and governance behaviour.

## Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Toolbar: undo/redo, styles, lists, zoom, copy, print, export │
├──────────┬──────────────────────────────┬───────────────────┤
│ Source   │ Document canvas (A4)         │ ORB assistant     │
│ panel    │ print-style editable page    │ guidance + actions│
│          │                              │                   │
│ Dictate  │ Title, record type badge     │ Check safeguarding│
│ template │ contenteditable body         │ Improve grammar   │
│ rough    │ adult review statement       │ Prepare PDF       │
│ notes    │ export footer (print only)   │ Check vs guidance │
└──────────┴──────────────────────────────┴───────────────────┘
```

## Start screen

When opened directly:

- `OrbStudioHero` welcome band
- Quick-start option chips (paste, template, draft, dictate)
- Record type selector + rough notes composer card
- `OrbStudioActionRail`: Analyse with ORB → Generate draft

When opened from Dictate or Template:

- Skips start screen; loads document canvas with handoff content
- Source panel shows origin (Dictate transcript, template structure)

## Document canvas

- A4-centred white paper (`210mm`), visible margins, paper shadow
- Record title, record type badge, date/time
- `contentEditable` body with HTML sanitisation (`sanitizeOrbWriteHtml`)
- Adult review statement in footer
- "Generated with ORB Residential, powered by IndiCare Intelligence" — **hidden from toolbar, shown in print/export footer only**

## Toolbar

| Control | data attribute |
|---------|----------------|
| Undo / Redo | `data-orb-write-undo`, `data-orb-write-redo` |
| Paragraph / headings | `data-orb-write-block-style`, `data-orb-write-h1`, `data-orb-write-h2` |
| Bold / Italic / Underline | `data-orb-write-bold`, etc. |
| Lists, quote, divider, table | `data-orb-write-bullet`, `data-orb-write-quote`, etc. |
| Clear formatting | `data-orb-write-clear-format` |
| Word count | `data-orb-write-word-count` |
| Zoom | `data-orb-write-zoom-controls` |
| Copy / Print / PDF | `data-orb-write-export-pdf`, `data-orb-write-print` |
| Save draft / Approve | `data-orb-write-save-draft`, `data-orb-write-approve` |

## ORB assistant panel

Uses existing governed edit route (`editOrbDictateDocument`) — **no new brain**.

Actions (child-centred, no blame language):

- Check safeguarding gaps
- Check Ofsted readiness
- Improve grammar
- Create chronology entry
- Create manager summary
- What am I missing?
- Prepare PDF
- Check against selected guidance

Adult must accept/reject/apply suggestions — no silent submission. Version history recorded on apply.

## Handoffs preserved

| Source | Mechanism |
|--------|-----------|
| Dictate | `loadOrbWriteHandoff()` → `handoffToOrbWriteDocument()` |
| Template | `loadOrbWriteTemplateHandoff()` → blank structured document |
| Saved draft | `loadOrbWriteLocalDraft()` |

## Known limitations

- Rich text via `contentEditable` + `execCommand` (browser-dependent)
- Basic HTML table insert only
- Zoom scales canvas via CSS `transform` (toolbar does not scale)
- Mobile: columns stack vertically

## Tests

- `frontend-next/components/orb-write/orb-write-word-processor.test.ts` (v1 contracts)
- `frontend-next/components/orb-write/orb-write-word-processor-v2.test.ts` (v2 studio layout)
