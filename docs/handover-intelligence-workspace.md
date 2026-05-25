# Handover intelligence workspace

## Purpose

The handover intelligence workspace (`/handover`) helps staff and managers prepare, review and complete shift handovers using **safe metadata summaries** from existing OS surfaces. It does not replace professional judgement or formal young-person handover records.

## Data sources

- Recording alerts (`recording_alert_service.build_digest`)
- Recording review queue (`recording_review_service`)
- ISN safeguarding network digest (`isn_digest_service`)
- Manager daily brief themes (via shared operational signals)
- Intelligence actions (`intelligence_action_service`)
- Child journey route hints
- Shift handover context (`handover_service.current_handover`) when schema is available
- Handover workspace drafts (`handover_draft_service`)

## Safety boundaries

- No raw safeguarding narratives in intelligence cards
- No full recording bodies in summary cards
- Metadata-only items with `no_raw_body` flags
- Standalone `/orb` cannot access handover APIs
- Operational ORB links use `/assistant/orb` only — no handover payload in URLs
- Completing a workspace draft does **not** automatically create a formal `handover_records` entry unless formal mapping succeeds for a child-scoped draft (see `docs/handover-review-formal-mapping.md`)
- Manager review required when safeguarding/ISN/high-risk flags are present in `source_context`

## Handover drafts

Table: `handover_drafts` (migration `sql/089_handover_drafts.sql`; review fields `sql/090_handover_review_formal_mapping.sql`)

Statuses: `draft`, `ready_for_review`, `completed`, `archived`

Review statuses: `draft`, `awaiting_review`, `changes_requested`, `approved`, `safeguarding_review_required`, `completed`, `archived`

Manager review queue: `/handover/reviews`

Formal per-child handover remains on young-person routes (`handover_records`); workspace may map to formal record when safe.

## ORB support

Handover UI exposes operational ORB prompts (manager brief, action priority, safeguarding themes, record quality review). Users open ORB in context; no child IDs, draft IDs or record bodies are passed in URLs.

## Limitations

- Shift schema may be unavailable in some environments (degraded overview section)
- In-memory fallback when migration not applied
- No automated safeguarding threshold decisions
- Notification feed includes at most two “ready for review” handover draft reminders to avoid noise

## Review and formal mapping (this pass)

See `docs/handover-review-formal-mapping.md` and `docs/handover-workflow-map.md`.

## Future

- Home/shift formal handover from workspace when shift contract is clear
- Shift-aware auto-reminders when shift sessions are fully wired
- Child-level handover export templates
