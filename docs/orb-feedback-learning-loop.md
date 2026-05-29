# ORB feedback learning loop (standalone /orb)

## What is collected

When an adult rates an ORB answer (thumbs up/down), standalone ORB may store:

- Message and conversation identifiers (client-generated IDs, not OS record IDs)
- Rating and reason (for thumbs down)
- Optional free-text comment
- Trimmed question/answer snapshots
- Mode, profile role, prompt tier
- Scenario family, secondary families, source anchors, action id, document lens
- Small standalone-safe metadata JSON

## What is not collected

- Live IndiCare OS `child_id`, `home_id`, `staff_id`, `record_id`, `chronology_id`
- Automatic writes to safeguarding rules, expert scenario bank, or prompt files

## Why it is collected

Feedback creates **evidence for human review**: scenario marker gaps, answer quality, citation issues, role-fit issues, unsafe wording, and missing professional lenses.

## How it improves ORB

`orb_feedback_improvement_service` groups feedback and produces **review suggestions** and **improvement candidates** (`review_required: true`). Candidates may propose expected markers, must-not-say lines, source anchors, role-lens fixes, or scenario variants — but nothing is applied automatically.

Admin summary: `GET /orb/admin/feedback/summary` (admin only). Legacy: `GET /orb/standalone/feedback/summary`.

## Improvement candidates (persisted)

Downvotes on scenario-loop reasons create/update rows in `orb_improvement_candidates` (`sql/202_orb_improvement_candidates.sql`).

Admins approve or reject via:

- `POST /orb/admin/feedback/candidates/{id}/approve`
- `POST /orb/admin/feedback/candidates/{id}/reject`

Approval **does not** auto-edit prompts, scenarios or safety rules — it records a review trail for a later implementation PR.

Admin UI: `/admin/orb-quality`.

## API

- `POST /orb/standalone/feedback` — premium standalone access
- Storage: `sql/201_orb_feedback.sql` → `orb_feedback` table (with in-memory fallback if migration pending)

## Principle

ORB may learn from feedback through a **controlled improvement loop**. It must **not** silently self-modify safeguarding or professional judgement from one user's feedback.
