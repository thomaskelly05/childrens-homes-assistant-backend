# ORB Write — Recording Framework

## Handoff from Dictate

`finalise_dictate_document` applies framework headings when adult edits do not already include `##` sections.

`OrbWriteHandoffPayload` includes `record_type_id`. `handoffToOrbWriteDocument()` structures body via `structureOrbWriteDocumentBody()`.

## Write station UI

- Document title from framework label
- Record type badge (`data-orb-write-record-type-badge`)
- Section chips for required headings; missing sections shown as amber chips
- Adult review statement preserved

## PDF / export

`orb-write-export.ts`:
- `formatBodyWithHeadings()` applies `pdf_heading_order` when body is unstructured
- Footer: “Generated with ORB Residential, powered by IndiCare Intelligence”
- No UI panels or internal brain metadata in export

## Limitations

- Section chips use simple text matching — not semantic parsing
- Formal OS document save not implemented
- User can still freely edit body; headings are prompts not enforced locks
