# Notification system finalisation summary

This document marks the **final major notification pass** for IndiCare OS (for now). The OS notification bell remains the single attention centre; no duplicate bells, recording alert feeds, or ISN notification channels were added.

## Architecture (complete enough for now)

| Layer | Status |
|-------|--------|
| Operational feed (recording, ISN, brief, review, actions, governance) | Active |
| Lifecycle (read, acknowledge, assign, resolve, archive) | Active |
| Preferences + role defaults + urgent safeguarding override | Active |
| Escalation rules + manual check | Active |
| Escalation run history | Active (DB + memory fallback) |
| Response analytics + governance summary | Active |
| Care Hub + daily brief oversight | Active |
| Push / email / background scheduler | **Future** |

## Sources

See `docs/os-notification-system.md` for adapter mapping. All operational items use **metadata-only safe summaries**.

## Escalation run history

- Migration: `sql/088_os_notification_escalation_run_history.sql`
- Table: `os_notification_escalation_check_runs`
- Each manual check records counts (urgent, safeguarding, recording, ISN, daily brief) — never raw bodies or narratives
- API: `GET /api/notifications/escalations/runs`, `GET /api/notifications/escalations/last-run`

## Analytics

Service: `services/os_notification_analytics_service.py`

- Response metrics: unread, acknowledged, resolved, timing averages when timestamps exist
- Urgent / safeguarding unacknowledged counts
- Governance summary for managers
- Automation health: manual checks yes; scheduler/push/email explicitly false

API:

- `GET /api/notifications/analytics/health`
- `GET /api/notifications/analytics/response-metrics`
- `GET /api/notifications/analytics/governance-summary`
- `GET /api/notifications/automation/health`

## UI surfaces

| Surface | What managers see |
|---------|-------------------|
| `/notifications` | Governance strip + operational feed |
| `/notifications/settings` | Automation status, last check, history, metrics |
| Care Hub | Notification oversight card |
| Daily brief | Notification and escalation oversight section |

## ORB

ORB prompts use `/assistant/orb` only (`action_priority`, `manager_daily_brief`, `safeguarding_themes`). No notification payloads in URLs. Standalone `/orb` does not import notification analytics clients.

## What remains future

1. **Background scheduler** — periodic escalation checks (foundation is manual + run history only)
2. **Push notifications** — placeholder flags in preferences
3. **Email delivery** — placeholder flags in preferences
4. **Provider-level preference UI** — schema supports scope; UI is user-focused
5. **Named-user escalation chains** — rules route to roles today

## Safety boundaries

1. Analytics and run history are metadata-only
2. Escalations support oversight; they do not make safeguarding decisions
3. No auto-resolve for safeguarding or ISN items
4. No statutory action claims in copy
5. Urgent safeguarding override remains active when categories are muted
6. Degraded honest state when DB or feed unavailable

## Manual verification URLs

- https://app.indicare.co.uk/notifications
- https://app.indicare.co.uk/notifications/settings
- https://app.indicare.co.uk/command-centre
- https://app.indicare.co.uk/command-centre/briefing

Apply migration after deploy:

```bash
psql $DATABASE_URL -f sql/088_os_notification_escalation_run_history.sql
```

Ensure prior migrations `085`, `086`, `087` are applied.
