# Safeguarding and missing episodes first-class architecture

Date: 2026-05-17

Purpose: define the next domain architecture step for IndiCare OS so safeguarding and missing-from-care workflows no longer rely on incident-category behaviour.

## CTO summary

Safeguarding and missing episodes must become first-class operational domains.

They should not be treated as generic incidents or categories of incidents.

They carry different legal, operational, emotional, evidential and leadership responsibilities. Their workflows must therefore have their own contracts, lifecycle, chronology semantics, oversight, evidence links and review requirements.

This document defines the architecture to build next.

---

## Why this matters

Residential children’s homes are judged heavily on:

- how children are protected;
- how missing episodes are managed;
- whether risks are understood;
- whether patterns are identified;
- whether leaders take effective action;
- whether statutory notifications are made;
- whether children’s voices are heard;
- whether records show professional curiosity and therapeutic response.

A strong safeguarding architecture is therefore not a feature.
It is core platform infrastructure.

---

## Current risk

Some safeguarding and missing workflows are currently transported through incident-style categories or shared record pathways.

That is acceptable as a transitional compatibility layer, but not as the long-term domain model.

Risks of leaving it this way:

- safeguarding concern semantics become diluted;
- missing episodes do not carry their own lifecycle;
- return-home interview linkage can become weak;
- Reg 40 relevance can be missed;
- exploitation and contextual safeguarding indicators become hard to query;
- chronology becomes less precise;
- provider oversight becomes less trustworthy;
- inspection evidence becomes harder to defend.

---

# Target architecture

Create two first-class domains:

1. Safeguarding
2. Missing From Care

These may still link to incidents, but should not depend on incident categories as their primary model.

---

# Domain 1 — Safeguarding

## SafeguardingConcern DTO

A safeguarding concern should include:

- safeguarding_id
- provider_id
- home_id
- young_person_id
- concern_type
- concern_source
- concern_summary
- date_time_identified
- immediate_safety_actions
- child_voice
- disclosure_or_observation
- alleged_person_or_context where safe and appropriate
- contextual_safeguarding_factors
- exploitation_indicators
- online_safety_indicators
- peer_on_peer_concern
- professional_notifications
- statutory_notifications
- Reg 40 relevance
- social_worker_informed
- police_informed
- LADO_informed where applicable
- placing_authority_informed
- manager_review_required
- manager_review_status
- evidence_links
- chronology_links
- operational_state_links
- lifecycle_status
- created_by
- created_at
- updated_at
- schema_version

## Safeguarding lifecycle

Lifecycle states:

- open
- immediate_action_taken
- manager_review
- escalated
- strategy_discussion_required
- external_professionals_informed
- safety_plan_updated
- closed_with_oversight
- reopened

## Safeguarding chronology semantics

A safeguarding concern should generate chronology events for:

- concern recorded
- immediate safety action
- professional notification
- escalation
- manager review
- safety plan update
- child voice captured
- closure/review outcome

## Safeguarding evidence links

A safeguarding concern may link to:

- daily notes
- incidents
- missing episodes
- risk assessments
- safety plans
- key work sessions
- professional communications
- documents
- photos/attachments where supported
- inspection readiness evidence

## Safeguarding operational queue

Queue items should include:

- immediate action required
- manager review overdue
- child voice missing
- professional notification missing
- safety plan update required
- evidence missing
- Reg 40 review required
- chronology gap

---

# Domain 2 — Missing From Care

## MissingEpisode DTO

A missing episode should include:

- missing_episode_id
- provider_id
- home_id
- young_person_id
- episode_status
- date_time_last_seen
- last_seen_location
- reported_missing_at
- reported_by
- circumstances
- known_risks_at_time
- exploitation_risks
- online_risks
- associates/locations of concern where safe and appropriate
- police_reference
- police_informed_at
- social_worker_informed_at
- placing_authority_informed_at
- family_informed_at where appropriate
- actions_taken_by_staff
- search_actions
- return_time
- return_location
- return_circumstances
- immediate_welfare_check
- injuries_or_health_concerns
- debrief_completed
- return_home_interview_required
- return_home_interview_completed
- risk_assessment_updated
- safety_plan_updated
- child_voice
- management_review
- evidence_links
- chronology_links
- lifecycle_status
- created_by
- created_at
- updated_at
- schema_version

## Missing lifecycle

Lifecycle states:

- active_missing
- reported_to_police
- professionals_informed
- returned
- welfare_check_completed
- debrief_completed
- return_home_interview_pending
- return_home_interview_completed
- risk_review_required
- safety_plan_updated
- manager_review_completed
- closed_with_oversight
- reopened

## Missing chronology semantics

