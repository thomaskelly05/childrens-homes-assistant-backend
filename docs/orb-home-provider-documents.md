# Home and provider documents

## Standalone ORB scope

Documents are **provider/home library items**, not child case records. No child profile fields are collected.

## Prototype storage

`orb-home-documents-store.ts` uses `localStorage` key `orb-home-documents-library-v1` until provider-scoped persistence is wired to `orb_knowledge_library_service` with `document_family: provider_policy`.

## Types

- Home policy
- Provider policy
- Local authority guidance / protocol
- Useful link
- Uploaded document (register + paste; full file ingest via Analyse tab API)

## Approval

- Default: **draft**
- **approved** — may be prioritised in grounding
- **needs_review** / **archived** — shown in UI; not cited as authoritative

## Examples

Missing From Home Policy, Safeguarding Policy, Physical Intervention Policy, Medication Policy, Complaints Policy, Statement of Purpose, LA Missing Protocol, LADO Guidance, Reg 44 Report, Reg 45 Review.

## Blocker for production

Team-wide home document storage requires provider/home_id on knowledge sources and RBAC — use Knowledge Library ingest API when available.
