# IndiCare Model Independence Roadmap

## Current state

- **Approved provider:** OpenAI (`INDICARE_LLM_PROVIDER=openai`)
- **Gateway:** `ai_gateway_service` for non-streaming calls
- **Streaming:** `assistant/llm_provider.py` with shared privacy/redaction/audit
- **Policy:** `ai_privacy_decision_service` centralises allow/block decisions

## Principles

1. **Optional external AI** — providers can run with external AI disabled; ORB falls back to safe local messaging.
2. **No silent fallback** — in production, unknown provider names fail closed rather than defaulting to OpenAI.
3. **Converge, don't fork** — new features must use gateway or governed streaming wrappers.
4. **OpenAI remains supported** — existing deployments continue to work with current env configuration.

## Near-term (convergence)

| Item | Status |
|------|--------|
| Central `AIPrivacyDecision` | Done |
| Streaming governance | Done |
| Learning ledger redaction | Done |
| Legacy route migration (documents, reports, notes) | Planned |
| Provider-admin API for settings | Planned |

## Medium-term (portability)

### Azure OpenAI

1. Add `azure_openai` to `APPROVED_LLM_PROVIDERS`
2. Implement adapter implementing `LLMProvider` protocol with Azure endpoint + deployment name
3. Map `OPENAI_BASE_URL` / `AZURE_OPENAI_*` env vars in `_load_provider_config`
4. Reuse `ai_external_call_governance` — no change to call sites

### Other hosted models

- Register provider in `services/ai_provider_registry.py`
- Route through `ai_model_router_service` only after privacy decision passes
- Document sub-processor in provider policy doc

## Long-term (self-sufficiency)

- Expand deterministic IndiCare Intelligence Core coverage for routine staff queries
- On-prem or VPC-hosted smaller models for low-risk metadata tasks
- Embeddings stored and queried without sending raw child text externally
- Sector learning from anonymised tags only (learning ledger pattern)

## Development vs production

| Environment | Unknown provider |
|-------------|------------------|
| Production | Hard fail with clear configuration error |
| Development | Warning + OpenAI fallback (preserves local dev ergonomics) |

## Success criteria

- Zero undocumented direct OpenAI imports in `services/`, `assistant/`, `routers/`
- 100% of external calls pass privacy decision + audit
- Provider can switch vendor without ORB UX regression
