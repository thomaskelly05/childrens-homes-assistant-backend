# Sprint: Operational Experience Convergence to 100%

Date: 2026-05-17
Role: CTO / principal frontend engineer / backend integration lead / product quality owner

---

# Sprint purpose

This sprint defines what “100%” means for IndiCare OS at the current maturity stage.

100% does NOT mean:

- every future enterprise feature complete;
- every possible analytics system built;
- predictive safeguarding;
- unlimited dashboard widgets;
- AI autonomy.

100% means:

> everything visible in the live product is real, schema-backed, provider-scoped, operationally coherent, visually premium, and workflow-proven.

This sprint is the convergence sprint between:

- the rich PostgreSQL schema;
- the operational backend;
- the Apple-esque UI direction;
- the personalised identity layer;
- IndiCare Connect;
- chronology/replay;
- child/home/adult two-minute understanding.

---

# Non-negotiable outcome

By the end of this sprint, a provider demo should never create the feeling:

- “is this fake?”
- “is this wired?”
- “why does this feel duplicated?”
- “why does this look like a generic dashboard?”
- “why does the system not know who I am?”
- “why does the child feel like a record instead of a person?”

---

# Mandatory references

Read and follow:

- `docs/platform-maturity/schema-ui-alignment-report.md`
- `docs/architecture/experience-bundle-architecture.md`
- `docs/design/modular-operational-surface-system.md`
- `docs/design/apple-esque-operational-workspace-principles.md`
- `docs/design/indicare-premium-identity-and-connect-design-language.md`
- `docs/architecture/indicare-operational-design-manifesto.md`
- `docs/design/operational-ui-simplification-principles.md`

---

# Definition of 100% for this sprint

A page/workflow is 100% complete only when it is:

1. schema-backed;
2. ProviderContext scoped;
3. free from fake/demo operational content;
4. wired to live API data;
5. visually aligned to the Apple-esque IndiCare design language;
6. mobile usable;
7. keyboard usable;
8. console-clean;
9. calm and non-cluttered;
10. tested or browser-proven.

If it does not meet all ten, it is not complete.

---

# Phase 1 — Build the experience bundle endpoints

The next UI cannot become Apple-like while still fetching fragmented operational data.

Create production-grade bundle endpoints:

## 1. Adult workspace bundle

Endpoint:

`GET /api/me/workspace`

Must aggregate:

- user identity;
- staff profile;
- profile preferences;
- dashboard preferences;
- home/provider context;
- unread Connect;
- unread notifications;
- today handover;
- assigned/favourite children;
- my actions;
- recent records;
- recent chronology;
- pinned templates.

Use existing schema where possible:

- `users`
- `staff`
- `user_profile_preferences`
- dashboard preference tables
- `notifications`
- `operational_notifications`
- Connect tables
- handover tables
- chronology/actions tables

No fake data.

---

## 2. Child profile bundle

Endpoint:

`GET /api/young-people/{id}/profile-bundle`

Must aggregate:

- `young_people`
- `young_person_identity_profile`
- `young_person_communication_profile`
- `young_person_all_about_me`
- `young_person_contacts`
- `young_person_photos`
- safeguarding context
- missing episode context
- active plans/risk summaries
- recent chronology
- documents/evidence
- key worker/staff links

The bundle must support person-first rendering.

---

## 3. Home operational bundle

Endpoint:

`GET /api/homes/{id}/operational-bundle`

Must aggregate:

- home details;
- current children;
- today handover;
- open safeguarding;
- missing follow-up;
- notifications;
- Connect home channel summary;
- Reg 44 actions;
- Reg 45 actions;
- evidence gaps;
- recent significant chronology;
- operational pressure.

---

# Phase 2 — Replace fragmented frontend data fetching

Migrate these pages to experience bundles:

- dashboard;
- adult profile;
- staff workspace;
- child overview;
- home overview;
- welcome modal;
- Connect preview;
- notification preview;
- handover preview.

Remove duplicated fetches and duplicated cards.

The UI should render fewer, richer, more connected surfaces.

---

# Phase 3 — Apple-esque operational surface system

Implement the modular operational surface system.

Create shared frontend primitives:

- `OperationalSurface`
- `FocusSurface`
- `ContextSurface`
- `AmbientSurface`
- `SurfaceStack`
- `PersonalisedWidgetShell`
- `ProfileHeroSurface`
- `PersonFirstChildHeader`
- `TodayWorkspaceSurface`
- `ConnectPreviewSurface`
- `NotificationSurface`
- `HandoverSurface`

These should replace box-heavy cards.

Design requirements:

- fewer borders;
- more whitespace;
- rounded spacious modules;
- soft gradients;
- vibrant IndiCare blue accents;
- smooth hover/focus states;
- strong typography;
- calm empty states;
- ORB remains colourful/luminous.

---

# Phase 4 — Adult profile to feel like a real home/work profile

