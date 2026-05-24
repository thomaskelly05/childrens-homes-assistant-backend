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

## Digest and badge summary

Managers can fetch metadata-only oversight surfaces without opening `/record/alerts`:

| Endpoint | Purpose |
|----------|---------|
| `GET /recording-alerts/digest` | Full manager digest: counts, recommendations, top alerts (metadata), routes |
| `GET /recording-alerts/badge-summary` | Lightweight nav badge counts for AppShell |
| `POST /recording-alerts/run-checks` | Manual check run wrapping `generate_alerts` + last-run metadata |
| `GET /recording-alerts/last-check` | Most recent check run (in-memory or `recording_alert_check_runs`) |

Digest and badge responses never include raw draft bodies. Top alerts expose title, safe summary, severity and routes only.

## Manual run checks

There is **no background scheduler** in this pass. Managers run checks from:

- `/record/alerts` — Run checks now
- Care Hub — Recording oversight digest
- `/record/governance` — Alert digest card

Check runs record `generated`, `created`, `updated`, `skipped` and `completed_at`. Optional persistence: `sql/084_recording_alert_check_runs.sql`.

## AppShell and Care Hub visibility

- AppShell Record nav shows a subtle badge when open/urgent alerts exist (manager roles).
- Care Hub includes a **Recording oversight** digest card with counts, last check, Run checks, Open alerts/governance, Ask OS ORB.

## ORB support

Operational ORB prompt chips on `/record/alerts`, Care Hub digest and manager digest:

- Recording oversight summary (`manager_daily_brief`)
- What needs manager review (`action_priority`)
- How to prioritise recording alerts (`action_priority`)
- Safeguarding-sensitive recording (`safeguarding_themes`)
- Recording quality themes (`record_quality_review`)

Links use `/assistant/orb` with mode/query only — never draft, child or alert IDs in URL.

## Intelligence actions

When `create_intelligence_action` is used, the service attempts `intelligence_action_service.create_action` with safe metadata. If creation fails, a warning is returned and managers can use `/intelligence-actions`.

## Limitations

- In-memory fallback when `recording_alerts` table is not migrated.
- Check-run history in-memory until migration 084 is applied.
- No push notifications or email in this pass.
- Dashboard governance alerts remain separate lightweight recommendations; persistent alerts live in `recording_alerts`.
- Formal record creation is not implied by resolving an alert.

## Future work

- Scheduled generation after draft save/review events
- Push notifications for urgent safeguarding alerts (requires Connect/notification infrastructure)
- Per-home alert assignment rules

See also: `docs/recording-alert-automation-roadmap.md`

## Manual migration

```bash
psql $DATABASE_URL -f sql/083_recording_alerts.sql
psql $DATABASE_URL -f sql/084_recording_alert_check_runs.sql
```
