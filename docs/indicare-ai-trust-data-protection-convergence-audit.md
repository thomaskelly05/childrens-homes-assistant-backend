# IndiCare AI Trust, Data Protection and Model Independence — Convergence Audit

**Date:** June 2026  
**Scope:** Converge existing AI governance building blocks without rebuilding ORB, streaming, voice, dictate, documents or templates.

---

## Executive summary

IndiCare already had substantial AI trust infrastructure. This audit maps what was wired, what was duplicated, and what still bypassed governance. Convergence work connected **streaming LLM** and the **AI gateway** to a new central **`AIPrivacyDecision`** service, strengthened the **learning ledger**, and enforced **fail-closed provider loading** in production.

---

## Part 1 — Component inventory

### `services/ai_gateway_service.py`

| Aspect | Detail |
|--------|--------|
| **Exists** | Single non-streaming outbound gateway (`draft_text`), cost estimates, feature allow-list |
| **Protects** | External drafting/summarisation; redaction before provider call |
| **ORB** | Used for structured metadata after ORB stream (`llm_provider._generate_structured_meta`) |
| **Streaming** | Indirect (metadata pass only) |
| **Voice/dictate/docs** | Not primary path |
| **Duplicated** | Overlaps `ai_privacy_service`, `ai_privacy_guard_service` for policy checks |
| **Bypasses** | None for gateway callers |
| **Converge** | Now uses `ai_privacy_decision_service` + `record_model_usage` |
| **Leave alone** | Public API shape, cost estimation, draft-only semantics |

### `services/ai_redaction_service.py`

| Aspect | Detail |
|--------|--------|
| **Exists** | Regex + class-aware redaction (names, DOB, NHS, postcode, school, family, safeguarding) |
| **Protects** | Identifiers in prompts/records before external AI |
| **ORB** | Via gateway + streaming governance |
| **Streaming** | Yes (via `ai_external_call_governance.redact_chat_messages`) |
| **Voice/dictate/docs** | Partial (`recording_draft_service`, `ai_privacy_guard_service`) |
| **Duplicated** | Learning ledger had local regex (removed) |
| **Bypasses** | Legacy direct OpenAI routes (see route table) |
| **Converge** | Shared by gateway, streaming, learning ledger |
| **Leave alone** | Detection patterns and `AiRedactionResult` schema |

### `services/ai_usage_audit_service.py`

| Aspect | Detail |
|--------|--------|
| **Exists** | Best-effort `ai_usage_audit` table inserts |
| **Protects** | Accountability; never breaks user flow on failure |
| **ORB** | Streaming + gateway |
| **Streaming** | Yes |
| **Duplicated** | `ai_privacy_audit_service` (different events table) |
| **Bypasses** | Legacy routes without audit |
| **Converge** | Called from gateway, streaming, privacy decisions |
| **Leave alone** | Fail-open persistence behaviour |

### `services/provider_data_intelligence_settings_service.py`

| Aspect | Detail |
|--------|--------|
| **Exists** | Env-driven defaults; `from_record` for DB rows |
| **Protects** | `external_ai_enabled`, redaction mode, feature allow-list, storage flags |
| **ORB** | Indirect via privacy decision |
| **Gap** | No provider-admin API/UI for per-home overrides (TODO in service) |
| **Converge** | Source of truth for `ai_privacy_decision_service` |
| **Leave alone** | Env variable names |

### `schemas/data_protection.py` / `schemas/data_intelligence.py`

| Aspect | Detail |
|--------|--------|
| **Exists** | `DataClassification`, `AIPrivacyDecision`, `ProviderDataIntelligenceSettings`, `AIUsageEvent` |
| **Protects** | Typed policy contracts |
| **Converge** | Used by new `ai_privacy_decision_service` |
| **Leave alone** | Enum values |

### `assistant/llm_provider.py`

| Aspect | Detail |
|--------|--------|
| **Exists** | Async OpenAI streaming for ORB/OS assistant |
| **Protects** | Now: privacy decision, redaction, usage audit |
| **ORB** | Primary stream path via `ai_service` / standalone |
| **Streaming** | **Governed** (this pass) |
| **Bypasses** | Was direct OpenAI until convergence |
| **Converge** | Option C: wrap with privacy + redaction + audit |
| **Leave alone** | Stream token protocol, structured JSON meta pass |

