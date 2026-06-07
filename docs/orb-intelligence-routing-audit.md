# ORB Intelligence Routing Audit

**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Sprint type:** Audit · Measure · Design · Document (no production behaviour change)  
**Date:** June 2026

---

## Executive summary

ORB standalone intelligence is strong but **over-activates the full brain** for many requests. Three parallel depth systems (`prompt_tier`, `expert_depth`, agent `depth`) converge on similar outcomes but are computed independently, and **retrieval runs multiple times per request** on the conversation path.

The recommended model is a unified **Quick / Standard / Deep** tier (mapped to existing `fast` / `residential` / `deep` infrastructure) with a new `orb_brain_selection_service` as the single classification entry point — **designed but not yet wired to production**.

| Tier | Target perceived time | Current equivalent | Main gap |
|------|----------------------|-------------------|----------|
| **Quick** | 1–3 s | `prompt_tier=fast`, `expert_depth=general_light` | Too few queries reach fast; intelligence core still runs |
| **Standard** | 3–8 s | `prompt_tier=residential`, `expert_depth=residential_*` | Duplicate retrieval; large prompt stacks |
| **Deep** | 10–30 s | `prompt_tier=deep`, agents, deep research | Appropriate; needs progressive UX not less brain |

---

## 1. Current depth systems (three parallel axes)

ORB does not have a single “brain depth” knob. Three systems run in parallel:

| Axis | Values | Owner service | Used for |
|------|--------|---------------|----------|
| `prompt_tier` | `fast` · `residential` · `deep` | `orb_knowledge_retrieval_service.resolve_prompt_tier` | Pack limits, spine modules, shared cognition skip, model cost tier |
| `expert_depth` | `general_light` · `residential_light` · `residential_standard` · `residential_deep` · `safeguarding_critical` | `indicare_intelligence_core_service._resolve_expert_depth` | Intelligence packet layers, stream status, tier upgrades |
| Agent `depth` | `quick` · `standard` · `deep` | `orb_agent_orchestrator_service` / request | RAG source limits, detail level, extra search |

**Convergence rule today:** `prepare_request_bundle()` upgrades `prompt_tier` when `expert_depth` is higher — e.g. `residential_deep` forces `prompt_tier=deep`; `residential_light` upgrades `fast` → `residential`.

---

## 2. Request classification: simple · standard · deep

### 2.1 Simple requests (→ Quick tier)

**Characteristics:**
- Short factual or definitional questions
- General knowledge with ≤10 words and no specialist intents
- ≤6 words with no regulatory/recording/safeguarding/residential intents
- Greetings and product orientation (handled by instant fast path)

**Examples:**
- “What does regulation 13 mean?”
- “What is a Reg 44 visit?”
- “Hello”
- “What is ORB?”

**Current routing:** Often lands on `residential` because regulatory intents fire (`regulatory_framework`). **Gap:** simple regulation lookups do not consistently reach `fast`.

### 2.2 Standard requests (→ Standard tier)

**Characteristics:**
- Recording support, reflective practice, management guidance
- Safeguarding scenarios without immediate critical risk
- Residential modes (Record This Properly, Ofsted Lens, Manager Copilot, etc.)
- Profile context or attachments
- Care-relevance score 35–69

**Examples:**
- “Help me write a missing-from-care return record”
- “How should I record a restraint without injury?”
- “What should I include in a manager review after an incident?”

**Current routing:** `prompt_tier=residential`, `expert_depth=residential_standard` or `residential_light`.

### 2.3 Deep requests (→ Deep tier)

**Characteristics:**
- Safeguarding modes (Safeguarding Thinking, Safeguarding)
- High-risk terms (suicide, abuse, exploitation, missing from care, medication error, etc.) — with restraint+recording exception → residential
- Safeguarding principles intent
- Care-relevance ≥70 or `residential_deep` / `safeguarding_critical`
- Specialist agents, document analysis, deep research
- Evidence maps, SCCIF reviews, Reg 44/45 prep, audits, investigations

**Examples:**
- “Create an Ofsted evidence map for missing-from-care practice”
- “A young person disclosed sexual harm — what are the immediate steps?”
- Deep research agent runs
- Document analysis with uploaded policy

**Current routing:** Full stack — shared cognition, full RAG, premium model, evaluation, explainability.

---

## 3. Entry points and flows

### 3.1 Standalone conversation (non-stream)

