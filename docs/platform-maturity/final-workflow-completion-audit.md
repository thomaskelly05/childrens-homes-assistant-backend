# Final workflow completion audit

Date: 2026-05-17  
Scope: core demo workflows, Document OS templates, search, chronology, evidence, inspection readiness and ORB/assistant context.  
Positioning: operational evidence mapping for residential children's homes; not legal advice.

## Executive summary

IndiCare OS now has a real editable Document OS template registry for core residential children's home records. The strongest end-to-end workflow remains the Next.js child recording workspace plus `/api/document-system` editable documents. Daily notes, incidents, health, key work and family/professional contact have typed backend save paths. Safeguarding and missing episodes are demo-usable through incident transport with typed incident categories, but first-class safeguarding/missing routers remain a product risk. Education has backend support and a new Document OS template, but no first-class guided education recording page equivalent to daily notes.

## Workflow audit matrix

| Workflow | Exists | Route exists | Frontend exists | Create/save/reopen | Edit supported | Chronology updates | Evidence links | Operational memory/replay | Search | Review/sign-off | Mobile usable | Console clean | Remaining risk |
|---|---:|---:|---:|---|---|---|---|---|---|---|---|---|---|
| Daily note | Yes | `/young-people/{id}/daily-notes` | `frontend-next` child journey | Supported via recording workspace | Patch/submit/approve routes exist | Service/linking path present | Via document/evidence links where attached | Covered by operational record transport tests | Command/search and list surfaces | Submit/approve routes exist | Uses responsive Next shell | Needs browser run with seeded child | Needs live child data for final demo proof |
| Incident | Yes | `/young-people/{id}/incidents` | `frontend-next` child journey | Supported via recording workspace | Patch/submit/approve routes exist | Service/linking path present | Incident evidence links available | Covered by operational intelligence paths | Command/search and incident lists | Submit/approve routes exist | Responsive shell | Needs browser run | Significant incident review should be manager-sampled in demo |
| Safeguarding record | Partial | Transported as incident category `safeguarding_concern` | `frontend-next` safeguarding workflow | Create/save through incident transport | Incident edit route | Chronology via incident/linking path | New Safeguarding Concern template supports evidence links | Operational memory sees incidents/chronology | Search by category/template | Document review/sign-off supported | Responsive shell | Needs browser run | Dedicated safeguarding flag router is not mounted; do not claim first-class typed CRUD |
| Missing episode | Partial | Transported as incident category `missing_from_placement`; workspace aliases exist | `frontend-next` missing workflow | Create/save through incident transport | Incident edit route | Chronology via incident/linking path | New missing episode/RHI/risk templates support links | Missing pattern services expect missing episode shapes | Search by missing/template | Document review/sign-off supported | Responsive shell | Needs browser run | Split model between incidents and missing episode tables |
| Return home interview | Partial | No dedicated young-person route | New Document OS template | Create/save/reopen as document | Document edit supported | Linkable chronology appendix | Linkable evidence | Searchable document | Template/document search | Document review/sign-off supported | Responsive editor | Needs browser run | Not a first-class record transport yet |
| Health record | Yes | `/young-people/{id}/health-records` | `frontend-next` health workflow | Supported via recording workspace | Health patch routes exist | Linking service pattern | New health templates support links | Operational memory via records/chronology | Command/search | Document review for health documents | Responsive shell | Needs browser run | Medication concern is stronger as document than typed health subworkflow |
| Education record | Partial | `/young-people/{id}/education-records` | No first-class child journey workflow | Backend supports records; Document OS template supports updates | Education patch/profile routes | Linking service on create | Document template evidence links | Operational memory through chronology if projected | Template/document search | Document review/sign-off supported | Responsive document editor | Needs browser run | Do not demo standalone education creation unless using Document OS |
| Key work session | Yes | `/young-people/{id}/keywork` | `frontend-next` keywork workflow | Supported via recording workspace and document template | Keywork patch/review routes exist | Linking service pattern | Key Work Session template links evidence | Operational intelligence sees keywork | Command/search | Document review/sign-off supported | Responsive shell | Needs browser run | Prefer Document OS key work for therapeutic demo depth |
| Behaviour support | Partial | Plan/workspace support; no dedicated child journey route | Daily note fields + new templates | Document workflow supported | Document edit supported | Linkable chronology | Linkable evidence | Operational intelligence via plans/records | Template/document search | Document review/sign-off supported | Responsive editor | Needs browser run | No dedicated browser workflow outside Document OS |
| Contact/professional communication | Yes | `/young-people/{id}/family/records`; professional as Document OS | Family contact workflow exists | Family contact save supported | Family routes exist | Linking service pattern | Family/professional templates link evidence | Operational memory via records | Search by family/professional templates | Document review supported | Responsive shell | Needs browser run | Professional contact is document-led, not a separate typed communication router |
| Document/template record | Yes | `/api/document-system/*`, `/api/document-os/templates` | Documents pages/editor/templates | Create, save, reopen, autosave supported | Patch supported | Link endpoint supports chronology | Link endpoint supports evidence | Searchable through documents and operational memory evidence | Template query and document query supported | Review/signature routes supported | Responsive editor | Typecheck/build required | Multiple legacy document stacks still exist; use `/api/document-system` in demo |
| Care plans | Yes | Document OS | Documents editor | Create/save/reopen as Care Plan Review | Edit supported | Linkable chronology | Linkable evidence | Searchable document | Search supported | Review/sign-off supported | Responsive editor | Needs browser run | Care planning is document-led in demo |
| Risk assessments | Yes | Document OS | Documents editor | Create/save/reopen as Risk Assessment Review | Edit supported | Linkable chronology | Linkable evidence | Searchable document | Search supported | Review/sign-off supported | Responsive editor | Needs browser run | Dedicated risk-assessment page may still be demo-data-backed |
| Chronology | Yes | `/young-people/{id}/timeline`, `/api/operational-memory/chronology` | Chronology pages | Read/projection supported | Not an editor | Core purpose | Evidence graph connects | Operational memory route exists | Search/filter surfaces | Not applicable | Responsive pages | Needs browser run | Some projections depend on record/linking services being invoked |
| Evidence linking | Yes | `/api/document-system/documents/{id}/links`, evidence graph routes | Evidence/doc panels | Link create supported | Link list via document payload | Chronology link type allowed | Evidence link type allowed | Evidence traversal exists | Search surfaces partial | Review/sign-off consumes evidence | Responsive panels | Needs browser run | `/evidence/record/*` remains illustrative/static |
| Inspection readiness | Yes | `/inspection`, `/inspection-os`, Annex A services | Ofsted readiness/documents regulatory pages | Snapshot/readiness routes exist | Document actions supported | Links to chronology/evidence | Reg 44/45/Annex A templates | Operational memory/inspection services | Search by regulatory templates | Review/sign-off supported | Responsive pages | Needs browser run | Readiness can be under-populated without live evidence |
| ORB/assistant context | Yes | `/orb`, `/assistant/os`, child context routes | ORB/assistant pages | Operational question flow exists | Not a record editor | Context consumes chronology where available | Assistant boundary blocks standalone document access | Replay/summary routes exist | Search/assistant surfaces | Human-in-control copy | Responsive shell | Needs browser run | Do not present ORB as autonomous decision-maker |

