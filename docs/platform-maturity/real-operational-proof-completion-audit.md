# Real operational proof completion audit

Status: consolidation completion note, 2026-05-17

## Now schema-backed

- Safeguarding domain records: `safeguarding_domain_records`.
- Missing episode domain records: `missing_episode_domain_records`.
- Return-home interviews: `return_home_interviews`.
- Document lifecycle transitions through existing document tables now recognise `draft`, `review`, `returned_for_update`, `approved`, `signed_off` and `archived`.

## Operational workflows added

- Safeguarding: create, review, add action, escalate, resolve, queues and deterministic synthesis.
- Missing episodes: create, police notified, returned, safeguarding escalation, return-home interview completion, close, queues and deterministic synthesis.
- Return-home interviews: create and link back to the missing episode lifecycle.

## Chronology and replay-backed flows

- Safeguarding emits `safeguarding_created`, `safeguarding_reviewed`, `safeguarding_action_added`, `safeguarding_escalated` and `safeguarding_resolved`.
- Missing episodes emit `missing_reported`, `police_notified`, `returned_home`, `safeguarding_escalation` and pattern review signals.
- Return-home interviews emit `return_home_interview_completed`.
- New domain services write operational memory lifecycle transitions when operational-memory tables are available.

## Frontend operational truth changes

- Visible Next operational pages now render live OS data or honest empty states.
- Mixed live/demo evidence gaps were removed from actions and regulatory document pages.
- Demo report preview and demo child/staff name enrichment were removed from reports.
- Fake shift, handover, staff-task and notification queues were replaced with live-derived cards or clear “not connected” states.

## Still compatibility-layer driven

- Legacy HTML/JS pages and demo endpoints remain in the repository.
- `frontend_compat` and router-loader compatibility shadows still serve older clients.
- Some live pages still depend on broad OS context aggregators while domain-specific storage matures.

## Remaining enterprise hardening

- Apply and verify the new migration in each environment.
- Add DB-backed integration tests for the new repositories and routes.
- Federate operational search across safeguarding, missing episodes, RHI, documents, evidence and staff.
- Add role-specific browser proof for provider isolation and cross-provider leakage prevention.

## Remaining realtime risks

- Realtime notification queues and live handover state are not yet first-class schema-backed workflows.
- Redis-backed multi-worker replay stability still needs environment-level proof.
- Websocket reconnect tests should include new safeguarding and missing queue invalidation events.

## Remaining lifecycle migration work

- Legacy safeguarding and missing records still need one-way migration into the first-class domain tables.
- Legacy document generators should attach lifecycle metadata, chronology IDs and evidence traversal links consistently.
- Legacy demo endpoints should be removed or hard-gated after dependent routes are retired.
