# Experience Bundle Architecture

Status: Proposed / Active
Date: 2026-05-17
Audience:
- backend engineering
- frontend engineering
- product architecture
- operational systems architecture

---

# Purpose

This document defines the next architectural evolution for IndiCare OS.

The platform currently contains:

- rich operational schema;
- chronology infrastructure;
- safeguarding domains;
- missing episode domains;
- plans/risk infrastructure;
- notifications;
- handovers;
- identity/profile infrastructure;
- inspection/evidence infrastructure.

The main remaining product challenge is no longer:

- schema depth;
- operational modelling;
- backend foundations.

The challenge is:

> coherent experience aggregation.

This document defines the architectural pattern for:

- adult workspace bundles;
- child profile bundles;
- home operational bundles.

---

# Problem with the current frontend model

Many current pages still:

- fetch fragmented endpoints;
- render disconnected cards;
- duplicate operational summaries;
- repeat chronology concepts;
- force frontend orchestration;
- expose schema complexity directly to the UI.

This creates:

- dashboard sprawl;
- box-heavy layouts;
- operational fragmentation;
- weak hierarchy;
- slow feature cohesion.

The platform currently knows more than it visually communicates.

---

# Strategic direction

The next IndiCare UI should operate through:

> experience bundles.

Meaning:

The backend aggregates operational truth into coherent UI-ready structures.

The frontend then renders:

- calm operational experiences;
- identity-aware workspaces;
- connected chronology;
- person-first child profiles.

WITHOUT:

- excessive frontend orchestration;
- repeated queries;
- fragmented operational cards.

---

# Core principle

The schema remains the operational truth layer.

Experience bundles are:

- aggregation layers;
- orchestration layers;
- presentation-aligned operational views.

They do NOT replace:

- chronology;
- operational memory;
- safeguarding domains;
- plans;
- evidence.

---

# Bundle philosophy

Bundles should:

- aggregate operationally related data;
- reduce frontend complexity;
- support calm UI hierarchy;
- support two-minute understanding;
- support personalised operational environments.

Bundles should NOT:

- fabricate operational truth;
- hide safeguarding context;
- infer unsupported conclusions;
- duplicate operational sources.

---

# Bundle 1 — Adult Workspace Bundle

Endpoint:

`GET /api/me/workspace`

Purpose:

Create a coherent personalised operational workspace.

---

## Aggregate sources

Potential schema sources:

- users
- staff
- user_profile_preferences
- dashboard_preferences
- notifications
- operational_notifications
- handovers
- handover_items
- shift_handover_entries
- connect_threads
- connect_messages
- chronology_events
- actions/tasks
- assigned children
- pinned templates

---

## UI purpose

The adult workspace should answer:

- who am I here?
- what changed since my last shift?
- what requires my attention?
- who are my key children?
- what matters today?

---

## Suggested structure

```json
{
  "identity": {},
  "home": {},
  "today": {},
  "notifications": [],
  "connect": {},
  "children": [],
  "actions": [],
  "handover": {},
  "recentChronology": [],
  "dashboardPreferences": {}
}
```

---

# Bundle 2 — Child Profile Bundle

Endpoint:

`GET /api/young-people/{id}/profile-bundle`

Purpose:

Create a person-first child experience.

---

## Aggregate sources

Potential schema sources:

- young_people
- young_person_identity_profile
- young_person_communication_profile
- young_person_all_about_me
- young_person_contacts
- young_person_photos
- safeguarding_records
- missing_episodes
- chronology_events
- plans/risk tables
- documents/evidence
- education/health profiles

---

## UI purpose

The child profile should answer:

- who is this child?
- what matters to them?
- what helps them?
- what support context exists?
- what happened recently?
- what operational concerns exist?

WITHOUT:

reducing the child to risk.

---

## Suggested structure

```json
{
  "identity": {},
  "communication": {},
  "relationships": [],
  "support": {},
  "plans": [],
  "safeguarding": {},
  "missing": {},
  "recentChronology": [],
  "documents": [],
  "evidence": []
}
```

---

# Bundle 3 — Home Operational Bundle

Endpoint:

`GET /api/homes/{id}/operational-bundle`

Purpose:

Create a calm operational overview for the home.

---

## Aggregate sources

Potential schema sources:

- homes
- young_people
- handovers
- safeguarding queues
- missing queues
- notifications
- Reg44/Reg45 actions
- inspection readiness
- chronology significance
- staffing/workforce pressure
- evidence gaps

---

## UI purpose

The home view should answer:

- what is happening here?
- who needs attention?
- what operational pressure exists?
- what safeguarding follow-up exists?
- what is unresolved?
- what changed recently?

---

## Suggested structure

```json
{
  "home": {},
  "today": {},
  "childrenNeedingAttention": [],
  "safeguarding": {},
  "missing": {},
  "notifications": [],
  "handover": {},
  "inspection": {},
  "actions": [],
  "recentChronology": []
}
```

---

# Important UX principle

The frontend should increasingly render:

- fewer surfaces;
- richer surfaces;
- connected operational narratives.

NOT:

- many disconnected cards.

---

# Relationship to chronology

Chronology remains:

> the operational truth plane.

Bundles should:

- summarise chronology;
- surface chronology significance;
- expose chronology continuity.

Bundles should NOT:

- replace chronology.

---

# Relationship to replayability

Bundles should increasingly support:

- replay-safe reconstruction;
- operational continuity;
- lifecycle visibility.

Bundle rendering should remain compatible with:

- operational memory;
- chronology projection;
- replay infrastructure.

---

# Relationship to ORB

ORB may consume bundles where permissions allow.

BUT:

ORB remains:

- a copilot;
- reflective;
- bounded;
- evidence-aware.

ORB must not:

- fabricate operational truth;
- override human safeguarding judgement.

---

# Relationship to Connect

IndiCare Connect should increasingly integrate into bundles.

Examples:

- unread messages;
- shift continuity;
- child-linked discussion;
- home operational awareness.

Connect should support:

- continuity;
- communication;
- operational cohesion.

Not social-media-style distraction.

---

# Visual implications

Experience bundles enable:

- calmer layouts;
- larger operational surfaces;
- fewer repeated cards;
- Apple-like workspace hierarchy;
- connected chronology visibility;
- richer personalisation.

This is essential for the next UI phase.

---

# Migration strategy

Do NOT rewrite the platform at once.

Instead:

1. create bundles;
2. migrate pages incrementally;
3. replace fragmented widget fetches;
4. retire duplicated operational cards;
5. reduce frontend orchestration over time.

---

# Final principle

The purpose of experience bundles is not to:

- simplify the schema.

The schema should remain rich.

The purpose is to:

> present operational truth in a calm, coherent, emotionally intelligent way.

This is the bridge between:

- enterprise operational infrastructure;
and:
- premium human-centred operational experience.
