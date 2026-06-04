# IndiCare Intelligence route parity audit

## Purpose

ORB is the shell; **IndiCare Intelligence Core** (`indicare_intelligence_core_service`, packet version `indicare_intelligence_10`) is the single always-on brain entry via `orb_knowledge_retrieval_service.prepare_request_bundle()`.

This audit records parity across ORB-facing and OS assistant-facing pathways after the Perfect 10 hardening pass.

## Route matrix

| Pathway | Entry | Core packet | Quality gate | Learning ledger | Notes |
|---------|--------|-------------|--------------|-----------------|-------|
| `POST /orb/standalone/conversation` | `orb_standalone_routes.standalone_orb_conversation` | Yes (retrieval bundle) | Yes (`finalize_standalone_intelligence`) | Yes | Reference implementation |
| `POST /orb/standalone/conversation/stream` | `standalone_orb_conversation_stream` | Yes | Yes (on final metadata) | Yes | Same finalize helper as non-stream |
| `POST /orb/standalone/actions/run` | `orb_action_engine_service.run_action` | Yes | Yes (care-related / non-general depth) | Yes | `indicare_intelligence_core` on payload |
| `POST /assistant/orb/conversation` | `orb_operational_assistant_service.answer` | Yes | Yes | Yes | Permission-scoped OS records; Core prompt block in operational prompt |
| `POST /orb/dictate/generate` | `orb_dictate_service.generate_dictate_note` | Yes (transcript packet) | Via recording quality checks | N/A (dictate) | `brain_metadata.indicare_intelligence_core` |
| Voice transcript → chat | Frontend `sendMessage` | Yes (server) | Yes (server) | Yes | Transcript treated as typed message |
| Dictate transcript → generate | Dictate routes | Yes | Recording quality/missingness | N/A | Core prompt in generate system/user |

## Shared helper

`services/indicare_intelligence_route_finalize_service.py`:

- `intelligence_context_summary()` — API-safe metadata for `context_used.indicare_intelligence_core`
- `finalize_standalone_intelligence()` — quality gate, optional answer fixes, learning ledger
- `merge_intelligence_into_context()` — consistent context merge

## Legacy `expert_brain_9`

Still emitted on retrieval bundles as an alias to `orb9_packet` for backward compatibility. New clients should read `indicare_intelligence_core` or `indicare_intelligence` on `context_used`.

## OS operational path

Uses the same Core packet and post-answer gate as standalone, while **grounding answers only in permissioned OS evidence**. Quality gate fixes for fake OS access are not applied as standalone disclaimers (OS path may legitimately reference records).

## Tests

- `tests/test_indicare_intelligence_route_parity.py`
- `tests/test_indicare_voice_dictation_intelligence_parity.py`
- `tests/test_indicare_orb_frontend_core_metadata.py`

## Non-goals (unchanged)

- No random scraping
- No auto-update of statutory/safeguarding/medical/legal corpora
- No Ofsted grade prediction or diagnosis
