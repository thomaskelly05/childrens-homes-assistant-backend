# Templates & Documents — Recording Framework Convergence

## Templates page

`OrbRecordingLibraryCards` in `orb-templates-panel.tsx` shows clickable recording framework cards:

- Template name, category, purpose, when to use, ORB checks
- Actions: Start in Dictate, Open in ORB Write, Preview structure, Use with Document

Existing API prompt templates remain below as “Prompt templates”.

## Documents page

`orb-document-panel.tsx` adds:

- **Review against record type** — dropdown with suggested types from uploaded/pasted text
- Record type card with purpose and related outputs
- Uses `matchOrbRecordingTypesForDocument()` for policy-style uploads (e.g. Missing From Home policy → Missing From Home Record, Risk Assessment Update, etc.)

Existing document intelligence routes and AI governance are unchanged.

## Wiring actions

Parent ORB shell should handle `onRecordingAction` from templates panel:
- `dictate` — open Dictate with `studio_template_id` / `record_type_id`
- `write` — open ORB Write with empty structured document
- `document` — open Documents with record type pre-selected

(Station wiring depends on host app navigation — framework payloads are ready.)
