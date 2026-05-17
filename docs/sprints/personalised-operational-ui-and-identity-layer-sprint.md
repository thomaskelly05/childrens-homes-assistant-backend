# Sprint: Personalised Operational UI & Identity Layer

Date: 2026-05-17
Role: CTO / principal product architect / frontend design lead / operational systems engineer

---

# Sprint purpose

Create the next IndiCare OS experience layer:

- personalised;
- sleek;
- Apple-esque;
- vibrant IndiCare blue;
- child-centred;
- adult-aware;
- home-aware;
- operationally truthful;
- fully wired to real schema-backed data.

This sprint must NOT create a beautiful fake UI.

Every visible operational surface must be connected to:

- real APIs;
- real schema-backed records;
- ProviderContext;
- chronology projections;
- operational memory/replay where available;
- honest empty states where data is missing.

---

# Strategic design vision

IndiCare should feel like:

> Apple designed an operational system for residential children’s homes.

But with IndiCare’s own identity:

- vibrant blues;
- luminous but calm interaction states;
- warm white / soft neutral space;
- deep readable typography;
- child-centred profile experiences;
- adult-personalised workspaces;
- ORB remaining bold, colourful and alive.

The platform should feel:

- premium;
- calming;
- emotionally intelligent;
- operationally useful;
- deeply human;
- easy for any adult of any age or skill level.

---

# Non-negotiable product questions

Every page must be reviewed against these questions:

## Child question

Does this tell me who this child is?

Not just:

- risk;
- incidents;
- compliance.

But:

- what matters to them;
- what helps them;
- how they communicate;
- who they trust;
- their routines;
- strengths;
- aspirations;
- emotional support needs;
- current safety context.

---

## Adult question

Do I know who the adult is that is using this?

The system should know:

- Theo is logged in;
- Theo’s role;
- Theo’s home;
- Theo’s children/key responsibilities;
- Theo’s preferred dashboard layout;
- Theo’s pinned widgets;
- Theo’s quick actions;
- Theo’s current operational priorities.

---

## Personalisation question

Can the adult create their own calm operational environment?

Adults should be able to:

- pin widgets;
- hide non-relevant widgets;
- reorder dashboard sections;
- choose quick actions;
- favourite children;
- favourite documents/templates;
- save dashboard layout;
- upload/change profile picture;
- see their own operational focus.

---

## Two-minute understanding question

Can I understand:

- the child;
- the home;
- the adult’s operational context

within two minutes?

If not, simplify.

---

# Important rule

Personalisation must never break operational truth.

An adult may customise layout and priority views.

They must NOT be able to hide critical safeguarding alerts, statutory follow-up, urgent missing episodes, or high-priority operational safety items.

Critical information remains surfaced.

---

# Phase 0 — Full UI/data wiring audit

Audit all current UI pages before changes:

- dashboard;
- home;
- young person overview;
- staff/adult profile;
- safeguarding;
- missing episodes;
- documents;
- chronology;
- provider oversight;
- ORB/in-shell assistant;
- standalone assistant;
- search;
- settings/profile.

Create/update:

`docs/platform-maturity/personalised-ui-wiring-audit.md`

Audit must identify:

- what is live schema-backed;
- what still uses static/demo data;
- what profile data exists;
- what profile data is missing;
- what image upload support exists;
- which widgets are duplicated;
- which widgets should become configurable;
- which pages fail the two-minute understanding test;
- which actions are not wired;
- which empty states are unclear.

---

# Phase 1 — Adult identity layer

Create or consolidate a first-class adult/staff profile experience.

## Backend requirements

Audit existing staff/adult tables before adding anything.

Use existing schema where possible.

If missing, add safe migration support for:

- profile_image_url / avatar asset reference;
- display_name;
- preferred_name;
- role_title;
- home_id;
- provider_id;
- key_children / assigned children where supported;
- professional strengths;
- communication preferences;
- dashboard_preferences JSON;
- pinned_widgets JSON;
- favourite_children JSON;
- favourite_templates JSON;
- quick_actions JSON.

Do not duplicate staff tables.

Use ProviderContext and policy engine.

## Frontend requirements

Create/update adult profile page showing:

- profile photo;
- name / preferred name;
- role;
- home/provider;
- assigned children;
- upcoming actions;
- recent activity;
- pinned workflows;
- dashboard preferences;
- quick actions;
- upload/change profile image where supported.

The adult should feel:

- recognised;
- supported;
- professionally respected.

Not merely logged in.

---

# Phase 2 — Child identity layer

Create or improve the child profile experience.

## Backend requirements

Audit existing young_people schema before adding anything.

Use existing columns where possible.

If missing, add safe migration support for:

- profile_image_url / avatar asset reference;
- preferred_name;
- pronouns where appropriate;
- interests;
- strengths;
- aspirations;
- favourite_activities;
- favourite_foods;
- communication_style;
- sensory_needs;
- what_helps;
- what_does_not_help;
- important_relationships;
- key_contacts;
- routines;
- cultural/religious identity where appropriate;
- child_voice_summary.

Do not make these mandatory if historical data is missing.

## Frontend requirements

Young Person overview must lead with personhood.

Visible above the fold:

- photo;
- name / preferred name;
- home;
- key worker;
- what matters to me;
- what helps me;
- communication/sensory notes;
- current safety context;
- quick actions.

Risk and safeguarding must remain visible, but not define the child.

---

# Phase 3 — Profile image and media upload

Adults should be able to upload:

- adult profile images;
- child profile images where permissions allow.

## Backend requirements

Use secure file handling.

Must support:

- provider/home scoping;
- allowed file types;
- max file size;
- safe storage reference;
- audit event;
- profile image update route;
- image replacement;
- image removal/reset;
- default placeholder avatar.

