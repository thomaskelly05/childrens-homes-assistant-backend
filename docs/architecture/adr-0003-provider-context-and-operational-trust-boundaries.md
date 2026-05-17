# ADR-0003 — ProviderContext and operational trust boundaries

Status: Accepted
Date: 2026-05-17
Decision makers: CTO / platform architecture

---

# Context

IndiCare OS is evolving into a multi-provider operational platform for residential children’s homes.

The platform already includes:

- ProviderContext foundations;
- policy engine foundations;
- chronology projections;
- operational memory;
- provider oversight;
- assistant/ORB infrastructure;
- operational queues;
- safeguarding direction;
- evidence traversal;
- realtime infrastructure.

As the platform matures, the operational risk profile changes significantly.

The system is no longer handling only:

- generic records;
- isolated forms;
- single-home operational flows.

It is increasingly handling:

- provider-wide operational visibility;
- safeguarding chronology;
- inspection evidence;
- leadership oversight;
- assistant operational retrieval;
- replayable operational history.

This creates a major architectural requirement:

strict operational trust boundaries.

---

# Decision

ProviderContext becomes a mandatory operational trust boundary across IndiCare OS.

All major operational systems must:

- operate within provider scope;
- respect home scope;
- respect role scope;
- respect policy-engine decisions;
- avoid cross-provider operational leakage.

This applies to:

- chronology;
- operational memory;
- realtime events;
- queues;
- search;
- evidence traversal;
- safeguarding;
- missing episodes;
- documents;
- assistant retrieval;
- inspection readiness.

ProviderContext is not optional convenience metadata.

It is core operational infrastructure.

---

# Consequences

## Positive consequences

### 1. Operational trust

Providers can trust that:

- children’s data remains isolated;
- chronology is scoped correctly;
- safeguarding information does not leak;
- operational oversight reflects the correct organisation.

---

### 2. Safer assistant behaviour

Assistant/ORB systems can safely retrieve:

- chronology;
- evidence;
- safeguarding context;
- provider oversight data

within explicit trust boundaries.

This significantly reduces:

- accidental operational leakage;
- unsafe summarisation;
- incorrect organisational visibility.

---

### 3. Safer realtime infrastructure

Realtime systems can enforce:

- provider-scoped subscriptions;
- home-scoped subscriptions;
- replay-safe reconnect behaviour;
- queue invalidation isolation.

---

### 4. Stronger enterprise readiness

This supports:

- enterprise onboarding;
- provider confidence;
- governance expectations;
- inspection defensibility;
- operational accountability.

---

# Architectural implications

## Provider scope is mandatory

Major operational contracts should include:

- provider_id;
- home_id where relevant;
- actor/user identifiers where relevant;
- replay identifiers where relevant.

Avoid global operational reads.

---

## Search must be provider-scoped

Operational search must not:

- leak children;
- leak chronology;
- leak safeguarding records;
- leak provider oversight.

Search indexing and retrieval must remain scope-aware.

---

## Realtime must be provider-scoped

Realtime channels and reconnect logic must:

- validate provider scope;
- validate home scope where required;
- isolate queue updates;
- isolate chronology updates.

---

## Assistant retrieval must be provider-scoped

Assistant retrieval must:

- use ProviderContext;
- respect policy-engine outcomes;
- avoid cross-provider chronology traversal;
- avoid cross-provider evidence traversal.

Assistant systems must not bypass operational trust boundaries.

---

## Operational memory and replay must remain scoped

Replay systems must preserve:

- provider identity;
- home identity;
- chronology ownership;
- operational event provenance.

Replay must not flatten trust boundaries.

---

# Rejected alternatives

## Alternative: partial provider scoping

Rejected because:

- inconsistent trust behaviour;
- realtime leakage risk;
- chronology ambiguity;
- unsafe assistant retrieval.

---

## Alternative: assistant-level scoping only

Rejected because:

- trust must exist below assistant level;
- replay/search/realtime also require enforcement.

ProviderContext must be systemic.

---

## Alternative: frontend-only isolation

Rejected because:

- frontend isolation alone is insufficient;
- backend/replay/search layers must enforce trust.

---

# Implementation guidance

Future platform work should:

1. require ProviderContext in operational reads/writes;
2. reject unscoped operational access;
3. preserve scope through replay and chronology projection;
4. ensure realtime subscriptions are scope-aware;
5. ensure search indexing is scope-aware;
6. ensure assistant retrieval remains bounded.

---

# Operational UX implications

Operational trust should remain largely invisible to end users.

The goal is:

- safe operational behaviour;
- coherent provider oversight;
- stable organisational understanding.

Not:

- noisy tenancy messaging;
- enterprise jargon-heavy UX.

---

# Strategic outcome

This decision establishes IndiCare OS as:

- provider-safe;
- chronology-safe;
- safeguarding-safe;
- replay-safe;
- assistant-safe by architecture.

Rather than relying on:

- ad hoc filtering;
- frontend-only checks;
- inconsistent scope handling.
