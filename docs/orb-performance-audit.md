# ORB Residential Performance Audit

**Audit date:** 2026-06-07  
**Repository:** thomaskelly05/childrens-homes-assistant-backend  
**Branch:** `cursor/orb-performance-audit-smoke-test-960f`  
**Base commit:** `068b8fc059fe109629177ca6ce1f872699050d3f`

---

## 1. Executive summary

ORB Residential answer quality is strong for intelligence-heavy prompts such as *"Create an Ofsted evidence map for missing-from-care practice."* The primary launch risk is **latency perception**, not correctness.

Static analysis and instrumented mocked runs show:

| Stage | Typical cost (Ofsted evidence-map prompt) | User-visible? |
|-------|-------------------------------------------|---------------|
| Knowledge retrieval + intelligence packet | ~4–50 ms (CPU; no DB in standalone path) | Stream status only |
| Shared institutional cognition | ~20–200 ms when not skipped | Status events |
| Prompt assembly | Included above; **~18k–54k grounding chars** at residential/deep tier | Hidden |
| **LLM provider call** | **Dominant (seconds)** | Tokens / answer |
| Citations + explainability | ~5–30 ms | End of response |
| Intelligence finalisation (quality gate) | ~10–80 ms | End of stream / metadata |
| Learning ledger | Best-effort; non-blocking on failure | Never |
| Governance event | Best-effort; swallowed on failure | Never |

**Conclusion:** Slowness is expected to feel like **model latency + large prompt size**, not retrieval or Python orchestration. Streaming already sends status and optional fast-opening tokens before the heavy context build completes on `/conversation/stream`. Non-stream `/conversation` still builds full context before the model call.

This audit added **safe stage timing** via `OrbChatTimingTracker` + `build_route_timing_payload()` on conversation (sync + stream), agent run, and deep research routes. Timing is attached to `context_used.timing` and logged at INFO (`orb_route_timing`).

No answer behaviour, model selection, or public routes were changed.

---

## 2. Tested / audited surfaces

| Surface | Entry | Auth |
|---------|-------|------|
| Standalone conversation | `POST /orb/standalone/conversation` | `require_rich_orb_premium_access` |
| Standalone stream | `POST /orb/standalone/conversation/stream` | Same |
| Specialist agents | `POST /orb/standalone/agents/run` | Same |
| Deep research | `POST /orb/standalone/agents/deep-research` | Same |
| Document analysis | `POST /orb/standalone/documents/analyse` | Same |
| Config contract | `GET /orb/standalone/config` | `require_orb_product_bootstrap_access` |
| Saved outputs | `/orb/standalone/outputs/*` | Mixed bootstrap / premium |
| Voice status | `GET /orb/voice/session/status` | Bootstrap |
| Frontend client | `frontend-next/lib/orb/standalone-client.ts`, `components/orb-standalone/*` | Session cookies |

**Core services reviewed:** `orb_knowledge_retrieval_service`, `indicare_intelligence_core_service`, `shared_institutional_cognition_runtime`, `orb_converged_general_assistant_service`, `orb_general_assistant_service`, `ai_model_router_service`, `orb_evaluation_service`, `orb_unified_explainability_service`, `orb_agent_orchestrator_service`, `orb_deep_research_service`, `orb_document_understanding_service`, `orb_intelligence_output_service`, `orb_brain_metadata_service`, `orb_standalone_usage_service`, `orb_plan_enforcement_service`, `indicare_ai_governance_event_service`, `orb_rag_retrieval_service`.

---

## 3. Current timing coverage

| Stage | Conversation (sync) | Conversation (stream) | Agents / deep research | Documents |
|-------|--------------------|-----------------------|------------------------|-----------|
| Request received | ✅ `stages.request_received_ms` | ✅ | ✅ | ❌ (not instrumented) |
| Context / retrieval build | ✅ marks + `retrieval_elapsed_ms` | ✅ (after early status) | ✅ agent orchestrator marks | Partial via service logs |
| Intelligence packet | ✅ inside retrieval bundle | ✅ | ✅ brain context step | Via understanding service |
| Shared cognition | ✅ `shared_cognition_complete_ms` | ✅ + `shared_cognition_skipped` | ✅ | N/A |
| Prompt build | ✅ `prompt_char_estimate` | ✅ | ✅ `prompt_char_estimate` | N/A |
| Model call | ✅ `provider_elapsed_ms` | ✅ + `first_token_ms` | ✅ | Via router latency |
| Stream complete | N/A | ✅ | N/A | N/A |
| Citations | ✅ `citations_complete_ms` | ✅ | ✅ | In understanding payload |
| Explainability | ✅ `explainability_complete_ms` | ✅ | ✅ (evaluation step) | Evaluation optional |
| Intelligence finalise | ✅ via `finalize_standalone_intelligence` + timing | ✅ before metadata event | Partial (agent path) | N/A |
| Quality gate | ✅ `quality_gate_complete_ms` (debug) | ✅ | Via evaluation | `include_evaluation` |
| Learning ledger | ✅ non-blocking | ✅ non-blocking | ❌ | ❌ |
| Governance | ❌ swallowed | ❌ | ✅ `governance_complete_ms` | ❌ |
| Save metadata | N/A | N/A | ✅ via `_attach_save_metadata` | N/A |
| Total route | ✅ `elapsed_ms` | ✅ `total_elapsed_ms` | ✅ | ❌ |
| INFO log summary | ✅ `log_orb_route_timing` | ✅ | ✅ | ❌ |

