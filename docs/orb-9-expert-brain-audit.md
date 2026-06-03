# ORB 9/10 Expert Brain — Repository Audit

**Date:** 2026-06-03  
**Scope:** Converge existing ORB, Ofsted, safeguarding, evidence and knowledge systems into one governed expert brain.

---

## Executive summary

IndiCare already has **strong ORB foundations** (~167 `orb_*` services, 32 `assistant/knowledge` modules, 80+ ORB docs, extensive pytest coverage). Capability is spread across **parallel brain concepts** (standalone brain, operating brain, expert answer engine, scenario playbooks, official source registry, answer quality heuristics, Ofsted readiness/simulation) without a **single orchestration spine** that enforces whole-child thinking, governed sources, gap detection, and answer quality gates on every residential path.

**Recommended convergence:** Master ORB Expert Brain Orchestrator → Trusted Source Registry → Quality Standards Brain → Whole Child Lens → Gap/Missingness → Learning Ledger → Answer Quality Gate → existing retrieval/expert engine (adapt, do not replace).

---

## 1. ORB brain services (what exists)

| Service / module | Role | Notes |
|------------------|------|-------|
| `services/orb_standalone_brain_service.py` | Dual-brain routing (general vs residential), modes, domains | Primary standalone frame; no live OS access |
| `services/orb_operating_brain_service.py` | ORB-only control knowledge runtime | Wraps `assistant/knowledge/orb_operating_brain.py` |
| `services/orb_knowledge_retrieval_service.py` | Query classification, spine packs, `prepare_request_bundle` | **Main convergence bridge** today |
| `services/orb_expert_answer_engine_service.py` | Scenario families → expert packets, light self-check | Used by retrieval, action engine, general assistant |
| `services/orb_scenario_playbook_service.py` | Live/high-risk playbooks with must_include/avoid | Overlaps expert scenarios |
| `services/orb_human_practice_brain_service.py` | Role lenses, practice voice | Used by expert engine |
| `services/orb_unified_cognition_runtime.py` | Broader cognition runtime | Parallel to standalone path |
| `services/orb_residential_cognition_router.py` | Residential routing | Overlaps mode router |
| `services/orb_mode_router.py` / `orb_intent_router.py` | Mode and intent | Fragmented with standalone brain modes |
| `services/orb_regulatory_reasoning_service.py` | Regulatory framing | Overlaps quality_standards module |
| `services/orb_professional_curiosity_service.py` | Curiosity prompts | Partial gap-detection |
| `services/orb_risk_intelligence_service.py` | Risk framing | OS-linked; standalone uses packets only |
| `services/orb_evidence_*` (graph, lineage, diagnostic, reasoning) | Evidence intelligence | OS/evidence hub; not wired to standalone gate |
| `services/orb_answer_quality_service.py` | Heuristic evaluation (British English, fake OS claims) | **Not** the 12-dimension expert gate requested |
| `services/orb_evaluation_service.py` | Evaluation suite | Admin/QA path |
| `services/orb_learning_micro_service.py` | Micro learning | Not a full anonymised ledger |
| `services/orb_web_search_service.py` | Web search capability | **Risk:** must be registry-governed only |
| `services/orb_public_source_discovery_service.py` | Public discovery | **Risk:** random scraping if enabled |

**Knowledge modules:** `assistant/knowledge/orb_operating_brain.py`, `quality_standards.py`, `regulatory_framework.py`, `reg44_reg45.py`, `working_together.py`, `contextual_safeguarding.py`, `guidance_sources.json`, `orb_source_registry.py`, `orb_expert_scenarios.py`, scenario families/modifiers.

---

## 2. Knowledge loaders

| Component | Purpose |
|-----------|---------|
| `assistant/knowledge_loader.py` | JSON + Python module loading, `select_relevant_python_knowledge` |
| `services/orb_knowledge_source_pack_service.py` | Pack labels for retrieval |
| `services/orb_knowledge_library_service.py` | Vault/library (SQL-backed) |
| `services/orb_knowledge_grounding_service.py` | Grounding blocks |
| `data/orb_knowledge_seed/` | Seeded markdown (e.g. SCCIF overview) |

