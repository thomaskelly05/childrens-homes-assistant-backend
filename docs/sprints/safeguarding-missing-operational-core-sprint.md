# Sprint: Safeguarding & Missing Operational Core

Date: 2026-05-17

Role: CTO / principal platform architect / safeguarding domain lead

## Sprint purpose

Build the first implementation layer for safeguarding and missing-from-care as first-class operational domains in IndiCare OS.

This sprint must convert the architecture and tracker into working platform foundations without destabilising current demo-ready workflows.

## Context

The platform currently has strong foundations for:

- chronology projection;
- operational memory;
- provider context;
- policy engine;
- evidence traversal;
- Document OS templates;
- operational queues;
- assistant/ORB separation;
- therapeutic recording;
- regulatory evidence mapping.

The known domain gap is that safeguarding and missing episodes are still partly transported through incident-category or shared record pathways.

This sprint begins the migration away from that pattern.

## Non-negotiable principles

1. Safeguarding and missing are first-class domains, not incident subtypes.
2. Existing incident-compatible pathways must continue working during migration.
3. No demo-ready workflow may regress.
4. No speculative AI, risk scoring or autonomous safeguarding decisions.
5. Chronology remains the operational truth plane.
6. All sensitive reads/writes must respect ProviderContext and the policy engine.
7. All new contracts must be schema-versioned.
8. All new workflows must use calm, therapeutic, non-punitive language.

---

# Deliverable 1 — Contract layer

Create:

- `schemas/safeguarding_contracts.py`
- `schemas/missing_episode_contracts.py`
- `schemas/return_home_interview_contracts.py`

## Safeguarding contracts

Minimum DTOs:

- `SafeguardingConcernCreate`
- `SafeguardingConcernUpdate`
- `SafeguardingConcernRead`
- `SafeguardingNotification`
- `SafeguardingReview`
- `SafeguardingQueueItem`

Required fields:

- schema_version
- safeguarding_id where applicable
- provider_id
- home_id
- young_person_id
- concern_type
- concern_summary
- date_time_identified
- immediate_safety_actions
- child_voice
- concern_source
- professional_notifications
- evidence_ids
- chronology_ids
- lifecycle_status
- manager_review_required
- created_by
- created_at

## Missing episode contracts

Minimum DTOs:

- `MissingEpisodeCreate`
- `MissingEpisodeUpdate`
- `MissingEpisodeRead`
- `MissingEpisodeReturnUpdate`
- `MissingEpisodeQueueItem`

Required fields:

- schema_version
- missing_episode_id where applicable
- provider_id
- home_id
- young_person_id
- episode_status
- date_time_last_seen
- last_seen_location
- circumstances
- known_risks_at_time
- reported_missing_at
- police_informed_at
- social_worker_informed_at
- actions_taken_by_staff
- return_time
- return_circumstances
- debrief_completed
- return_home_interview_required
- return_home_interview_completed
- risk_assessment_updated
- safety_plan_updated
- lifecycle_status
- created_by
- created_at

## Return-home interview contracts

Minimum DTOs:

- `ReturnHomeInterviewCreate`
- `ReturnHomeInterviewUpdate`
- `ReturnHomeInterviewRead`

Required fields:

- schema_version
- return_home_interview_id where applicable
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
- what_would_help_next_time
- professional_actions_required
- safety_plan_updates
- risk_assessment_updates
- evidence_ids
- chronology_ids

## Tests

Create:

- `tests/test_safeguarding_contracts.py`
- `tests/test_missing_episode_contracts.py`
- `tests/test_return_home_interview_contracts.py`

Acceptance:

- DTOs validate required scope fields;
- blank critical text is rejected;
- evidence/chronology ID lists are cleaned and deduplicated;
- schema version is present;
- model serialization is stable.

---

# Deliverable 2 — Service layer foundations

Create:

- `services/safeguarding_domain_service.py`
- `services/missing_episode_domain_service.py`
- `services/return_home_interview_service.py`

These services should be thin at first and should coordinate existing platform systems rather than duplicating them.

Each service should support:

- create payload normalization;
- ProviderContext permission checks;
- lifecycle transition context;
- operational memory write hooks where tables exist;
- chronology projection hooks;
- evidence traversal hooks;
- provider queue hooks;
- compatibility transforms from legacy incident/category records where required.

Do not build a large database abstraction if existing repositories can be safely used.

---

# Deliverable 3 — Routes

Create:

- `routers/safeguarding_domain_routes.py`
- `routers/missing_episode_domain_routes.py`

Minimum routes:

## Safeguarding

- `GET /api/safeguarding/domain`
- `POST /api/safeguarding/domain`
- `GET /api/safeguarding/domain/{safeguarding_id}`
- `PATCH /api/safeguarding/domain/{safeguarding_id}`
- `GET /api/safeguarding/domain/queues/attention`

