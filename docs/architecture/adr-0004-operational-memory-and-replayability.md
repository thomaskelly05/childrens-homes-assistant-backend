# ADR-0004 — Operational memory and replayability

Status: Accepted
Date: 2026-05-17
Decision makers: CTO / platform architecture

---

# Context

IndiCare OS is evolving beyond:

- static records;
- isolated CRUD workflows;
- disconnected audit logs.

The platform already contains foundations for:

- operational memory;
- chronology projections;
- realtime replay;
- lifecycle transitions;
- provider oversight;
- operational queues;
- evidence traversal;
- assistant operational retrieval.

Historically, many operational systems treat updates as:

- destructive overwrites;
- mutable form state;
- disconnected audit appendices.

This model weakens:

- operational explainability;
- safeguarding defensibility;
- chronology reconstruction;
- inspection evidence;
- leadership review;
- replay-safe assistant retrieval.

A formal replayability direction is therefore required.

---

# Decision

Operational memory becomes a core architectural layer of IndiCare OS.

Major operational domains should increasingly support:

- append-oriented lifecycle recording;
- replay-safe operational reconstruction;
- chronology projection;
- evidence-linked operational state;
- audit-aware lifecycle history.

Replayability is considered:

- operational infrastructure,
not:
- debugging infrastructure.

---

# Consequences

## Positive consequences

### 1. Operational explainability

The platform can increasingly explain:

- what changed;
- when it changed;
- who changed it;
- why it changed;
- what operational consequences followed.

This strengthens:

- safeguarding defensibility;
- provider trust;
- inspection readiness;
- leadership oversight.

---

### 2. Safer chronology reconstruction

Chronology becomes reconstructable from:

- operational memory events;
- lifecycle transitions;
- replay-safe projections.

This reduces:

- chronology drift;
- stale timeline ambiguity;
- hidden state mutation.

---

### 3. Stronger assistant trust

Assistant/ORB systems can increasingly retrieve:

- replay-backed operational sequences;
- chronology-backed lifecycle state;
- evidence-linked operational context.

This is safer than relying on:

- mutable summaries;
- isolated final-state snapshots.

---

### 4. Better provider oversight

Provider leadership can increasingly understand:

- unresolved operational pressure;
- safeguarding escalation history;
- repeated missing patterns;
- overdue reviews;
- operational drift.

---

# Architectural implications

## Major domains should emit operational memory events

Including:

- daily notes;
- incidents;
- safeguarding concerns;
- missing episodes;
- return-home interviews;
- management oversight;
- document lifecycle transitions;
- evidence changes;
- review/signoff transitions.

---

## Replay identifiers should persist

Operational events should increasingly support:

- event identifiers;
- lifecycle identifiers;
- chronology projection identifiers;
- provider/home scope;
- schema versioning.

---

## Replay should not bypass trust boundaries

Replay systems must preserve:

- ProviderContext;
- policy engine outcomes;
- chronology ownership;
- provider/home scope.

Replay is not exempt from operational trust.

---

## Replay must support calm operational UX

Replayability should improve:

- operational clarity;
- chronology understanding;
- review understanding;
- evidence defensibility.

It should not expose:

- noisy low-value event spam;
- overwhelming audit verbosity.

---

# Rejected alternatives

## Alternative: mutable final-state only architecture

Rejected because:

- poor explainability;
- weak chronology reconstruction;
- weak safeguarding defensibility;
- weak operational replay.

---

## Alternative: separate audit subsystem disconnected from operations

Rejected because:

- fragmented operational understanding;
- duplicated timeline systems;
- replay inconsistency.

Operational memory should remain connected to chronology and lifecycle systems.

---

## Alternative: AI-generated operational history summaries

Rejected because:

- unsafe operational authority;
- replay inconsistency;
- explainability risk.

Assistant systems may assist interpretation, but replayable operational events remain authoritative.

---

# Implementation guidance

Future platform work should:

1. prefer append-oriented operational recording;
2. emit lifecycle-aware replay events;
3. connect replay to chronology projections;
4. preserve provider/home scope;
5. support evidence traversal;
6. avoid destructive hidden mutation.

---

# Operational UX implications

Users should experience:

- trustworthy chronology;
- understandable operational history;
- reliable review/audit visibility.

Users should NOT experience:

- raw event-stream overload;
- technical replay jargon;
- noisy audit spam.

---

# Strategic outcome

This decision establishes IndiCare OS as:

- replay-aware;
- chronology-backed;
- operationally reconstructable;
- safeguarding-defensible by design.

Rather than:

- mutable form software;
- disconnected audit infrastructure;
- opaque operational state systems.
