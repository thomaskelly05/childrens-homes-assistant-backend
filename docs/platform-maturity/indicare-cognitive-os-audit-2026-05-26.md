# IndiCare Cognitive OS Audit — 2026-05-26

## Executive finding

IndiCare is no longer just a residential children's homes management system with AI features. The repository already contains the foundations of a cognitive operating system for residential childcare.

The major discovery is that the `IndiCare Intelligence Spine` already exists and is registered as a built operational capability. The next phase is not to invent the intelligence layer from scratch, but to harden, connect, test and productise the layers already present.

## Current built architecture

### 1. Chronology as the operational truth plane

Status: built / architecturally accepted.

Evidence in repo:
- `docs/architecture/adr-0001-chronology-as-operational-truth-plane.md`
- `services/os_chronology_service.py`
- `services/chronology_projection_service.py`
- `services/chronology_intelligence_service.py`
- `services/chronology_pattern_service.py`
- `services/chronology_cluster_service.py`
- `assistant/chronology_graph.py`

What this means:
- Chronology is positioned as the canonical operational narrative layer.
- Operational events can be replayed, linked to evidence and used by ORB/assistant retrieval.
- This is the correct foundation for explainable safeguarding intelligence.

Assessment:
- Strong foundation.
- Needs consolidation into one visible intelligence product surface.

### 2. Intelligence Spine

Status: built but needs hardening and productisation.

Evidence in repo:
- `services/indicare_intelligence_spine_service.py`
- `routers/indicare_intelligence_routes.py`
- `schemas/indicare_intelligence.py`
- `services/indicare_intelligence_capability_service.py`

Built capabilities:
- Home intelligence.
- Child intelligence.
- Manager daily brief.
- Inspection intelligence.
- Live record collection.
- Pattern detection.
- Record quality review.
- Evidence graph.
- Ofsted evidence simulation.
- Regulatory ontology context.
- Snapshot cache.
- Proposed action layer.

Assessment:
- This is the central cognitive orchestrator previously thought to be missing.
- It already performs the role of an intelligence kernel.
- It now needs stronger integration with specialist services: chronology clusters, missing pattern intelligence, workforce intelligence, relational intelligence, placement stability and emotional climate.

### 3. Pattern and safeguarding intelligence

Status: built, deterministic, safe-language aligned.

Evidence in repo:
- `services/pattern_detection_service.py`
- `services/chronology_pattern_service.py`
- `services/missing_pattern_intelligence_service.py`
- `services/risk_intelligence_language.py`
- `services/safeguarding_flowchart_service` equivalent logic inside `document_os_core.py`

Built capabilities:
- Missing episode increase.
- Incident increase.
- Restraint increase.
- Repeated safeguarding concerns.
- Missing child voice.
- Missing manager review.
- Stale risk assessment.
- Repeated family contact escalation.
- Education refusal pattern.
- Medication refusal pattern.
- Night incident clustering.
- Missing staff debrief.
- Overdue actions.
- Weak recording quality.
- Missing-from-care day/time/location/trigger/associate analysis.

Assessment:
- Strong safe decision-support design.
- Current approach is rule-based and transparent, which is appropriate for safeguarding.
- Needs evidence confidence scoring and false-positive management.

### 4. Evidence graph and knowledge graph foundations

Status: built / early-stage.

Evidence in repo:
- `assistant/chronology_graph.py`
- `services/evidence_graph_intelligence_service.py`
- `services/chronology_cluster_service.py`
- `services/regulatory_graph_service.py`

Built capabilities:
- Chronology nodes and edges.
- Linked safeguarding clusters.
- Evidence graph responses.
- Regulatory and SCCIF links.
- Evidence gaps.
- Manager review prompts.

Assessment:
- Graph foundations are in place.
- Needs richer relationship ontology: person, event, location, staff, risk, plan, action, review, evidence, regulation.

### 5. Workforce and culture intelligence

Status: built / partially connected.

Evidence in repo:
- `services/workforce_intelligence_service.py`
- `services/workforce_journey_service.py`
- `routers/workforce_os_routes.py`
- `routers/staff_profile_os_routes.py`

Built capabilities:
- Workforce chronology.
- Recording quality scoring.
- Workforce risk scoring.
- Supervision and training signals.
- Wellbeing flags.
- Practice concerns.
- Staff-child relationship indicators.
- Command centre alerts.
- ORB workforce context.

Assessment:
- One of IndiCare's strongest differentiators.
- Needs direct connection into the Intelligence Spine response, not just separate dashboard use.

### 6. Recording quality and therapeutic language intelligence

Status: built.

Evidence in repo:
- `services/record_quality_intelligence_service.py`
- `services/workforce_intelligence_service.py`
- `services/document_os_core.py`
- `services/indicare_forms_framework_service.py`

Built capabilities:
- Child voice detection.
- Safeguarding language detection.
- Restorative language detection.
- Reflection quality scoring.
- Vague wording detection.
- Punitive wording detection.
- Therapeutic rewrite prompts.

Assessment:
- This is a major care-sector differentiator.
- Should become a visible OS-wide quality score, not hidden inside services.

### 7. ORB and assistant surfaces

Status: built / mixed standalone and OS-linked.

Evidence in repo:
- `routers/orb_standalone_routes.py`
- `routers/orb_operational_routes.py`
- `routers/orb_proactive_routes.py`
- `services/assistant_context_service.py`
- `services/indicare_intelligence_surface_router.py`
- `services/orb_voice_session_service.py`

