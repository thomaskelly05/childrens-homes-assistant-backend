# ORB Runtime Convergence Wiring

## Goal

Converge standalone ORB and operational ORB onto a shared intelligence spine without removing safety boundaries.

---

# Existing architecture

## Standalone ORB

Current runtime:

- routers/orb_standalone_routes.py
- services/orb_general_assistant_service.py
- services/orb_standalone_brain_service.py
- services/orb_knowledge_retrieval_service.py
- services/orb_rag_retrieval_service.py

Standalone constraints:

- no live records
- no chronology access
- no provider dashboards
- no operational actions

---

## Operational ORB

Current runtime:

- routers/orb_routes.py
- routers/orb_operational_routes.py
- assistant/*
- chronology intelligence
- safeguarding intelligence
- governance intelligence
- operational evidence graphs

Operational permissions:

- permissioned OS access
- chronology access
- evidence grounding
- management visibility

---

# Convergence target

## Shared intelligence spine

Canonical intelligence services:

- assistant/modes.py
- assistant/knowledge_loader.py
- assistant/response_contracts.py
- assistant/answer_quality.py
- assistant/assistant_response_pipeline.py
- services/orb_residential_intelligence_service.py

---

# Runtime flow

## Standalone ORB flow

User request
  -> standalone route
  -> standalone context adapter
  -> orb_residential_intelligence_service
  -> assistant modes
  -> assistant knowledge selection
  -> assistant response contracts
  -> retrieval + RAG
  -> model router
  -> answer quality checks
  -> standalone governance checks
  -> response

---

## Operational ORB flow

User request
  -> operational route
  -> operational context adapter
  -> orb_residential_intelligence_service
  -> assistant modes
  -> assistant knowledge selection
  -> chronology/evidence retrieval
  -> model router
  -> answer quality checks
  -> operational governance checks
  -> response

---

# Important rule

The difference between ORB Residential and IndiCare OS must be:

- context
- permissions
- evidence access

NOT:

- different intelligence
- different safeguarding logic
- different recording logic
- different quality standards logic

---

# Shift Builder integration

Standalone Shift Builder should:

- use user supplied notes only
- never imply live records
- generate structured recording drafts
- generate chronology prompts
- generate safeguarding reflections
- generate manager review prompts

Operational Shift Builder may:

- enrich from chronology
- enrich from linked incidents
- enrich from actions
- enrich from plans
- enrich from previous handovers

---

# Required future runtime changes

## Phase 1

Inject orb_residential_intelligence_service into:

- services/orb_general_assistant_service.py

Purpose:

- shared mode detection
- shared contracts
- shared knowledge loading
- shared answer quality

---

## Phase 2

Inject into:

- orb agent routes
- document analysis
- recording helpers
- safeguarding helpers
- Ofsted lens

---

## Phase 3

Inject into operational ORB routes.

Purpose:

- shared response quality
- shared contracts
- shared knowledge routing
- shared safeguarding reasoning

---

# Long-term architecture

# IndiCare Intelligence Spine

Single intelligence runtime.

Powered by:

- assistant/*
- orb_residential_intelligence_service.py
- chronology intelligence
- safeguarding intelligence
- SCCIF alignment
- response contracts
- answer quality
- knowledge graph

Surfaces:

- ORB Residential
- IndiCare OS
- mobile
- APIs
- future provider integrations