### `services/indicare_intelligence_core_service.py`

| Aspect | Detail |
|--------|--------|
| **Exists** | Always-on ORB brain packet; learning ledger hooks |
| **Protects** | Depth routing, safeguarding terms, source basis |
| **ORB** | Core |
| **Weaken** | Must not be reduced — untouched |
| **Converge** | Learning ledger uses stronger redaction |

### `services/orb_learning_ledger_service.py`

| Aspect | Detail |
|--------|--------|
| **Exists** | In-memory anonymised learning tags |
| **Protects** | No full prompts; redacted summaries only |
| **Converge** | Uses `ai_redaction_service` (`safeguarding_strict`) |
| **Leave alone** | Tag aggregation API |

### `services/trusted_source_registry_service.py` + `trusted_sources_registry.json`

| Aspect | Detail |
|--------|--------|
| **Exists** | Gold/silver statutory sources; validation rules |
| **Protects** | No random scraping; auto-apply blocked for statutory types |
| **Gaps** | Runtime refresh paths must keep `auto_apply_blocked`; sector learning not in gold tier |
| **Leave alone** | Registry file content structure |

### `services/ai_privacy_guard_service.py` / `services/ai_privacy_service.py`

| Aspect | Detail |
|--------|--------|
| **Exists** | Operational context guard, export guard, legacy policy |
| **Duplicated** | Overlapping “allow external AI?” logic with new decision service |
| **Converge** | New calls should use `ai_privacy_decision_service`; guards remain for ORB operational/export surfaces |
| **Leave alone** | Operational/export-specific flows |

---

## Part 1 — External AI route inventory

| File | Route / service | Feature | Provider | Stream? | Redaction | `external_ai_enabled` | Feature allow-list | Prompt/transcript storage | Usage audit | Fail-closed | Action |
|------|-----------------|---------|----------|---------|-----------|----------------------|-------------------|---------------------------|-------------|-------------|--------|
| `assistant/llm_provider.py` | ORB/OS stream | `orb_chat_stream` | OpenAI | Yes | Yes | Yes | Yes | Respected | Yes | Yes | **Converged** |
| `services/ai_gateway_service.py` | `draft_text` | configurable | OpenAI | No | Yes | Yes | Yes | Respected | Yes | Yes | **Converged** |
| `services/ai_providers/openai_provider.py` | Model router | varies | OpenAI | Yes/No | Partial | Partial | Partial | Partial | Partial | Partial | Route new work via gateway |
| `services/orb_dictate_service.py` | Dictate | transcription/draft | OpenAI | No | Partial | Env | Partial | Default off | Partial | Partial | Document; migrate to gateway |
| `services/orb_dictate_edit_service.py` | Dictate edit | edit | OpenAI | No | Partial | Env | Partial | Default off | Partial | Partial | Document; migrate |
| `routers/documents_routes.py` | Document AI | summarise | OpenAI | No | No | No | No | Default off | No | Partial | **Bypass** — high priority |
| `routers/reports_routes.py` | Report draft | drafting | OpenAI | No | No | Env | Partial | Default off | No | Partial | **Bypass** |
| `services/document_ai_review_service.py` | Doc review | review | OpenAI | No | No | No | No | Default off | No | Partial | **Bypass** |
| `services/ai_notes_service.py` | Notes AI | notes | OpenAI | No | No | No | No | Default off | No | Partial | **Bypass** |
| `assistant/streaming.py` | Legacy stream | chat | OpenAI | Yes | No | No | No | Default off | No | No | **Bypass** — deprecate |
| `assistant/retrieval.py` | Embeddings | RAG | OpenAI | No | No | No | No | N/A | No | No | **Bypass** |
| `services/orb_embedding_service.py` | ORB embeddings | embeddings | OpenAI | No | N/A | Env | Partial | N/A | Partial | Partial | Minimise input text |
| `services/title_service.py` | Titles | title | OpenAI | No | No | No | No | Default off | No | No | Low risk; gateway later |
| `services/ai_reasoning_service.py` | Reasoning | reasoning | OpenAI | Async | Partial | Env | Partial | Default off | Partial | Partial | Document |
| `routers/orb_voice_residential_routes.py` | Voice | STT/TTS hooks | OpenAI/ElevenLabs scaffold | Yes | N/A | Env | Partial | Default off | Partial | Partial | Server TTS reserved |
| `services/indicare_intelligence_core_service.py` | ORB brain | deterministic | N/A | N/A | N/A | N/A | N/A | No prompts stored | N/A | Yes | **Untouched** |