## Browser proof status

The repository contains browser routes for the requested workflows, and automated browser-contract tests now assert that the Next.js workflow definitions and recording transport include daily note, incident, safeguarding, missing, health, key work, family contact and documents. Full manual browser proof still requires a running backend with live child/home records and valid authenticated session cookies.

## Workflows fixed in this sprint

- Document template registry changed from generic repeated structures to distinct residential children's home templates.
- `/api/document-os/templates` now exposes the real editable template catalogue with sections, fields, mapping and draft blank-document payloads.
- `/api/document-system/templates` supports `query`/`q` search.
- `/api/document-system/documents` supports `query`/`q` search across title, template, status, sections, metadata and links.
- The Next.js template grid now has client-side search and opens templates into the live editor.

## Templates created

Daily Note; Incident Report; Safeguarding Concern; Missing From Care Episode; Return Home Interview; Key Work Session; Behaviour Support Reflection; Physical Intervention / Restraint Review; Sanction / Consequence Review; Bullying Concern; Child Voice Record; Family Contact Record; Professional Contact Record; Health Appointment Record; Medication Concern / Health Follow-up; Education Update; Care Plan Review; Risk Assessment Review; Placement Plan Update; Individual Behaviour Support Plan; Missing Risk Assessment; Internet/Social Media Safety Plan; Reg 44 Evidence Note; Reg 45 Review Evidence Note; Annex A Evidence Summary; Manager Oversight Note; Staff Supervision Record; Staff Reflective Practice Note; Safer Recruitment Checklist; Training/Competency Review. `Statement of Purpose` is retained for existing home-document entry points.

## Regulatory mapping result

Every new template maps to at least one Quality Standard area, at least one SCCIF area, and one or more operational regulation references from Regulations 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 35, 40, 44 and 45 as relevant. The mapping is presented as operational evidence mapping, not legal advice.

## Therapeutic language audit result

Template tests now reject punitive phrases including "bad behaviour", "non-compliant", "attention seeking", "refused", "kicked off" and "manipulative". Child templates include child voice prompts and therapeutic guidance to write with curiosity, describe behaviour as communication, separate facts from reflection and record repair/follow-up.

## Remaining demo risks

- Safeguarding and missing workflows are transported through incident categories rather than first-class typed routers.
- Education is strongest through Document OS and backend APIs, not a first-class child journey workflow.
- Evidence route `/evidence/record/*` is illustrative; use document links and operational memory/evidence graph in the demo.
- Legacy document stacks remain; keep the client demo on `frontend-next` and `/api/document-system`.
- Manual browser proof is still dependent on a live local auth/database setup.

## What not to demo

- Do not demo legacy `frontend` document shells as the primary product experience.
- Do not claim ORB makes decisions or auto-finalises records.
- Do not claim first-class standalone safeguarding/missing CRUD until dedicated routers replace incident transport.
- Do not demo standalone education creation except through the new Education Update template or backend-supported surface.