The adult profile must feel like:

> Facebook/Apple profile for a professional in a residential children’s home.

Must show:

- profile photo/avatar;
- preferred/display name;
- role;
- home/provider;
- about me / bio;
- professional strengths;
- therapeutic approach;
- assigned/favourite children;
- recent activity;
- pinned templates;
- Connect presence/unread;
- today handover involvement;
- quick actions.

If a field is missing in schema:

- use existing preference JSON where safe;
- or add a safe migration;
- or show an honest editable empty state.

Do not fake profile content.

---

# Phase 5 — Child profile must become person-first

The child page must feel human before operational.

Above the fold must show:

- photo;
- preferred name;
- age;
- home;
- key worker;
- what matters to me;
- what helps me;
- communication style;
- sensory needs;
- strengths/interests;
- important relationships;
- current safety context.

Risk/safeguarding remains visible but must not emotionally dominate the page.

Use real schema sources from the schema alignment report.

---

# Phase 6 — Personalised dashboard widgets

Complete dashboard personalisation.

Adults must be able to:

- pin widgets;
- unpin optional widgets;
- reorder widgets;
- reset to recommended layout;
- favourite children;
- favourite templates;
- save preferences;
- reload preferences after refresh.

Critical operational widgets cannot be hidden:

- urgent safeguarding;
- active missing;
- urgent notifications;
- required handover.

No drag chaos.

Use accessible move up/down controls if drag-and-drop is not robust.

---

# Phase 7 — IndiCare Connect must become usable

Current Connect foundations must become genuinely usable.

Implement/prove:

- home channel exists or can be created;
- adults in same home can see correct threads;
- direct messages can be started with a real user;
- messages send;
- messages persist;
- unread counts update;
- notifications generate;
- mark read works;
- thread open works;
- mobile layout works.

No fake messages.

No cross-home/provider leakage.

---

# Phase 8 — Welcome + handover must become real

The welcome experience must use real bundle data.

It should say something like:

“Good evening, Theo. Here’s what matters at Rosewood House today.”

But only if the data is real.

Must show:

- today’s handover;
- unread Connect;
- notifications;
- children needing attention;
- open actions;
- recent significant chronology.

If no handover exists:

show a calm empty state and offer:

- create handover;
- open Connect;
- view home overview.

---

# Phase 9 — Remove all remaining demo/static operational identity content

Audit and remove/gate:

- fake staff names;
- fake avatars;
- fake child profile content;
- fake messages;
- fake notifications;
- fake handover;
- fake dashboard widgets;
- static operational cards.

E2E/demo data is allowed only if explicitly gated and not used in live routes.

---

# Phase 10 — Workflow proof

Browser-prove these flows:

## Adult

- login;
- profile opens;
- profile avatar loads;
- preferences load;
- dashboard layout saves;
- dashboard reloads saved layout.

## Child

- child profile opens;
- child avatar loads;
- identity fields load;
- chronology loads;
- safeguarding/missing context loads;
- no fake data appears.

## Connect

- home channel opens;
- direct message starts;
- message sends;
- unread badge updates;
- notification appears;
- mark read works.

## Handover

- today handover loads;
- no handover empty state works;
- handover item opens/links where available.

---

# Phase 11 — Testing

Add/extend tests:

- `tests/test_experience_bundles.py`
- `tests/test_me_workspace_bundle.py`
- `tests/test_child_profile_bundle.py`
- `tests/test_home_operational_bundle.py`
- `tests/test_connect_service.py`
- `tests/test_notifications.py`
- `tests/test_dashboard_preferences.py`
- `tests/test_avatar_upload_policy.py`
- `tests/test_provider_context.py`

Run:

```bash
python -m pytest tests/test_experience_bundles.py -q
python -m pytest tests/test_connect_service.py tests/test_notifications.py -q
python -m pytest tests/test_dashboard_preferences.py tests/test_avatar_upload_policy.py -q
python -m pytest tests/test_provider_context.py -q
```

Frontend:

```bash
npm run typecheck
npm run lint
npm run build
```

---

# Phase 12 — Final completion audit

Create:

`docs/platform-maturity/operational-experience-convergence-completion-audit.md`

Must state:

- what is now 100% schema-backed;
- what pages use experience bundles;
- what static/demo content was removed;
- what workflows are browser-proven;
- what UI surfaces were redesigned;
- what remains below 100%;
- safe demo path.

---

# Final success criteria

By the end, the product should feel:

- personal;
- homely;
- sleek;
- Apple-esque;
- operationally truthful;
- low cognitive load;
- vibrant in IndiCare blue;
- emotionally intelligent;
- connected through real schema data.

The adult should feel:

> this is my workspace.

The child should feel:

> this system knows me as a person.

The home should feel:

> this system understands what is happening today.

No fake data.
No disconnected widgets.
No box-heavy dashboards.
No unclear operational truth.
