# ORB Speed Optimisation Plan

**Repository:** `thomaskelly05/childrens-homes-assistant-backend`  
**Sprint type:** Audit · Measure · Design · Document  
**Date:** June 2026

---

## 1. Executive summary

ORB’s intelligence quality is production-grade. The primary user-facing gap is **perceived speed** — especially **first-token latency** on Standard and Deep paths, and **over-routing** of simple questions to the full residential brain.

This plan recommends a **tiered brain model** (Quick / Standard / Deep) via `orb_brain_selection_service`, **deduplication of retrieval**, **progressive streaming UX**, and **safe caching** of regulation and SCCIF summaries — without reducing safeguarding, Ofsted alignment, citations, or explainability on Standard/Deep tiers.

**Expected outcome:** Quick queries feel 2–4× faster; Standard queries feel 30–50% faster (perceived); Deep queries feel faster through progressive sections while retaining full intelligence depth.

---

## 2. Current performance findings

### 2.1 Instrumentation available

`OrbChatTimingTracker` (`services/orb_chat_timing_service.py`) exposes:
- Stage marks: `context_build_ms`, `retrieval_ms`, `shared_cognition_ms`, `prompt_build_ms`, `model_ms`, `post_model_ms`, `first_token_ms`
- Flags: `shared_cognition_skipped`, `prompt_tier`, `expert_depth`, `prompt_char_estimate`

Enable debug: `ORB_CHAT_TIMING_DEBUG=true`

### 2.2 Observed bottlenecks (from code-path analysis)

| Stage | Typical impact | Fast tier | Residential | Deep |
|-------|---------------|-----------|-------------|------|
| Classification + bundle | 50–300 ms | Light | Medium | Heavy |
| Shared cognition | 0 ms (skipped) | — | 100–500 ms | 100–500 ms |
| RAG retrieval | 0 ms (skipped) | — | 200–800 ms | 200–1200 ms |
| Prompt assembly | 10–50 ms | Small | Large | Very large |
| LLM (provider) | 1–15+ s | 1–3 s | 3–10 s | 5–25 s |
| Post-LLM (citations, explainability, finalize) | 50–200 ms | Minimal | Full | Full |

### 2.3 Perceived-speed features already shipped

- `estimate_expert_depth()` before full retrieval (stream)
- `stream_status_sequence()` — status pills by depth
- `fast_opening_for_message()` — pre-token practical opener
- Fast tier skips shared cognition and RAG

**Gap:** Context build still blocks model start; status messages are generic not task-specific.

---

## 3. Top latency contributors

1. **LLM provider round-trip** — dominant; tier-aware model selection already exists
2. **Duplicate `prepare_request_bundle()`** — 2× per conversation minimum
3. **Shared institutional cognition** — 10+ conditional sub-services on non-fast paths
4. **Intelligence core full packet** — gap/missingness/convergence on most requests
5. **RAG hybrid search + query embedding** — no query cache
6. **Large prompt stacks** — deep tier + addenda + grounding
7. **Sequential post-LLM pipeline** — citations → explainability → finalize

---

## 4. Quick wins

| # | Recommendation | Risk | Effort | Expected speed gain | Quality impact |
|---|--------------|------|--------|---------------------|----------------|
| Q1 | **Wire brain selection (shadow mode)** — log `orb_brain_selection_service` tier alongside current routing without changing behaviour | Low | Low | 0% (measurement only) | None |
| Q2 | **Dedupe `prepare_request_bundle()`** — pass bundle from route to converged/general assistant | Low | Low | 15–25% on context_build | None |
| Q3 | **Expand Quick routing** — regulation definition queries → Quick (see brain selection rules) | Low | Low | 40–60% on simple reg questions | Neutral (cached summaries) |
| Q4 | **Task-specific stream status** — “Checking Reg 13 guidance…” vs generic “Preparing guidance…” | Low | Low | Perceived 20–40% | Positive UX |
| Q5 | **Emit fast opening on more residential_light queries** | Low | Low | Perceived 15–30% first-token | None if full answer follows |
| Q6 | **Cache regulation one-liners** — Reg 12–45 summary snippets in `orb_static_intelligence_cache` | Low | Medium | 100–300 ms on Quick hits | Positive consistency |

