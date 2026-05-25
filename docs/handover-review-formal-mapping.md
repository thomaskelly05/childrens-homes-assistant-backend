# Handover review, formal mapping and timeline foundation

## Review lifecycle

1. **Draft** — Author edits in `/handover` workspace.
2. **Send to review** — Sets `review_status=awaiting_review` (and `status=ready_for_review`).
3. **Manager review** — `/handover/reviews` queue with safe summaries only.
4. **Approve / request changes / safeguarding review** — Recorded in `handover_review_events`.
5. **Complete after approval** — `POST /handover/reviews/{id}/action` with `complete_after_approval`.
6. **Complete from workspace** — Blocked when `manager_review_required` and not `approved`.

## Formal mapping

- **Child-scoped drafts** with narrative may create `handover_records` via `handover_formal_mapping_service`.
- Payload uses **workspace body/sections only** — not auto-imported ISN, safeguarding or recording bodies.
- **Home/shift** formal routes are **not wired** — response includes: *"Formal handover record is not wired yet."*
- `formal_record_created` is `false` unless insert succeeds.

## Timeline link

- After formal record creation, `handover_shift_timeline_service` attempts chronology via `YoungPeopleLinkingService`.
- `linked_timeline_id` is set only when a chronology event id is returned.
- Otherwise `timeline_linked=false` and next step references pending shift timeline wiring.

## Safety boundaries

- No raw safeguarding narrative in review queue cards.
- No automated safeguarding decisions.
- No false formal or timeline confirmation.
- Operational ORB at `/assistant/orb` only — no handover payload in URLs.

## Remaining gaps

- Home/shift `handover_service` formal create from workspace.
- Unified audit export for review events.
- Notification tuning per home.

See also: `docs/handover-intelligence-workspace.md`, `docs/handover-workflow-map.md`.
