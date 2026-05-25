# Notification preferences and escalations

## Purpose

This foundation adds governance to the OS notification bell and notification centre:

- Role-based notification defaults
- Per-user preference overrides
- Urgent safeguarding override (items cannot be fully hidden)
- Escalation rules for overdue unacknowledged items
- Manual escalation checks with dry-run support
- Audit-safe preference and escalation event storage

## Role-based defaults

| Role family | Typical in-app categories |
|-------------|---------------------------|
| Registered manager, deputy, senior, RI, admin | Recording, ISN, daily brief, review, actions, governance |
| Support worker | Actions, handover; limited governance/daily brief; ISN from high severity |
| HR / workforce | System/handover; limited operational safeguarding |
| Unknown | Conservative: in-app only, urgent safeguarding if permitted |

Defaults are defined in `os_notification_preference_service.build_default_rules_for_role`.

## Preference rules

Each rule covers `source` + `category` with:

- `enabled` / `in_app_enabled`
- `min_severity` (low → urgent)
- `urgent_override` (always true for safeguarding defaults)
- Email/push placeholders (disabled — not configured yet)

User overrides persist in `os_notification_preferences` (migration `sql/087_os_notification_preferences_escalations.sql`).

## Urgent safeguarding override

These remain visible even when a category is muted or minimum severity is raised:

- ISN urgent/high safeguarding network items
- `safeguarding_review_due`, `safeguarding_escalation_required`, `high_risk_review_due` recording alerts
- ISN types: `isn_safeguarding_alert`, `isn_escalation_required`, etc.

## Escalation rules

Default rules (memory/DB) include:

1. Urgent ISN unacknowledged → 60 min → registered manager / safeguarding lead
2. High ISN unacknowledged → 240 min → registered manager
3. Urgent recording alert → 120 min → manager
4. Changes requested pending → 24 h → senior
5. Daily brief unreviewed → midday → manager
6. Medication error review due → 60 min → manager

Escalations create `os_notification_escalation_events` records with metadata-only `safe_summary`. They do **not**:

- Auto-resolve items
- Make safeguarding threshold decisions
- Send push/email (not configured)

## API

| Method | Path |
|--------|------|
| GET | `/api/notifications/preferences/health` |
| GET | `/api/notifications/preferences` |
| PATCH | `/api/notifications/preferences` |
| GET | `/api/notifications/escalations/health` |
| GET | `/api/notifications/escalations/rules` |
| POST | `/api/notifications/escalations/rules` |
| POST | `/api/notifications/escalations/check` |

Operational feed applies preferences after lifecycle state. Metadata includes `hidden_by_preferences`.

## Data safety

- No raw record bodies or safeguarding narratives in preferences, escalation cards, or events
- No standalone `/orb` links
- ORB links remain `/assistant/orb` operational only
- Fail conservative when role/home routing is unclear

## UI

- `/notifications/settings` — preferences, escalation rules, run escalation check
- Notification centre links to settings and shows hidden-by-preferences count when applicable

## Limitations

- Push and email delivery not implemented (`email_placeholder` / `push_placeholder` only)
- Escalation routing uses role names; user resolution may warn when user lookup unavailable
- Daily brief midday rule uses server local hour unless `force` in rule metadata
- Second notification bell not added; Connect notifications unchanged

## Future work

- Push/email when job infrastructure exists
- Home/provider scoped preferences UI
- Assign escalation targets to specific users from directory
- Scheduled escalation check job
