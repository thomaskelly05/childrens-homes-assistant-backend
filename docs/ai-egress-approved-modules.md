# Approved AI/Provider Egress Modules (NR-1)

This document is the authoritative list of modules permitted to perform AI/provider
egress, and the invariants that protect **Named Risk NR-1** ("AI egress is not yet
enforced through a single governed chokepoint" — see `constitution/documents/A2-…` and
`constitution/documents/00-constitutional-hierarchy.md`).

It is referenced by `constitution/audits/post-constitution-system-audit/01-nr-1-remediation-report.md`.

## Invariants

1. **One client factory.** A raw `OpenAI()` / `AsyncOpenAI()` client may only be
   constructed in **`services/openai_header_sanitisation.py`** (the sanitised factory:
   strips forwarded request headers). Everywhere else must use
   `create_sync_openai_client` / `create_async_openai_client`.
2. **Inference only in approved modules.** Provider inference calls
   (`chat.completions`, `responses`, `embeddings`, `audio.speech`,
   `audio.transcriptions`, `completions`) may only appear in the approved modules below
   (plus `scripts/**` tooling and `tests/**`).

## Approved modules

| Module | Role | Governance |
|---|---|---|
| `services/openai_header_sanitisation.py` | Sanitised client factory | Builds the only approved clients |
| `services/ai_gateway_service.py` | Governed gateway (sync) | privacy decision + redaction + cost + usage |
| `services/ai_external_call_governance.py` | Governed wrappers (embeddings, transcription, draft) | privacy decision + redaction + usage |
| `assistant/llm_provider.py` | Primary streaming chat path | `evaluate_external_call` + `redact_chat_messages` (pre-egress); `record_model_usage` (post-egress audit) |
| `services/ai_providers/openai_provider.py` | Approved provider adapter (via `AiGovernedEgress` + `ai_model_router_service`) | **Phase 1:** adapter executes only after `AiGovernedEgress` governance passes |
| `services/ai_providers/openai_tts_provider.py` | OpenAI TTS adapter (NR-1 Phase 2B) | Executes only via `AiGovernedEgress.synthesize_speech()` after Phase 2A route gate |
| `services/ai_providers/elevenlabs_tts_provider.py` | ElevenLabs TTS adapter (NR-1 Phase 2B) | Executes only via `AiGovernedEgress.synthesize_speech()` after Phase 2A route gate |
| `services/ai_governed_egress.py` | Provider-agnostic governed egress chokepoint (NR-1 Phase 1 + 2B TTS) | `evaluate_external_call` + redaction + allow-listing + usage audit + error sanitisation; `synthesize_speech` for TTS |
| `services/ai_provider_adapter_registry.py` | Provider adapter registry | Resolves adapters for governed egress; test adapters require `AI_ALLOW_TEST_PROVIDER=true` |
| `services/ai_tts_provider_adapter_registry.py` | TTS provider adapter registry (NR-1 Phase 2B) | Resolves TTS adapters for `AiGovernedEgress.synthesize_speech()` |
| `services/orb_voice_tts_service.py` | ORB Voice TTS orchestration | Phase 2A route gate + Phase 2B governed egress orchestration (no direct provider calls) |
| `assistant/streaming.py` | Legacy streaming (governance-allow-listed) | `evaluate_external_call` + `redact_chat_messages`; not a live product route |

Tooling: `scripts/generate_orb_scenario_variants.py` (offline scenario generation).

## How to run the audit / guard

Dependency-free (no app deps required), runnable anywhere:

```bash
python3 scripts/ai_egress_audit.py --report   # print the egress classification
python3 scripts/ai_egress_audit.py            # guard mode: exit 1 on a violation
```

The same invariants are asserted by `tests/test_ai_egress_audit_guard.py` and the
pre-existing `tests/test_no_direct_external_ai_bypass.py` /
`tests/test_no_remaining_direct_ai_bypass.py`.

## Remaining NR-1 work (not yet done — see the remediation report)

- Extend governed egress to **realtime/WebSocket/browser-direct** paths (Phase 2C).
- Repo-wide guard proving product code cannot call provider adapters or SDK clients directly (Phase 2D).
- ElevenLabs HTTP host guard in `scripts/ai_egress_audit.py` (Phase 2D).
- Wire the egress guard into **CI** hard gate (the quality-gate workflow does not currently run the
  pytest suite — see constitution E6).

Phase 1 (model-router chokepoint) is documented in
`constitution/audits/post-constitution-system-audit/02-nr-1-phase-1-report.md`.

Phase 2A (TTS route intent gate + privacy decision) and Phase 2B (TTS provider adapter egress) are
implemented; NR-1 remains **PARTIALLY RESOLVED** until Phase 2C/2D and re-verification.