```
POST /orb/standalone/conversation
  → abuse guards, plan limits
  → _build_standalone_request_context()
       → prepare_request_bundle()          [classification + packs + intelligence core]
       → shared_institutional_cognition_runtime.build_context()  [skipped if fast]
  → _build_framed_message()               [tiered system prompt]
  → orb_converged_general_assistant_service.answer()
       → prepare_request_bundle() AGAIN    [duplicate]
       → orb_general_assistant_service.answer()
            → prepare_retrieval()          [RAG if not fast]
            → ai_model_router_service.complete_with_routing()
  → post-LLM: style sanitize, explainability, finalize_standalone_intelligence
```

**Key files:** `routers/orb_standalone_routes.py`, `services/orb_converged_general_assistant_service.py`, `services/orb_general_assistant_service.py`

### 3.2 Standalone conversation stream

```
POST /orb/standalone/conversation/stream
  → SSE status "received"
  → estimate_expert_depth()               [lightweight, pre-retrieval]
  → stream_status_sequence(expert_depth)  [UX status pills]
  → fast_opening_for_message()            [pre-token opening text]
  → _build_standalone_request_context()   [full context build — blocks first token]
  → stream_answer() → stream_with_routing()
  → SSE metadata + done
```

**Perceived-speed mitigations already exist** but first-token latency is still dominated by context build before streaming starts.

**Key files:** `services/orb_stream_status_service.py`, `services/orb_fast_opening_service.py`, `services/orb_chat_timing_service.py`

### 3.3 Specialist agents

```
POST /orb/standalone/agents/run
  → classify_agent() / explicit agent_type
  → document_analysis → orb_document_understanding_service (bypasses generic agent LLM)
  → else: intelligence packet + shared cognition + RAG + agent prompt + LLM + evaluation
```

**Nine agents:** `deep_research`, `ofsted_research`, `recording_quality`, `safeguarding_reflection`, `policy_comparison`, `manager_briefing`, `therapeutic_practice`, `general_research`, `document_analysis`

**Key file:** `services/orb_agent_orchestrator_service.py`

### 3.4 Deep research

```
POST /orb/standalone/agents/deep-research
  → optional document analysis
  → retrieve_primary_sources() + retrieve_supporting_sources()  [2× RAG]
  → cluster_sources() + identify_gaps()
  → run_agent(deep_research) + build_research_briefing()
```

**Key file:** `services/orb_deep_research_service.py`

### 3.5 Document analysis

```
POST /orb/standalone/documents/analyse
  → orb_document_understanding_service.analyse_document()
       → RAG guidance + LLM + orb_evaluation_service.evaluate_document_output()
```

---

## 4. Service activation matrix

### 4.1 Conversation path

| Service | Simple (Quick) | Standard | Deep |
|---------|----------------|----------|------|
| `orb_knowledge_retrieval_service.classify_query` | ✅ | ✅ | ✅ |
| `resolve_prompt_tier` | → fast | → residential | → deep |
| `prepare_request_bundle` / source packs | ❌ empty | ✅ ~4 packs, 3 spine | ✅ full packs, 8 spine |
| `indicare_intelligence_core_service` | ✅ `general_light` fast packet | ✅ full packet | ✅ full + tier upgrade |
| `shared_institutional_cognition_runtime` | ❌ **skipped** | ✅ 10+ conditional modules | ✅ full modules |
| `orb_rag_retrieval_service` | ❌ | ✅ hybrid search | ✅ hybrid search |
| `orb_residential_cognition_router` | ❌ | ✅ | ✅ |
| `ai_model_router_service` | LOW/FAST | STANDARD/BALANCED | PREMIUM/HIGH |
| `orb_unified_explainability_service` | ✅ minimal | ✅ full | ✅ full |
| `finalize_standalone_intelligence` | ✅ quality gate | ✅ | ✅ |
| `orb_evaluation_service` | ❌ (conversation) | ❌ | ❌ |

### 4.2 Agent / research / document path

| Service | Quick depth | Standard | Deep |
|---------|-------------|----------|------|
| Intelligence core | ✅ | ✅ | ✅ |
| Shared cognition | ✅ always | ✅ | ✅ |
| RAG (source limit) | 5 | 8 | 12 + extra search |
| Document understanding | if doc agent | if doc agent | if doc / deep-research |
| Evaluation | ✅ post-LLM | ✅ | ✅ |
| Deep research workflow | — | — | ✅ |

