# ORB Residential — Shared Brain Migration Plan

**Product:** ORB Residential — powered by IndiCare Intelligence  
**Phase 1 scope:** Architecture foundation + Dictate proof case  
**Last verified:** 2026-06-15 (code audit)

---

## 1. Core standard

Chat, Dictate, Voice, and Write must share:

| Concern | Shared requirement |
|---------|-------------------|
| Brain decision | Real `orb_brain_convergence_orchestrator` decision before generation |
| Prompt policy | Central registry; no new inline prompt strings |
| Model policy | Capability tier via `ai_provider_registry` / router |
| Knowledge / RAG | Via brain convergence + retrieval hooks where applicable |
| Safeguarding / governance | `try_governed_draft_text`, redaction, recording contracts |
| Memory / session | Per-surface today; Phase 5 unifies |
| Output metadata | Reflects actual decision used for generation |

The child remains central. ORB supports adults; it does not replace professional judgement.

---

## 2. Current route → service → model paths

### 2.1 Standalone ORB chat (converged)

| Step | Location |
|------|----------|
| Route | `POST /orb/standalone/conversation` — `routers/orb_standalone_routes.py` |
| Brain decision | `orb_brain_convergence_orchestrator_service.build_brain_decision` |
| Prompt assembly | `orb_converged_general_assistant_service` + intelligence core |
| Model selection | `ai_model_router_service` via converged assistant |
| Knowledge / RAG | Brain orchestrator retrieval hooks |
| Governance | Standalone safety + intelligence finalize |
| Metadata | `orb_brain_metadata_service.build_brain_metadata` |

**Status:** ✅ **Already converged**

### 2.2 Legacy OS chat (not converged)

| Step | Location |
|------|----------|
| Route | Legacy chat routes → `services/ai_service.py` |
| Brain decision | Orchestrator path; **not** full brain convergence |
| Prompt assembly | Inline / legacy orchestrator |
| Model selection | `generate_ai_stream` internal routing |
| Knowledge / RAG | Partial / legacy |
| Governance | Varies by route |
| Metadata | Partial |

**Status:** ❌ **Not converged** — Phase 4

### 2.3 Dictate generate (Phase 1 target)

**Before Phase 1:**

| Step | Location |
|------|----------|
| Route | `POST /orb/dictate/generate` — `routers/orb_dictate_routes.py` |
| Service | `services/orb_dictate_service.generate_dictate_note` |
| Brain decision | `_dictate_brain_metadata` → `orb_document_brain_adapter_service.build_document_brain_context` → orchestrator (**metadata only, parallel to generation**) |
| Prompt assembly | `_build_generate_prompt` inline in `orb_dictate_service.py` |
| Model selection | `ORB_DICTATE_MODEL` env default `gpt-4.1-mini` hardcoded in dictate service |
| Generation | `try_governed_draft_text` → `ai_gateway_service` |
| Post-gen | `_finalize_dictate_text` → `finalize_document_intelligence` |
| Governance | Recording contract, intelligence packet, governed draft gate |

**Status (before):** ⚠️ **Partially converged / cosmetic metadata** — brain decision ran for metadata but LLM path bypassed unified gateway and model router.

**After Phase 1:**

| Step | Location |
|------|----------|
| Route | Unchanged |
| Service | `generate_dictate_note` → `orb_unified_brain_gateway.generate_dictate_draft` |
| Brain decision | Gateway calls orchestrator **before** generation; metadata from same decision |
| Prompt assembly | `orb_prompt_registry.build_dictate_generate_prompt` |
| Model selection | Gateway `resolve_dictate_model` via `ai_provider_registry` (env override documented as temporary) |
| Generation | Gateway → `try_governed_draft_text` |
| Post-gen | Unchanged in dictate service |

**Status (after):** ✅ **Dictate generate converged** via unified gateway

### 2.4 Dictate edit / improve

| Step | Location |
|------|----------|
| Service | `services/orb_dictate_edit_service.py` |
| Path | Same pattern as generate: governed draft + document brain adapter metadata |

**Status:** ⚠️ **Partially converged** — Phase 1.1 (not migrated in Phase 1)

### 2.5 Write

| Step | Location |
|------|----------|
| Routes | ORB Write routes |
| Service | Write services using `try_governed_draft_text` + document brain adapter |
| Model | Feature-specific env / hardcoded |

