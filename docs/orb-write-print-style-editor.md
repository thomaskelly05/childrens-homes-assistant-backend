# ORB Write Print-Style Editor

## Layout

- Neutral workspace background (`#e8eaed`) surrounds the document.
- Centred A4 page (`210mm` × `min-height: 297mm`) with white surface and shadow.
- Visible margins via page padding (`20mm` horizontal, `18mm` vertical).
- Document chrome only — no toolbar or side panel inside the page.

## On-page content

| Element | `data-*` attribute |
|---------|-------------------|
| Title | `data-orb-write-page-title` |
| Record type badge | `data-orb-write-record-type-badge` |
| Date/time | `data-orb-write-datetime` |
| Editable body | `data-orb-write-body` |
| Adult review statement | `data-orb-write-review-notice` |
| Export footer | `data-orb-write-export-footer` |

Footer text: *Generated with ORB Residential, powered by IndiCare Intelligence*

## Zoom controls

| Control | Attribute |
|---------|-----------|
| Zoom out | `data-orb-write-zoom-out` |
| Percentage | `data-orb-write-zoom-percent` |
| Zoom in | `data-orb-write-zoom-in` |
| Fit width | `data-orb-write-zoom-fit-width` |
| 100% | `data-orb-write-zoom-100` |

Levels: 75%, 90%, 100%, 110%, 125%, 150%.  
Preference stored in `localStorage` key `orb-write-zoom-v1`.  
Zoom applies to `data-orb-write-document-canvas` only.

## PDF and print alignment

- `buildOrbWritePrintHtml` mirrors on-page structure (title, badge, date, body, review, footer).
- `exportOrbWritePdf` uses `/orb/dictate/export` with the same body + review + footer.
- Browser print opens a print-only window without toolbar/panels.

## Toolbar (outside page)

Undo, redo, heading, bold, italic, lists, table, word count, last edited, zoom, copy, print, export PDF, save draft, approve.
