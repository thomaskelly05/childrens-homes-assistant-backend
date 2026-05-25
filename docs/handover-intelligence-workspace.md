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
- Completing a workspace draft does **not** create a formal `handover_records` entry

## Handover drafts

Table: `handover_drafts` (migration `sql/089_handover_drafts.sql`)

Statuses: `draft`, `ready_for_review`, `completed`, `archived`

Formal per-child handover remains on young-person routes (`handover_records`).

## ORB support

Handover UI exposes operational ORB prompts (manager brief, action priority, safeguarding themes, record quality review). Users open ORB in context; no child IDs, draft IDs or record bodies are passed in URLs.

## Limitations

- Shift schema may be unavailable in some environments (degraded overview section)
- In-memory fallback when migration not applied
- No automated safeguarding threshold decisions
- Notification feed includes at most two “ready for review” handover draft reminders to avoid noise

## Future

- Deeper integration with formal `handover_records` approval workflow
- Shift-aware auto-reminders when shift sessions are fully wired
- Child-level handover export templates