**Status:** ⚠️ **Partially converged** — Phase 2

### 2.6 Voice transcript / response

| Step | Location |
|------|----------|
| Route | `POST /orb/standalone/conversation` (voice mode) + voice station |
| Brain | Standalone converged path when using standalone conversation |
| Transcription | Server/browser transports (not reasoning) |

**Status:** ✅ **Chat intelligence converged** when using standalone; ⚠️ transcript-only paths separate — Phase 3

### 2.7 Voice TTS (playback only)

| Step | Location |
|------|----------|
| Route | `POST /orb/voice/tts` |
| Model | Direct OpenAI TTS SDK |

**Status:** ✅ **Acceptable** — playback only, not reasoning

---

## 3. Surface convergence matrix

| Surface | Brain decision | Prompt registry | Model policy | Governance | Metadata truth |
|---------|---------------|-----------------|--------------|------------|----------------|
| Standalone chat | ✅ Real | ⚠️ Inline (converged assistant) | ✅ Router | ✅ | ✅ |
| Legacy chat | ❌ Partial | ❌ | ⚠️ Legacy | ⚠️ | ⚠️ |
| Dictate generate | ✅ Gateway (Phase 1) | ✅ Registry (Phase 1) | ✅ Gateway (Phase 1) | ✅ | ✅ |
| Dictate edit | ⚠️ Parallel metadata | ❌ Inline | ⚠️ Hardcoded | ✅ | ⚠️ Cosmetic |
| Write | ⚠️ Parallel metadata | ❌ Inline | ⚠️ Hardcoded | ✅ | ⚠️ Cosmetic |
| Voice intelligence | ✅ Via standalone | ⚠️ Inline | ✅ Router | ✅ | ✅ |
| Voice TTS | N/A | N/A | TTS-only | N/A | N/A |

---

## 4. Phase 1 deliverables

### 4.1 `services/orb_unified_brain_gateway.py`

Stable internal contract:

- `OrbUnifiedBrainRequest` — surface, mode, user_text, contexts, metadata, response_format
- `OrbUnifiedBrainResponse` — text, structured, brain_decision, model_used, knowledge_used, safety_flags, etc.
- `generate_dictate_draft(...)` — Dictate proof case entry point

Flow: **brain decision first** → prompt registry → governed generation → unified response metadata.

### 4.2 `services/orb_prompt_registry.py`

Registers Dictate prompt templates. Legacy `_build_generate_prompt` delegates here.

### 4.3 Tests

- Dictate calls unified gateway
- Real brain metadata (not cosmetic-only path)
- No hardcoded model in dictate service
- Response shape preserved
- Safeguarding / recording constraints intact

---

## 5. Future phases (do not implement in Phase 1)

### Phase 2 — Write → unified brain gateway

Migrate ORB Write draft generation to `orb_unified_brain_gateway` with `surface="write"`. Register Write prompts in `orb_prompt_registry`.

### Phase 3 — Voice transcript → gateway → TTS

Route voice intelligence transcript processing through gateway before TTS. Keep TTS as playback-only.

### Phase 4 — Legacy chat → unified brain gateway

Replace `generate_ai_stream` paths with gateway; preserve streaming via `response_format="stream"`.

### Phase 5 — Shared memory / session continuity

Unify session context across Chat, Dictate, Voice, Write where appropriate (child-centred, RBAC-scoped).

---

## 6. Non-negotiables (all phases)

- Do not break existing public APIs, iOS, auth/RBAC
- Do not store raw audio by default
- Do not auto-save outputs
- Do not weaken safety, redaction, or governance
- Compatibility wrappers where needed
- Small, reviewable diffs

---

## 7. Key files reference

| Purpose | File |
|---------|------|
| Brain orchestrator | `services/orb_brain_convergence_orchestrator_service.py` |
| Document surfaces adapter | `services/orb_document_brain_adapter_service.py` |
| Brain metadata | `services/orb_brain_metadata_service.py` |
| Governed draft gate | `services/ai_external_call_governance.py` |
| Model registry | `services/ai_provider_registry.py` |
| Model router (chat) | `services/ai_model_router_service.py` |
| Dictate service | `services/orb_dictate_service.py` |
| Unified gateway (Phase 1) | `services/orb_unified_brain_gateway.py` |
| Prompt registry (Phase 1) | `services/orb_prompt_registry.py` |
