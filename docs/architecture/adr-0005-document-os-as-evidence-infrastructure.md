# ADR-0005 — Document OS as evidence infrastructure

Status: Accepted
Date: 2026-05-17
Decision makers: CTO / product architecture / evidence architecture

---

# Context

IndiCare OS now includes a therapeutic Document OS foundation with:

- distinct residential children’s home templates;
- SCCIF mapping;
- Quality Standard mapping;
- Children’s Homes Regulations mapping;
- evidence metadata;
- chronology linkage;
- review and sign-off metadata direction;
- template search and editor routes.

There is a risk that document functionality could drift into:

- generic form storage;
- static template libraries;
- compliance-only paperwork;
- disconnected files;
- duplicated evidence summaries.

That would weaken IndiCare’s operational value.

In residential children’s homes, documents are not merely files.

They are often:

- evidence of care;
- evidence of review;
- evidence of safeguarding action;
- evidence of leadership oversight;
- evidence of children’s views;
- evidence of progress, risk, planning and reflection.

A formal platform decision is therefore needed.

---

# Decision

The Document OS is treated as operational evidence infrastructure, not generic document storage.

This means documents/templates should increasingly support:

- regulatory mapping;
- chronology linkage;
- evidence traversal;
- lifecycle state;
- review/sign-off;
- provider governance;
- inspection readiness;
- therapeutic recording;
- child voice;
- operational replay.

A document is not just content.

It is a structured operational artefact.

---

# Consequences

## Positive consequences

### 1. Better inspection readiness

Documents can support evidence for:

- Reg 44;
- Reg 45;
- Annex A;
- SCCIF areas;
- Quality Standards;
- leadership oversight;
- safeguarding follow-up.

---

### 2. Better operational traceability

Documents can link to:

- chronology;
- operational memory;
- safeguarding records;
- incidents;
- missing episodes;
- provider queues;
- evidence packs.

---

### 3. Stronger therapeutic practice

Document templates can guide staff to record:

- child voice;
- emotional presentation;
- support strategies;
- reflection;
- repair/restorative work;
- what helped;
- what needs follow-up.

---

### 4. Reduced duplication

Instead of duplicating evidence summaries across dashboards, documents become linked evidence artefacts that can be referenced contextually.

---

# Platform requirements

## Templates must be structured

Templates should include:

- template_id;
- category;
- regulatory alignment;
- SCCIF alignment;
- Quality Standard alignment;
- required sections;
- review requirements;
- sign-off requirements;
- evidence metadata;
- chronology linkage.

---

## Documents should support lifecycle

Document lifecycle should increasingly support:

- draft;
- in review;
- returned for update;
- approved;
- signed off;
- archived;
- superseded.

---

## Documents should be evidence-aware

Documents should support links to:

- child;
- home;
- staff;
- chronology events;
- operational states;
- safeguarding concerns;
- missing episodes;
- inspection requirements.

---

## Documents should be provider-governed

Provider-level configuration should eventually support:

- template visibility;
- template customisation;
- template versioning;
- review rules;
- sign-off rules;
- retention rules.

---

# Rejected alternatives

## Alternative: document templates as static forms

Rejected because:

- weak evidence linkage;
- poor inspection readiness;
- limited operational intelligence;
- high duplication risk.

---

## Alternative: documents as file uploads only

Rejected because:

- poor structured evidence;
- limited chronology linkage;
- poor searchability;
- weak operational workflow.

---

## Alternative: AI-generated documents as primary truth

Rejected because:

- professional judgement remains essential;
- AI output must remain draft/supportive;
- operational evidence must be human-reviewed and auditable.

---

# Assistant/ORB implications

Assistant systems may help:

- draft content;
- suggest reflective wording;
- identify missing sections;
- surface linked evidence;
- explain regulatory relevance.

Assistant systems must not:

- auto-sign documents;
- create unsupported facts;
- replace manager review;
- present draft content as final evidence.

---

# Implementation guidance

Future Document OS work should:

1. preserve template distinctiveness;
2. link documents to chronology and evidence traversal;
3. support lifecycle/review/sign-off;
4. expose document evidence in inspection readiness;
5. avoid duplicate evidence cards elsewhere;
6. maintain therapeutic language governance;
7. support provider-level governance over time.

---

# Strategic outcome

This decision establishes the Document OS as:

- evidence-aware;
- therapeutic;
- chronology-linked;
- inspection-ready;
- provider-governed;
- operationally meaningful.

Rather than:

- a generic forms library;
- static file storage;
- or disconnected compliance paperwork.
