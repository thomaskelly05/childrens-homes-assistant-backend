# Manager daily brief and notification bell integration

## Purpose

Managers start shifts with one connected oversight path:

**recording alert → notification bell → Care Hub digest → manager daily brief → review queue / alerts → ORB support**

This pass wires recording alerts and the manager daily brief into the **existing** OS notification bell (`NotificationBell` in AppShell). It does not add a second bell or competing notification UI.

## Notification bell integration

- **Component**: `frontend-next/components/connect/notification-bell.tsx`
- **Adapter API**: `GET /api/notifications/operational-feed`
- **Service**: `services/os_notification_adapter_service.py`

The bell continues to count Connect and schema-backed `/api/notifications` unread items, and adds operational items from the adapter (recording alerts + daily brief reminder + **ISN safeguarding network** items).

Bell items are **metadata-only**:

- `safe_summary` — no draft body, alert body or child narrative
- Routes avoid `draft_id`, `alert_id`, `child_id` or `body` in query strings
- ORB links use `/assistant/orb` only (never standalone `/orb`)

## Notification preferences and escalations

Managers can configure preferences and run escalation checks at `/notifications/settings`. The daily brief page links to notification settings and notes that escalation rules protect urgent safeguarding items. Unreviewed daily brief items may appear as escalation candidates after midday. See `docs/notification-preferences-and-escalations.md`.

The daily brief includes a **Notification and escalation oversight** section (metadata-only): urgent/safeguarding unacknowledged counts, last escalation check, and links to notification settings. See `docs/notification-finalisation-summary.md`.

## Manager daily brief

- **Schemas**: `schemas/manager_daily_brief.py`
- **Service**: `services/manager_daily_brief_service.py`
- **Routes**: `/api/manager-daily-brief`, `/manager-daily-brief`
- **Care Hub card**: `care-hub-manager-daily-brief.tsx`
- **Full page**: `/command-centre/briefing`

### Data sources (metadata only)

| Section | Source |
|--------|--------|
| Recording alerts | `recording_alert_service.build_digest` |
| Reviews | `recording_review_service.get_review_summary` |
| Safeguarding-sensitive | Open alerts filtered by type |
| Actions | `intelligence_action_service.build_action_summary` |
| Handover | `handover_intelligence_service` + `/handover` workspace (see `docs/handover-intelligence-workspace.md`) |
| Handover reviews | `handover_review_service` + `/handover/reviews` (see `docs/handover-review-formal-mapping.md`) |
| Safeguarding network (ISN) | `isn_digest_service.build_digest` (metadata only) |
| Governance context | `recording_governance_service.build_dashboard` (counts only) |
| Workforce / shift | `workforce_context_service` + Staff Profile OS route hints (`/staff`, `/staff/{id}`) |

### Mark reviewed

`POST /api/manager-daily-brief/mark-reviewed` persists review state in `manager_daily_brief_reviews` (`sql/086_manager_daily_brief_reviews.sql`) with in-memory fallback when the table is unavailable. When reviewed, the daily brief bell item is hidden for that day and the OS notification state for `manager_daily_brief:today` is resolved.

## Safety boundaries

1. No raw record bodies in bell, badges or brief cards.
2. No automated safeguarding threshold decisions.
3. No auto-resolution of high-risk alerts.
4. Brief and notifications support oversight — they do not replace manager judgement.
5. Daily brief does not claim inspection compliance.
6. Standalone `/orb` must not import notification, manager brief or ISN notification clients.
7. ISN items in the bell use safe summaries only — see `docs/isn-notification-integration.md`.

## Push / email

Not in scope. Existing Connect notification tables remain unchanged. Future work can enqueue rows into `notifications` when job infrastructure exists.

## OS notification lifecycle

Operational bell items support read/acknowledge/assign/resolve/archive via `POST /api/notifications/{notification_key}/action`. See `docs/os-notification-system.md`.

## Workforce and shift context (integration pass)

- Brief section **Workforce and shift context** (`workforce_shift`) via `manager_daily_brief_service.build_workforce_section`
- Field `workforce_summary` on `ManagerDailyBrief`
- Care Hub card `CareHubWorkforceContext` (`data-testid="care-hub-workforce-shift"`)
- Bell: low-noise workforce indicators (supervision/training/gap/action counts) from `os_notification_adapter_service._workforce_indicator_items`
- API: `/api/workforce/context/dashboard` — metadata only

## Future roadmap

1. ~~Persist brief “reviewed” state per user/home in SQL.~~ **Done** (`sql/086_manager_daily_brief_reviews.sql`).
2. Event-driven alert checks after draft save / review decision.
3. Optional push via existing `notifications` table (metadata rows only).
4. ~~Handover workspace from brief sections.~~ **Done** — `/handover` intelligence workspace and drafts (`sql/089_handover_drafts.sql`).
5. ~~Handover review queue and formal mapping foundation.~~ **Done** — `/handover/reviews`, `sql/090_handover_review_formal_mapping.sql`.
6. Handover export snapshot from brief + workspace draft.
7. Per-home duty manager assignment for alerts.
