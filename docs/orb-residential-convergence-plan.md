# ORB Residential Convergence Plan

## Strategic decision

IndiCare will use:

- One shared intelligence spine
- Two product surfaces
- Strict operational guard rails

### Shared brain

The following systems become the canonical shared intelligence layer:

- assistant/knowledge_loader.py
- assistant/response_contracts.py
- assistant/answer_quality.py
- assistant/modes.py
- assistant/knowledge/*
- services/indicare_intelligence_spine_service.py
- services/orb_standalone_brain_service.py
- services/indicare_intelligence_surface_router.py

This becomes:

# IndiCare Intelligence Spine

The Intelligence Spine powers:

- ORB Residential
- IndiCare OS
- Future APIs
- Future mobile applications

---

# Product surfaces

## ORB Residential

Standalone product.

### Allowed context

- User supplied notes
- Uploaded documents
- Voice notes
- User profile
- Saved outputs
- Preferences
- Templates
- Reflective workflows

### Blocked context

- Live child records
- Live chronology
- Provider dashboards
- Workforce dashboards
- Real safeguarding state
- Cross-home intelligence
- Operational APIs

### Core paid tools

1. Shift Builder
2. Record This Properly
3. Safeguarding Thinking
4. Therapeutic Reframe
5. Ofsted Lens
6. Supervision Prep
7. Reg 44 Prep
8. Reg 45 Prep

### Pricing

- £9.99/month
- Free trial
- Usage limits
- Future team plans

---

## IndiCare OS

Operational platform.

### Additional access

- Chronology intelligence
- Live records
- Workforce intelligence
- Provider intelligence
- Inspection readiness
- Cross-home pattern analysis
- Live safeguarding state
- Operational oversight

Uses the same Intelligence Spine.

---

# Immediate convergence work

## Sprint 1 - Shared intelligence routing

Goal:

Create a single intelligence entrypoint.

### Tasks

- Create services/orb_residential_intelligence_service.py
- Route standalone ORB through assistant mode detection
- Route standalone ORB through response contracts
- Route standalone ORB through answer quality checks
- Route standalone ORB through knowledge loader
- Add standalone context boundary enforcement

---

## Sprint 2 - Shift Builder

Goal:

Create the daily paid workflow.

### Inputs

- Voice transcript
- Pasted notes
- Uploaded shift notes

### Outputs

- Daily note
- Incident summary
- Handover
- Chronology points
- Safeguarding concerns
- Child voice gaps
- Manager prompts
- Therapeutic reflection
- Action list

---

## Sprint 3 - Knowledge convergence

Goal:

Unify all knowledge systems.

### Converge

- assistant/knowledge/*
- orb knowledge source packs
- Knowledge Library
- Official uploaded guidance
- Templates
- Micro interventions
- Reflective prompts

### Required official guidance

- SCCIF
- Quality Standards
- Working Together
- Children’s Homes Regulations
- Missing from care guidance
- Restraint guidance
- Exploitation guidance
- Online safety guidance
- LADO guidance
- Medication guidance

---

## Sprint 4 - Subscription enforcement

Goal:

Commercialise ORB Residential.

### Tasks

- Require active subscription or trial for /orb
- Add free trial flow
- Add usage tracking
- Add plan limits
- Add billing portal
- Add upgrade prompts
- Add referral codes

---

## Sprint 5 - Product simplification

Goal:

Reduce cognitive overload.

### Primary UI actions

1. Ask ORB
2. Shift Builder
3. Record This Properly
4. Safeguarding Thinking
5. Ofsted Lens
6. Upload Document

Advanced tools move under secondary navigation.

---

# Architectural rule

One brain.

Different context adapters.

## StandaloneContextAdapter

Safe user supplied context only.

## OperationalContextAdapter

Live operational intelligence context.

---

# Commercial goal

Target:

- 500+ paying residential users
- ORB Residential funds OS expansion
- OS becomes enterprise operational layer

---

# Product positioning

# ORB Residential

Powered by IndiCare.

The AI companion for adults working in children’s residential care.
