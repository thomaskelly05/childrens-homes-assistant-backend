# ISN notification integration

## Purpose

The **IndiCare Safeguarding Network (ISN)** captures contextual safeguarding intelligence — signals, patterns, escalations and multi-agency context. This pass wires ISN into the **existing** operational notification rhythm:

- OS notification bell (`NotificationBell`)
- Care Hub safeguarding network digest card
- Manager daily brief safeguarding network section
- Recording alert cross-links (metadata markers only)
- Child journey ISN link
- Operational ORB prompts (`/assistant/orb` only)

ISN does **not** replace professional judgement, statutory referral workflows, or the Intelligence Spine.

## Architecture

| Layer | Location |
|-------|----------|
| ISN core | `services/isn_service.py`, `repositories/isn_repository.py`, `routers/isn_routes.py` |
| Digest | `services/isn_digest_service.py` |
| Bell adapter | `services/isn_notification_adapter_service.py` → `services/os_notification_adapter_service.py` |
| Lifecycle | `services/isn_notification_lifecycle_service.py` + `services/os_notification_state_service.py` |
| Schemas | `schemas/isn_notifications.py` |
| API | `routers/isn_notification_routes.py` — `/api/isn/notifications/*` |
| Frontend client | `frontend-next/lib/os-api/isn-notifications.ts` |
| Care Hub card | `frontend-next/components/command-centre/care-hub-isn-digest.tsx` |

## Notification bell

`GET /api/notifications/operational-feed` merges:

1. Recording alerts (existing)
2. Manager daily brief reminder (existing)
3. **ISN safeguarding network items** (new)

Bell items use `source: isn`, `category: Safeguarding network`, and metadata-only `safe_summary`. No raw safeguarding narrative, child IDs or ISN IDs in routes.

## Manager daily brief

Section id: `isn_safeguarding_network`, title: **Safeguarding network**.

Includes urgent/review/follow-up counts, top metadata items, linked recording alert count, routes to `/safeguarding` and `/record/alerts`, and extended ORB prompts.

## Safety boundaries

1. **Metadata only** in bell, Care Hub cards and brief — never full signal/alert bodies.
2. **No threshold decisions** — ISN surfaces patterns for human review.
3. **No auto-resolve** of safeguarding notifications.
4. **No referral claims** unless a separate formal workflow records them.
5. **Standalone `/orb`** must not import `isn-notifications.ts` or receive ISN payloads in URLs.
6. **ORB links** use `/assistant/orb?mode=safeguarding_themes` (or related operational modes) only.

## Lifecycle actions

`POST /api/isn/notifications/{item_id}/action` (or `POST /api/isn/notifications/action` with `metadata.item_id`):

- acknowledge, assign, resolve, archive, reopen, create_intelligence_action

OS state is persisted in `os_notification_state`. ISN source rows update when memory/DB storage is available. Safeguarding escalation types cannot be auto-resolved from the bell.

Unified actions also work via `POST /api/notifications/isn:{id}/action`.

## What is not included

- Push notifications / email digests (future scheduler)
- Wiring `os-command/safeguarding-network` graph API into the bell (separate schema; ISN tables used instead)
- Automated MASH/LADO/police referral decisions

## Limitations

- When `isn_safeguarding_alerts` tables are unavailable, digest returns a calm empty/degraded state with limitations text.
- Memory-mode test seeding via `isn_digest_service.seed_memory_alert()` for pytest only.
- Multi-agency pack content remains in ISN services; only safe digests surface in OS UI.

## Future roadmap

1. Persist ISN notification acknowledgement per user/home.
2. Event-driven refresh when `isn_service.create_alert` runs.
3. Optional enqueue into legacy `notifications` table (metadata rows).
4. Deeper link between recording alert IDs and ISN alert IDs (still metadata-only in bell).
