# Safeguarding & Missing Operational Core — implementation tracker

Date: 2026-05-17

Purpose: convert the safeguarding and missing first-class architecture direction into a staged engineering implementation plan that can be completed safely without destabilising demo-ready workflows.

Related documents:
- safeguarding-missing-first-class-architecture.md
- final-demo-readiness-audit.md
- final-workflow-completion-audit.md
- frontend-canonical-migration-tracker.md

---

# CTO objective

Move safeguarding and missing-from-care handling from:

- incident-category compatibility behaviour

into:

- first-class operational domains

while preserving:

- chronology integrity;
- operational memory;
- provider oversight;
- replay compatibility;
- existing demo flows;
- frontend stability.

---

# Architectural principles

## 1. Safety before cleverness

The safeguarding system must prioritise:

- clarity;
- chronology;
- oversight;
- evidence;
- explainability;
- operational trust.

Do not introduce:

- predictive safeguarding scoring;
- opaque AI risk labels;
- autonomous operational decisions.

---

## 2. Compatibility-first migration

Existing incident-linked safeguarding data must continue to work during migration.

Introduce:

- canonical typed contracts;
- transformation layers;
- compatibility adapters.

Do not break:

- chronology;
- search;
- replay;
- provider oversight;
- existing seeded demos.

---

## 3. Chronology is the operational truth plane

Safeguarding and missing workflows must project into:

- chronology;
- operational memory;
- evidence traversal;
- provider queues.

No isolated safeguarding silo.

---

# Phase breakdown

---

# PHASE 1 — Canonical contracts

## Goal

Introduce typed safeguarding and missing contracts.

## Deliverables

### Backend schemas

Create:

- schemas/safeguarding_contracts.py
- schemas/missing_episode_contracts.py
- schemas/return_home_interview_contracts.py

Required:

- schema versioning
- provider scoping
- home scoping
- chronology linkage
- evidence linkage
- lifecycle state support
- operational memory identifiers

## Acceptance criteria

- DTOs validate;
- DTOs compile;
- DTOs support serialization;
- schema version present;
- provider/home/child identifiers required.

## Tests

- tests/test_safeguarding_contracts.py
- tests/test_missing_episode_contracts.py
- tests/test_return_home_interview_contracts.py

Status: NOT STARTED

---

# PHASE 2 — Service layer

## Goal

Create first-class operational services.

## Deliverables

Create:

- services/safeguarding_service.py
- services/missing_episode_service.py
- services/return_home_interview_service.py

Responsibilities:

- create/save/update;
- lifecycle transitions;
- chronology projections;
- evidence traversal edges;
- operational memory writes;
- provider queue updates;
- escalation logic;
- review state management.

## Acceptance criteria

- create/save/reopen works;
- lifecycle transitions persist;
- chronology projections created;
- operational memory append works;
- provider queues update.

## Tests

- tests/test_safeguarding_domain_workflow.py
- tests/test_missing_episode_workflow.py
- tests/test_return_home_interview_workflow.py

Status: NOT STARTED

---

# PHASE 3 — Chronology & replay integration

## Goal

Safeguarding and missing become first-class chronology and replay events.

## Deliverables

Add chronology projections for:

### Safeguarding
- concern created
- immediate safety action
- professional notification
- escalation
- manager review
- safety-plan update
- closure

### Missing
- last seen
- reported missing
- police informed
- returned
- welfare check
- debrief
- return-home interview
- risk review
- safety-plan update
- closure

## Acceptance criteria

- chronology ordering stable;
- replay reconstruction stable;
- provider scoping preserved;
- child chronology readable.

## Tests

- tests/test_safeguarding_chronology_projection.py
- tests/test_missing_chronology_projection.py
- tests/test_missing_provider_queue.py

Status: NOT STARTED

---

# PHASE 4 — Operational queues

## Goal

Create operational safeguarding visibility.

## Deliverables

### Safeguarding queues

- immediate action required
- manager review overdue
- professional notification missing
- child voice missing
- safety-plan update required
- Reg 40 consideration required

### Missing queues

- active missing child
- overdue return-home interview
- debrief missing
- risk assessment update required
- repeated missing pattern
- safety-plan update overdue

## Acceptance criteria

- queues provider-scoped;
- queues home-scoped;
- queues searchable;
- queues update from lifecycle events.

Status: NOT STARTED

---

# PHASE 5 — Frontend operational migration

## Goal

Add calm, canonical operational UI.

## Deliverables

### Safeguarding page

Must show:

- active concerns
- review status
- chronology links
- evidence links
- escalation state
- notifications
- safety-plan state

### Missing page

Must show:

- active missing episodes
- current status
- chronology timeline
- return-home interview status
- repeat patterns
- follow-up actions

### Child overview additions

Must summarise:

- active safeguarding concerns
- active/recent missing episodes
- what helps keep this child safe
- current safety actions
- unresolved follow-up

## Acceptance criteria

- no duplicate cards;
- canonical lifecycle rendering;
- mobile usable;
- keyboard accessible;
- calm operational hierarchy.

Status: NOT STARTED

---

# PHASE 6 — Search & evidence integration

## Goal

Safeguarding and missing become searchable evidence-aware operational domains.

## Deliverables

Search should find:

- safeguarding concerns
- missing episodes
- return-home interviews
- linked evidence
- chronology events
- safety-plan updates

Evidence traversal should support:

- linked incidents
- linked notes
- linked documents
- linked reviews
- linked plans

## Acceptance criteria

- search relevance clear;
- chronology links work;
- evidence graph links work.

Status: NOT STARTED

---

# PHASE 7 — Document OS integration

## Goal

Integrate safeguarding and missing into therapeutic Document OS.

## Deliverables

Templates:

- safeguarding concern
- missing episode
- return-home interview
- exploitation concern
- contextual safeguarding review
- manager safeguarding oversight note

Requirements:

- child voice;
- therapeutic reflection;
- restorative practice;
- regulatory mapping;
- SCCIF mapping;
- chronology linkage;
- evidence linkage.

Status: PARTIAL

---

# PHASE 8 — Provider oversight

## Goal

Provider-level safeguarding awareness.

## Deliverables

Provider oversight should show:

- safeguarding pressure;
- homes with rising concerns;
- repeated missing episodes;
- overdue follow-up;
- unresolved reviews;
- missing evidence.

Do not build predictive scoring.

Focus on:

- operational visibility;
- chronology-backed oversight.

Status: NOT STARTED

---

# Demo guidance during migration

Until migration is complete:

## Safe to demo

- chronology direction
- operational memory direction
- therapeutic templates
- child overview
- daily note workflow
- document registry
- provider oversight direction

## Avoid overselling

Do not present safeguarding/missing as fully mature first-class operational domains until:

- typed contracts exist;
- lifecycle queues exist;
- chronology projections complete;
- browser workflows proven.

---

# Definition of complete

The safeguarding/missing operational core is considered complete only when:

- typed contracts exist;
- create/save/reopen works;
- chronology projections work;
- operational memory persists lifecycle events;
- provider queues work;
- evidence traversal works;
- child overview summarises safeguarding context;
- search works;
- browser workflows proven;
- mobile flows usable;
- no workflow relies primarily on incident categories.
