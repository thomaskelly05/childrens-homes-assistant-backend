# IndiCare Intelligence Spine — Specification

## Objective

Create a single shared intelligence runtime powering:

- ORB Residential
- IndiCare OS
- future APIs
- future mobile applications

without duplicating:

- safeguarding reasoning
- therapeutic reasoning
- recording logic
- answer quality systems
- knowledge systems
- response contracts

---

# Core architectural principle

# One Intelligence Spine.

Multiple surfaces.

---

# Surfaces

## ORB Residential

Standalone premium intelligence application.

### Uses

- StandaloneContextAdapter
- user-supplied context only
- saved outputs
- projects
- workflow continuity
- personalised preferences

### Never uses

- chronology
- live records
- provider dashboards
- governance systems
- operational evidence

---

## IndiCare OS

Operational enterprise platform.

### Uses

- OperationalContextAdapter
- chronology
- live records
- provider governance
- safeguarding state
- operational evidence
- management systems

---

# Intelligence Spine components

## 1 — Mode detection

Current:

- assistant/modes.py

Purpose:

Detect user intent/workflow.

Examples:

- safeguarding thinking
- recording support
- supervision support
- Ofsted support
- therapeutic reflection

---

## 2 — Knowledge selection

Current:

- assistant/knowledge_loader.py

Purpose:

Select relevant:

- safeguarding guidance
- Quality Standards guidance
- SCCIF guidance
- therapeutic guidance
- recording guidance

---

## 3 — Response contracts

Current:

- assistant/response_contracts.py

Purpose:

Ensure outputs are:

- structured
- workflow-aware
- child-centred
- safe
- emotionally clear

---

## 4 — Answer quality system

Current:

- assistant/answer_quality.py

Purpose:

Detect:

- hallucinations
- fake record access
- safeguarding concerns
- unsupported claims
- poor structure
- unsafe guidance

---

## 5 — Therapeutic reasoning

Current:

- distributed across assistant/orb services

Needs convergence.

Purpose:

Support:

- trauma-informed thinking
- behaviour-as-communication thinking
- emotionally aware responses
- reflective practice

---

## 6 — Safeguarding reasoning

Current:

- distributed across assistant/orb services

Needs convergence.

Purpose:

Support:

- concern identification
- escalation thinking
- factual separation
- evidence clarity
- safeguarding-safe wording

---

## 7 — Recording intelligence

Purpose:

Support:

- factual recording
- child-centred language
- chronology-ready thinking
- evidence clarity
- emotional neutrality
- therapeutic framing

---

# Shared runtime flow

## ORB Residential flow

User request
→ StandaloneContextAdapter
→ Intelligence Spine
→ workflow contracts
→ answer quality
→ premium rendering
→ standalone-safe response

---

## IndiCare OS flow

User request
→ OperationalContextAdapter
→ Intelligence Spine
→ chronology enrichment
→ operational evidence
→ answer quality
→ operational rendering

---

# Runtime boundaries

## Hard separation rule

ORB Residential and IndiCare OS must NEVER share:

- runtime permissions
- route access
- chronology state
- provider state
- operational evidence

They share:

# intelligence only.

---

# Intelligence convergence priorities

## Highest priority convergence

### safeguarding logic

Current issue:

Multiple safeguarding reasoning locations.

Goal:

Single safeguarding reasoning layer.

---

### therapeutic reasoning

Current issue:

Distributed emotional/therapeutic logic.

Goal:

Single therapeutic reasoning layer.

---

### recording logic

Current issue:

Multiple recording helper systems.

Goal:

Single recording intelligence layer.

---

# Long-term intelligence direction

The Intelligence Spine should eventually support:

- reflective continuity
- workflow memory
- emotional context shaping
- developmental reasoning
- chronology trajectory reasoning
- safeguarding trajectory reasoning
- inspection readiness intelligence

---

# Strategic value

The Intelligence Spine becomes:

# the core company asset.

Not:

- ORB UI
- OS UI
- workflows
- dashboards

The intelligence itself becomes the moat.
