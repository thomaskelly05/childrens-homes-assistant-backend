# ORB Brain Routing Audit

**Date:** 2026-06-07  
**Scope:** ORB Residential (standalone), ORB OS (permissioned), shared IndiCare Intelligence services

---

## 1. Executive summary

**ORB is the shell. IndiCare Intelligence is the brain.**

ORB Residential (`/orb/standalone/*`) and ORB OS (`/assistant/orb/*`) share the same intelligence logic family — IndiCare Intelligence Core, Shared Institutional Cognition Runtime, knowledge retrieval, quality gates, and evaluation — but they operate under **strictly different data boundaries**.

| Product | Boundary | Live OS records |
|---------|----------|-----------------|
| ORB Residential | `standalone_orb` | Never |
| ORB OS | `os_orb` / `operational_os_orb` | Permissioned only |

Shared intelligence is allowed. Shared live OS data is not.

---

## 2. Route map

| Surface | Endpoint | Router | Primary services | Intelligence Core | Shared Cognition | Knowledge Retrieval | Evaluation / Quality Gate | Explainability | OS records allowed | Notes |
|---------|----------|--------|------------------|-------------------|------------------|---------------------|-------------------------|----------------|--------------------|-------|
| standalone_orb | `POST /orb/standalone/conversation` | `orb_standalone_routes` | OKR → converged/general assistant → finalize | Yes (via OKR) | Yes (`surface=standalone_orb`) | Yes (`prepare_request_bundle`) | Yes (gate + finalize) | Yes (`orb_unified_explainability_service`) | No | Reference full-brain path |
| standalone_orb | `POST /orb/standalone/conversation/stream` | `orb_standalone_routes` | Same as conversation + SSE | Yes | Yes (skipped on `fast` tier) | Yes | Yes (finalize on metadata) | Yes | No | Early `expert_depth` status |
| standalone_orb | `POST /orb/standalone/agents/run` | `orb_agent_routes` | `orb_agent_orchestrator_service` | **Yes** (upgraded) | **Yes** (`surface=standalone_orb`) | Yes (RAG + source packs) | Yes (`orb_evaluation_service`) | Partial (context_used metadata) | No | Full standalone brain + specialist RAG |
| standalone_orb | `POST /orb/standalone/agents/deep-research` | `orb_agent_routes` | `orb_deep_research_service` → orchestrator | **Yes** (via orchestrator) | **Yes** (via orchestrator) | Yes (multi-pass RAG) | Yes | Partial | No | Clusters sources + gap analysis |
| standalone_orb | `POST /orb/standalone/actions/run` | `orb_standalone_routes` | `orb_action_engine_service` | Yes (care-related) | Indirect | Yes | Yes | Partial | No | Action follow-ups |
| os_orb | `POST /assistant/orb/conversation` | `orb_operational_routes` | `orb_operational_assistant_service` | Yes (via OKR) | Yes (`surface=operational_orb`) | Yes + OS evidence | Yes (eval; gate fixes off) | Partial (intelligence_output) | Yes (permissioned) | Privacy guard before model |
| os_orb | `POST /assistant/orb/operational` | `orb_operational_routes` | `orb_intelligence_bridge_service` | Yes | Yes | Yes + OS evidence | Yes | Partial | Yes | Bridge entry |
| os_orb | `POST /assistant/orb/evidence-diagnostics` | `orb_operational_routes` | `orb_universal_evidence_service` | No | No | No | No | Diagnostic only | Yes | Evidence health check |
| legacy_os | `POST /assistant/*` | `assistant_routes` | `assistant_orchestrator` → `assistant_engine` | No | No | Legacy retrieval | No | No | Scoped | Separate legacy stack |

**Abbreviations:** OKR = `orb_knowledge_retrieval_service`, Core = `indicare_intelligence_core_service`, SICR = `shared_institutional_cognition_runtime`

### Model call paths

| Surface | LLM entry |
|---------|-----------|
| Standalone conversation | `ai_model_router_service.complete_with_routing` via converged/general assistant |
| Standalone agents | `ai_model_router_service.complete_with_routing` via orchestrator |
| Deep research | Orchestrator (after multi-pass RAG clustering) |
| OS ORB conversation | `ai_model_router_service.complete_with_routing` via operational assistant (`surface=operational_os`) |

### Evidence / citation grounding

| Surface | Pre-LLM grounding | Post-LLM citations |
|---------|-------------------|-------------------|
| Standalone conversation | Source packs, knowledge spine, operating brain, SICR citations | `orb_citation_service` + SICR merge |
| Standalone agents | RAG (`orb_rag_retrieval_service`) + intelligence prompt blocks | Pack + document RAG citations |
| Deep research | Primary + supporting RAG clusters | Research citations overlay |
| OS ORB | OKR + `orb_universal_evidence_service` (labelled OS items) | Operational source citations |

---

## 3. Gap report (pre-upgrade baseline)

Surfaces that previously did **not** use the full intelligence stack:

| Gap | Surface | Status after this pass |
|-----|---------|------------------------|
| No Intelligence Core packet | `/orb/standalone/agents/run` | **Fixed** — `build_intelligence_packet` on every run |
| No Shared Cognition | Agent + deep research | **Fixed** — `build_context(surface=standalone_orb)` |
| No unified explainability | Agents, OS ORB | Partial — agents now expose cognition metadata in `context_used` |
| No quality gate preview | Agents | **Fixed** — `quality_gate_preview` in context_used |
| No governance on agents | Agents | Already present — `indicare_ai_governance_event_service` |
| Lighter path | Legacy `/assistant/*` | Intentionally separate — future convergence candidate |
| Surface string mismatch | OS uses `operational_orb` not `os_orb` | Documented risk — some SICR enrichments gated on `standalone_orb` only |