Built capabilities:
- Standalone ORB.
- OS-linked ORB.
- Surface boundary router.
- Assistant modes.
- Voice session foundations.
- Product boundary controls.
- Safeguarding / Reflect / Ofsted Lens / Behaviour Support / Record This Properly modes.

Assessment:
- Strong architecture.
- Needs tighter handoff from Intelligence Spine into ORB's live context so ORB behaves like a cognitive companion rather than only a chat interface.

### 8. Inspection and regulatory intelligence

Status: built / partially productised.

Evidence in repo:
- `services/ofsted_judgement_simulation_service.py`
- `services/ofsted_document_readiness_service.py`
- `services/regulatory_ontology_service.py`
- `routers/ofsted_readiness_routes.py`
- `routers/inspection_readiness_routes.py`
- `routers/indicare_intelligence_routes.py`

Built capabilities:
- Evidence strength simulation.
- Document readiness.
- Regulatory ontology summary.
- SCCIF / Quality Standards alignment.
- Ofsted evidence pack capability.

Assessment:
- Strong but must avoid grade prediction language.
- Should become continuous readiness, not a one-off report.

## What is not fully complete yet

### 1. Continuous Intelligence State

Current state:
- Intelligence appears request/response based.
- Snapshot cache exists, but not yet a continuously updated state engine.

Needed:
- `child_intelligence_state`
- `home_intelligence_state`
- `staff_intelligence_state`
- `provider_intelligence_state`
- background projection/update job
- state versioning and audit trail

Priority: critical.

### 2. Spine integration of specialist services

Current state:
- The Intelligence Spine uses pattern detection, record quality, evidence graph, Ofsted simulation and readiness.
- It does not yet clearly call all specialist services discovered in the repo.

Needed integration:
- `chronology_pattern_service`
- `chronology_cluster_service`
- `missing_pattern_intelligence_service`
- `workforce_intelligence_service`
- `PlacementStabilityService`
- `RelationalIntelligenceService`
- `ContextualSafeguardingService`
- `WorkforceCultureIntelligenceService`

Priority: critical.

### 3. Emotional climate intelligence

Current state:
- Inputs exist: recording language, wellbeing flags, restorative language, punitive language, relationship indicators, incident/missing patterns.
- No single emotional climate model is visible.

Needed:
- home emotional climate score
- child emotional pressure indicators
- staff emotional fatigue indicators
- relational warmth indicators
- institutional drift indicators

Priority: high.

### 4. Provider-level cross-home intelligence

Current state:
- Provider context exists architecturally.
- Home and child intelligence exists.
- Cross-home provider trend intelligence is not yet clearly centralised.

Needed:
- cross-home risk trends
- cross-home workforce fragility
- repeated provider evidence gaps
- provider inspection readiness view
- anonymised learning trends

Priority: high.

### 5. Explainability and confidence model

Current state:
- Safe language is strong.
- Evidence links are present.
- Decision-support notice is present.

Needed:
- confidence score per finding
- evidence strength per finding
- source recency weighting
- contradiction detection
- false-positive suppression
- manager feedback loop

Priority: high.

### 6. ORB cognitive presence

Current state:
- ORB can access modes and context.
- Standalone and OS surfaces are separated safely.

Needed:
- ORB should receive a live `intelligence_context` packet from the Spine.
- ORB should answer from current state: what matters now, why it matters, evidence, next review.
- ORB should ask reflective challenge questions based on live patterns.

Priority: high.

### 7. Product clarity

Current state:
- Many advanced services exist, but they are scattered across docs, routers and services.

Needed:
- single product map: built / partial / planned
- one dashboard for Intelligence Spine health
- one demo flow showing the cognitive OS
- one investor/provider narrative

Priority: medium.

## Recommended next build sequence

### Phase 1 — Consolidate the Intelligence Spine

1. Extend `IndiCareIntelligenceSpineService` to call all specialist services.
2. Add specialist service outputs to `IntelligenceSpineResponse`.
3. Add `emotional_climate`, `placement_stability`, `workforce_culture`, `chronology_clusters`, `missing_patterns`, `relational_intelligence` sections.
4. Add unit tests for response shape and safe language.

### Phase 2 — Build continuous intelligence state

1. Create tables for intelligence state snapshots.
2. Project events into child/home/staff/provider states.
3. Store state version, generated_at, evidence_refs and human feedback.
4. Expose `/intelligence/state/home/{id}`, `/intelligence/state/child/{id}`, `/intelligence/state/provider/{id}`.

### Phase 3 — ORB live cognition

1. Add `intelligence_context` to OS ORB context builder.
2. Let ORB answer from the current spine state.
3. Add reflective challenge prompts.
4. Keep all final decisions human-led.

### Phase 4 — Provider Intelligence Console

1. Build cross-home provider intelligence.
2. Add home comparison views.
3. Add workforce fragility view.
4. Add inspection readiness heatmap.
5. Add anonymised organisational learning.

### Phase 5 — Trust, audit and evaluation

1. Add confidence scoring.
2. Add manager feedback: useful / not useful / incorrect.
3. Add audit trail for AI-generated findings.
4. Add evaluation tests against known mock scenarios.
5. Add safety tests preventing threshold decisions and grade predictions.

## Strategic conclusion

IndiCare has already built much of the Palantir-style operating layer, but with a care-specific and safeguarding-first design.

The main gap is not invention. The main gap is convergence.

The next objective should be:

> Turn the existing services into one continuously updating, evidence-linked, human-led Intelligence Spine that ORB can explain calmly and safely.

If this is done well, IndiCare becomes a cognitive operating system for residential childcare rather than a traditional care management product.