# ADR-0001 — Chronology as the operational truth plane

Status: Accepted
Date: 2026-05-17
Decision makers: CTO / platform architecture

---

# Context

IndiCare OS is evolving into a chronology-centred operational platform for residential children’s homes.

The platform now includes:

- operational memory;
- chronology projections;
- provider context;
- policy engine;
- evidence traversal;
- therapeutic document workflows;
- operational queues;
- safeguarding architecture direction;
- inspection readiness;
- assistant/ORB operational retrieval.

Historically, many care platforms treat chronology as:

- a passive timeline;
- a reporting view;
- a historical appendage;
- or a disconnected audit trail.

That model is insufficient for IndiCare.

The platform increasingly depends on:

- operational replay;
- safeguarding understanding;
- evidence defensibility;
- provider oversight;
- lifecycle visibility;
- assistant explainability;
- inspection readiness.

A stronger architectural principle is therefore required.

---

# Decision

Chronology is adopted as the primary operational truth plane of IndiCare OS.

This means:

- operational events project into chronology;
- chronology is replayable;
- chronology supports evidence traversal;
- chronology supports provider oversight;
- chronology is lifecycle-aware;
- chronology becomes the primary operational narrative layer.

Chronology is not merely:

- a UI timeline;
- a note feed;
- or an audit afterthought.

It is a canonical operational projection layer.

---

# Consequences

## Positive consequences

### 1. Operational explainability

The platform can explain:

- what happened;
- when;
- why;
- what followed;
- what evidence exists;
- what operational action was taken.

This improves:

- safeguarding defensibility;
- provider trust;
- leadership oversight;
- assistant explainability.

---

### 2. Replayability

Operational memory and chronology together enable:

- replay-safe operational reconstruction;
- lifecycle replay;
- inspection evidence reconstruction;
- operational auditing.

---

### 3. Cross-domain coherence

Chronology becomes the shared operational language across:

- daily notes;
- incidents;
- safeguarding;
- missing episodes;
- key work;
- documents;
- evidence;
- operational queues;
- inspection readiness.

This reduces fragmented operational truth.

---

### 4. Safer assistant retrieval

Assistant/ORB systems can retrieve:

- chronology-backed events;
- evidence-linked operational context;
- replay-aware operational sequences.

This is safer than freeform summarisation.

---

### 5. Better inspection defensibility

Inspection evidence can increasingly rely on:

- chronology sequences;
- operational actions;
- linked evidence;
- review history;
- leadership oversight.

---

# Architectural implications

## All major operational domains should project into chronology

Including:

- safeguarding concerns;
- missing episodes;
- return-home interviews;
- incidents;
- daily notes;
- management oversight;
- document lifecycle transitions;
- operational reviews;
- evidence updates.

---

## Chronology events should be typed

Avoid generic untyped timeline blobs.

Chronology projections should support:

- event type;
- lifecycle state;
- linked evidence;
- linked operational records;
- provider/home scope;
- chronology significance;
- replay identifiers;
- schema versioning.

---

## Chronology is provider-scoped operational infrastructure

Chronology must respect:

- ProviderContext;
- policy engine decisions;
- home scoping;
- role permissions;
- audit visibility rules.

No cross-provider chronology leakage.

---

## Chronology must support calm operational UX

Chronology rendering should avoid:

- noisy duplicated entries;
- meaningless timestamps;
- repeated warnings;
- fragmented event language.

Chronology should answer:

- what matters;
- what changed;
- what requires follow-up.

---

# Rejected alternatives

## Alternative: chronology as passive audit log

Rejected because:

- weak operational explainability;
- fragmented domain understanding;
- poor replay support;
- weaker inspection evidence.

---

## Alternative: assistant-generated operational summaries as truth

Rejected because:

- unsafe operational authority;
- explainability concerns;
- replay inconsistency;
- hallucination risk.

Chronology-backed retrieval remains safer.

---

## Alternative: separate timelines per domain

Rejected because:

- fragmented operational understanding;
- duplicated rendering systems;
- poor provider oversight;
- weak child/home narrative continuity.

---

# Implementation guidance

Future domain work should:

1. create typed chronology projection events;
2. persist replay-safe operational identifiers;
3. link chronology to evidence traversal;
4. expose chronology through canonical operational primitives;
5. avoid creating isolated domain-specific timelines.

---

# Related architecture

Related documents:

- safeguarding-missing-first-class-architecture.md
- safeguarding-missing-implementation-tracker.md
- frontend-canonical-migration-tracker.md
- chronology-projection-architecture.md
- operational-memory-replay.md
- assistant-operational-trust.md

---

# Strategic outcome

This decision establishes IndiCare OS as:

- chronology-centred;
- operationally replayable;
- evidence-aware;
- safeguarding-aware;
- therapeutically contextual;
- explainable by design.

Rather than:

- form-centred;
- dashboard-centred;
- or AI-summary-centred.
