# IndiCare AI Sub-processor and Provider Policy

## Sub-processors

When external AI is enabled, IndiCare may use:

| Vendor | Purpose | Data sent | Training opt-out |
|--------|---------|-----------|------------------|
| OpenAI | Chat completion, embeddings (where enabled), speech hooks | Redacted prompts/context | Required via contract + `no_training_required` flag |
| ElevenLabs (scaffold) | Optional future TTS | Non-identifiable audio text only if enabled | To be confirmed before production enable |

Providers must approve sub-processors in their data processing agreements.

## Configuration requirements

Before enabling external AI in production:

1. Execute DPA covering children's social care data
2. Confirm provider **zero retention / no training** terms
3. Set `AI_EXTERNAL_PROCESSING_ENABLED=true` only after sign-off
4. Set `AI_STORE_PROMPTS=false` and `AI_STORE_TRANSCRIPTS=false` unless legally required and documented
5. Restrict `allowed_ai_features` to minimum necessary set

## Data minimisation

- Send the smallest prompt that satisfies the task
- Apply redaction mode appropriate to classification (`strict` / `safeguarding_strict`)
- Do not send full documents when a summary suffices
- Block `AI_RESTRICTED` and `EXPORT_RESTRICTED` classes from external calls by default

## Incident response

If a sub-processor reports an incident:

1. Disable `AI_EXTERNAL_PROCESSING_ENABLED` at provider level
2. Preserve `ai_usage_audit` metadata for investigation (no prompt text by default)
3. Notify provider DPO and affected homes per safeguarding policy

## Vendor change process

1. Add adapter + approve in `APPROVED_LLM_PROVIDERS`
2. Update this document and customer-facing trust pack
3. Run regression tests: streaming, gateway, fail-closed loading
4. Pilot on non-production home before rollout

## ElevenLabs / voice scaffold

Voice routes currently use browser-first STT/TTS with server hooks reserved. No child-identifiable audio should be sent to third parties without explicit realtime voice enablement and redaction review.