**Existing utilities**

- `services/orb_chat_timing_service.py` — `OrbChatTimingTracker`, `build_route_timing_payload`, `log_orb_route_timing`
- `services/indicare_intelligence_route_finalize_service.py` — finalise marks (`finalise_start`, `quality_gate_complete`, `ledger_complete`)
- `orb_knowledge_retrieval_service.prepare_request_bundle` — `retrieval_elapsed_ms`, `grounding_char_count`
- Model router — `context_used.model_routing.latency_ms`
- `orb_standalone_usage_service` — persists aggregate latency post-response

**Debug-only detail:** Set `ORB_CHAT_TIMING_DEBUG=true` or `ENV=development` for `debug_timing` pairwise stage durations.

---

## 4. Missing timing coverage

| Gap | Risk | Recommendation |
|-----|------|----------------|
| Document analyse route | Low — not on hot chat path | Add route-level timing in follow-up if document UX is launch-critical |
| Governance recording duration | Low — best-effort, swallowed | Optional mark after `record_from_standalone_response` |
| RAG embedding calls (when enabled) | Medium if external AI on | Already bounded; surface in `retrieval_meta` when present |
| Frontend TTFB / first paint | Medium for perceived speed | Browser Performance API in `standalone-client.ts` (post-launch) |
| Usage/billing DB checks | Low at bootstrap | Logged only on failure today |
| Plan enforcement | Low | Returns early template without model |

---

## 5. Route timing map

### `POST /orb/standalone/conversation`

```
request → abuse/plan guards → OrbChatTimingTracker
  → _build_standalone_request_context (retrieval, cognition, prompt)
  → assistant_runtime.answer (MODEL — dominant)
  → citations + explainability
  → finalize_standalone_intelligence (quality gate, ledger)
  → context_used.timing + INFO log
```

**Observed (mocked provider, Ofsted evidence-map prompt):** retrieval ~4 ms, prompt ~54k chars, provider dominates.

### `POST /orb/standalone/conversation/stream`

```
request → status SSE (received, depth status)
  → optional fast_opening token (first_token_ms)
  → _build_standalone_request_context
  → stream_answer tokens (MODEL)
  → citations + explainability
  → finalize_standalone_intelligence (after tokens)
  → metadata SSE + done
```

**Perceived latency:** Status + opening token can arrive before retrieval completes.

### `POST /orb/standalone/agents/run`

```
classify → brain context → RAG retrieve → prompt → model → parse
  → evaluation → save envelope → governance (best-effort)
  → context_used.timing
```

### `POST /orb/standalone/agents/deep-research`

```
plan → optional document analyse → primary/supporting RAG
  → delegate to agent orchestrator → briefing merge → evaluation
  → context_used.timing (includes agent_elapsed_ms)
```

### Document analysis (`POST /orb/standalone/documents/analyse`)

```
abuse guards → orb_document_understanding_service.analyse_document
  → optional evaluation via intelligence output service
```

No route-level timing added (out of scope for this pass; not a launch blocker).

---

## 6. Top 10 likely slowest operations

| Rank | Operation | Why slow | Typical relative cost |
|------|-----------|----------|------------------------|
| 1 | **LLM completion / stream** | Large prompt + reasoning model | 60–90% of wall time |
| 2 | **Prompt size (grounding + cognition blocks)** | 18k–54k+ chars for residential/deep Ofsted prompts | Drives #1 |
| 3 | **Shared institutional cognition** | Many brain modules for safeguarding/Ofsted depth | 5–15% pre-model |
| 4 | **Intelligence packet (IndiCare Core)** | Domain scans, gaps, missingness for deep prompts | 3–10% pre-model |
| 5 | **Agent RAG retrieval** | Library search + citation build | 5–15% on agent path |
| 6 | **Deep research multi-pass RAG** | Primary + supporting + clustering | Adds to agent time |
| 7 | **Document analysis model call** | Separate LLM pass | Seconds when used |
| 8 | **Evaluation service** | Heuristic + structure checks | <100 ms |
| 9 | **Explainability assembly** | Citation normalisation | <50 ms |
| 10 | **Learning ledger DB write** | Optional persistence | Non-blocking; can fail silently |