---

## Part 2–3 — Privacy decision and gateway/streaming convergence

**Created:** `services/ai_privacy_decision_service.py`  
**Created:** `services/ai_external_call_governance.py` (shared redaction + audit helpers)

**Approach:** Option C — least disruptive wrap of `llm_provider` without routing bytes through the sync gateway.

**Rules implemented:**
- Restricted decision features blocked
- `AI_RESTRICTED` / `EXPORT_RESTRICTED` classifications block unless explicit override
- Sensitive care classifications → `strict` / `safeguarding_strict` redaction
- `external_ai_enabled` required
- Feature allow-list includes `orb_chat_stream` when external AI enabled
- `no_training_required=True` by default
- Prompt/transcript storage off unless settings enable
- Auditable via `ai_usage_audit` + structured logs

---

## Part 4 — Learning ledger

- Never stores `prompt_text`
- `prompt_summary` redacted via `ai_redaction_service` (`safeguarding_strict`), then truncated
- Learning tags sanitised

---

## Part 5 — Model independence

- `APPROVED_LLM_PROVIDERS = {"openai"}`
- Production: unknown `INDICARE_LLM_PROVIDER` raises (no silent OpenAI fallback)
- Development: warning + fallback preserved for local dev
- Azure/other: register in `APPROVED_LLM_PROVIDERS` and add adapter (not implemented — scaffold only)

---

## Part 6 — Trusted source governance gaps

| Check | Status |
|-------|--------|
| No random scraping | Enforced by registry-only citations |
| Gold statutory auto-check only | `auto_check_allowed: true`, `auto_apply_allowed: false` in registry |
| Human approval for gold/silver statutory | `human_approval_required: true` |
| Local LSCP / provider policy | `trust_tier: local`, approval required |
| Sector learning ≠ statutory | Not in gold statutory types; validate on add |
| **Gap** | Some discovery services need explicit `auto_apply_blocked` in API responses for UI |

---

## Part 7 — Provider/admin settings readiness

| Setting | Env today | DB `from_record` | Admin API/UI |
|---------|-----------|-------------------|--------------|
| `external_ai_enabled` | Yes | Partial | **Gap** |
| `redaction_mode` | Yes | Partial | **Gap** |
| `allowed_ai_features` | Yes | Partial | **Gap** |
| `prompt_storage` | Yes | Partial | **Gap** |
| `transcript_storage` | Yes | Partial | **Gap** |
| `realtime_voice_enabled` | Yes | Partial | **Gap** |
| `report_ai_drafting_enabled` | Yes | Partial | **Gap** |
| `data_retention_days` | Schema only | Partial | **Gap** |

**TODO:** Minimal service-level note added in `provider_data_intelligence_settings_service.py` — full admin API deferred.

---

## What remains bypassed (post-convergence)

1. `routers/documents_routes.py`, `routers/reports_routes.py`  
2. `services/ai_notes_service.py`, `services/document_ai_review_service.py`  
3. `assistant/streaming.py`, `assistant/retrieval.py` (legacy)  
4. Dictate services (partial governance via env only)  
5. Embeddings (`orb_embedding_service`, `retrieval.py`)

---

## Tests added

- `tests/test_ai_privacy_decision_service.py`
- `tests/test_ai_gateway_enforcement_streaming.py`
- `tests/test_no_direct_external_ai_bypass.py`
- `tests/test_learning_ledger_redaction.py`
- `tests/test_llm_provider_fail_closed.py`
- `tests/test_trusted_source_governance.py`
