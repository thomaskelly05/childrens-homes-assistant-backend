# IndiCare Legacy AI Route Governance Audit

**Date:** 2026-06-04  
**Scope:** Remaining legacy/direct AI paths after PR #1475 (`AIPrivacyDecision`, `ai_external_call_governance`, governed `assistant/llm_provider`, AI gateway).  
**Goal:** Converge bypass routes without rebuilding the platform; preserve ORB chat, streaming, documents, dictate, and reports behaviour.

## Executive summary

| Status | Count | Notes |
|--------|------:|-------|
| Converged (governed) | 12 | Gateway / `ai_external_call_governance` |
| Legacy documented (not live) | 1 | `assistant/streaming.py` |
| Dev/script only | 1 | `scripts/generate_orb_scenario_variants.py` |
| Already governed (PR #1475) | 4 | Gateway, llm_provider, openai_provider, model router |

All product-facing paths in the convergence list now call `AIPrivacyDecision` before external models, apply redaction, record usage audit (fail-open on audit errors), respect prompt/transcript storage flags, and keep outputs draft-only with human review.

---

## Inventory by path

### Routers

| File | Function / route | Feature | Data type | Sensitivity | Provider | Stream | Redaction (now) | Audit (now) | Provider check | Draft / review | Risk | Convergence |
|------|------------------|---------|-----------|-------------|----------|--------|-----------------|-------------|----------------|----------------|------|-------------|
| `routers/documents_routes.py` | `safe_model_text` / `safe_model_json` | `document_generation` | Incident, log, handover, safeguarding text | High (child/staff) | OpenAI via gateway | No | strict / safeguarding_strict | Yes | Yes | Draft docx only | Medium → Low | **Converged** |
| `routers/reports_routes.py` | `POST /reports/incident` | `report_drafting` | Incident description | High | OpenAI via gateway | No | strict | Yes | Yes + `report_ai_drafting_enabled` | Draft JSON | Medium → Low | **Converged** |
| `routers/document_ai_review_routes.py` | `POST /document-ai/review` | `document_ai_review` | Care record fields | High | Gateway | No | strict | Yes | Yes | Draft review | Medium → Low | **Converged** (service) |
| `routers/ai_notes_routes.py` | transcribe / generate / edit | `ai_notes` | Audio, transcripts | High | Governed STT + gateway | No | strict | Yes | Yes | Draft notes | Medium → Low | **Converged** (service) |
| `routers/orb_dictate_routes.py` | `/generate`, `/edit` | `dictate`, `dictate_edit` | Transcripts, drafts | High | Gateway | No | strict | Yes | Yes | Standalone draft | Medium → Low | **Converged** (service) |

### Services

| File | Function | Feature | Data type | Sensitivity | Provider | Stream | Redaction | Audit | Provider check | Draft / review | Risk | Convergence |
|------|----------|---------|-----------|-------------|----------|--------|-----------|-------|----------------|----------------|------|-------------|
| `services/document_ai_review_service.py` | `review_document_with_ai` | `document_ai_review` | Document payload | High | Gateway | No | strict | Yes | Yes | Fallback if blocked | Medium → Low | **Converged** |
| `services/ai_notes_service.py` | transcribe / generate / edit | `ai_notes` | Audio / transcript | High | Governed STT + gateway | No | strict | Yes | Yes | Draft | Medium → Low | **Converged** |
| `services/orb_dictate_service.py` | `generate_dictate_note` | `dictate` | Transcript | High | Gateway | No | strict | Yes | Yes (fallback) | Standalone draft | Medium → Low | **Converged** |
| `services/orb_dictate_edit_service.py` | `edit_dictate_document` | `dictate_edit` | Draft document | High | Gateway | No | strict | Yes | Yes (fallback) | Standalone draft | Medium → Low | **Converged** |
| `services/orb_embedding_service.py` | `embed_many` | `knowledge_embedding` | ORB library text | Medium | Governed embeddings | No | per decision | Yes | Yes | N/A | Medium → Low | **Converged** |
| `services/title_service.py` | `generate_title` | `metadata` | Chat snippet | Low–medium | Gateway | No | per decision | Yes | Yes | Non-record | Low | **Converged** |
| `services/ai_reasoning_service.py` | `run_os_reasoning` | `orb_text_fallback` | OS context JSON | High | Gateway | No | strict | Yes | Yes | Deterministic fallback | Medium → Low | **Converged** |

### Assistant

| File | Function | Live? | Feature | Data type | Sensitivity | Provider | Stream | Redaction | Audit | Risk | Convergence |
|------|----------|-------|---------|-----------|-------------|----------|--------|-----------|-------|------|-------------|
| `assistant/llm_provider.py` | `stream_chat` | **Yes** (ORB chat) | `orb_chat_stream` | Chat messages | High | AsyncOpenAI | **Yes** | Yes | Yes | Low (PR #1475) | Governed |
| `assistant/streaming.py` | `run_chat_stream` | **No** | `legacy_assistant_stream` | Chat | High | OpenAI (lazy) | Yes | Yes | Yes | Low | **Legacy + governed** |
| `assistant/retrieval.py` | `embed_query` | **Yes** (via `assistant_engine`) | `knowledge_embedding` | Query text | Medium–high | Governed embeddings | No | Yes | Yes | Low | **Converged** |
| `assistant/assistant_engine.py` | orchestration | **Yes** | — | Mixed | High | Uses retrieval + llm_provider | Partial | Inherited | Inherited | Low | Uses governed deps |

### Embeddings & vectors

| Path | Scope | Child/staff data risk | Convergence |
|------|-------|----------------------|-------------|
| `assistant/retrieval.py` → `indicare_knowledge` | Statutory/internal knowledge + user query | Query may contain identifiers; redacted before embed | **Converged** |
| `services/orb_embedding_service.py` | ORB Knowledge Library (standalone) | Provider-uploaded docs; redacted | **Converged** |
| Document vector stores (if enabled) | Per-provider uploads | See embedding policy doc | Policy documented |

### Already governed (PR #1475)

- `services/ai_gateway_service.py`
- `services/ai_providers/openai_provider.py`
- `services/ai_model_router_service.py`
- ORB learning ledger redaction (separate PR scope)

### Remaining documented (not converged in this pass)

| File | Reason |
|------|--------|
| `scripts/generate_orb_scenario_variants.py` | Dev-only scenario generator; not a production route |
| `assistant/streaming.py` | Not imported by live routes; kept with governance for inventory parity |

### Additional known integrations (not direct bypass)

Listed in `tests/test_no_direct_external_ai_bypass.py` → `ADDITIONAL_KNOWN_PATHS` (ORB voice realtime, expert engine, etc.).

---

## Risk register (residual)

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | Redaction misses rare identifiers | Medium | High | Strict/safeguarding modes; human review required |
| R2 | Env-based provider settings until admin API | Medium | Medium | Documented; per-provider DB overrides planned |
| R3 | `assistant_engine` does not pass provider_id into `embed_query` | Low | Medium | Retrieval still redacts; future: thread session scope |
| R4 | Audit DB failure | Low | Low | Fail-open logging; usage not blocked |
| R5 | Local embedding model not yet implemented | Medium | Low | Policy + roadmap in embedding doc |

---

## Acceptance mapping

1. All known bypass routes audited — **Yes** (this document)  
2. Documents AI governed — **Yes**  
3. Reports AI governed — **Yes**  
4. Notes / document review governed — **Yes**  
5. Dictate governed — **Yes**  
6. Legacy assistant paths governed or inactive — **Yes** (`streaming` inactive; `retrieval` governed)  
7. Embedding policy — **Yes** (`indicare-embedding-data-protection-policy.md`)  
8. External AI disabled blocks processing — **Yes** (403 or local fallback)  
9. Redaction before outbound calls — **Yes**  
10. Usage audit recorded — **Yes**  
11. Prompt/transcript storage off by default — **Yes** (unchanged)  
12. Human review for drafts — **Yes** (flags on responses / copy)  
13. ORB chat not broken — **Verified via existing streaming tests**  
14. Tests pass — **See CI / pytest output**
