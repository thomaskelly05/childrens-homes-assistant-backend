# ORB Write Word Processor

Date: 2026-06-05

## Purpose

ORB Write is ORB Residential's document studio for governed residential records — not live OS record saving. Adults draft, review, and export; ORB suggests improvements through the governed edit path.

## Editor

- **Implementation:** `contentEditable` div in `orb-write-editor.tsx`
- **Fallback:** Plain text with `<br/>` line breaks when no HTML present
- **Sanitisation:** `sanitizeOrbWriteHtml()` strips script/iframe/on* handlers before sync

## Document canvas

- Centred A4-style page (`210mm` × `min-height: 297mm`)
- White page, soft shadow, visible margins
- Title, record type badge, date/time at top
- Adult review statement and export footer at bottom
- Print/export excludes toolbar, zoom, AI panel, guidance panel

## Toolbar controls

| Control | data attribute |
|---------|----------------|
| Undo / Redo | `data-orb-write-undo`, `data-orb-write-redo` |
| Paragraph style dropdown | `data-orb-write-block-style` |
| Bold / Italic / Underline | `data-orb-write-bold`, etc. |
| Bullet / Numbered list | `data-orb-write-bullet`, `data-orb-write-numbered` |
| Quote / Divider | `data-orb-write-quote`, `data-orb-write-divider` |
| Table | `data-orb-write-table` |
| Align left | `data-orb-write-align-left` |
| Clear formatting | `data-orb-write-clear-format` |
| Word count / Last edited | `data-orb-write-word-count`, `data-orb-write-last-edited` |
| Zoom | `data-orb-write-zoom-controls` |
| Copy / Print / PDF | `data-orb-write-copy`, `data-orb-write-print`, `data-orb-write-export-pdf` |
| Save draft | `data-orb-write-save-draft` |
| Approve / Finalise | `data-orb-write-approve` |

## Zoom

Levels: 75%, 90%, 100%, 110%, 125%, 150%, Fit width.

Preference stored in `localStorage` key `orb-write-zoom-v1`. Zoom applies to `data-orb-write-document-canvas` only.

## ORB guidance panel

Actions route through `POST /orb/dictate/edit` via `editOrbDictateDocument()`:

- Make more child-centred
- Improve grammar
- Check safeguarding gaps
- Check Ofsted readiness
- What am I missing?
- Create chronology entry
- Create manager summary
- Prepare for PDF

**Rules:** ORB suggests; adult accepts/rejects/applies. Version history records applied changes in the standalone panel state. No silent submission. No internal metadata visible.

## Handoffs preserved

- Dictate → Write: `orb-write-session-handoff-v1` in sessionStorage
- Templates → Write: `orb-write-template-handoff`
- PDF export: `lib/orb/write/orb-write-export.ts`
- Local draft: `orb-write-local-draft-v1`

## Privacy

- No child profile selector in standalone ORB Write
- Adult review statement required on every document
- Export footer: "Generated with ORB Residential, powered by IndiCare Intelligence"
