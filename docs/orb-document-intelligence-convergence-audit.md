# ORB Document Intelligence Convergence Audit

**Date:** 2026-05-29 · **Route:** `/orb` · **Canonical UI:** `OrbCareCompanion`

This audit maps existing document, extractor, and action-planner functionality and records what was converged into the standalone ORB Document Intelligence layer.

---

## 1. Existing document / extractor services found

| Service / module | Path | Scope | Notes |
|------------------|------|-------|-------|
| ORB document understanding | `services/orb_document_understanding_service.py` | Standalone | LLM + heuristics; modes explain/summarise/action_plan/lenses |
| ORB document ingestion | `services/orb_document_ingestion_service.py` | Standalone Knowledge Library | Upload/paste → chunks |
| **ORB document intelligence (new)** | `services/orb_document_intelligence_service.py` | Standalone | Unified lenses; wraps understanding + Reg 44 extraction |
| **Reg 44 document extraction (new)** | `services/orb_reg44_document_extraction.py` | Standalone | Heuristics ported from OS report reader |
| OS document intelligence | `services/document_intelligence_service.py` | IndiCare OS | Quality analysis on OS documents |
| Document OS core | `services/document_os_core.py` | OS | Evidence infrastructure |
| Document extraction | `services/document_extraction_service.py`, `document_extraction_pipeline.py` | OS uploads | Pipeline extraction |
| Universal document intelligence router | `backend/universal_document_intelligence_router.py` | OS API | `/api/...` analyse |
| Assistant action extraction | `assistant/action_extraction.py` | OS assistant | Tasks from OS evidence |
| Plan impact | `services/document_plan_impact_service.py` | OS | Plan linkage |
| ORB record-to-action | `services/orb_record_to_action_service.py` | Standalone text | Heuristic actions from notes |
| ORB action engine | `services/orb_action_engine_service.py` | Standalone | Response-bar structured actions |
| ORB deep research / agents | `services/orb_deep_research_service.py`, `orb_agent_orchestrator_service.py` | Standalone | Document-aware agents |

---

## 2. Reg 44 extractor / action planner found

| Component | Path | Standalone? |
|-----------|------|-------------|
| **Reg 44 report reader (DB-backed)** | `backend/reg44_report_reader_router.py` | No — requires `home_id`, PostgreSQL |
| Reg 44 document ingestion | `backend/reg44_document_ingestion_router.py` | No |
| Reg 44 trend engine | `backend/reg44_trend_engine_router.py` | No |
| Reg 44 intelligence (live feed) | `services/reg44_intelligence_service.py` | No — `build_operational_feed` |
| Legacy JS workspace | `frontend/js/reg44-report-reader-workspace.js` | OS UI |
| **Converged standalone extractor** | `services/orb_reg44_document_extraction.py` | Yes — pasted/uploaded text only |

Action planner convergence:

- OS: `insert_action_from_evidence` in report reader (writes DB actions).
- Standalone: `reg44` lens + `actions` lens → draft `OrbDocumentIntelligenceAction` list (not OS tasks).

---

## 3. Reg 45 / governance logic found

| Component | Path | Standalone use |
|-----------|------|----------------|
| Reg 45 quality review service | `services/reg45_quality_review_service.py` | OS only |
| Reg 45 builder (assistant) | `assistant/reg45_builder.py` | OS assistant |
| Reg 45 routes | `routers/reg45_quality_review_routes.py` | OS |
| **ORB `reg45` lens** | `services/orb_document_intelligence_service.py` | Provider learning reflection on supplied text |

---

## 4. Document upload / analyse routes

| Route | File | Purpose |
|-------|------|---------|
| `POST /orb/standalone/documents/upload` | `routers/orb_document_routes.py` | Ingest to Knowledge Library |
| `POST /orb/standalone/documents/analyse` | same | Legacy understanding response; optional `lens` → intelligence shape |
| **`POST /orb/standalone/documents/intelligence`** | same | **Canonical lens API** |
| `GET /orb/standalone/documents/lenses` | same | Lens registry |
| `POST /orb/standalone/documents/action-plan` | same | Alias `action_plan` mode |
| `POST /orb/standalone/actions/run` | `routers/orb_standalone_routes.py` | Action engine (chat follow-ups) |
| `POST /api/reg44-reader/*` | `backend/reg44_report_reader_router.py` | OS Reg 44 imports |

---

## 5. Frontend document panels / features

| UI | Path | Notes |
|----|------|-------|
| ORB document panel | `frontend-next/components/orb-standalone/orb-document-panel.tsx` | Upload/paste/tabs |
| **In-chat document chips** | `orb-care-companion.tsx`, `OrbDocumentContextChips` | Contextual lenses |
| Document intelligence client | `frontend-next/lib/orb/document-intelligence.ts` | Detection + formatting |
| OS document upload | `frontend-next/components/indicare/document-upload-panel.tsx` | Not on `/orb` |
| Legacy upload JS | `frontend/js/document-intelligence-upload.js` | Legacy shell |

---

## 6. Tests found

| Test file | Coverage |
|-----------|----------|
| `tests/test_orb_document_understanding_service.py` | Modes, safeguarding/Ofsted caveats |
| `tests/test_orb_document_routes.py` | Upload, analyse, OS ID rejection |
| **`tests/test_orb_document_intelligence.py`** | Lenses, Reg 44, policy card, boundary |
| `tests/test_orb_document_ingestion.py` | Ingestion |
| `frontend-next/lib/orb/document-intelligence.test.ts` | Contextual actions, wiring |

---

## 7. Duplicated / split document logic