## Missing

- `GET /api/missing-episodes`
- `POST /api/missing-episodes`
- `GET /api/missing-episodes/{missing_episode_id}`
- `PATCH /api/missing-episodes/{missing_episode_id}`
- `POST /api/missing-episodes/{missing_episode_id}/return-home-interview`
- `GET /api/missing-episodes/queues/attention`

Routes must:

- require authentication;
- use ProviderContext;
- fail closed on scope;
- return typed DTOs;
- keep compatibility with existing demo routes.

---

# Deliverable 4 — Chronology projection integration

Add first-class chronology projection event builders for:

## Safeguarding

- safeguarding concern created
- immediate safety action recorded
- professional notification recorded
- manager review completed
- safety plan update required/completed
- concern closed/reopened

## Missing episodes

- child last seen
- reported missing
- professionals informed
- child returned
- welfare check completed
- debrief completed
- return-home interview completed
- risk assessment updated
- safety plan updated
- episode closed/reopened

Acceptance:

- child chronology includes these events;
- provider/home scope is retained;
- events are ordered deterministically;
- event labels use calm, professional wording.

---

# Deliverable 5 — Operational queues

Extend provider/home attention queues with:

## Safeguarding queue items

- immediate action required
- manager review overdue
- child voice missing
- professional notification missing
- Reg 40 consideration required
- safety plan update required

## Missing queue items

- child currently missing
- return-home interview overdue
- debrief missing
- risk review required
- repeat missing pattern observed
- safety plan update required

Acceptance:

- provider-scoped queues do not leak cross-provider data;
- home-scoped queues respect home access;
- queue wording is calm and action-oriented.

---

# Deliverable 6 — Frontend minimal surfaces

This sprint should add simple, calm first-class surfaces. Do not overdesign.

Add or update:

- safeguarding operational page;
- missing episodes page;
- child overview safety summary;
- provider oversight safeguarding/missing queue sections.

Use canonical operational primitives where available.

Avoid duplicated cards.

Frontend should show:

## Safeguarding

- active concerns;
- manager review state;
- professional notifications;
- child voice status;
- chronology/evidence links.

## Missing

- active/current missing episodes;
- returned episodes needing follow-up;
- return-home interview status;
- risk/safety plan update status;
- repeat pattern indicator where deterministic.

---

# Deliverable 7 — Search integration

Update search so it can find:

- safeguarding concerns;
- missing episodes;
- return-home interviews;
- linked chronology;
- linked evidence.

Search result cards should include:

- title;
- type;
- child/home;
- date;
- status;
- quick open action.

---

# Deliverable 8 — Document OS integration

Connect Document OS templates to first-class domains where possible:

- safeguarding concern template;
- missing episode template;
- return-home interview template;
- contextual safeguarding review;
- exploitation concern;
- manager safeguarding oversight note.

Documents created from these templates should carry:

- template id;
- provider/home/child scope;
- evidence links;
- chronology links;
- regulatory mappings.

---

# Testing requirements

Run and extend:

```bash
python -m pytest tests/test_safeguarding_contracts.py
python -m pytest tests/test_missing_episode_contracts.py
python -m pytest tests/test_return_home_interview_contracts.py
python -m pytest tests/test_safeguarding_domain_workflow.py
python -m pytest tests/test_missing_episode_workflow.py
python -m pytest tests/test_return_home_interview_workflow.py
python -m pytest tests/test_safeguarding_chronology_projection.py
python -m pytest tests/test_missing_provider_queue.py
python -m pytest tests/test_operational_record_transport.py
python -m pytest tests/test_chronology_projection.py
python -m pytest tests/test_operational_memory_replay.py
```

Frontend:

```bash
npm run typecheck
npm run lint
npm run build
```

Manual browser proof:

- create safeguarding concern;
- reopen safeguarding concern;
- create missing episode;
- update missing episode as returned;
- complete return-home interview;
- show chronology projection;
- show provider queue update;
- search for all three.

---

# Demo guidance after sprint

If complete, the next demo can safely include:

1. Safeguarding concern creation.
2. Missing episode creation.
3. Return-home interview linkage.
4. Chronology update.
5. Provider safeguarding/missing queue.
6. Document template linkage.

Until browser proof passes, keep these as seeded/document examples rather than live workflow demonstrations.

---

# Final output required

At the end of implementation, provide:

1. Contracts added.
2. Routes added.
3. Services added.
4. Workflow proof results.
5. Chronology integration results.
6. Provider queue results.
7. Search integration results.
8. Document OS integration results.
9. Remaining risks.
10. What is safe to demo.
11. What should not be demoed yet.
