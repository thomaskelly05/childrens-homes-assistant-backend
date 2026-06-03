# IndiCare Intelligence Perfect 10 — Full Repo Convergence Audit

**Date:** 2026-06-03  
**Principle:** ORB is the shell. IndiCare Intelligence is the brain.

## Executive summary

| Area | Status before | Perfect 10 action |
|------|---------------|-------------------|
| ORB 9 Expert Brain Orchestrator | Wired via knowledge retrieval (missing import fixed) | Wrapped by `indicare_intelligence_core_service` |
| Knowledge retrieval / spine | Live on `/orb/standalone/conversation` | Always calls Intelligence Core packet |
| Operating brain | Live | Retained; merged into Core prompt |
| Residential brain catalogue | **Unwired** (unified cognition only) | Merged into 55-domain map |
| Institutional depth frame | Live via shared cognition | Injected for `residential_light+` |
| IndiCare convergence layers | Live via shared cognition | Exposed in packet metadata |
| Quality gate | Preview only | Live evaluation on conversation response |
| Learning ledger | `record_interaction` uncalled | `record_learning` on conversation |
| Source packs / trusted registry | Parallel | `indicare_source_convergence_service` |

---

## Core ORB 9

### `services/orb_expert_brain_orchestrator_service.py`
- **Does:** Master ORB 9 packet — expert engine, whole-child lens, missingness, gaps, quality preview, citations.
- **Live ORB path:** Yes (via Intelligence Core → knowledge retrieval grounding).
- **Duplicates:** Partial overlap with Intelligence Core; retained as ORB 9 engine layer.
- **Converge:** Keep; called inside Intelligence Core as `orb9_packet`.
- **Disposition:** **Keep — wired into ORB 10**

### `services/orb_knowledge_retrieval_service.py`
- **Does:** Query classification, source packs, spine, prompt tier, request bundle.
- **Live ORB path:** Yes — central retrieval for standalone routes and converged assistant.
- **Duplicates:** Overlaps classification with Intelligence Core care scoring.
- **Converge:** Always builds `indicare_intelligence` in `prepare_request_bundle`.
- **Disposition:** **Keep — wired into ORB 10**

### `services/orb_operating_brain_service.py` + `assistant/knowledge/orb_operating_brain.py`
- **Does:** ORB control knowledge — answer standards, safety, routing, checklists.
- **Live ORB path:** Yes.
- **Disposition:** **Keep**

### `assistant/knowledge/orb_quality_standards_brain.json`
- **Does:** QS1–QS9 spine for residential answers.
- **Live ORB path:** Yes via `orb_quality_standards_brain_service`.
- **Disposition:** **Keep — connected via Intelligence Core**

### `assistant/knowledge/orb_scenario_sequences.json`
- **Does:** Mandatory response sequences (missing, allegation, restraint, etc.).
- **Live ORB path:** Yes via missingness graph / orchestrator.
- **Disposition:** **Keep**

### `assistant/knowledge/orb_regression_test_bank.py`
- **Does:** 10 gold regression scenarios.
- **Live ORB path:** Tests + Intelligence Core depth tests.
- **Disposition:** **Keep**

### `assistant/knowledge/trusted_sources_registry.json`
- **Does:** Governed gold/silver/bronze source IDs; no scraping.
- **Live ORB path:** Citation + source convergence.
- **Disposition:** **Keep**

---

## Older / deeper intelligence

### `services/orb_residential_brain_catalog_service.py`
- **Does:** 12+ practical residential domains (adult needs, answer lens, evidence questions).
- **Live ORB path:** Was **no** (only `orb_unified_cognition_runtime`).
- **Valuable knowledge:** Yes — practical shift wording.
- **Converge:** Merged into `indicare_registered_home_domain_map.json` via catalog merge IDs.
- **Disposition:** **Keep — merged, not discarded**

### `services/orb_institutional_depth_frame_service.py`
- **Does:** Topic frames (missing, restraint, allegations, inspection, etc.).
- **Live ORB path:** Yes via shared cognition; now also Intelligence Core for residential depth.
- **Disposition:** **Keep — adaptive depth frame provider**

### `services/orb_indicare_intelligence_convergence_service.py`
- **Does:** 22 intelligence layer routing (child voice, safeguarding, ISN, etc.).
- **Live ORB path:** Yes via shared cognition.
- **Converge:** `active_intelligence_layers` in Intelligence Core packet.
- **Disposition:** **Keep — product language layer**