| Split | Resolution |
|-------|------------|
| OS Reg 44 reader vs standalone | Standalone uses `orb_reg44_document_extraction` only; no DB |
| `orb_document_understanding_service` vs new intelligence layer | Intelligence **wraps** understanding; no duplicate LLM prompts for standard lenses |
| Document panel tabs vs chat chips | Panel for deep work; chips for in-chat lens runs |
| Action engine vs document actions | Action engine for **message** follow-ups; `/documents/intelligence` for **document** lenses |

---

## 8. Converged immediately (this pass)

- Single service: `orb_document_intelligence_service.py`
- Reg 44 heuristics: `orb_reg44_document_extraction.py` (from report reader)
- Policy card structured output (`policy_card` lens)
- Document-to-action-plan grouped output (`actions` lens)
- 15 lenses with registry metadata (vaults, safety, standalone boundary)
- Route `POST /orb/standalone/documents/intelligence`
- In-chat contextual document chips on `/orb`
- Fixed async `analyse` route (was calling non-existent sync `analyse`)

---

## 9. Remain OS-only

- `backend/reg44_report_reader_router.py` (DB imports, evidence items, OS actions)
- `services/reg44_intelligence_service.py` (live operational feed)
- `services/reg45_quality_review_service.py` and Reg 45 dashboards
- `services/document_intelligence_service.py`, Document OS, inspection packs
- `assistant/action_extraction.py` (OS record types)
- Universal document intelligence on `/api/...` with home/child scope

---

## 10. Standalone ORB can safely use

- User upload/paste and Knowledge Library `source_id`
- ORB Knowledge Spine / RAG (`orb_rag_retrieval_service`)
- Data vault descriptions (via understanding + action engine)
- Draft outputs only — no OS task creation
- Reg 44/45/**Ofsted lenses as text analysis**, not live readiness scores

---

## 11. Recommended implementation order (next PRs)

1. Wire selected document lenses to Action Engine aliases (`create_checklist` ← `checklist` lens output).
2. Save document intelligence outputs to `orb_saved_output` with `created_from: document_intelligence`.
3. OS permissioned document intelligence: attach `home_id` only on embedded ORB with ACL checks.
4. Sync Reg 44 lens output format with OS report reader DTOs for import (optional one-click when user is in OS).
5. PDF section-aware extraction (page/section citations).

---

## 10. Future IndiCare OS-connected behaviour (architecture)

**Standalone ORB today**

- User uploads or pastes document.
- ORB analyses **only** supplied document + Knowledge Library context.
- No live OS records; `os_records_accessed: false` on every intelligence response.
- Action plans and Reg 44 actions are **drafts** for local review.

**IndiCare OS later (not implemented in this pass)**

- Documents attached to home/child/staff/provider contexts.
- Permissioned chronology and record retrieval for embedded ORB.
- Action plans → OS action tables / manager queues.
- Reg 44/45/Ofsted dashboards consume extracted evidence with provenance.
- Policy cards published as staff-facing guidance inside the home workspace.

---

## Document lenses supported

| Lens ID | Label | Underlying |
|---------|-------|------------|
| `summary` | Summary | `summarise` |
| `explain` | Explain | `explain` |
| `actions` | Action plan | `action_plan` + grouped horizons |
| `policy_card` | Policy card | explain + structured card |
| `reg44` | Reg 44 extraction | `orb_reg44_document_extraction` + action plan |
| `reg45` | Reg 45 evidence review | `manager_briefing` + governance sections |
| `ofsted` | Ofsted lens | `ofsted_lens` |
| `safeguarding` | Safeguarding lens | `safeguarding_lens` (critical safety) |
| `recording_quality` | Recording quality | `recording_lens` |
| `manager_oversight` | Manager oversight | `manager_briefing` |
| `ri_governance` | RI governance | `manager_briefing` + RI sections |
| `staff_briefing` | Staff briefing | `staff_briefing` |
| `supervision` | Supervision questions | `full_review` / questions |
| `checklist` | Audit checklist | `action_plan` / questions |
| `what_is_missing` | What is missing? | `full_review` + gaps |

---

## Known limitations

- Visit date/visitor/home extraction is regex-based; absent metadata returns *not stated in the supplied document*.
- LLM unavailable → understanding fallback heuristics (shorter output).
- Policy card timescales are not invented when absent.
- No automatic OS Reg 44 import from standalone ORB.
- Document panel still uses `/analyse` for tab UX; chat uses `/intelligence`.

---

## Policy card behaviour

Structured fields: title, plain-English summary, what staff must know, escalation, recording, who to inform, timescales (if stated), related records, manager/RI responsibilities, safeguarding/Ofsted relevance, common mistakes, staff briefing, supervision questions, audit checklist, ORB-safe answer rules.

---

## Standalone boundary

- Premium dependency on all document routes.
- `_reject_os_ids` on upload, analyse, intelligence payloads.
- Every response: `standalone: true`, `os_records_accessed: false`.
- Copy states analysis is from uploaded/provided document only.

---

## Academy / NVQ lenses (2026-05-29)

| Lens ID | Use case |
|---------|----------|
| `nvq_evidence_map` | Learner/assessor uploads practice or portfolio text |
| `reflective_account_plan` | Reflective account draft |
| `assessor_feedback` | Draft assessor feedback (judgement support only) |
| `professional_discussion_prompts` | Criteria/evidence text |
| `witness_testimony_prompt` | Practice description |
| `learning_action_plan` | Gap/action planning |
| `workbook_summary` | Workbook/assignment text |
| `qualification_criteria_explainer` | Criteria document |

All lenses: supplied text only; authenticity section; no live Academy learner records.
