# NR-1 Phase 1 Report — Provider-Agnostic Governed AI Egress

| Field | Value |
|---|---|
| Risk | NR-1: AI egress is not yet enforced through a single governed chokepoint |
| Phase | **Phase 1** (model-router / chat / text inference path) |
| Status after this work | **PARTIALLY RESOLVED / OPEN** |
| Branch | `cursor/nr1-phase1-governed-egress-dbf0` |

## What changed

Phase 1 introduces a **provider-agnostic governed egress layer** (`AiGovernedEgress`) that
sits between product callers and all provider adapters. The model router no longer calls
`openai_provider` or `mock_provider` directly.

### New modules

| Module | Role |
|---|---|
| `services/ai_governed_egress.py` | `AiGovernedEgress` — mandatory governance chokepoint |
| `services/ai_provider_adapter_registry.py` | Provider adapter registry (OpenAI, Mock, future adapters) |
| `services/ai_providers/fake_governance_test_provider.py` | Test-only adapter (requires `AI_ALLOW_TEST_PROVIDER=true`) |
| `schemas/ai_models.py` | `AiProviderGovernanceContext` added to routing/provider request types |

### Updated modules

| Module | Change |
|---|---|
| `services/ai_model_router_service.py` | All `complete` / `stream` paths route through `ai_governed_egress` |
| `services/ai_external_call_governance.py` | Router feature constants + `build_router_governance_context()` |
| `services/ai_privacy_decision_service.py` | Router features added to legacy allow-list |
| ORB callers (6 services) | Pass `surface`, `route`, `user`, and governance scope |

## Architecture (provider-agnostic)

```
Product feature / ORB service
  → ai_model_router_service (routing + task classification)
  → AiGovernedEgress (governance contract — provider-neutral)
  → AiProviderAdapterRegistry
  → provider-specific adapter (OpenAI today; Anthropic/Gemini/etc. later)
  → provider SDK / REST / WebSocket / local runtime
```

**OpenAI is one adapter, not the governance layer.**

### Governance contract applied at egress

1. Feature/surface identification (`AiProviderGovernanceContext`)
2. Tenant/context scope (user_id, provider_id, home_id, child_id, role, route)
3. External processing decision (`evaluate_external_call`, fail closed)
4. Redaction/minimisation (system prompt, message, history)
5. Provider/model allow-listing (via `ai_provider_registry`)
6. Cost/usage controls (usage recorded via `record_model_usage`)
7. Audit (governed egress decision events, no raw prompts/responses)
8. Error sanitisation (keys and payloads stripped)
9. Timeout policy (inherited from provider request routing decision)
10. Provider abstraction (adapter executes only after governance passes)

## What is now provider-agnostic

- `AiGovernedEgress` — works with any registered `AiProviderBase` adapter
- `AiProviderAdapterRegistry` — registration point for OpenAI, Mock, and future providers
- `AiProviderGovernanceContext` — neutral naming, not OpenAI-specific
- Model router path — all chat/text inference goes through the same egress layer

## What is NOT covered (Phase 1 out of scope)

| Provider type | Status |
|---|---|
| TTS (ElevenLabs, `orb_voice_tts_service`) | Not governed at egress chokepoint |
| Realtime / WebSocket / browser-direct | Not covered |
| Transcription | Uses existing `governed_transcribe_audio_file` wrapper (unchanged) |
| Embeddings | Uses existing `governed_embeddings_create` wrapper (unchanged) |
| Legacy OS streaming (`assistant/llm_provider.py`) | Already governed separately; unchanged |
| Gateway sync path (`ai_gateway_service`) | Already governed separately; unchanged |

## ORB/router callers updated

| Caller | Route identifier |
|---|---|
| `orb_general_assistant_service` | `orb_general_assistant_service._llm_answer` / `.stream_answer` |
| `orb_operational_assistant_service` | `orb_operational_assistant_service.answer` |
| `orb_agent_orchestrator_service` | `orb_agent_orchestrator_service._call_model` |
| `orb_action_engine_service` | `orb_action_engine_service._llm_complete` |
| `orb_document_understanding_service` | `orb_document_understanding_service.analyse_document` |
| `orb_live_guardrail_repair_service` | `orb_live_guardrail_repair_service.repair_guardrail_answer` |

## Tests added

| Test file | Coverage |
|---|---|
| `tests/test_ai_governed_egress.py` | 10 behavioural governance tests (missing context, blocking, redaction, usage, sanitisation, fake provider) |
| `tests/test_ai_governed_egress_guard.py` | CI guard: router must not call adapters directly |
| `tests/test_ai_model_router_service.py` | Updated for governance context |

## CI guards

| Check | Status |
|---|---|
| `scripts/ai_egress_audit.py` | Unchanged (still passes — adapters remain approved inference modules) |
| `tests/test_ai_governed_egress_guard.py` | **Added** — router must use governed egress |
| Direct adapter call AST guard for product code | **Deferred to Phase 2** (full repo-wide enforcement) |
| Provider SDK import inventory | Existing tests unchanged |

## Production behaviour

- Model-router chat/text calls now **require governance context** (auto-built from surface if caller omits explicit context, but missing context on direct `complete()` fails closed).
- External AI disabled → external providers blocked before adapter execution; mock/local fallback when `local_fallback_available=True`.
- Redaction applied before content reaches any external provider.
- Usage audit recorded after successful governed calls.
- **Risk:** feature allow-list changes may affect providers with strict settings — router features added to legacy allow-list.

## Remaining NR-1 blockers

1. TTS path (`orb_voice_tts_service`) — no `evaluate_external_call` at egress
2. Realtime/WebSocket/browser-direct paths — not behind governed egress
3. Repo-wide AST guard proving product code cannot import provider adapters directly
4. Full provider migration (Anthropic, Gemini, etc.) — interfaces ready, adapters not added
5. CI hard-gate for behavioural governance tests (pre-merge gate advisory only today)

## Public promise

**Remains blocked.** NR-1 is not resolved. Do not publish the public promise.

## Recommended Phase 2

1. Extend `AiGovernedEgress` to TTS and realtime provider types
2. Add repo-wide import/call graph guard (product → egress only)
3. Implement second real provider adapter (e.g. Anthropic) behind same registry
4. Wire behavioural governance tests into CI hard gate
5. Remove legacy allow-list dependency for router features (provider settings validation)
