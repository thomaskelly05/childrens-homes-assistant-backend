# ORB Home Documents Convergence Map

**Date:** 2026-06-23  
**Scope:** Audit of existing document/upload systems and canonical ORB Home Documents convergence plan.

## Executive summary

ORB previously stored home policies in **browser localStorage** (`orb-home-documents-library-v1`) with no server sync. Parallel upload paths existed via **ORB Knowledge Library** (`/orb/standalone/knowledge/*`), **ORB standalone documents** (`/orb/standalone/documents/upload`), and **IndiCare OS** (`/os/documents/upload`). This pass introduces the **canonical server-backed Home Documents API** at `/orb/home-documents/*` using `schemas/orb_home_documents.py` and `services/orb_home_documents_service.py`.

**No second brain** was created. **No duplicate document library** was created — `document_library_routes` remains unmounted; home documents use a dedicated `orb_home_documents` store scoped to home/organisation.

---

## Existing routes

### Mounted (live)

| Router | Prefix | Purpose |
|--------|--------|---------|
| `orb_knowledge_routes` | `/orb/standalone/knowledge/*` | Global ORB knowledge library ingest/search |
| `orb_document_routes` | `/orb/standalone/documents/*` | Standalone document intelligence (no home scope) |
| `backend.os_live_data_router` | `/os/documents/*` | IndiCare OS live document upload |
| `home_inspection_compat_routes` | `/homes/{home_id}/documents` | OS home document read compat |
| `orb_records_workspace_launch_routes` | `/orb/records-workspace/*` | Adult drafts workspace (separate concern) |

### Orphaned (not in `router_loader.py`)

| Router | Prefix | Status |
|--------|--------|--------|
| `document_library_routes` | `/documents/library/*` | Home-scoped PG `documents` table — **not mounted** |
| `workspace_records_routes` | `/workspace-records/*` | OS operational records lifecycle — **not mounted** |
| `universal_document_intelligence_router` | `/api/document-intelligence/*` | Document intelligence — **not mounted** |
| `document_upload_extraction_routes` | `/api/document-os/extraction` | Extraction API — **not mounted** |
| `reg44_document_ingestion_router` | `/api/reg44-reader/documents/*` | Reg 44 ingestion — **not mounted** |
| `referral_upload_routes` | `/{referral_id}/documents/upload` | Referral uploads — **not mounted** |
| `chat_routes` | `/chat/upload` | Chat upload — **not mounted** |
| `routers.upload_routes` | — | **Module missing** — skipped at startup |
| `routers.assistant_upload_routes` | — | **Module missing** — skipped at startup |

### New canonical API (this pass)

| Router | Prefix | Purpose |
|--------|--------|---------|
| `orb_home_documents_routes` | `/orb/home-documents/*` | **Canonical** home document upload, list, archive, indexing |

---

## Duplicate risks

| Risk | Systems involved | Severity | Resolution |
|------|------------------|----------|------------|
| Home docs never reach server | `orb-home-documents-store.ts` vs knowledge library vs OS upload | **High** | Wire UI to `/orb/home-documents/*`; localStorage becomes fallback only |
| Two libraries on same PG table | `document_library_routes` vs `os_live_data_router` | Medium | Keep `document_library_routes` unmounted; ORB home docs use `orb_home_documents` table |
| Knowledge library vs home docs | `orb_knowledge_library` vs `orb_home_documents` | Medium | Separate stores; home docs indexed in `orb_home_document_chunks` with home scope |
| Standalone doc upload vs home docs | `/orb/standalone/documents/upload` | Low | Standalone blocks `home_id`; home docs require home scope |
| Records workspace vs home docs | `/orb/records-workspace/*` | Low | Different product surfaces — drafts vs policies |

---

## Current storage methods

| System | Storage | Scoped by |
|--------|---------|-----------|
| Client localStorage | `orb-home-documents-library-v1` | Browser session only |
| ORB Knowledge Library | `orb_knowledge_sources` + `orb_knowledge_chunks` | Global / user scope |
| OS documents | `documents` table + `file_storage` | `home_id` |
| **ORB Home Documents (new)** | `orb_home_documents` + `orb_home_document_chunks` + local blob storage | `home_id` / `organisation_id` / uploader |

---

## Current embedding/indexing methods

| System | Indexing | Governance |
|--------|----------|------------|
| ORB Knowledge Library | `orb_embedding_service` → chunk `embedding` JSONB | `ORB_EMBEDDINGS_ENABLED` + OpenAI key |
| ORB document ingestion | Chunks via `orb_document_ingestion_service` | Same governance |
| **ORB Home Documents (new)** | `orb_home_document_indexing_service` | Reuses embedding service; `indexing_status=disabled` when unavailable |

Text extraction reuses `orb_document_ingestion_service.extract_text_from_file` (PDF/DOCX/TXT/MD).

---

## Proposed canonical home document service

**Service:** `services/orb_home_documents_service.py`  
**Retrieval:** `services/orb_home_document_retrieval_service.py`  
**Answer grounding:** `services/orb_home_aware_answer_service.py`

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/orb/home-documents/upload` | Upload + audit + extract text |
| GET | `/orb/home-documents` | List (home/organisation scoped) |
| GET | `/orb/home-documents/{document_id}` | Get metadata (no raw file for unauthorised) |
| PATCH | `/orb/home-documents/{document_id}` | Update title/type metadata |
| POST | `/orb/home-documents/{document_id}/archive` | Archive with audit |
| GET | `/orb/home-documents/types` | Allowed document types |
| GET | `/orb/home-documents/summary` | Counts by type/status |
| GET | `/orb/admin/home-documents/analytics` | Founder/admin anonymised aggregates |

### Document fields

`document_id`, `organisation_id`, `home_id`, `uploaded_by_user_id`, `title`, `document_type`, `filename`, `mime_type`, `storage_uri`, `text_extract_status`, `indexing_status`, `version`, `archived`, `created_at`, `updated_at`, `privacy_classification`, `access_role_policy`, `audit_trail`.

Extracted text is stored server-side only — never returned in list/get responses.

---

## What should be deprecated or converged

| System | Action |
|--------|--------|
| `orb-home-documents-store.ts` | Converge to API-backed; keep localStorage as offline fallback |
| `document_library_routes` | Remain unmounted; do not mount alongside home documents API |
| `orb-home-documents-store` upload placeholder | Replace with `POST /orb/home-documents/upload` |
| Standalone knowledge ingest for home policies | Route home policy uploads through home documents API |
| OS `/os/documents/upload` for ORB users | Remain for IndiCare OS; ORB standalone uses home documents API |

---

## Safeguarding constraints (preserved)

- Local documents **cannot override** safeguarding/regulatory principles
- `HOME_AWARE_ANSWER_DISCLAIMER` applied at answer time
- Conflict advisory when local policy may conflict with safeguarding duties
- Founder analytics redact document text, child/staff names, provider details
- Every upload/read/archive action audited
- No compliance guarantee claims

---

## Source chip examples

When home documents are used in answers:

- `Home document: Statement of Purpose`
- `Home document: Medication Policy`
- `Home document: Safeguarding policy`

Chips are emitted by `orb_home_document_retrieval_service.build_source_chip()`.