---

## 4. Boundary model

### `standalone_orb` (ORB Residential)

**Allowed context:**
- User prompt and user-supplied text (documents, attachments, project memory)
- ORB Knowledge Library (source packs, RAG, knowledge spine)
- Shared intelligence logic (guidance-only, record-free)
- Hypothetical / practice / Ofsted-expectation questions

**Forbidden context:**
- Live OS records, Care Hub, child/staff files
- Chronology, incidents, plans, risks, dashboards
- Any `child_id`, `young_person_id`, `staff_id`, `home_id`, `record_id`, `chronology_id`
- `operational_context` with OS data (stripped/rejected)

**Boundary flags (always false on standalone):**
- `os_linked`, `care_record_access`, `os_records_accessed`, `operational_context_used`

### `os_orb` (ORB OS)

**Allowed context:**
- Everything standalone may use, plus permission-scoped operational context after auth checks
- `orb_operational_context_bridge`, `orb_universal_evidence_service`

**Forbidden:**
- Autonomous writes, safeguarding threshold decisions, Ofsted grade prediction

### Shared brain services

Shared services receive an explicit `surface` parameter:
- `surface="standalone_orb"` — operational context ignored; OS IDs rejected at route layer
- `surface="os_orb"` / `operational_orb` — permissioned operational context permitted

---

## 5. Agent upgrade notes

### Agents now using full standalone brain

All specialist agents via `POST /orb/standalone/agents/run`:

- `deep_research`, `ofsted_research`, `recording_quality`, `safeguarding_reflection`
- `policy_comparison`, `manager_briefing`, `therapeutic_practice`, `general_research`, `document_analysis`

### Per-run intelligence assembly

1. `indicare_intelligence_core_service.build_intelligence_packet(message, mode, profile_context, history=[], profile_role=None)`
2. `shared_institutional_cognition_runtime.build_context(surface="standalone_orb", operational_context=None)`
3. Prompt blocks merged into `build_agent_prompt` (intelligence block + shared cognition + RAG grounding)
4. Metadata attached to `context_used`

### Metadata attached to `context_used`

- `expert_depth`, `active_brains`, `active_intelligence_layers`, `active_engines`
- `cognition_display_labels`, `reasoning_lenses`, `quality_gate_preview`
- `registered_home_domains`, `whole_child_domains`, `source_basis`, `gaps`
- `missingness_graph` (summary only: node/edge counts, sequence_id)
- `shared_cognition.explainability`, `official_source_grounding`
- `standalone_only=True`, `os_linked=False`, `care_record_access=False`, `os_records_accessed=False`

### Intentionally unavailable on standalone agents

- Live web retrieval
- OS record access
- Autonomous write tools
- Unified explainability UI contract (conversation-only today)

### Deep research

`orb_deep_research_service` delegates synthesis to `orb_agent_orchestrator_service.run_agent`, so it inherits the full standalone brain upgrade. Additional value: multi-pass RAG, source clustering, gap identification, document understanding overlay.

---

## 6. Remaining gaps and convergence plan

| Priority | Gap | Recommendation |
|----------|-----|----------------|
| Medium | Legacy `/assistant/*` uses `assistant_engine` not ORB brain | Route high-value OS assistant modes through intelligence bridge |
| Medium | OS ORB uses `operational_orb` surface string | Align to `os_orb` for full SICR enrichment parity |
| Low | Agents lack `orb_unified_explainability_service` | Add explainability build on agent responses (metadata only first) |
| Low | Duplicate brain paths (legacy `/api/orb/conversation`) | Deprecate legacy route; redirect to `/assistant/orb` |

### Risk: duplicate brain paths

Two parallel stacks exist:
1. **ORB brain family** — OKR + Core + SICR (standalone + OS ORB)
2. **Legacy assistant** — `assistant_orchestrator` + `assistant_engine`

Convergence should migrate legacy surfaces onto the ORB brain family without merging Residential/OS boundaries.

---

## 7. Acceptance checks

- [x] Standalone ORB remains record-free
- [x] Agent routes reject OS identifiers (`child_id`, `young_person_id`, `staff_id`, `home_id`, `record_id`, `chronology_id`)
- [x] Agent `context_used` includes intelligence metadata
- [x] No public route paths changed
- [x] Existing RAG, citations, evaluation preserved
- [x] Governance event recording preserved on agent runs

---

## 8. Service reference

| Service | Role |
|---------|------|
| `indicare_intelligence_core_service` | Always-on brain packet: expert depth, ORB9, convergence, gaps, quality gate preview |
| `shared_institutional_cognition_runtime` | Surface-aware cognition router, lenses, citations, prompt blocks |
| `orb_knowledge_retrieval_service` | Query classification, source packs, knowledge spine, tier resolution |
| `orb_rag_retrieval_service` | Agent-specific Knowledge Library RAG |
| `orb_answer_quality_gate_service` | 12-dimension post-answer gate |
| `orb_evaluation_service` | Standalone evaluation facade (answer/document/agent) |
| `orb_unified_explainability_service` | UI explainability contract (standalone conversation) |
