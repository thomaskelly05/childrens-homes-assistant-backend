# IndiCare Embedding Data Protection Policy

## Purpose

Define how IndiCare generates, stores, scopes, and deletes vector embeddings that may be derived from child, staff, or provider content.

## Principles

1. **Embeddings are sensitive** when sourced from child-identifiable or staff-identifiable text, even if not reversible in all cases.
2. **Minimise before embed** — apply the same redaction modes as chat (`strict`, `safeguarding_strict`) before sending text to an external embedding API.
3. **External embeddings require explicit enablement** — honour `AI_EXTERNAL_PROCESSING_ENABLED` and `AIPrivacyDecision` feature `knowledge_embedding`.
4. **Scope preservation** — vectors and metadata must remain tied to `provider_id`, `home_id`, and (where applicable) young person or document IDs; no cross-provider index sharing.
5. **No cross-provider leakage** — retrieval queries filter by tenant scope in SQL / service layer.
6. **Audit external calls** — record feature, model, redaction mode, token estimates via `ai_usage_audit_service` (metadata only, no raw text by default).
7. **Retention & deletion** — when source documents or young person records are deleted or export-erased, associated embedding rows must be removed or invalidated per provider retention policy (`data_retention_days` in intelligence settings).
8. **Local model path (future)** — document option to run on-prem / local embedding models for self-sufficiency (see `indicare-model-independence-roadmap.md`).

## Implementation surfaces

| Surface | Data typical | External embed | Redaction | Audit |
|---------|--------------|----------------|-----------|-------|
| `assistant/retrieval.py` | User question + knowledge query | Governed | Yes | Yes |
| `services/orb_embedding_service.py` | ORB Knowledge Library uploads | Governed | Yes | Yes |
| Document ingestion (if vector index enabled) | Uploaded policies / guides | Must use governance layer | Required | Required |

## When external AI is disabled

- `governed_embeddings_create` returns `available: false`, `blocked: true`.
- Retrieval falls back to empty knowledge context (existing exception handling in `retrieve_context_bundle`).
- ORB Knowledge Library search degrades gracefully (no silent cross-tenant fallback).

## Storage rules

- Do **not** store raw source text in embedding audit metadata.
- Store only: model name, dimensions hash, document IDs, provider/home scope, retention state.
- Default: no storage of embedding inputs in prompt/transcript tables.

## Local embedding option (documented, not yet default)

Environment placeholders for future work:

- `INDICARE_LOCAL_EMBEDDING_ENABLED`
- `INDICARE_LOCAL_EMBEDDING_MODEL` (e.g. sentence-transformers / onnx runtime)

When enabled, `governed_embeddings_create` should prefer local inference before OpenAI (implementation tracked on model independence roadmap).

## Operator checklist

- [ ] Confirm `AI_EXTERNAL_PROCESSING_ENABLED` for production only when DPA/sub-processor review complete  
- [ ] Keep `AI_STORE_PROMPTS` and `AI_STORE_TRANSCRIPTS` false unless legal basis documented  
- [ ] Review redaction mode after safeguarding incidents  
- [ ] Run deletion hooks when erasing young person or document records  
