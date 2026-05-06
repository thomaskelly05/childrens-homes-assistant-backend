# IndiCare Production System Audit

## Purpose

This audit resets IndiCare around one production operating model:

**Click -> Write -> IndiCare AI improves -> Submit for approval -> Manager reviews/comments -> Approve/archive -> Retrieve/view again.**

Everything in the platform should serve that lifecycle across children, staff, home, provider, safeguarding, documents, chronology, reporting and inspection evidence.

---

## 1. Current state summary

IndiCare has strong foundations but has grown through multiple experimental layers. The product now needs consolidation into one coherent operating system.

### Strong foundations already present

- A workspace route exists for child-centred recording.
- A schema-aware `WorkspaceRecordsService` already abstracts daily, incident, safeguarding and missing records.
- The service already contains internal review logic.
- A real young people selector/data endpoint exists.
- A canonical blue visual direction has started through `indicare-blue-os.css`.
- Legacy CSS layers have started to be removed.
- The child workspace, memory stream, life model and Copilot direction are conceptually strong.

### Main issue

The system still has several partially implemented concepts rather than one complete production lifecycle.

---

## 2. Frontend architecture audit

### Current issue

The frontend previously loaded many competing stylesheets and scripts. This created visual instability, duplicated navigation, old green styling and inconsistent layouts.

### Already improved

The workspace now loads the canonical blue OS styling direction:

- `frontend/css/indicare-blue-os.css`

Legacy/superseded CSS files removed:

- `workspace-enhancements.css`
- `workspace-redesign.css`
- `premium-care-os.css`
- `mobile-care-experience.css`
- `million-dollar-care-os.css`
- `native-mobile-recording.css`

### Remaining concern

`frontend/js/indicare-unified-os.js` is currently acting as a cleanup/enforcement layer. It removes legacy chrome and normalises buttons/cards. This is acceptable as a migration helper, but should not be the long-term architecture.

### Production recommendation

Move to:

- one shell HTML structure
- one CSS design system
- explicit component classes
- no auto-guessing button/card behaviour
- no hidden legacy nav logic
- no duplicate CSS systems

---

## 3. Record engine audit

### Current backend

`routers/workspace_records_routes.py` exposes:

- `GET /workspace-records/{record_type}`
- `POST /workspace-records/{record_type}`

`services/workspace_records_service.py` already includes:

- schema-aware table discovery
- list records
- create records
- review queue logic
- review record logic
- manager review/audit log insertion

### Critical gap

The backend route exposes only list/create. The service has review logic but it is not routed.

### Missing production endpoints

Needed:

- `GET /workspace-records/review/queue`
- `GET /workspace-records/{record_type}/{id}`
- `PATCH /workspace-records/{record_type}/{id}`
- `POST /workspace-records/{record_type}/{id}/ai-improve`
- `POST /workspace-records/{record_type}/{id}/submit`
- `POST /workspace-records/{record_type}/{id}/review`
- `POST /workspace-records/{record_type}/{id}/archive`
- `GET /workspace-records/{record_type}/{id}/versions`

### Production record states

All records should use one lifecycle:

- draft
- ai_improved
- submitted_for_review
- changes_requested
- approved
- archived

### Mandatory production principles

- All records editable before approval.
- Approved/archived records amendable only through audited amendment/version history.
- Manager comments must be first-class data, not just notes.
- Archive must not mean delete.
- All records must be retrievable forever unless lawfully removed.

---

## 4. Frontend recording audit

### Current frontend

`frontend/js/indicare-workspace/records-api-ui.js` supports:

- create record chooser
- create record modal
- submit to backend
- show record list
- open read-only record detail

### Critical gaps

The UI does not yet expose the full production flow:

- edit existing record
- save draft
- AI improve record
- show original vs improved wording
- submit for approval
- manager comment
- approve
- request changes
- archive
- view archived records
- version history

### Production recommendation

Replace current modal-centred flow with a universal record workspace:

1. Record type selected.
2. Staff writes naturally.
3. AI checks and improves.
4. Staff edits final version.
5. Submit for review.
6. Manager reviews with comments.
7. Approve/archive.
8. Record remains searchable/viewable with full history.