---

## 7. Necessary for quality / safety (do not remove)

- Standalone OS boundary rejection (`FORBIDDEN_STANDALONE_OS_KEYS`)
- Auth + billing / plan enforcement
- Knowledge spine + source-pack grounding (honest citations)
- Intelligence packet + quality gate for care-heavy prompts
- Safeguarding-critical opening on stream
- Evaluation + explainability metadata
- `os_records_accessed: false` contract
- Live-web honesty (`RESEARCH_NOTE` / `LIVE_WEB_NOTE`)
- CSRF + session on mutating routes

---

## 8. Cacheable operations

| Asset | Cache type | Already cached? |
|-------|------------|-----------------|
| `orb_scenario_sequences.json` | Process static | ✅ `orb_static_intelligence_cache` |
| Domain map / quality standards brain | Process static | ✅ per-service |
| Source pack labels | Process static | ✅ in-memory |
| Intelligence packet for identical prompt+mode | Request/session | ❌ (risk of stale guidance) |
| Shared cognition routing decision | Short TTL | ❌ post-launch candidate |
| RAG chunk embeddings | DB / vector store | Partial via knowledge library |

**Never cache:** user permissions, billing state, OS records, child/staff identifiers.

---

## 9. Skippable in quick mode

| Operation | Quick mode behaviour today |
|-----------|---------------------------|
| Shared cognition | Skipped when `prompt_tier == "fast"` |
| Full intelligence packet | Reduced via `general_light` fast path (`care_relevance_score < 20`) |
| Deep knowledge spine modules | `max_modules: 0` on fast tier |
| Learning ledger | Can set `record_learning=False` (stream still records by default) |
| Multiple RAG passes | Deep research depth=`quick` limits sources |
| Explainability lenses | Reduced brains on fast tier |

---

## 10. Recommended performance tiers

| Tier | Prompt tier / depth | Cognition | Intelligence | Model | UX |
|------|---------------------|-----------|--------------|-------|-----|
| **Quick** | `fast` / `general_light` | Skipped or minimal | Cached source-pack only | Faster model, concise detail | Immediate status; no deep panels required |
| **Standard** | `residential` | Shared cognition (subset) | Full packet; quality gate | Default routed model | Stream tokens; metadata at end |
| **Deep** | `deep` / `safeguarding_critical` | Full brain stack | Full packet + gaps + missingness | Quality-tier model | Progressive status; accept longer wait |

Ofsted evidence-map prompts classify as **residential → deep** (missing-from-care + Ofsted Lens), so they correctly use the full standalone brain unless user selects concise mode.

---

## 11. Recommendations (ranked)

### Launch blocker

*None identified in this audit.* Routes, boundaries, and auth behave as designed in targeted tests.

### Should fix before public launch

1. **Monitor production `orb_route_timing` logs** — alert on p95 `provider_elapsed_ms` and `first_token_ms`.
2. **Document expected wait** for deep/Ofsted prompts in UI status copy (already partially via `stream_status_sequence`).
3. **Cap prompt growth** — review whether 54k-char framed prompts can trim duplicate cognition blocks without quality loss (analysis only; no change in this PR).

### Nice-to-have after launch

1. Route-level timing on document analyse.
2. Frontend Real User Monitoring (TTFB, first token, metadata received).
3. Session-level cache for repeated identical regulatory prompts.
4. Parallelise independent cognition sub-builds where safe.
5. Governance timing metric (low priority).

---

## Instrumentation reference

```python
# services/orb_chat_timing_service.py
timing = OrbChatTimingTracker()
timing.mark("request_received")
# ... stages ...
context_used["timing"] = build_route_timing_payload(timing, route="...", elapsed_ms=...)
log_orb_route_timing(route, context_used["timing"], mode=mode)
```

**Safety:** Timing metadata contains only relative milliseconds, route names, tiers, char counts, and model ids — no child/staff/home record content.

---

## Related docs

- `docs/orb-chat-speed-optimisation.md` — prior stream UX optimisation
- `docs/orb-residential-launch-smoke-test.md` — launch readiness results
