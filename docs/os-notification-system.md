# OS notification system

## Purpose

The OS notification bell (`NotificationBell` in AppShell) is the single operational attention centre for managers. It combines:

- Connect / schema-backed `notifications` table items (unchanged)
- Operational feed items from `os_notification_adapter_service`

All operational items use **metadata-only safe summaries**. They do not expose raw recording bodies or safeguarding narrative.

## Sources

| Source | Adapter | Routes |
|--------|---------|--------|
| Recording alerts | `recording_alert_service` | `/record/alerts`, `/record/reviews` |
| ISN safeguarding network | `isn_notification_adapter_service` | `/safeguarding` |
| Manager daily brief | `manager_daily_brief_service` | `/command-centre/briefing` |
| Recording review queue | `recording_review_service` | `/record/reviews` |
| Intelligence actions | `intelligence_action_service` | `/intelligence-actions` |
| Governance flags | `recording_governance_service` | `/record/governance` |

## Lifecycle

Persisted in `os_notification_state` (migration `sql/085_os_notification_state.sql`):

- `mark_read` / `mark_unread`
- `acknowledge` / `assign` / `resolve` / `archive` / `reopen`

Service: `services/os_notification_state_service.py`

Actions sync to source where safe:

- **Recording alerts** → `recording_alert_service.apply_alert_action`
- **ISN** → `isn_notification_lifecycle_service` (memory/DB when available)
- **Daily brief** → `manager_daily_brief_service.mark_reviewed` + OS state resolve

Safeguarding-sensitive recording alerts and ISN escalation items **cannot be auto-resolved** from the bell.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/notifications/operational-feed` | Full feed with state applied |
| GET | `/api/notifications/operational-summary` | Counts only |
| POST | `/api/notifications/{notification_key}/action` | Lifecycle action |
| POST | `/api/notifications/mark-all-read` | Mark operational keys read |

ISN-specific: `POST /api/isn/notifications/{item_id}/action` or `POST /api/isn/notifications/action` with `metadata.item_id`.

## Bell behaviour

- Category labels: Recording, Safeguarding network, Daily brief, Review, Action, Governance
- Unread badge + urgent sub-badge
- Per-item actions: Mark read, Acknowledge, Resolve, Archive
- Mark all read
- Quick links: Recording alerts, Daily brief, Safeguarding network
- ORB links use `/assistant/orb` only (never standalone `/orb`)

## Manager daily brief reviewed state

Migration `sql/086_manager_daily_brief_reviews.sql` persists per user/day/home review.

When reviewed, the daily brief bell item is hidden and OS state is resolved.

## Safety boundaries

1. No raw record or safeguarding narrative in bell, badges or notification centre.
2. No automated safeguarding threshold decisions.
3. No false confirmation of formal referral or statutory decisions.
4. Standalone `/orb` must not import notification or ISN clients.
5. Notifications support oversight; they do not replace manager judgement.

## Limitations

- Push/email not implemented (use existing `notifications` table when job infrastructure exists).
- ISN DB lifecycle sync is partial when `isn_safeguarding_alerts` table unavailable (memory fallback).
- Connect notification bodies may still appear in the Connect section of `/notifications` (separate from operational feed).

## Future

- Event-driven feed refresh (WebSocket / SSE)
- Optional metadata rows in `notifications` table for push enqueue
- Per-home notification scope filters