---

## 5. Quality vs latency contribution

| Service | Quality contribution | Latency contribution | Notes |
|---------|---------------------|---------------------|-------|
| `classify_query` | Medium — routes everything | Low (~ms) | Runs 2–3× per request today |
| `prepare_request_bundle` | High — grounding + intelligence | Medium–High | Duplicate calls |
| `indicare_intelligence_core_service` | **High** for residential/safeguarding | **High** on full path | `general_light` fast path exists but still invoked |
| `shared_institutional_cognition_runtime` | **High** for complex care | **High** — many sub-services | Correctly skipped on fast |
| `orb_rag_retrieval_service` | **High** — citations, grounding | **High** — embeddings + hybrid search | Skipped on fast (good) |
| `ai_model_router_service` | **Highest** — answer quality | **Highest** — provider RTT | 40s timeout; tier affects model |
| `orb_evaluation_service` | High for agents/docs | Medium post-LLM | Not on conversation path |
| `orb_unified_explainability_service` | Metadata/trust | Low–Medium | Required for transparency |
| `finalize_standalone_intelligence` | Quality gate + learning | Medium | Runs after every conversation |
| `orb_stream_status_service` | Perceived speed only | Negative (helps UX) | Pre-token status |
| `orb_fast_opening_service` | Perceived speed only | Negative (helps UX) | Streams before context done |

---

## 6. Latency analysis (timing stages)

`OrbChatTimingTracker` stages (`services/orb_chat_timing_service.py`):

```
request_received
  → context_build_start
  → retrieval_complete
  → shared_cognition_complete
  → prompt_build_complete
  → model_start
  → first_token / model_complete
  → citations_complete
  → explainability_complete
  → finalise_start → quality_gate_complete → ledger_complete
  → response_sent
```

**Top latency contributors (ordered):**

1. **LLM provider call** — `provider_elapsed_ms`; largest variable; dominates total time.
2. **Duplicate `prepare_request_bundle()`** — route + converged assistant + general assistant `prepare_retrieval`.
3. **Shared cognition** — skipped on fast only; 10+ conditional modules on residential/deep.
4. **Intelligence core full packet** — gap detection, missingness graph, convergence, domain brain when not `general_light`.
5. **RAG hybrid search** — keyword + semantic + per-query embedding.
6. **Prompt size** — `prompt_char_estimate` grows with tier; deep tier adds capabilities, citations essay, addenda.
7. **Post-LLM** — citations merge, explainability, quality gate, learning ledger.

**Stream-specific:** `estimate_expert_depth()` and status events fire early, but **full context build still blocks first model token** after fast opening text.

---

## 7. Model routing (`ai_model_router_service`)

Flow:
1. `classify_task()` → `AiTaskType` (mode map, research intent, safeguarding, regulatory, etc.)
2. `classify_risk()` → `AiRiskLevel`
3. `route()` merges `prompt_tier` via `ai_cost_policy_service.tier_from_prompt_tier`
4. Provider/model selection by capability + quality/cost tier
5. History cap: 12 turns (fast) vs 20 (other)

**Mapping to proposed tiers:**

| Proposed tier | `prompt_tier` | Typical model tier |
|---------------|---------------|-------------------|
| Quick | `fast` | LOW cost / FAST quality |
| Standard | `residential` | STANDARD / BALANCED |
| Deep | `deep` | PREMIUM / HIGH |

---

## 8. Existing caching

| Cache | Location | Safe for Quick tier? |
|-------|----------|---------------------|
| Static JSON in-process | `orb_static_intelligence_cache.py` | ✅ domain map, quality standards |
| Knowledge library JSON | `data/orb_knowledge_library_cache.json` | ✅ RAG chunks |
| Cost cache TTL | `orb_cost_cache_service.py` | ✅ greetings, scenario packets |
| Regulation summaries | Not yet dedicated | ✅ **candidate** for Quick tier |
| SCCIF summaries | Partially in spine packs | ✅ **candidate** |
| Query embedding cache | ❌ none | Opportunity |
| Per-request classification | ❌ none | Opportunity for identical prompts |

---

## 9. Over-intelligence findings

### 9.1 Simple questions routed to Standard

