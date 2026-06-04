# IndiCare External AI Route Inventory

Living inventory of routes and services that may call external model providers (OpenAI today; pluggable via gateway).

## Governed entry points (use these for new work)

| Module | Role |
|--------|------|
| `services/ai_gateway_service.py` | Non-streaming chat completions (draft text) |
| `services/ai_external_call_governance.py` | Privacy decision, redaction, audit, embeddings, STT helpers |
| `assistant/llm_provider.py` | ORB / assistant **streaming** chat |
| `services/ai_providers/openai_provider.py` | Provider adapter for model router |
| `services/ai_model_router_service.py` | Routed provider selection |

## HTTP routes with external AI

| Method | Path | Feature key | Draft only | Notes |
|--------|------|-------------|------------|-------|
| POST | `/documents/incident` | `document_generation` | Yes | Manager/admin |
| POST | `/documents/risk` | `document_generation` | Yes | JSON risk table |
| POST | `/documents/daily-log` | `document_generation` | Yes | |
| POST | `/documents/handover` | `document_generation` | Yes | |
| POST | `/documents/safeguarding` | `document_generation` | Yes | safeguarding_strict redaction |
| POST | `/documents/reflection` | `document_generation` | Yes | |
| POST | `/reports/incident` | `report_drafting` | Yes | Requires `REPORT_AI_DRAFTING_ENABLED` |
| POST | `/document-ai/review` | `document_ai_review` | Yes | Fallback if blocked |
| POST | `/ai-notes/transcribe` | `ai_notes` | Yes | Governed STT |
| POST | `/ai-notes/generate` | `ai_notes` | Yes | |
| POST | `/ai-notes/edit` | `ai_notes` | Yes | |
| POST | `/ai-notes/extract-actions` | `ai_notes` | Yes | |
| POST | `/orb/dictate/generate` | `dictate` | Yes | Local fallback if disabled |
| POST | `/orb/dictate/edit` | `dictate_edit` | Yes | Local fallback if disabled |
| * | ORB chat / assistant stream | `orb_chat_stream` | Yes | `assistant/llm_provider.py` |

## Services (no direct HTTP)

| Service | Feature | External call type |
|---------|---------|-------------------|
| `document_ai_review_service` | `document_ai_review` | Chat completion |
| `orb_embedding_service` | `knowledge_embedding` | Embeddings |
| `assistant/retrieval.py` | `knowledge_embedding` | Embeddings |
| `title_service` | `metadata` | Short title |
| `ai_reasoning_service` | `orb_text_fallback` | OS embedded reasoning |
| `ai_gateway_service` | various | Chat completion |

## Not live / dev only

| Module | Status |
|--------|--------|
| `assistant/streaming.py` | Legacy; not imported by routers |
| `scripts/generate_orb_scenario_variants.py` | Dev script |

## Environment controls

| Variable | Effect |
|----------|--------|
| `AI_EXTERNAL_PROCESSING_ENABLED` | Master external AI switch (default false) |
| `REPORT_AI_DRAFTING_ENABLED` | Report incident drafting |
| `AI_STORE_PROMPTS` / `AI_STORE_TRANSCRIPTS` | Storage flags (default false) |
| `AI_REDACTION_MODE` | Provider default redaction |
| `ORB_EMBEDDINGS_ENABLED` | ORB embedding service toggle |

## Feature allowlist (when external AI enabled)

`metadata`, `orb_text_fallback`, `orb_chat_stream`, `report_drafting`, `risk_drafting`, `document_generation`, `document_ai_review`, `ai_notes`, `dictate`, `dictate_edit`, `knowledge_embedding`

See `services/provider_data_intelligence_settings_service.py` for defaults.
