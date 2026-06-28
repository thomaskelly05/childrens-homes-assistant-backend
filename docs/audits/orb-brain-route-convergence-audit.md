# ORB Brain Route Convergence Audit

**Date:** 2026-06-28  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Phase:** 1 — mapping only (no broad rewiring)  
**Prior governance:** PRs #1791–#1796 (realtime egress, NR-1 guards)

---

## Executive summary

ORB Residential standalone surfaces (Chat, Dictate, Write, Communicate, and most Voice specialist paths) **converge through one canonical brain decision layer**: `orb_brain_convergence_orchestrator_service.build_brain_decision`, with LLM execution via `orb_converged_general_assistant_service` (chat) or `orb_unified_brain_gateway` (dictate/write).

**OS-embedded assistants** (`/assistant/os/*`, legacy `/assistant-api/*`, `/assistant/general/stream`) use a **separate stack**: `assistant_orchestrator` → `ai_service.generate_ai_stream` / `assistant_general_service`. They carry richer live child/home/provider context but **do not** use the convergence orchestrator.

**Legacy `/orb/conversation`** and **unmounted dangerous realtime modules** remain the highest-risk divergence points.

| Category | Count |
|----------|-------|
| Routes audited (matrix rows) | 38 |
| Already converged (keep as-is) | 11 |
| Converge soon | 10 |
| Add context | 2 |
| Add tests | 3 |
| Retire | 9 |
| Phase 2D safety | 5 |

**NR-1 status:** Open — governed realtime routes from #1791–#1796 remain in place; unmounted `/assistant/realtime/*` modules guarded by tests.  
**Public promise:** Blocked — not drafted or published in this pass.

---

## Core principle verified

> One ORB brain. Multiple safe entry points.

| Entry point | Converged brain? | Notes |
|-------------|------------------|-------|
| Chat (`/orb/standalone/conversation`) | **Yes** | Canonical path |
| Voice respond (`/orb/voice/respond`) | **Tiered** | `voice_fast` skips convergence; specialist/safeguarding uses it |
| Dictate/Write (`/orb/dictate/*`) | **Yes** | Via `orb_unified_brain_gateway` |
| Communicate (`/orb/communicate/*`) | **Yes** (metadata) | Deterministic templates; no LLM on support-pack |
| OS young-people/home/quality assistants | **No** | `assistant_orchestrator` stack |
| AI Suite general stream | **No** | `assistant_general_service` |
| OS operational ORB (`/assistant/orb/*`) | **Partial** | Standalone brain blocks, not full orchestrator |

---

## Route convergence matrix

Machine-readable source: `services/orb_brain_route_convergence_audit_service.py`