**Rank: High impact / low risk** — Q2, Q3, Q4, Q6

---

## 5. Medium improvements

| # | Recommendation | Risk | Effort | Expected speed gain | Quality impact |
|---|--------------|------|--------|---------------------|----------------|
| M1 | **Single classification pass** — cache `classify_query` result on request context object | Low | Medium | 5–10% context build | None |
| M2 | **Progressive sections (stream)** — yield Section 1/2/3 as LLM completes headings | Low | Medium | Perceived 30–50% on long answers | Positive |
| M3 | **Parallelise pre-LLM** — intelligence core + shared cognition where independent | Medium | Medium | 10–20% context build | None |
| M4 | **Query embedding cache** — TTL cache for RAG query vectors | Low | Medium | 50–200 ms per RAG hit | None |
| M5 | **SCCIF / QS summary packs for Quick** — pre-built cached packs | Low | Medium | 200–500 ms on Quick | Neutral |
| M6 | **Defer non-critical post-LLM** — stream answer first; attach explainability in metadata event | Medium | Medium | Perceived 10–15% | None if metadata still arrives |
| M7 | **Language template refresh** — see `orb-output-language-audit.md` | Low | Medium | Shorter answers feel faster | Positive tone |
| M8 | **Agent quick path** — skip full shared cognition for `depth=quick` agents | Medium | Medium | 15–25% agent start | Monitor quality |

**Rank: High impact / medium risk** — M2, M3, M6, M8

---

## 6. Long-term improvements

| # | Recommendation | Risk | Effort | Expected speed gain | Quality impact |
|---|--------------|------|--------|---------------------|----------------|
| L1 | **Production brain selection** — replace parallel tier systems with unified Quick/Standard/Deep | Medium | High | 20–40% overall routing efficiency | Positive if tuned |
| L2 | **Retrieval router** — skip RAG when cached pack fully answers Quick query | Medium | High | 500 ms–2 s on hits | Monitor citation completeness |
| L3 | **Speculative streaming** — start LLM with minimal prompt; inject grounding chunks as they arrive | High | High | 30–50% first-token | Risk of answer drift |
| L4 | **Section-level model routing** — fast model for outline, premium for deep sections | High | High | Variable | Quality risk on complex safeguarding |
| L5 | **Edge-cached knowledge packs** — CDN/static for regulation summaries | Low | High | Latency at scale | Positive |
| L6 | **Intelligence packet incremental build** — stream gap analysis after first answer section | Medium | High | Perceived Deep improvement | Positive for Deep |

**Rank: High impact / high risk** — L3, L4

---

## 7. Progressive response design

### 7.1 Immediate status streaming (enhance existing)

Replace generic messages with **intent-aware copy**:

| Intent | Status message |
|--------|----------------|
| Regulatory | Checking regulation guidance… |
| Recording | Preparing recording points… |
| Safeguarding | Checking the safest next steps… |
| Ofsted / evidence map | Building evidence map… |
| Missing from care | Reviewing missing-from-care practice… |
| Document | Reading your document… |

Implementation: extend `stream_status_sequence()` to accept `classification.intents` or brain selection result.

### 7.2 Progressive sections

For Deep tier and long Standard answers:

```
SSE: section_start { "id": 1, "title": "Immediate safety and recording" }
SSE: token deltas...
SSE: section_complete { "id": 1 }
SSE: section_start { "id": 2, "title": "Evidence inspectors may look for" }
...
```

Frontend can render sections as they complete — user sees progress, not a blank wait.

### 7.3 Cached intelligence (safe candidates)

