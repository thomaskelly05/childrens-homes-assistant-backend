# Workforce and shift context integration

## What was found

Existing systems reused (not rebuilt):

- **Shift OS:** `ShiftService`, `ShiftRepository`, `routers/shift_routes`, `/shifts/current`
- **Workforce intelligence:** `WorkforceIntelligenceService`, `WorkforceJourneyService`, `workforce_pressure_service`
- **Staff profile / today:** `staff_profile_service`, `staff_today_service`, `/staff`, `/staff/[id]`
- **Training / supervision:** `/staff/training-matrix`, `/staff/supervision`, journey list APIs
- **Intelligence actions:** `intelligence_action_service` for staff-assigned follow-up
- **Handover:** `handover_intelligence_service`, draft sections, review queue

## Staff Profile OS (adult working-life profile)

- `services/staff_profile_os_service.py` — per-staff dashboard reusing workforce context, journey and actions
- `/api/staff-profile-os/{staff_id}` and `/staff/[id]` UI (`StaffProfileOsDashboard`)
- Handover and daily brief link to `/staff/{id}` when `shift_lead_id` or action owner is known
- See `docs/staff-profile-os.md` and `docs/staff-profile-os-connection-map.md`

## What was reused

- `services/workforce_context_service.py` — aggregates safe metadata from shift and workforce pressure services
- Handover section `staff_shift` via `build_staff_shift_section`
- Manager daily brief section `workforce_shift`
- Care Hub `CareHubWorkforceContext` card
- Low-noise notification items in `os_notification_adapter_service._workforce_indicator_items`
- Operational ORB prompts on handover and workforce services (`/assistant/orb` only)

## Safe summary model

`schemas/workforce_context.py` defines `WorkforceContextItem` with:

- `safe_summary` — sanitised, max length, no raw body patterns
- `sensitivity` — `public_operational`, `manager_only`, `hr_sensitive`, `confidential`
- No supervision notes, HR narratives or wellbeing detail in dashboard cards

## Sensitivity boundaries

| Data | Card summary | Detail |
|------|--------------|--------|
| Shift lead / count | Yes | `/shifts/current` |
| Training overdue counts | Manager only | `/staff/training-matrix` |
| Supervision overdue counts | Manager only, count only | `/staff/supervision` |
| Wellbeing | Route hint only | `/wellbeing` |
| HR / DBS | Not shown | Permissioned HR routes |

## Connections

### Handover

- Intelligence section **Staff and shift context** (`staff_shift`)
- Draft editor section **Staff and shift context** in `handover-sections.ts`
- ORB prompts for staff handover and staffing review

### Care Hub

- Card **Workforce and shift** with shift lead, counts, actions, Ask OS ORB

### Manager daily brief

- Section **Workforce and shift context**
- `workforce_summary` on brief model

### Notifications

- Optional indicators: supervision overdue, training compliance, staffing gap, staff action overdue (metadata only)

### ORB

- Prompts use `/assistant/orb?mode=manager_daily_brief` or `action_priority`
- No staff/shift IDs in standalone `/orb` URLs

### Child Journey

- Route hint: **Staff actions** → `/actions` (no private workforce info on child page)

## Limitations

- Shift data requires PostgreSQL operational migrations; without DB, route hints only
- `conn=None` tests use memory/degraded paths
- Staff profile landing is `/staff/[id]` — not embedded in Care Hub cards
- Standalone ORB must not import `workforce-context.ts` client

## SCCIF alignment

- Workforce context feeds `sccif_alignment_service.collect_workforce_evidence`
- May support leadership and management judgement area (partial evidence)

## Future staff profile build

When ready: embed permission-scoped staff snapshot in Care Hub using `staff_profile_service` with field allow-list — not in this pass.