- **Regulation lookups** trigger `regulatory_framework` intent → `residential` even for “What does regulation 13 mean?”
- **Default fallback** in `resolve_prompt_tier` is `residential`, not `fast`
- **Intelligence core** always runs via `prepare_request_bundle`; only `general_light` + care_score < 20 skips heavy layers

### 9.2 Duplicate work

| Step | Occurrences per conversation |
|------|------------------------------|
| `classify_query` | 2–3× |
| `prepare_request_bundle` | 2× (route + converged assistant) |
| RAG `retrieve_for_conversation` | 1–2× (if not fast) |

### 9.3 Agents always run full cognition

Agent path **never skips** shared cognition — even `quick` depth agents build full brain context.

### 9.4 Conversation auto-escalation to agents

`orb_agent_conversation_bridge.maybe_run_agent_for_conversation()` can trigger agent runs on `AUTO_RUN_PATTERNS` (deep research, briefing, document analysis) — appropriate for Deep but adds latency when user expected a quick answer.

---

## 10. Recommended Quick / Standard / Deep routing model

### QUICK MODE (new unified tier)

| Aspect | Specification |
|--------|---------------|
| **Target** | 1–3 s perceived response |
| **Maps to** | `prompt_tier=fast`, `expert_depth=general_light`, agent `depth=quick` |
| **Use for** | Factual questions, quick policy/regulation definitions, simple “what should I do” without active risk, product questions |
| **Activate** | `classify_query`, lightweight intelligence packet, knowledge pack cache hits, source grounding (cached summaries), fast model |
| **Skip** | Shared cognition, RAG hybrid search, gap analysis, full evaluation, full explainability generation, multi-pass reasoning |
| **Preserve** | Safeguarding boundary language, inline citations from cached packs, standalone boundary, child-centred tone |

### STANDARD MODE (default)

| Aspect | Specification |
|--------|---------------|
| **Target** | 3–8 s |
| **Maps to** | `prompt_tier=residential`, `expert_depth=residential_light/standard` |
| **Use for** | Recording support, safeguarding reflection (non-critical), management support, Ofsted preparation, reflective practice |
| **Activate** | Current ORB path: intelligence core, shared cognition, retrieval, evidence grounding, evaluation on agents, explainability metadata |
| **Optimise** | Dedupe retrieval; progressive stream status; section streaming |

### DEEP MODE

| Aspect | Specification |
|--------|---------------|
| **Target** | 10–30 s |
| **Maps to** | `prompt_tier=deep`, `expert_depth=residential_deep/safeguarding_critical`, agents, deep research |
| **Use for** | Evidence maps, SCCIF reviews, Reg 44/45, audits, investigations, provider reviews, deep research, document analysis |
| **Activate** | Full brain: gap analysis, intelligence layers, evidence mapping, research agents, quality gate, full explainability |
| **UX** | Progressive sections (“Building evidence map…”, “Checking safeguarding evidence…”) |

---

## 11. Brain selection architecture (design only)

New service: `services/orb_brain_selection_service.py`

**Status:** Implemented as design artifact; **not wired to production routes**.

```
User request
    │
    ▼
orb_brain_selection_service.select_brain()
    │
    ├─ signals: prompt, mode, attachments, agent_type, user_selection
    ├─ delegates to: classify_query, resolve_prompt_tier, estimate_expert_depth, classify_agent
    │
    ▼
BrainSelectionResult
    ├─ tier: quick | standard | deep
    ├─ confidence: 0.0–1.0
    ├─ reason: human-readable
    ├─ recommended_route: conversation | agent | deep_research | document_analysis
    └─ legacy_mapping: { prompt_tier, expert_depth, agent_depth }
```

See `services/orb_brain_selection_service.py` for implementation and `tests/test_orb_brain_selection_service.py` for classification examples.

---

## 12. Boundaries preserved (non-negotiable)

This audit does **not** recommend:
- Removing citations, evaluation, or explainability from Standard/Deep paths
- Weakening safeguarding or Ofsted alignment
- Merging ORB Residential with ORB OS
- Changing public routes
- Reducing evidence quality on Deep tier

---

## 13. Related documentation

- `docs/orb-speed-optimisation-plan.md` — launch recommendations and ranked improvements
- `docs/orb-output-language-audit.md` — robotic language patterns and replacements
- `docs/orb-brain-routing-audit.md` — prior route-level audit (standalone vs OS)
- `docs/orb-performance-audit.md` — timing instrumentation reference