**Gap:** No single `trusted_sources_registry.json` with governance metadata (`auto_apply_allowed`, `human_approval_required`, trust tiers).

---

## 3. Ofsted, Reg 44/45, QA and evidence

| Service | Purpose |
|---------|---------|
| `services/ofsted_document_readiness_service.py` | Document catalogue readiness |
| `services/ofsted_judgement_simulation_service.py` | Evidence-strength simulation (no grades) |
| `services/ofsted_evidence_engine_service.py` | Evidence engine |
| `services/inspection_readiness_service.py` | Inspection readiness |
| `services/inspection_pack_*` | Pack registry/build |
| `assistant/knowledge/inspection_readiness.py` | Static inspection prompts |
| `schemas/sccif_alignment.py` | SCCIF alignment schema |
| Frontend: `inspection-orb-support.tsx`, `sccif-alignment-dashboard.tsx` | UI surfaces |

**Gap:** No **Ofsted report registry/ingestion/analysis** pipeline for public report learning (practice/risk markers, anonymised).

---

## 4. Safeguarding, risk, chronology, child voice, manager oversight

| Area | Services / modules |
|------|-------------------|
| Missing / exploitation | `missing_episode_service`, `exploitation_risk_intelligence_service`, `missing_pattern_intelligence_service`, ISN missing/CSE services |
| Child voice | `isn_child_voice_service`, knowledge modules |
| Chronology | `chronology_pattern_service` |
| Manager oversight | `manager_intelligence_service`, `manager_daily_brief_service`, `manager_operational_queue_service` |
| Governance | `governance_intelligence_service`, `human_review_governance_service` |

**Gap:** Standalone ORB does not consistently run **gap/missingness graph** across answer packets before display.

---

## 5. Document intelligence and readiness

| Service | Notes |
|---------|-------|
| `services/orb_document_intelligence_service.py` | Uses expert engine for lens |
| `services/document_intelligence_service.py` | OS documents |
| `services/document_gap_analysis_service.py` | Gap analysis |
| `services/ofsted_document_readiness_service.py` | Readiness |

**Overlap:** Document gaps exist in OS path; standalone needs **answer-level** missingness (not only file gaps).

---

## 6. Feedback, evaluation, answer quality

| Component | Notes |
|-----------|-------|
| `services/orb_answer_quality_service.py` | Dimension heuristics for standalone text |
| `services/orb_expert_scenario_evaluator_service.py` | Marker-based scenario evaluation |
| `sql/201_orb_feedback.sql` | `orb_feedback` table with rich reason codes |
| `routers/orb_feedback_routes.py` | Feedback API |
| `docs/orb-feedback-learning-loop.md` | Design doc |

**Gap:** No `orb_learning_ledger` table/service; follow-up question taxonomy not centralised.

---

## 7. Frontend ORB modes and prompts

| Location | Modes / features |
|----------|------------------|
| `services/orb_standalone_brain_service.py` | Safeguarding Thinking, Ofsted Lens, Record This Properly, Reg 44/45 Prep, Manager Copilot, etc. |
| `frontend/ai-suite/indicare-orb-ai.js` | Legacy ORB UI |
| `frontend-next/` | Recording ORB rail, care hub widgets, inspection/handover ORB support |
| `services/orb_product_mode_service.py` | Product modes |

**Gap:** Frontend modes not yet mapped to **Quality Standard lenses** and **whole-child domains** in API metadata.

---

## 8. Database / SQL supporting learning and sources

| Migration | Purpose |
|-----------|---------|
| `sql/073–074` | Knowledge library + semantic governance |
| `sql/077` | Official source citations |
| `sql/201` | ORB feedback |
| `sql/202` | Improvement candidates |
| `sql/208` | Knowledge source scope |

**Gap:** `orb_learning_ledger` table (proposed `sql/209_orb_learning_ledger.sql`).

---

## 9. Duplicated / overlapping concepts

