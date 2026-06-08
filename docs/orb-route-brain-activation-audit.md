# ORB Route + Brain Activation Audit

**Date:** June 2026  
**Scope:** Full ORB Residential brain activation and therapeutic language contract convergence across Chat, Voice, Dictate, Write, actions and templates.

## Core principle

ORB Residential must answer as:

- a **general assistant** by default (ChatGPT-style)
- a **specialist children's homes assistant** when residential/care context is detected
- a **therapeutic, person-centred, Ofsted-ready recording assistant** when asked to record/write/explain incidents
- **never** a generic advice bot for residential scenarios

---

## Contract layers

| Contract | Module | Purpose |
|----------|--------|---------|
| Brain route decision | `services/orb_brain_route_service.py` | Server-authoritative route metadata (`general_assistant`, `residential_specialist`, `live_lookup`, `document_workspace`) |
| Dual-brain framing | `services/orb_standalone_brain_service.py` | Activates specialist brains, response contracts, knowledge domains |
| Converged intelligence | `services/orb_residential_intelligence_service.py` | Standalone/OS intelligence spine: contracts, knowledge, recording/therapeutic blocks |
| No-invented-facts | `services/orb_recording_contract_service.py` | Recording safety: placeholders, incident scaffolds, heuristic validation |
| Therapeutic language | `services/orb_therapeutic_language_contract_service.py` | Person-centred language, shorthand translation, residential incident headings |
| Ofsted/recording quality | `services/orb_residential_quality_service.py` | Post-hoc quality checks, missing capture prompts, Ofsted-readiness summary |
| Response shape | `assistant/response_contracts.py` | Per-mode section contracts (incident, safeguarding, recording, etc.) |
| Legacy OS prompts | `assistant/prompts.py` | OS-linked assistant (parallel stack; therapeutic rules aligned) |

---

## Entrypoint audit matrix

| Entrypoint | `decide_orb_brain_route()` | Shared ORB brain | Residential enrichment | No-invented-facts | Therapeutic contract | Ofsted/quality layer | Bypass risk | Tests |
|------------|---------------------------|------------------|------------------------|-------------------|---------------------|---------------------|-------------|-------|
| `POST /orb/standalone/conversation` | Yes (metadata) | Yes — `orb_converged_general_assistant_service` → `orb_residential_intelligence_service` | Yes via intelligence + standalone brain | Yes — recording contract in prompt | Yes — therapeutic + residential scenario blocks | Post-answer via `process_answer`; explicit `/quality-check` | Fast tier skips some blocks; plan-limit fallback | `test_orb_brain_activation_therapeutic_contract.py`, `test_orb_residential_convergence.py` |
| `POST /orb/standalone/conversation/stream` | Same as above | Same | Same | Same | Same | Same | SSE→POST fallback **fixed** to preserve `source_surface`/`client_route_hint` | `test_orb_fast_opening_stream_completion.py`, frontend source scan |
| `POST /orb/standalone/brain-route` | Yes (authoritative) | N/A (classification only) | Via `orb_standalone_brain_service.frame()` | No | No | No | Does not execute LLM | `test_orb_brain_route_authoritative.py` |
| `POST /orb/standalone/actions/run` | No (action path) | Yes — `orb_action_engine_service` | Yes — vaults, expert brain, standalone brain | Yes — in action prompts | Yes — system prompt for recording/safeguarding actions | Via `finalize_standalone_intelligence` | Frontend prefill fallback if action fails | `test_orb_brain_activation_therapeutic_contract.py` |
| `POST /orb/dictate/generate` | No (implicit document) | Yes — `orb_document_brain_adapter_service` | Yes — intelligence packet | Yes — `build_recording_contract_prompt_block` | Yes — therapeutic contract in generate/edit prompts | `compute_quality_checks` post-generation | Offline `_fallback_generate` uses safe scaffold | `test_orb_dictate_routes.py`, `test_orb_incident_report_no_invented_facts.py` |
| `POST /orb/dictate/edit` | No | Yes — document brain adapter | Yes | Yes | Yes — therapeutic contract in `_build_edit_prompt` | `compute_quality_checks` | Offline `_fallback_edit` | `test_orb_brain_activation_therapeutic_contract.py` |
| `POST /orb/dictate/analyze` | No | Yes — document adapter | Yes | Heuristic only | Heuristic (`orb_dictate_quality`) | `orb_residential_quality_service` prompts | Transcribe-only path has no LLM | `test_orb_dictate_brain_analysis.py` |
| `POST /orb/dictate/finalise` | No | Yes | Yes | Yes | Yes | Yes | Export markdown — no AI | `test_orb_dictate_finalise_handoff.py` |
| ORB Write panel | Frontend → dictate API | Same as dictate | Same | Same | Same | Same | Local offline fallbacks | `test_orb_write_standalone_handoff.py` |
| Voice (realtime) | Via parent `askOrbBrain` | Yes — brain-routed transcription | Same as chat | Same | Same | Same | Browser PTT fallback is local only | `test_orb_residential_convergence.py` |
| `frontend-next/lib/orb/orb-brain-router.ts` | Sends hints only | `askOrbBrain` → stream/POST | `routeOrbBrainIntent` (telemetry) | N/A | N/A | N/A | Client hint cannot override backend | `orb-brain-router.test.ts` |
| `frontend-next/lib/orb/dictate/orb-dictate-client.ts` | Separate document lane | Document brain adapter | Yes | Yes | Yes | Yes | Local fallbacks on API failure | `test_orb_dictate_brain_parity.py` |