| Asset | Cache type | TTL | Safety notes |
|-------|-----------|-----|--------------|
| Regulation 12–45 one-paragraph summaries | Static JSON | Permanent (versioned) | Factual; cite regulation number |
| SCCIF quality standard summaries | Static JSON | Permanent | No grade language |
| Safeguarding principle packs | Static JSON | Permanent | Escalation reminders included |
| Common scenario openers | In-process | Permanent | Already in `orb_fast_opening_service` |
| Knowledge library chunks | JSON file + memory | Reload on publish | No user data |
| Greeting / help responses | TTL 600s | `orb_cost_cache_service` | Already exists |

**Do not cache:** user-specific context, OS record intelligence, permission-scoped data, safeguarding decisions.

---

## 8. Launch recommendations (phased)

### Phase 0 — This sprint (complete)
- [x] Intelligence routing audit
- [x] Output language audit
- [x] Speed optimisation plan
- [x] `orb_brain_selection_service` (design only, not wired)

### Phase 1 — Measure (1–2 weeks engineering)
- Shadow-log brain selection vs current tiers
- Enable `ORB_CHAT_TIMING_DEBUG` in staging; collect p50/p95 by tier
- Baseline first_token_ms and total_elapsed_ms

### Phase 2 — Quick wins (low risk)
- Dedupe `prepare_request_bundle`
- Task-specific stream status copy
- Regulation summary cache for Quick tier
- Shadow → canary: 5% traffic uses brain selection for routing

### Phase 3 — Standard path optimisation
- Progressive sections in stream
- Parallel pre-LLM where safe
- Language template updates (agent headings)

### Phase 4 — Deep path UX
- Section streaming for evidence maps
- Deep-specific progressive copy (“Checking safeguarding evidence…”, “Reviewing oversight…”)
- Full brain retained; no quality reduction

### Phase 5 — Evaluate
- A/B: perceived speed survey + quality gate pass rates
- Safeguarding review of Quick tier outputs
- Ofsted-alignment spot check on evidence map language

---

## 9. Risk matrix summary

| Rank | Items |
|------|-------|
| **High impact / low risk** | Dedupe retrieval (Q2), Quick routing expansion (Q3), task status copy (Q4), regulation cache (Q6), shadow brain selection (Q1) |
| **High impact / medium risk** | Progressive sections (M2), parallel cognition (M3), defer post-LLM (M6), agent quick cognition skip (M8), production brain selection (L1) |
| **High impact / high risk** | Speculative streaming (L3), section-level model routing (L4) |

---

## 10. Estimated impact (engineering targets)

| Tier | Current typical | Target after Phase 2–3 | Mechanism |
|------|----------------|----------------------|-----------|
| Quick | 4–8 s (often mis-routed to Standard) | **1–3 s** | Correct routing + cache + fast model |
| Standard | 6–15 s | **3–8 s** | Dedupe + perceived streaming |
| Deep | 15–40 s | **10–30 s** | Progressive sections; full brain unchanged |

*Note: LLM provider latency remains the floor; perceived improvements from first-token and progressive UX may exceed wall-clock reductions.*

---

## 11. Do nots (reconfirmed)

- Do not remove citations, evaluation, or explainability from Standard/Deep
- Do not reduce safeguarding or Ofsted quality
- Do not weaken ORB Residential / ORB OS boundary
- Do not change public routes in this sprint
- Do not ship major behaviour changes without shadow metrics and safeguarding review

---

## 12. Related artifacts

| Artifact | Path |
|----------|------|
| Routing audit | `docs/orb-intelligence-routing-audit.md` |
| Language audit | `docs/orb-output-language-audit.md` |
| Brain selection (design) | `services/orb_brain_selection_service.py` |
| Tests | `tests/test_orb_brain_selection_service.py` |
| Timing service | `services/orb_chat_timing_service.py` |
| Stream status | `services/orb_stream_status_service.py` |