### `services/shared_institutional_cognition_runtime.py`
- **Does:** Merges playbooks, curiosity, sector evidence, ISN, templates, convergence.
- **Live ORB path:** Yes for non-fast standalone tier.
- **Disposition:** **Keep — parallel enrichment (shell + brain)**

### `services/orb_human_practice_brain_service.py`
- **Does:** Role profiles (RSW, RM, RI, NVQ).
- **Live ORB path:** Partial — expert engine + action engine.
- **Disposition:** **Keep**

### `services/orb_scenario_playbook_service.py`
- **Does:** Live incident playbooks.
- **Live ORB path:** Yes.
- **Disposition:** **Keep**

### `services/orb_professional_curiosity_service.py`
- **Does:** RM/DSL/RI curiosity lenses.
- **Live ORB path:** Yes.
- **Disposition:** **Keep**

### `services/orb_knowledge_source_pack_service.py`
- **Does:** 16 built-in source pack metadata.
- **Live ORB path:** Yes.
- **Converge:** `indicare_source_convergence_service`.
- **Disposition:** **Keep**

### `services/orb_action_engine_service.py`
- **Does:** Structured post-answer actions (`/actions/run`).
- **Live ORB path:** Separate endpoint; uses retrieval + operating brain.
- **Disposition:** **Keep — should call Intelligence Core in future iteration**

### `services/orb_whole_child_lens_service.py`
- **Does:** Life domains + professional lenses.
- **Live ORB path:** ORB 9 / Intelligence Core.
- **Disposition:** **Keep**

### `services/orb_missingness_graph_service.py` / `orb_gap_detection_service.py` / `orb_answer_quality_gate_service.py` / `orb_learning_ledger_service.py` / `orb_followup_learning_service.py`
- **Live ORB path:** Intelligence Core packet; quality gate on conversation; ledger on response.
- **Disposition:** **Keep — wired**

### `services/orb_ofsted_learning_adapter.py`
- **Does:** Anonymised Ofsted report practice learning; rejects non-official URLs.
- **Live ORB path:** Adapter only; no grade prediction.
- **Disposition:** **Keep**

### `services/orb_unified_cognition_runtime.py`
- **Does:** Alternate runtime including residential catalogue.
- **Live ORB path:** **No** on standalone routes.
- **Disposition:** **Deprecated for standalone — catalogue merged into domain map**

---

## Related intelligence services (OS / spine — not standalone ORB answer path)

| Service | Role | Standalone ORB |
|---------|------|----------------|
| `indicare_intelligence_spine_service` | OS intelligence spine API | No |
| `indicare_intelligence_surface_router` | Surface routing | Config/capabilities only |
| `chronology_intelligence_service` | OS chronology | No |
| `child_experience_intelligence_service` | OS child experience | No |
| `document_intelligence_service` | OS documents | Upload analyse only |
| `evidence_graph_intelligence_service` | OS evidence graph | No |
| `governance_intelligence_service` | OS governance | No |
| `academy_intelligence_service` | NVQ/academy | Pack only |
| `orb_isn_cognition_service` | ISN | Via shared cognition |
| `orb_web_search_service` | Web search | **Disabled** for standalone |

---

## Routes & frontend

### `routers/orb_standalone_routes.py`
- **Disposition:** **Modified** — Intelligence Core packet, quality gate, learning ledger on conversation.

### `services/orb_converged_general_assistant_service.py` / `orb_general_assistant_service.py`
- **Disposition:** Inherit Intelligence Core via `prepare_request_bundle`.

### `frontend-next` ORB components
- **Disposition:** Unchanged UI; metadata available in `context_used.indicare_intelligence`.

---

## SQL / schema

| Artifact | Purpose |
|----------|---------|
| `sql/209_orb_learning_ledger.sql` | DB ledger (optional) |
| Intelligence actions SQL | OS actions, not standalone |

---

## Documentation cross-reference

| Doc | Status |
|-----|--------|
| `docs/intelligence-spine.md` | OS spine — complementary |
| `docs/indicare-intelligence-parity-audit.md` | Prior parity work |
| `docs/orb-9-expert-brain-architecture.md` | Updated for shell/brain principle |
| `docs/indicare-intelligence-perfect-10-architecture.md` | **New** |

---

## Human approval gaps (unchanged)

1. Gold statutory source text updates — human approval required.  
2. Ofsted report ingestion — anonymised learning only.  
3. No auto-apply on gold/silver safeguarding/clinical sources.  
4. No random web scraping in standalone ORB.
