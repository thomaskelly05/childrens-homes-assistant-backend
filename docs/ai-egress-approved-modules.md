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
| `services/ai_providers/openai_provider.py` | Approved provider adapter (via `ai_model_router_service`) | **Partial — see NR-1 remaining work**: governance currently depends on caller discipline, not enforced at the adapter |
| `services/orb_voice_tts_service.py` | ORB Voice TTS | Converged to the sanitised factory (NR-1). **Partial — full privacy-decision gating is remaining work** |
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

- Enforce mandatory privacy-decision / redaction / usage at the **provider-adapter
  chokepoint** (`openai_provider` / `ai_model_router_service`) so governance does not
  depend on caller discipline.
- Add **full privacy-decision gating** (scope-aware) to the **TTS** path, not only the
  sanitised client.
- Wire the egress guard into **CI** (the quality-gate workflow does not currently run the
  pytest suite — see constitution E6).
