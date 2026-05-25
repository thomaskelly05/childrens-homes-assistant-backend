# Handover workflow map

Operational map of handover flows in IndiCare OS. This document does not claim legal or regulatory completeness.

| Workflow | Existing route/service | Can create formal record now? | Requires child? | Requires shift? | Requires manager review? | Timeline link available? | Current behaviour after this pass | Gap / next action |
|----------|------------------------|------------------------------|-----------------|-----------------|--------------------------|--------------------------|-----------------------------------|-------------------|
| Intelligence → draft | `handover_intelligence_service`, `/handover` | No | Optional | No | If high-risk flags in source | No | Safe summaries pulled into workspace draft | — |
| Save workspace draft | `handover_draft_service`, `/api/handover/drafts` | No | Optional | No | Detected from source_context | No | Draft persisted (PG or memory) | — |
| Send to review | `mark_ready_for_review`, review_status `awaiting_review` | No | Optional | No | Yes when flags set | No | Enters manager review queue | — |
| Manager review queue | `handover_review_service`, `/handover/reviews` | No | Optional | No | Yes | No | Safe summary cards only | — |
| Approve / request changes | `POST /handover/reviews/{id}/action` | No | Optional | No | Yes | No | Audit in `handover_review_events` | — |
| Complete workspace handover | `complete_draft` | Only if child + `handover_records` table | Yes for formal | No | Blocks if review required and not approved | After formal create | Workspace completed; honest formal/timeline fields | Home-level formal shift handover |
| Young-person formal record | `young_people_handover_routes`, `handover_records` | **SUPPORTED_NOW** (child draft, narrative only) | Yes | Optional shift label | Via YP workflow separately | Via `YoungPeopleLinkingService` when formal created | `handover_formal_mapping_service` inserts approved record from draft body only | Do not auto-import raw intelligence |
| Home/shift formal handover | `handover_service` / `ShiftRepository` | **UNSAFE_TO_AUTOCREATE** | No | Yes | Unknown | **ROUTE_HINT_ONLY** | Not called from workspace completion | Wire when shift context contract is clear |
| Legacy `/handover/` notes | `handover_routes.py` | No | No | No | No | No | Separate legacy table | Not merged |
| Shift timeline link | `handover_shift_timeline_service` | After formal record | Yes | No | No | **SUPPORTED_NOW** when chronology links | `linked_timeline_id` only when chronology event created | No fake timeline IDs |
| Notifications | `os_notification_adapter_service` | No | Optional | No | For awaiting review | No | Low-noise review + completion hints | — |
| Care Hub / daily brief | Care Hub card, `manager_daily_brief_service` | No | Optional | No | Count in brief | No | Links to `/handover` and `/handover/reviews` | — |
| Child journey links | `child-journey-routes.ts` | No | Yes | No | Link to reviews | No | Draft + review routes per child | — |
| ORB support | `/assistant/orb` modes only | No | No | No | No | No | Review prompts; no payload in URL | Standalone `/orb` unchanged |

## Classifications

- **SUPPORTED_NOW** — Implemented and used with honest responses.
- **WORKSPACE_ONLY** — Completes draft without formal record.
- **ROUTE_HINT_ONLY** — UI/route hint; no automated create.
- **REVIEW_REQUIRED** — Manager approval before completion when flags set.
- **UNSAFE_TO_AUTOCREATE** — Not called; warning returned.
