# Recording governance dashboard

## Purpose

The recording governance dashboard (`/record/governance`) gives registered managers, deputies, seniors and RI-style roles a **metadata-only** view of recording activity across the operational OS:

- Draft status and volume
- Review backlog and priority
- High-risk and safeguarding-sensitive drafts
- Structured completion gaps
- Quality, language and privacy flags
- Form usage patterns
- Review outcomes from audit events

It supports leadership oversight and safe recording culture. It is **decision-support**, not automated safeguarding decisions or inspection grading.

## Data sources

| Source | Used for |
|--------|----------|
| `recording_drafts` (service + SQL) | Draft metadata, flags, structured completion, review status |
| `recording_review_events` | Manager review outcomes |
| `recording_review_service` | Queue priority, safeguarding classification |
| `recording_structured_template_registry` | High-risk template detection (via draft structured fields) |

API prefix: `/recording-governance/*` (and `/api/recording-governance/*` for frontend proxy).

## Safety boundaries

1. **Summary cards and list rows never include full `body` text** or raw structured field values.
2. Detail work happens on authorised `/record` and `/record/reviews` pages after normal access checks.
3. **Standalone `/orb` has no governance routes** and must not import `recording-governance` client code.
4. ORB governance prompts use **`/assistant/orb`** with modes such as `record_quality_review`, `safeguarding_themes`, `manager_daily_brief` — no draft IDs or bodies in URLs.
5. Privacy notice is shown on the dashboard: metadata, flags and summaries only.

## What metrics mean

- **Awaiting review**: Drafts in manager/safeguarding review states or `ready_for_review`.
- **Urgent**: Priority from review service rules (safeguarding-sensitive, flags, type).
- **Incomplete structured forms**: `structured_completion.required_missing` or invalid structured validation.
- **Privacy flags**: `privacy_flags` list or `privacy_sensitive` on draft.
- **Draft-only submissions**: Submitted in workspace without `linked_record_id`.
- **Form usage**: Aggregated counts by `form_id` / `recording_type` in scope.

## What is not shown

- Full record bodies
- Raw high-risk structured field values in summary UI
- Inspection compliance grades or legal completeness claims
- Automated safeguarding decisions

## Manager review relationship

Governance complements the **manager review queue** (`/record/reviews`). Alerts link to the queue or individual drafts. Managers remain accountable for approve / changes / escalation decisions.

## ORB support

Operational ORB can help summarise themes when asked via prompt chips. ORB does not receive dashboard payloads in URLs. Staff should not paste full sensitive bodies into ORB without privacy checks.

## Limitations

- In-memory fallback when PostgreSQL tables are unavailable (session-scoped counts).
- Formal record submission may still be workspace-only for some types.
- Child-scoped views filter by `child_id` but still require home-level access rules on underlying drafts.

## Next improvements

- Date-range filters in UI
- Export of anonymised governance reports
- Deeper integration with chronology formal records when submission router is fully wired
- Per-home multi-site aggregation for groups
