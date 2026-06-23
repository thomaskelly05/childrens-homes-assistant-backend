# ORB Home Document Upload & Home-Aware Answers — Foundation

**Status:** Types and architecture defined; server persistence convergence planned

## Goal

Adults/managers upload home policies and plans. ORB extracts text, optionally embeds, and cites home knowledge in answers — without inventing content or overriding safeguarding principles.

## Document types

Defined in `schemas/orb_home_documents.py` — `OrbHomeDocumentType`:

- Statement of Purpose
- Safeguarding, missing from care, behaviour support, physical intervention policies
- Medication, complaints, fire safety, whistleblowing, staff supervision, admission policies
- Placement planning documents
- Child-specific plans (authorised)
- Risk assessments, behaviour support plans, communication/health/education plans
- Local authority protocols

## Document lifecycle

| Status | Meaning |
|--------|---------|
| `processing` | Upload received; extraction in progress |
| `ready` | Text extracted; available for RAG if enabled |
| `failed` | Extraction/indexing failed |
| `archived` | Superseded or withdrawn |

## Requirements mapping

| Requirement | Status | Location |
|-------------|--------|----------|
| Upload document | Partial | `/os/documents/upload`, `/orb/standalone/documents/upload` |
| Classify document type | **This pass** | `OrbHomeDocumentType` enum |
| Store securely | Partial | `services/file_storage.py` |
| Extract text | Live | `services/document_extraction_pipeline.py` |
| Embeddings if enabled | Live | `services/orb_embedding_service.py` |
| Link to home/organisation | Planned | `OrbHomeDocumentRecord.home_id` |
| Permission controls | Planned | `OrbHomeDocumentPermission` |
| Versioning | Planned | `version` field on record |
| Audit trail | Planned | `audit_trail` on record |
| Cite in answers | Partial | Knowledge grounding service |
| Conflict advisory | **This pass** | `HOME_AWARE_ANSWER_DISCLAIMER` |

## Home-aware answer behaviour

When relevant home document is indexed, ORB may say:

> "Based on your home's Statement of Purpose and the general residential children's home guidance available…"

Rules:

1. **Never invent** content from documents
2. **Cite explicitly** — e.g. "Home document: Statement of Purpose"
3. **Do not override** safeguarding/regulatory principles with local policy
4. **Advise escalation** if local policy conflicts with safeguarding best practice

## Existing systems

| System | Notes |
|--------|-------|
| ORB Knowledge Library | `routers/orb_knowledge_routes.py` — ingest, search, governance |
| Client localStorage store | `orb-home-documents-store.ts` — **not server-backed** |
| OS document upload | `backend/os_live_data_router.py` — live for OS users |
| Document intelligence routers | Exist but not mounted |

## RAG architecture (planned)

```
Upload → classify type → store blob → extract text
  → optional: chunk + embed (governance-gated)
  → index linked to home_id + document_type
  → retrieval at answer time with citation
  → log "home knowledge used" in answer metadata
```

## Blockers

- No unified `home_documents` server table for ORB standalone
- localStorage-only home docs do not sync across devices
- `document_library_routes`, `universal_document_intelligence_router` not mounted

## Next pass

1. Add `orb_home_documents` table + service
2. Migrate localStorage store to API-backed persistence
3. Wire home document retrieval into answer pipeline with citation chips
4. Manager UI for upload + processing status