A missing episode should generate chronology events for:

- last seen
- reported missing
- police informed
- professionals informed
- significant updates while missing
- returned
- welfare check
- debrief
- return-home interview
- risk assessment update
- safety plan update
- manager review
- closure

## Missing operational queue

Queue items should include:

- child currently missing
- police notification required
- social worker notification required
- return-home interview overdue
- debrief missing
- risk assessment update required
- safety plan update required
- manager review required
- repeat missing pattern observed

---

# Return Home Interview architecture

Return-home interview should not be a generic note.

It should be linkable to a missing episode.

## ReturnHomeInterview DTO

Fields:

- return_home_interview_id
- missing_episode_id
- provider_id
- home_id
- young_person_id
- completed_by
- completed_at
- child_voice
- reason_given_by_child
- push_pull_factors
- harm_or_exploitation_indicators
- locations_or_associates_of_concern
- what_helped_return
- what_would_help_next_time
- professional_actions_required
- safety_plan_updates
- risk_assessment_updates
- management_review_required
- evidence_links
- chronology_links
- schema_version

---

# Regulatory and SCCIF alignment

Safeguarding and missing workflows should support operational evidence for:

## Children’s Homes Regulations

- Regulation 12 — Protection of children
- Regulation 13 — Leadership and management
- Regulation 14 — Care planning
- Regulation 40 — Notification of serious events
- Regulation 44 — Independent person visits
- Regulation 45 — Review of quality of care

## Quality Standards

- Protection of Children Standard
- Leadership and Management Standard
- Care Planning Standard
- Positive Relationships Standard
- Views, Wishes and Feelings Standard
- Health and Well-being Standard where relevant

## SCCIF areas

- how well children are helped and protected
- overall experiences and progress of children
- effectiveness of leaders and managers

This must be framed as operational evidence mapping, not legal advice.

---

# Therapeutic language requirements

Avoid:

- absconding as the only label
- refused
- non-compliant
- attention seeking
- manipulative
- kicked off
- bad behaviour

Prefer:

- missing from care
- was unable to engage at that time
- appeared distressed/dysregulated
- communicated through behaviour
- support offered
- what may have contributed
- what helped
- what did not help
- repair/restorative work
- child’s view

---

# Frontend requirements

## Safeguarding page

Must show:

- active safeguarding concerns
- concerns needing immediate review
- manager review status
- professional notifications
- child voice status
- evidence links
- chronology links
- Reg 40 review indicator
- safety plan update status

## Missing episode page

Must show:

- active missing episodes
- returned episodes needing follow-up
- return-home interview status
- risk review status
- safety planning status
- repeat missing indicators
- professional notifications
- chronology timeline

## Young person overview

Must summarise:

- active safeguarding status
- active/recent missing episodes
- repeat patterns
- what helps keep this child safe
- current safety actions

---

# Backend implementation plan

1. Create `schemas/safeguarding_contracts.py`.
2. Create `schemas/missing_contracts.py`.
3. Create `services/safeguarding_service.py`.
4. Create `services/missing_episode_service.py`.
5. Create `routers/safeguarding_domain_routes.py`.
6. Create `routers/missing_episode_routes.py`.
7. Add append-only operational memory writes for both domains.
8. Add chronology projection events for both domains.
9. Add operational queue items for both domains.
10. Add evidence traversal edges for both domains.
11. Add provider oversight aggregation.
12. Add frontend pages/components using canonical operational primitives.
13. Keep compatibility transforms from existing incident-category records.
14. Add migration/seed support.

---

# Testing plan

Create tests:

- tests/test_safeguarding_contracts.py
- tests/test_missing_episode_contracts.py
- tests/test_safeguarding_domain_workflow.py
- tests/test_missing_episode_workflow.py
- tests/test_return_home_interview_workflow.py
- tests/test_safeguarding_chronology_projection.py
- tests/test_missing_provider_queue.py

Acceptance criteria:

- safeguarding concern can be created, saved, reopened and searched;
- missing episode can be created, saved, updated as returned, reopened and searched;
- return-home interview links to missing episode;
- chronology projections include safeguarding and missing events;
- operational memory records lifecycle transitions;
- provider queues show safeguarding and missing follow-up;
- child overview summarises active safety context;
- no workflow relies solely on generic incident categories.

---

# Demo guidance

Until this architecture is implemented, do not demonstrate safeguarding or missing episodes as fully first-class typed workflows.

You may demonstrate:

- therapeutic templates;
- incident-linked safeguarding direction;
- chronology/evidence direction;
- provider oversight direction;
- document-based safeguarding recording.

After implementation, safeguarding and missing should become core demo flows.
