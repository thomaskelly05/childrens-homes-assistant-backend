# Manager review → formal sign-off → archive lifecycle map

## Review actions

| Action | Entry point | Formal route | Lifecycle | Notes |
|--------|-------------|--------------|-----------|-------|
| `approve` | `POST /recording-reviews/{draft_id}/action` | Via `RecordingReviewSignoffService` | `run_lifecycle_for_review` when supported | First-class sign-off entry |
| `submit_after_approval` | Same | Reuses sign-off orchestrator | Same | For explicit second step in UI |
| `request_changes` | `RecordingReviewService` | No | No | Draft returns to creator |
| `mark_safeguarding_escalation` | `RecordingReviewService` | No | No | Blocks archive until cleared |
| `mark_reviewed` | `RecordingReviewService` | No | No | Reviewed without formal route |
| `archive` | `RecordingReviewService` | No | No | Draft workspace only |

## Current behaviour (after wiring pass)

1. Manager **Approve** runs `approve_and_sign_off_review`.
2. Draft marked **approved** (or **signed_off** when formal + lifecycle complete).
3. If `target_status == supported_now` and gates pass → formal record via `RecordingSubmissionRouterService.submit_to_supported_workflow`.
4. `SignedOffLifecycleService.run_lifecycle_for_review` → archive, chronology, plan impacts, LifeEcho suggestions.
5. Response includes linked IDs, warnings, next steps.
6. Unsupported types: approved/reviewed only; honest warning, no archive.

## Formal route support

Registry: `recording_submission_target_registry`. Supported-now types (e.g. daily-note, incident, keywork) create formal records; others return `approved_no_formal_route`.

## Lifecycle support

- `SignedOffLifecycleService.run_lifecycle_for_review` — clears review flags on draft copy, prevents duplicate archive via source lookup.
- Drafts and pending reviews never archived (`skip_if_review_pending`, draft-only guard).
- Safeguarding escalation / unresolved safeguarding review blocks sign-off lifecycle.

## Gaps fixed

- PR #1306: `run_lifecycle_for_review` now invoked from review approval when formal record exists.
- Approve no longer stops at `review_status=approved` without lifecycle for supported routes.
- Review action response carries archive/chronology/plan/LifeEcho IDs.
- Manager review UI shows lifecycle result card.

## Remaining limitations

- Formal routes still limited to registry `supported_now` set; complaint and many templates remain draft-only approval.
- Safeguarding-sensitive records may get archive summary only; raw narratives not exposed in UI/API responses.
- LifeEcho suggestions are never auto-published.
- Care plans are never silently updated from plan impact suggestions.
- Memory-mode storage skips DB formal creation when `conn` is None.
- ORB prompts are guidance only; no automatic sign-off.

## High-risk gates

- Creator cannot self-approve high-risk drafts (`enforce_review_access`).
- `safeguarding_review_required` blocks lifecycle unless `confirm_reviewed` or already approved path.
- `safeguarding_escalation_required` blocks sign-off.
- Safeguarding alerts are not auto-resolved on sign-off.