| Overlap | Instances | Converge to |
|---------|-----------|-------------|
| Source registries | `orb_source_registry.py`, `orb_official_source_registry_service.py`, `guidance_sources.json` | **trusted_sources_registry.json** + citation service |
| Quality standards | `quality_standards.py`, inspection/SCCIF schemas, expert markers | **orb_quality_standards_brain_service** |
| Scenario routing | `orb_scenario_playbook_service`, `orb_expert_scenario_families`, playbooks in operating brain | **scenario_sequences** + expert engine |
| Answer quality | `orb_answer_quality_service`, expert `evaluate_answer_light`, evaluation suite | **orb_answer_quality_gate_service** (residential thresholds) |
| Brain framing | standalone brain, operating brain, human practice brain | **orb_expert_brain_orchestrator_service** |
| Ofsted intelligence | judgement simulation, document readiness, inspection services | **ofsted_report_* + adapter** for public report learning |

---

## 10. Missing for 9/10+ expert brain

1. **Master orchestrator** with explicit pipeline: intent → risk → lenses → sources → generate → gate → ledger  
2. **Governed trusted source registry** with change review (no auto-apply for statutory/safeguarding/medical/legal)  
3. **Whole-child professional lens** on every residential answer  
4. **Quality Standards Brain** (9 standards × structured fields) as answer spine  
5. **Gap detection + missingness graph** linked to QS and lenses  
6. **Answer quality gate** with scenario-specific minimum scores  
7. **Learning ledger + follow-up taxonomy** (anonymised)  
8. **Ofsted report intelligence** scaffold (registry, ingestion, practice/risk markers)  
9. **Regression test bank** for 10 gold scenarios on **answer packets**  
10. **Source update watcher** with human approval queue  

---

## What should be converged (order)

1. Audit + architecture docs (this file + `orb-9-expert-brain-architecture.md`)  
2. `trusted_sources_registry.json` + governance services  
3. Quality Standards Brain + Whole Child Lens + scenario sequences  
4. Gap/missingness + answer quality gate  
5. Master orchestrator wired into `orb_knowledge_retrieval_service.prepare_request_bundle`  
6. Learning ledger + follow-up learning  
7. Ofsted report intelligence scaffold  
8. Regression tests + developer docs  
9. Human content approval for gold statutory text and local policy uploads  

---

## Recommended file changes

| Action | Path |
|--------|------|
| **Create** | `docs/orb-9-expert-brain-architecture.md`, `docs/orb-9-*.md` (5 governance docs) |
| **Create** | `assistant/knowledge/trusted_sources_registry.json` |
| **Create** | `assistant/knowledge/orb_quality_standards_brain.json`, `orb_scenario_sequences.json`, `orb_regression_test_bank.py` |
| **Create** | `services/orb_expert_brain_orchestrator_service.py` + 15 new services (see mission) |
| **Create** | `schemas/orb_learning_ledger.py`, `sql/209_orb_learning_ledger.sql` |
| **Create** | `tests/test_orb_9_expert_brain.py` |
| **Modify** | `services/orb_knowledge_retrieval_service.py` — call orchestrator in `prepare_request_bundle` |
| **Modify** | `services/orb_expert_answer_engine_service.py` — attach orchestrator metadata to packets |
| **Defer replace** | `orb_source_registry.py` — keep for backward compatibility; map IDs to trusted registry |
| **Restrict** | `orb_web_search_service` / public discovery — only trusted registry URLs |

---

## Risk / safety concerns

- **Web scraping / unvetted sources:** `orb_web_search_service` and public discovery must not bypass registry.  
- **Auto-learning:** `sql/202` improvement candidates must not auto-apply safeguarding/regulatory content.  
- **Grade prediction:** Existing simulation services include disclaimers — orchestrator must reinforce.  
- **Live OS claims:** Multiple tests guard this; quality gate must block sub-threshold answers.  
- **Child-identifiable sector intelligence:** Learning ledger must store anonymised tags only.  
- **conftest CSRF:** Known test fixture issue per AGENTS.md — unrelated to ORB 9 but affects some auth tests.  

---

## Proposed implementation order

See **What should be converged** above. Steps 1–8 are implemented in branch `cursor/orb-9-expert-brain-b79b`; steps 9–10 remain human-governed content work.
