# Recording alerts and follow-up workflow

## Purpose

Recording governance surfaces risks on a dashboard. This workflow turns those risks into **actionable alerts** that managers can acknowledge, assign, resolve, archive, and optionally link to intelligence actions.

Alerts are **metadata and safe-summary only**. They never expose raw draft bodies.

## Alert types

| Type | Typical trigger |
|------|-----------------|
| `high_risk_review_due` | Manager/safeguarding review required, not approved |
| `safeguarding_review_due` | Safeguarding-sensitive or review required |
| `medication_error_review_due` | Medication error form/type |
| `missing_episode_follow_up_due` | Missing episode draft not completed |
| `rhi_follow_up_due` | RHI / return conversation follow-up |
| `structured_fields_missing` | `structured_completion.required_missing` non-empty |
| `privacy_flags_unresolved` | Privacy flags on draft |
| `changes_requested_pending` | Review status `changes_requested` |
| `draft_stale` | Draft unchanged > 7 days |
| `formal_submission_not_wired` | Submitted but formal path not complete |
| `formal_submission_failed` | Formal submission failed in metadata |
| `review_backlog_high` | Governance backlog ≥ threshold |
| `manager_review_required` | Explicit manager approval needed |
| `safeguarding_escalation_required` | Escalation from review or draft |
| `recording_quality_concern` | Quality/language flags on high-risk types |

## Generation rules

Generation is **API-triggered** (`POST /recording-alerts/generate`). There is no background scheduler in this pass.

- Scans visible recording drafts for the current user (manager scope).
- Optionally adds a home-level backlog alert from the governance dashboard.
- Replays recent review events per draft for changes/escalation alerts.
- **Dedupes** open/acknowledged/assigned alerts per `alert_type` + `draft_id`.

Constants: stale draft 7 days, changes requested overdue 3 days, backlog threshold 10.

## Lifecycle

1. **open** — created by generation
2. **acknowledged** — manager has seen the alert
3. **assigned** — owner label/user set
4. **resolved** — closed with optional note (manual only)
5. **archived** — no longer active

Actions: `acknowledge`, `assign`, `resolve`, `archive`, `reopen`, `create_intelligence_action`.

All lifecycle changes are written to the audit trail (`recording_alert` events).

## Safety boundaries

- No raw draft body in alert cards or API summaries.
- No safeguarding threshold decisions.
- Safeguarding/medication/high-risk alerts are **not auto-resolved**.
- Standalone `/orb` must not import recording-alerts APIs or receive alert payloads in URLs.
- OS ORB links use `/assistant/orb` with mode/query only.

## Manager judgement

Alerts support oversight; they do not replace professional judgement or formal safeguarding processes.

## ORB support

Operational ORB prompt chips on `/record/alerts`:

- What recording alerts mean
- What needs manager review
- How to prioritise follow-up
- Safeguarding-sensitive alerts

## Intelligence actions

When `create_intelligence_action` is used, the service attempts `intelligence_action_service.create_action` with safe metadata. If creation fails, a warning is returned and managers can use `/intelligence-actions`.

## Limitations

- In-memory fallback when `recording_alerts` table is not migrated.
- No push notifications or email in this pass.
- Dashboard governance alerts remain separate lightweight recommendations; persistent alerts live in `recording_alerts`.
- Formal record creation is not implied by resolving an alert.

## Future work

- Scheduled generation after draft save/review events
- Push notifications for urgent safeguarding alerts
- Per-home alert assignment rules

## Manual migration

```bash
psql $DATABASE_URL -f sql/083_recording_alerts.sql
```
