# ORB admin quality review

## Purpose

Give platform admins a review-led workflow for standalone ORB answer quality before paid subscriptions launch.

## Admin routes

| Route | Access | Description |
|-------|--------|-------------|
| `GET /orb/admin/feedback/summary` | Admin | Overview metrics, gaps, candidates, usage |
| `GET /orb/admin/feedback/items` | Admin | Filterable feedback list |
| `GET /orb/admin/feedback/candidates` | Admin | Improvement candidates |
| `POST /orb/admin/feedback/candidates/{id}/approve` | Admin | Approve candidate (audit trail only) |
| `POST /orb/admin/feedback/candidates/{id}/reject` | Admin | Reject candidate |
| `POST /orb/admin/feedback/items/{id}/mark-reviewed` | Admin | Mark feedback reviewed |
| `GET /orb/admin/billing/usage` | Admin | Platform usage & cost summary |

Legacy admin summary remains at `GET /orb/standalone/feedback/summary` (admin only).

## Admin UI

Route: `/admin/orb-quality`

Sections:

1. Overview cards (feedback, helpful ratio, complaints, cost)
2. Downvote reasons
3. Recurring gaps
4. Improvement candidates (approve / reject + note)
5. Feedback table
6. Usage & cost (tier split, budget warnings)

## Review flow

1. Adult submits feedback on `/orb` (thumbs + reason)
2. System stores feedback and may create/update a **pending** improvement candidate
3. Admin reviews evidence in quality dashboard
4. Admin approves or rejects candidate with optional note
5. **Approved candidates do not auto-edit prompts or scenarios in this PR** — they create a clear trail for a follow-up implementation PR

## Safeguards

- Normal users cannot access admin feedback routes
- No OS child/home/record IDs in standalone feedback
- Approval does not modify scenario bank, prompt files or safety rules