| Route | Module | Active | Surface | Access | Brain / orchestrator | Context | Intent | Safety | RAG | Governed egress | Risk | Recommendation | Phase |
|-------|--------|--------|---------|--------|---------------------|---------|--------|--------|-----|-----------------|------|----------------|-------|
| POST /orb/standalone/conversation | orb_standalone_routes | active | orb_standalone_chat | orb_residential | convergence → converged general assistant | user, mode, surface hints; no OS | Yes | scaffold + contracts + finalization | OKR + SICR | model router | low | keep_as_is | — |
| POST /orb/standalone/conversation/stream | orb_standalone_routes | active | orb_standalone_chat_stream | orb_residential | same as sync | same | Yes | same | same (fast skips SICR) | model router stream | low | keep_as_is | — |
| POST /orb/standalone/brain-route | orb_standalone_routes | active | brain_preview | auth | build_brain_decision only | message, mode | Yes | metadata boundaries | trace only | none | low | keep_as_is | — |
| POST /orb/standalone/actions/run | orb_standalone_routes | active | actions | auth | action_engine → build_brain_decision | action, message, mode | Yes | action guardrails | action-specific | model router | medium | keep_as_is | — |
| POST /orb/residential/conversation | orb_residential_premium_routes | active | premium | orb_residential | converged general assistant | message, mode, doc | Yes | finalization | OKR | model router | low | keep_as_is | — |
| POST /orb/dictate/generate | orb_dictate_routes | active | dictate | auth | unified_brain_gateway → adapter → orchestrator | note_type, transcript | Yes | redaction + contracts | vaults | governed draft | medium | keep_as_is | — |
| POST /orb/dictate/finalise | orb_dictate_routes | active | dictate | auth | dictate → gateway | session | Yes | same | vaults | governed draft | medium | keep_as_is | — |
| POST /orb/dictate/edit | orb_dictate_routes | active | dictate_edit | auth | gateway edit | document, note_type | Yes | contracts | blocks | governed draft | medium | keep_as_is | — |
| POST /orb/dictate/prepare-write | orb_dictate_routes | active | write | auth | gateway metadata | note_type, text | Yes | boundary | none | none | low | keep_as_is | — |
| POST /orb/dictate/realtime/session | orb_dictate_routes | active | dictate_realtime | auth | session issue only | user | No | realtime gov (#1793) | none | FEATURE_ORB_DICTATE_REALTIME | medium | add_tests | — |
| POST /orb/voice/respond | orb_voice_residential_routes | active | voice | auth | voice_brain_router → respond (tiered) | mode, transcript, memory | Yes | scaffold + protocols | policy phrases | governed draft | medium | add_context | 2 |
| POST /orb/voice/v2/respond | orb_voice_v2_routes | active | voice_v2 | auth | v2 → respond | + personality | Yes | same | same | governed draft | medium | add_context | 2 |
| WS /orb/voice/ws/{id} | orb_voice_residential_routes | active | voice_realtime | auth | provider WS handler | session | No | session gov (#1792) | none in-session | FEATURE_ORB_REALTIME_VOICE | high | phase_2d_safety | 2d |
| POST /orb/voice/realtime/session | orb_voice_residential_routes | active | voice_realtime | auth | session issue | profile, mode | No | realtime gov | none | FEATURE_ORB_REALTIME_VOICE | medium | add_tests | — |
| POST /orb/communicate/converge | orb_communicate_routes | active | communicate | auth | orchestrator metadata | text, workflow | Yes | boundaries | chips | none | low | keep_as_is | — |
| POST /orb/communicate/support-pack | orb_communicate_routes | active | communicate | auth | deterministic + metadata | situation, audience | Yes | safeguarding | chips | none | low | keep_as_is | — |
| POST /orb/standalone/agents/run | orb_agent_routes | active | agents | auth | agent_orchestrator (partial) | agent_type, prompt | Yes | governance events | RAG + packs | model router | medium | converge_soon | 2 |
| POST /orb/standalone/agents/deep-research | orb_agent_routes | active | agents | auth | deep_research → orchestrator | prompt | Yes | governance | multi-pass RAG | model router | medium | converge_soon | 2 |
| POST /orb/standalone/documents/intelligence | orb_document_routes | active | documents | auth | document_intelligence + metadata | doc, lens | Yes | boundary | doc understanding | model router | medium | add_tests | — |
| POST /orb/standalone/templates/{id}/generate | orb_template_routes | active | templates | auth | template service + metadata | template inputs | Yes | template guards | template | model router | medium | converge_soon | 2 |
| POST /orb/standalone/shift-builder/generate | orb_shift_builder_routes | active | shift_builder | auth | shift_builder → action engine | notes | No | conditional | limited | model router | medium | converge_soon | 2 |
| POST /assistant/orb/conversation | orb_operational_routes | active | os_orb | permissioned OS | operational_assistant (partial) | child/home/staff | Yes | privacy + permissions | universal evidence | model router | medium | converge_soon | 2 |
| POST /assistant/orb/operational | orb_operational_routes | active | os_orb_bridge | permissioned | intelligence_bridge | scope | Yes | audit | evidence | operational | medium | converge_soon | 2 |
| POST /orb/conversation | orb_routes | **legacy** | legacy_os_orb | auth | general_assistant direct | minimal | No | basic | legacy | model router | **high** | **retire** | 3 |
| POST /orb/session/start | orb_routes | legacy | legacy_voice | auth | session (#1795) | config | No | realtime gov | none | governed | medium | retire | 3 |
| POST /orb/realtime/session | orb_routes | legacy | legacy_realtime | auth | session (#1794) | config | No | realtime gov | none | governed | medium | retire | 3 |
| WS /orb/realtime/ws | orb_routes | legacy | legacy_realtime | auth | legacy WS | session | No | partial | none | legacy | **high** | phase_2d_safety | 2d |
| POST /assistant/general/stream | assistant_general_routes | active | ai_suite | auth + scope | assistant_general_service | yp/home/project | Yes | escalation + injection | knowledge_loader | llm_provider | medium | converge_soon | 2 |
| POST /assistant/os/young-people/stream | assistant_os_routes | active | os_yp | child access | orchestrator → generate_ai_stream | yp, home, evidence | Yes | scope + grounding | evidence index | generate_ai_stream | medium | converge_soon | 2 |
| POST /assistant/os/home/stream | assistant_os_routes | active | os_home | home scope | orchestrator → stream | home evidence | Yes | same | home retrieval | generate_ai_stream | medium | converge_soon | 2 |
| POST /assistant/os/quality/stream | assistant_os_routes | active | os_quality | quality scope | orchestrator → stream | quality scope | Yes | same | reg evidence | generate_ai_stream | medium | converge_soon | 2 |
| POST /assistant-api/young-people/assistant | assistant_routes | **legacy** | os_yp dup | same as OS | orchestrator → stream | same | Yes | same | same | generate_ai_stream | medium | **retire** | 3 |
| POST /assistant-api/home/assistant | assistant_routes | legacy | os_home dup | same | orchestrator → stream | same | Yes | same | same | generate_ai_stream | medium | retire | 3 |
| POST /assistant-api/quality/assistant | assistant_routes | legacy | os_quality dup | same | orchestrator → stream | same | Yes | same | same | generate_ai_stream | medium | retire | 3 |
| POST /young-people/assistant | young_people_assistant_routes | **unmounted** | os_yp | — | would use stream | yp | Yes | — | evidence | stream | high | retire | 3 |
| POST /assistant/query | assistant_query_routes | unmounted | legacy query | — | AssistantResponseService | query | No | unknown | AssistantRetrieval | legacy | high | retire | 3 |
| WS /assistant/realtime/ws | assistant_realtime_proxy_routes | **unmounted** | dangerous | — | raw websockets.connect | none | No | **none** | none | **BYPASS** | **critical** | phase_2d_safety | 2d |
| POST /assistant/realtime/session | assistant_realtime_voice_routes | unmounted | dangerous | — | ungoverned ephemeral session | none | No | none | none | BYPASS | critical | phase_2d_safety | 2d |
| POST /v1/assistant/respond | assistant_partner_api | unmounted | partner | API key | partner path | payload | No | partner auth | unknown | unknown | high | phase_2d_safety | 2d |

---

## A. Routes already converged (keep as-is)

1. `POST /orb/standalone/conversation`
2. `POST /orb/standalone/conversation/stream`
3. `POST /orb/standalone/brain-route` (+ debug/map/qa-run)
4. `POST /orb/standalone/actions/run`
5. `POST /orb/residential/conversation`
6. `POST /orb/dictate/generate`, `/finalise`, `/edit`, `/prepare-write`
7. `POST /orb/communicate/converge`, `/support-pack`

These use `orb_brain_convergence_orchestrator_service` (directly or via `orb_unified_brain_gateway`) and residential finalization where LLM output is produced.

---

## B. Converge soon (active, inconsistent brain)

| Route | Current gap |
|-------|-------------|
| `POST /orb/standalone/agents/run` | Intelligence packet path; not full `build_brain_decision` |
| `POST /orb/standalone/agents/deep-research` | Same |
| `POST /orb/standalone/templates/{id}/generate` | Template service separate from orchestrator LLM path |
| `POST /orb/standalone/shift-builder/generate` | Partial via action engine |
| `POST /assistant/orb/conversation` | `orb_standalone_brain_service` blocks only |
| `POST /assistant/orb/operational` | Bridge service, no orchestrator |
| `POST /assistant/general/stream` | AI Suite stack |
| `POST /assistant/os/*/stream` (×3) | `assistant_orchestrator` stack |

---

## C. Add context (right brain, missing metadata)

| Route | Missing |
|-------|---------|
| `POST /orb/voice/respond` | `voice_fast` tier skips convergence; lacks full surface/feature/task metadata on fast path |
| `POST /orb/voice/v2/respond` | Same tiered behaviour |

---

## D. Add tests (likely correct, unprotected)

| Route | Suggested test |
|-------|----------------|
| `POST /orb/dictate/realtime/session` | Brain-route mapping + governed session assertion (extends #1793 guards) |
| `POST /orb/voice/realtime/session` | Same (extends #1792 guards) |
| `POST /orb/standalone/documents/intelligence` | Convergence metadata contract on all lenses |

Existing coverage: `test_orb_brain_routing_convergence.py`, `test_orb_brain_convergence_orchestrator.py`, `test_orb_dictate_brain_parity.py`, realtime egress guards (#1791–#1796).

---

## E. Retire (legacy, should not remain active)

| Route | Reason |
|-------|--------|
| `POST /orb/conversation` | No convergence/finalization; superseded by `/orb/standalone/conversation` |
| `POST /orb/session/start`, `/orb/realtime/session`, `WS /orb/realtime/ws` | Legacy Orb Voice Assistant; superseded by `/orb/voice/*` |
| `POST /assistant-api/young-people/home/quality/assistant` | Duplicates `/assistant/os/*/stream` |
| `POST /young-people/assistant` (unmounted file) | Dead duplicate |
| `POST /assistant/query` (unmounted) | Legacy query stack |

Retired registry entries (61 modules) are skipped at load when files absent — see `RETIRED_COMPATIBILITY_ROUTERS` in `core/router_loader.py`.

---

## F. Phase 2D safety hardening

| Route / module | Risk |
|----------------|------|
| `WS /assistant/realtime/ws` (`assistant_realtime_proxy_routes`) | Direct `websockets.connect` + `OPENAI_API_KEY`; no governed egress |
| `POST /assistant/realtime/session` (`assistant_realtime_voice_routes`) | Ungoverned ephemeral session |
| `WS /orb/voice/ws/{session_id}` | Raw provider text in-session |
| `WS /orb/realtime/ws` | Legacy realtime websocket |
| `POST /v1/assistant/respond` (unmounted partner API) | Unknown egress if remounted |

Guarded by: `UNMOUNTED_DANGEROUS_ASSISTANT_REALTIME_ROUTERS`, `test_assistant_realtime_router_guard.py`.

---

## Brain gap analysis

| Gap | Routes | Detail |
|-----|--------|--------|
| OS assistants bypass convergence | `/assistant/os/*`, `/assistant-api/*`, `/assistant/general/stream` | Separate `assistant_orchestrator` stack |
| Legacy ORB conversation | `POST /orb/conversation` | Direct `orb_general_assistant_service` |
| Voice fast tier | `POST /orb/voice/respond` | Latency trade-off skips orchestrator |
| Agents partial convergence | `/orb/standalone/agents/*` | Intelligence packet ≠ full decision |
| Operational ORB partial | `/assistant/orb/conversation` | Brain blocks without orchestrator |
| Duplicate OS paths | assistant-api vs assistant/os | Same handlers, two prefixes |
| Duplicate retrieval | standalone vs OS | OKR vs evidence index |
| Realtime in-session raw text | voice/realtime WS | No finalization until handoff |
| Unmounted dangerous realtime | `/assistant/realtime/*` | Files exist; must not mount |

---

## Duplicated retrieval / context paths

1. **Standalone chat:** `orb_knowledge_retrieval_service.prepare_request_bundle` + `shared_institutional_cognition_runtime`
2. **OS assistants:** `build_runtime_assistant_context` + evidence index
3. **Agents:** `orb_rag_retrieval_service` (separate from chat OKR)
4. **AI Suite:** `assistant/knowledge_loader` module selection

Phase 2 should unify retrieval **planning** through convergence metadata while preserving standalone vs OS data boundaries.

---

## Voice / Dictate / Chat / Write — same brain?

| Surface | Shared residential brain? | Execution path |
|---------|---------------------------|----------------|
| Chat | **Yes** | convergence orchestrator → converged general assistant |
| Dictate/Write | **Yes** | unified brain gateway → document adapter → orchestrator |
| Communicate | **Yes** (metadata) | orchestrator; templates deterministic |
| Voice respond | **Tiered** | fast = lightweight; specialist = orchestrator + governed draft |
| Voice realtime WS | **No** (in-session) | Provider SDK; handoff to chat/dictate for converged answers |

---

## Recommended next build sequence

1. **Phase 1 (this PR):** Matrix + guard tests — complete.
2. **Phase 2a:** Wire `build_brain_decision` into agents, templates, shift-builder, operational ORB — metadata parity first.
3. **Phase 2b:** OS assistant convergence adapter — wrap `assistant_orchestrator` with convergence metadata without breaking evidence boundaries.
4. **Phase 2c:** Retire `POST /orb/conversation` and `/assistant-api/*` duplicates behind compatibility redirects.
5. **Phase 2d:** Harden voice/realtime in-session paths; delete or permanently quarantine unmounted realtime modules.
6. **Phase 3:** Retire legacy `/orb/*` session routes after client migration telemetry confirms zero traffic.

---

## Checks run (this PR)

| Check | Command |
|-------|---------|
| New convergence audit tests | `pytest tests/test_orb_brain_route_convergence_audit.py` |
| Existing ORB stream / brain tests | `pytest tests/test_orb_brain_routing_convergence.py tests/test_orb_brain_convergence_orchestrator.py -q` |
| Model router tests | `pytest tests/test_ai_model_router* -q` (if present) |
| NR-1 governance tests | `pytest tests/test_ai_egress_audit_guard.py tests/test_assistant_realtime_router_guard.py tests/test_ai_governed_egress*.py -q` |
| AI egress audit | `python3 scripts/ai_egress_audit.py` |
| py_compile | `python3 -m compileall -q services/orb_brain_route_convergence_audit_service.py tests/test_orb_brain_route_convergence_audit.py` |
| Ruff | `ruff check` on changed files |

---

## Safety statement

- **No routes removed** in this pass.
- **No frontend behaviour changed.**
- **No ORB Voice/Dictate/Write/Communicate/Chat UI changed.**
- **NR-1 governance controls not weakened** — unmounted realtime guards preserved.
- **Governed realtime routes not modified** — only mapping tests added.

**NR-1:** Remains open.  
**Public promise:** Remains blocked.
