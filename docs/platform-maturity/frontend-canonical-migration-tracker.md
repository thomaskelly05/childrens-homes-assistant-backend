# Frontend canonical migration tracker

Date: 2026-05-17

Purpose: track migration from fragmented operational UI patterns to one canonical operational frontend architecture.

This document exists to prevent:
- duplicated operational rendering;
- inconsistent chronology displays;
- mixed live/demo behaviour;
- fragmented websocket invalidation;
- duplicate lifecycle cards;
- operational drift between pages;
- inconsistent terminology and actions.

## Core principle

One operational concept should have:
- one canonical renderer;
- one operational source of truth;
- one lifecycle model;
- one evidence model;
- one chronology projection source.

Pages may contextualise information differently.
They should not invent different operational representations.

---

# Canonical operational primitives

The following primitives are now considered the canonical operational frontend building blocks.

| Primitive | Purpose |
| --- | --- |
| operational timeline | chronology/lifecycle/history rendering |
| lifecycle panel | operational state + escalation + resolution |
| audit timeline | operational replay/audit review |
| evidence panel | linked evidence + relationships |
| chronology card | chronology event rendering |
| safeguarding panel | safeguarding operational summary |
| inspection panel | inspection readiness/evidence state |
| governance review card | governance/signoff/review |
| operational queue | attention/action queue |
| child summary panel | 2-minute child understanding |
| document result card | searchable document rendering |

---

# Priority migration order

The goal is not to migrate everything at once.
The goal is to stabilise the most important operational paths first.

## Tier 1 — Critical demo flows

| Surface | Priority | Status | Remaining work |
| --- | --- | --- | --- |
| Command Centre | Critical | Partially migrated | Replace remaining duplicate operational summaries |
| Young Person overview | Critical | Partially migrated | Complete canonical chronology + evidence integration |
| Daily note workflow | Critical | Backend proven / browser proof incomplete | Finalise real browser create/save/reopen |
| Chronology detail | Critical | Improved | Fully adopt chronology projections |
| Search | Critical | Live route wired | Improve result hierarchy + canonical cards |
| ORB/in-shell assistant | Critical | Working | Adopt canonical chronology/evidence projections |

## Tier 2 — Operational trust flows

| Surface | Priority | Status | Remaining work |
| --- | --- | --- | --- |
| Safeguarding dashboard | High | Mixed rendering | Replace duplicate operational cards |
| Documents & Evidence | High | Partial | Canonical evidence traversal rendering |
| Inspection readiness | High | Partial | Typed inspection cards only |
| Governance | High | Partial | Canonical lifecycle/audit panels |
| Provider oversight | High | Partial | Canonical queue rendering |

## Tier 3 — Consolidation and polish

| Surface | Priority | Status | Remaining work |
| --- | --- | --- | --- |
| Staff overview | Medium | Mixed | Reduce duplicate status cards |
| Home overview | Medium | Needs redesign | Apply 2-minute operational understanding |
| Mobile nav | Medium | Improved | Reduce nested actions |
| Loading/empty states | Medium | Inconsistent | Standardise calm operational messaging |
| Keyboard accessibility | Medium | Partial | Complete operational tab order review |

---

# Duplicate operational surfaces identified

## Command Centre duplication risks

Potential duplication:
- safeguarding queue repeated in multiple cards;
- chronology summaries repeated in multiple panels;
- inspection warnings duplicated across counts and lists.

Direction:
- one primary attention queue;
- supporting counts only;
- drill-down instead of repeated cards.

## Young Person duplication risks

Potential duplication:
- chronology repeated in overview and chronology page;
- support strategies repeated in care summary and risk sections;
- safeguarding status repeated in multiple side panels.

Direction:
- overview summarises;
- chronology page contains full operational replay;
- safeguarding section links to canonical safeguarding view.

## Document/Evidence duplication risks

Potential duplication:
- evidence summaries repeated in inspection and documents;
- chronology-linked evidence repeated in timelines.

Direction:
- one canonical evidence renderer;
- contextual references elsewhere.

---

# Live/demo drift audit

The following categories must not use synthetic operational data outside explicit demo mode.

| Area | Risk |
| --- | --- |
| operational queues | trust erosion |
| chronology | operational confusion |
| safeguarding | severe trust risk |
| provider oversight | cross-provider confusion |
| evidence counts | inspection trust risk |
| lifecycle states | stale operational state risk |

Requirement:
All demo-only rendering must be:
- explicit;
- gated;
- visually identified if necessary.

---

# Operational UX rules

## The platform should answer quickly

Every major page should answer:

### Child page
- who is this child?
- what matters today?
- what helps?
- what are the risks?
- what happened recently?
- what should I do next?

### Home page
- what needs attention?
- what safeguarding pressure exists?
- what evidence is missing?
- what is unresolved?
- what should leadership review?

### Provider page
- which homes need support?
- where are operational gaps emerging?
- where are reviews/signoffs overdue?
- where is safeguarding pressure rising?

---

# Design rules

Avoid:
- dashboard grids overloaded with equal-weight cards;
- repeated warning banners;
- excessive borders;
- competing alert colours;
- long unexplained tables;
- multiple panels saying the same thing.

Prefer:
- operational hierarchy;
- whitespace;
- grouped meaning;
- progressive disclosure;
- calm summaries;
- one clear action area.

---

# Definition of migrated

A page is considered canonically migrated only when:

- it uses shared operational primitives;
- it uses typed DTOs;
- it uses canonical chronology projections;
- it uses canonical evidence traversal;
- it has no duplicate operational cards;
- it has no synthetic/live operational blending;
- it supports mobile layouts;
- it supports keyboard navigation;
- it has calm loading/error/empty states;
- it uses British English;
- it supports replay-safe operational rendering.

---

# Immediate next implementation targets

1. Complete browser-proof daily note workflow.
2. Complete browser-proof incident workflow.
3. Complete browser-proof safeguarding workflow.
4. Wire documents/templates into canonical search/open/review flow.
5. Migrate Command Centre fully onto canonical operational primitives.
6. Migrate child overview and chronology onto canonical chronology projections.
7. Migrate provider oversight onto canonical operational queue primitives.
8. Remove remaining duplicate operational renderers.
9. Replace remaining generic dict rendering.
10. Complete home overview redesign.
