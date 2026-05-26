# Scope-first lifecycle hardening audit

Audit date: 2026-05-26. Pass focus: end-to-end signed-off record lifecycle wiring, honest submission responses, archive/chronology/plan/LifeEcho QA — not new feature modules.

## Lifecycle wiring summary

| Workflow | Current status | child/home scope | Archive | Chronology | Plan impact | LifeEcho | Gaps fixed this pass | Remaining limitations |
|----------|----------------|------------------|---------|------------|-------------|----------|----------------------|------------------------|
| Draft save | Operational | child_id, home_id on draft | Never | Never | Never | Never | `skip_if_draft` in lifecycle orchestrator | Draft bodies stay in recording workspace only |
| Draft submit (no formal route) | Honest warning | Preserved on draft | Never | Never | Never | Never | `FORMAL_NOT_WIRED` message aligned to spec | Many catalogue types still `unsupported` / `route_to_existing_workflow` |
| Draft submit → formal record | Supported types via router | child_id required | On sign-off | From archive safe summary | From source mapping | Positive/safe only | `run_lifecycle_for_signed_off_record` single orchestrator | Formal creation needs live DB for production persistence |
| Manager review required | Blocks formal + archive | Preserved | Never until approved | Never | Never | Never | `MANAGER_REVIEW_ARCHIVE_BLOCK` on submission + lifecycle | Review approve → lifecycle via `run_lifecycle_for_review` (call from review service when formal exists) |
| Document sign-off (LAC/PEP/Reg44/Reg45) | Foundation | child on document | `create_from_document` | Linked on process | Extracted + mapped | Never auto for sensitive | `document_plan_impact_service` + lifecycle document entry | Full document ingestion UI varies by module |
| Child workspace indicators | Cards + ORB | `/young-people/{id}/*` | Link | Link | Link | Link | Lifecycle card + ORB modes | Counts not live-preloaded (scope-first) |
| Home workspace indicators | Section links | `home_id` query params | ORB summary | ORB chronology gaps | Review queue | Pending list hint | `chronologyGaps` + `home_id` on `/assistant/orb` | No dedicated home archive page — ORB/archive hints |
| ORB lifecycle prompts | Scoped `/assistant/orb` | scope + ids only | mode=archive_summary | mode=chronology_story_review | mode=plan_impact_review | mode=lifeecho_memory_support | Child/home ORB rail links | Standalone `/orb` unchanged |
| Recording submission UI | Result card | child_id links | Shows ID | Shows ID | Shows IDs | Shows IDs | Archive/plan/LifeEcho test IDs | No record bodies in URLs |

## Service map

- **Orchestrator**: `services/signed_off_lifecycle_service.py` — `run_lifecycle_for_signed_off_record`, `run_lifecycle_for_document`, `run_lifecycle_for_review`, duplicate archive prevention, safe warnings.
- **Submission**: `services/recording_submission_router_service.py` — formal route, lifecycle IDs on response, review blocks archive.
- **Archive**: `services/child_archive_service.py` — signed-off only in lists, filters (child, home, dates, type, author, search, tags), safe summaries for safeguarding.
- **Chronology**: `services/child_chronology_story_service.py` — built from archive, month grouping, story gaps, no raw narratives.
- **Plan impacts**: `services/plan_impact_suggestion_service.py` — reviewable suggestions, no silent plan overwrite.
- **LifeEcho**: `services/lifeecho_memory_service.py` — positive triggers only; negative types blocked unless manually reviewed elsewhere.
- **Documents**: `services/document_plan_impact_service.py` — LAC/PEP/Reg44/Reg45/health/risk mappings.

## Product split checks

- Standalone `/orb` does not load OS data (existing `test_orb_product_split.py`).
- Browser navigation uses `/young-people/{id}/…` not `/os/young-people`.
- No global dashboard preload on home workspace (`getGovernanceCommandCentre` absent).

## Manual test URLs

- Scope: `https://app.indicare.co.uk/select-scope`
- Child workspace: `https://app.indicare.co.uk/young-people/1/workspace`
- Archive: `https://app.indicare.co.uk/young-people/1/archive`
- Chronology: `https://app.indicare.co.uk/young-people/1/chronology`
- LifeEcho: `https://app.indicare.co.uk/young-people/1/lifeecho`
- Plan impacts: `https://app.indicare.co.uk/young-people/1/plan-impacts`