---

## Observed prompt fix

**Prompt:** `Jamie kicked off today after family time`

### Root cause (before fix)

- No explicit "incident report" wording → `is_incident_report_draft_request()` was false
- No residential keywords in `_contains_residential_signal()` → routed to `general_knowledge`
- Guidance contract produced generic advice ("challenging moment") instead of recording scaffold

### Fix applied

1. `is_residential_incident_scenario()` detects child name + adult shorthand + family time
2. Standalone brain routes to `residential_specialist` and activates `recording_quality_brain` + `therapeutic_language_brain`
3. `build_residential_scenario_prompt_block()` enforces therapeutic + no-invented-facts structure
4. `build_safe_residential_scenario_scaffold()` provides deterministic recording-ready fallback
5. Knowledge retrieval flags `recording_intent` for classification
6. Fast opening states shorthand must be clarified

### Expected response shape

1. Immediate safety and regulation (brief)
2. Shorthand clarification (`kicked off` → observable behaviour needed)
3. What is known
4. What needs clarifying
5. Recording wording scaffold (no invented facts)
6. Child voice / adult response / safeguarding / follow-up prompts

---

## Action buttons audit

| Action | Frontend | Backend | Full brain | No-invented-facts | Therapeutic contract |
|--------|----------|---------|------------|-------------------|---------------------|
| Record this properly | Mode change + chat / `convert_to_recording_wording` | `/actions/run` or chat | Yes | Yes | Yes |
| Manager oversight | `/actions/run` `create_manager_oversight_note` | Action engine | Yes | Yes | Yes |
| Convert to recording wording | `/actions/run` | Action engine | Yes | Yes | Yes |
| What am I missing? | `/actions/run` | Action engine | Yes | Yes | Yes |
| Add safeguarding lens | `/actions/run` | Action engine | Yes | Yes | Yes |
| Open in ORB Write | Session handoff only | N/A (user completes in Write) | Write uses dictate brain on generate | Yes in Write | Yes in Write |
| Use as template | Composer prefill | N/A | User-initiated | N/A | N/A |

**Gap fixed:** SSE→POST fallback in `orb-care-companion.tsx` now calls `buildOrbBrainConversationRequest` so brain hints are not dropped.

**Remaining intentional gaps (not bugs):**

- Intelligence CTAs that only change mode (no auto-send)
- Tools panel items that prefill composer instead of calling `/actions/run`
- Voice post-session handoffs (Dictate/Write with prefilled text)

---

## General assistant preservation

These prompts must **not** force residential framing:

| Prompt | Route | Test |
|--------|-------|------|
| Explain quantum computing simply | `general_assistant` | `test_general_prompts_remain_general_assistant` |
| Write a friendly email | `general_assistant` | same |
| Help me plan my week | `general_assistant` | same |

---

## Test matrix (PART 5)

| # | Prompt | Coverage |
|---|--------|----------|
| 1 | Jamie kicked off today after family time | Route, scaffold, contracts, fast opening |
| 2 | Jamie incident report draft | Document/residential route, incident contract |
| 3 | Young person refused school and kicked off | Residential brain activation |
| 4 | Manager oversight note for Jamie | Action prompt contract |
| 5 | Turn into recording wording: played up | Action shorthand rules |
| 6 | What am I missing from incident record | Action therapeutic system prompt |
| 7 | Voice transcript route | Voice/chat route parity test |
| 8 | Dictate generate | Generate prompt + fallback scaffold |
| 9 | Dictate edit: therapeutic | Edit prompt contract |
| 10 | ORB Write Ofsted-readiness | Quality layer via `run_residential_quality_check` |

**Test file:** `tests/test_orb_brain_activation_therapeutic_contract.py`

---

## Gaps fixed in this pass

1. Short residential behaviour scenarios (e.g. Jamie + kicked off + family time) now activate full residential brain
2. Central therapeutic language contract module created and wired across chat, dictate, write, actions
3. `kicked off` / `played up` shorthand detection aligned with `kicking off`
4. `family time` recognised as residential context
5. Incident contract mode forced for residential scenarios in converged intelligence
6. Generic headings (`Good Practice`, `What to Do Now`) forbidden in guidance/incident contracts
7. SSE fallback preserves brain routing hints
8. Fast opening for shorthand + family time scenarios
9. Knowledge retrieval `recording_intent` for shorthand scenarios

---

## Files changed

- `services/orb_therapeutic_language_contract_service.py` (new)
- `services/orb_recording_contract_service.py`
- `services/orb_standalone_brain_service.py`
- `services/orb_residential_intelligence_service.py`
- `services/orb_knowledge_retrieval_service.py`
- `services/orb_fast_opening_service.py`
- `services/orb_action_engine_service.py`
- `services/orb_dictate_edit_service.py`
- `assistant/response_contracts.py`
- `assistant/prompts.py`
- `frontend-next/components/orb-standalone/orb-care-companion.tsx`
- `tests/test_orb_brain_activation_therapeutic_contract.py` (new)
- `docs/orb-route-brain-activation-audit.md` (this file)