---

## 5. Child documents audit

### Current frontend

`child-digital-file.js` provides a visual catalogue of core documents such as:

- Placement Plan
- Care Plan
- Risk Assessment
- Behaviour Support Plan
- Missing From Care Plan
- Health Care Plan
- Personal Education Plan
- Communication Profile
- Sensory Profile
- Life Story / Identity

### Critical gap

These are not yet true editable live documents. The current approach opens a record modal for a document update, but does not provide:

- document body editing
- inline writing
- comments
- version history
- approval workflow
- AI assistance
- archived versions
- linked records/actions

### Production recommendation

Create one `child_documents` architecture where every document is a live editable surface.

Required endpoints:

- `GET /child-documents?young_person_id=`
- `GET /child-documents/{id}`
- `POST /child-documents`
- `PATCH /child-documents/{id}`
- `POST /child-documents/{id}/ai-improve`
- `POST /child-documents/{id}/submit`
- `POST /child-documents/{id}/review`
- `POST /child-documents/{id}/archive`
- `GET /child-documents/{id}/versions`
- `POST /child-documents/{id}/comments`

### Required document lifecycle

- draft
- ai_improved
- submitted_for_review
- changes_requested
- approved
- archived
- superseded

---

## 6. AI/Copilot audit

### Current direction

The Copilot direction is correct: one chat-style assistant that pulls together context and creates useful answers/templates.

### Production issue

AI must move from isolated frontend generated text into workflow actions.

### Required AI actions

For records:

- improve professional wording
- identify missing child voice
- identify missing adult response
- identify safeguarding relevance
- suggest follow-up actions
- improve reflective analysis
- produce manager summary

For documents:

- suggest plan amendments from chronology
- rewrite professional sections
- identify outdated content
- link evidence from recent records
- generate review summaries

For managers:

- review quality
- create approval comments
- identify weak records
- create coaching feedback

---

## 7. Chronology and memory stream audit

### Current state

The therapeutic memory stream is directionally strong. It links records into a child journey.

### Production requirement

All records and documents must feed one chronology engine.

Chronology should include:

- daily life
- incidents
- missing episodes
- safeguarding
- direct work
- achievements
- health
- education
- family contact
- document changes
- manager comments
- approvals
- plan updates

---

## 8. Governance and audit audit

### Current state

The records service can write to review/audit tables if a compatible table exists.

### Critical production requirement

Audit must be explicit, consistent and non-optional.

Every major action must create an audit event:

- created
- edited
- AI improved
- submitted
- returned
- manager commented
- approved
- archived
- amended
- document edited
- document approved

---

## 9. Production build order

### Phase 1: Core record lifecycle

Build one universal record engine fully:

- backend endpoints
- frontend editor
- AI improve button
- submit for approval
- manager review queue
- comments
- approve/request changes/archive
- view archived
- version history

### Phase 2: Editable child documents

Build live document editor:

- editable child documents
- AI improve
- comments
- approval workflow
- versions
- archive/supersede

### Phase 3: Unified chronology

Feed every approved record/document action into one memory stream.

### Phase 4: Manager/governance workspace

Create manager review hub around records/documents/actions.

### Phase 5: Inspection evidence

Auto-map approved records, documents and manager oversight into inspection readiness.

---

## 10. Immediate next engineering actions

1. Expose missing backend review/update/archive endpoints for workspace records.
2. Refactor `records-api-ui.js` into the universal record lifecycle UI.
3. Add editable record detail view.
4. Add manager review queue UI.
5. Add archive visibility toggle.
6. Create child document backend and editor architecture.
7. Remove remaining placeholder child fallbacks.
8. Gradually retire transitional `indicare-unified-os.js` normalisation once templates use canonical classes directly.

---

## Final product rule

If a feature does not support the core lifecycle below, it should be removed, hidden or redesigned:

**Click -> Write -> IndiCare AI improves -> Submit for approval -> Manager reviews/comments -> Approve/archive -> Retrieve/view again.**