Do not expose raw unsafe upload paths.

## Routes

Add or reuse:

- `POST /api/profile/avatar`
- `DELETE /api/profile/avatar`
- `POST /api/young-people/{id}/avatar`
- `DELETE /api/young-people/{id}/avatar`

Child avatar upload must require appropriate permission.

---

# Phase 4 — Personal dashboard preferences

Create a personalised dashboard layer.

## Backend

Create or consolidate dashboard preference storage.

Preferences should support:

- widget order;
- pinned widgets;
- hidden optional widgets;
- layout density;
- favourite children;
- favourite templates;
- quick actions;
- last selected home;
- role-aware defaults.

Critical operational widgets cannot be permanently hidden.

## Frontend

Dashboard should support:

- edit layout mode;
- pin/unpin widget;
- move widget up/down;
- reset to recommended layout;
- save preferences;
- role-aware default layout.

Use calm interaction patterns.

Avoid drag-and-drop complexity if it risks accessibility.

Move up/down controls are acceptable.

---

# Phase 5 — Widget system

Create a small controlled widget registry.

## Widget categories

### Adult widgets

- My actions;
- My key children;
- My recent records;
- My upcoming reviews;
- My pinned templates;
- My supervision/training where available;
- My ORB quick prompt.

### Child widgets

- What helps me;
- Current safety context;
- Recent chronology;
- Key contacts;
- Support strategies;
- Documents/evidence;
- Missing/safeguarding follow-up.

### Home widgets

- Children needing attention;
- Open safeguarding;
- Missing follow-up;
- Evidence gaps;
- Recent significant chronology;
- Outstanding reviews/sign-offs.

## Critical rule

Widget customisation must be constrained.

The platform should not become dashboard chaos.

Recommended layout remains the default.

---

# Phase 6 — Visual design system refresh

Apply a premium IndiCare visual language.

## Visual identity

- calm white/soft neutral base;
- deep charcoal readable text;
- vibrant IndiCare blue accents;
- subtle blue gradients for primary focus areas;
- soft cards only where necessary;
- fewer borders;
- more breathing room;
- large readable typography;
- clear section hierarchy.

## Avoid

- box-heavy grids;
- excessive shadows;
- too many colours;
- dense tables as default;
- corporate dashboard noise.

## ORB exception

ORB should remain:

- colourful;
- luminous;
- hue-rich;
- bold;
- expressive;
- visually alive.

ORB should contrast the calm platform.

ORB is the intelligent energy layer.

The rest of the platform is the calm operational environment.

---

# Phase 7 — Two-minute understanding redesign

## Child page

Must answer quickly:

1. Who is this child?
2. What matters to them?
3. What helps them?
4. What is the current safety/operational context?
5. Who are their key people?
6. What happened recently?
7. What should I do next?

## Home page

Must answer quickly:

1. What is happening in this home?
2. Which children need attention?
3. What safeguarding/missing follow-up is open?
4. What evidence/reviews are missing?
5. What has changed recently?
6. What should leadership look at first?

## Adult dashboard

Must answer quickly:

1. Who am I in this system?
2. What needs my attention?
3. Which children am I focused on?
4. What actions are mine?
5. What do I use most often?

---

# Phase 8 — Wire everything to real data

No fake operational data.

Every new UI element must either:

- use live schema-backed data;
- use ProviderContext-derived user context;
- use real stored preferences;
- or show an honest empty state.

Audit and remove:

- static profile assumptions;
- fake avatar placeholders pretending to be uploads;
- fake widgets;
- hardcoded children;
- hardcoded dashboard preferences;
- demo-only widget content on live routes.

---

# Phase 9 — Accessibility and low-skill usability

Assume adults may be:

- tired;
- older;
- stressed;
- using mobile;
- unfamiliar with AI;
- not confident with technology.

Ensure:

- large tap targets;
- clear labels;
- keyboard navigation;
- visible focus states;
- readable contrast;
- calm error states;
- no hidden critical actions;
- profile image upload is simple;
- dashboard customisation has reset option.

---

# Phase 10 — Tests and proof

Add/extend tests:

- `tests/test_profile_preferences.py`
- `tests/test_avatar_upload_policy.py`
- `tests/test_dashboard_preferences.py`
- `tests/test_child_identity_profile.py`
- `tests/test_provider_context.py`

Frontend:

- `npm run typecheck`
- `npm run lint`
- `npm run build`

Browser proof:

- adult profile opens;
- adult profile image upload works or shows honest unavailable state;
- child profile image upload works or shows honest unavailable state;
- adult dashboard preferences save and reload;
- widget reorder/pin/unpin works;
- child page passes two-minute test;
- home page passes two-minute test;
- ORB remains visually bold and separated;
- mobile layout works;
- no console errors.

---

# Final output required

Provide:

1. UI/data wiring audit summary;
2. adult identity changes;
3. child identity changes;
4. avatar upload support status;
5. personal dashboard preference changes;
6. widget registry changes;
7. pages redesigned;
8. live data wiring proof;
9. accessibility proof;
10. remaining risks;
11. what is safe to demo.

---

# Success criteria

By the end of this sprint, IndiCare should feel:

- personalised;
- human;
- calm;
- premium;
- vibrant in identity;
- emotionally intelligent;
- operationally truthful.

Adults should feel:

- recognised;
- supported;
- able to shape their workspace;
- clear about their priorities.

Children should feel represented as people, not cases.

The system should answer:

- do I know this child?
- do I know this home?
- do I know Theo the adult using this?
- can Theo shape the environment around how he works?

All while remaining real, wired, safe and schema-backed.
