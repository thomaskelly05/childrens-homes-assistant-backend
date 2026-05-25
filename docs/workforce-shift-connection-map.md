# Workforce and shift connection map

Integration pass: connect existing staff/shift/workforce systems into handover, Care Hub, daily brief, notifications and operational ORB — without rebuilding HR or Intelligence Spine.

| Area | Existing backend route/service | Existing frontend route/component | Data available | Safe summary available? | Handover | Care Hub | Daily brief | ORB | Sensitivity | Current behaviour after pass | Gap / next action |
|------|-------------------------------|-----------------------------------|----------------|----------------------------|----------|----------|-------------|-----|-------------|------------------------------|-------------------|
| staff profile | `routers/staff_profile_routes`, `services/staff_profile_service` | `/staff/[id]`, `/staff` | Profile metadata, lifecycle stage | SUMMARY_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | hr_sensitive | Route hints to `/staff` | Full profile cards in Care Hub when permission model confirmed |
| staff portal | Legacy `frontend/staff-portal.html` | `/staff/command-centre` | Portal shell | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | — | — | manager_only | Link to staff area | Next.js portal parity |
| rota / shifts | `routers/shift_routes`, `services/shift_service`, `repositories/shift_repository` | `/shifts`, `/shifts/current` | Current shift, active_staff, shift_lead | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | public_operational | `workforce_context_service.build_shift_context` | Live shift when DB migrations applied |
| staff on shift | `ShiftService.current_shift_workspace` | `/shifts/current` | Count, names (operational) | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | public_operational | Staff count + shift lead metadata | Name resolution when staff directory wired |
| shift lead | `os_shift_sessions.shift_lead_*` | `/shifts/current` | lead id/name fields | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | public_operational | Safe shift lead label | — |
| supervision | `routers/supervision_lifecycle_routes`, `workforce_journey_service` | `/staff/supervision` | Overdue counts via `workforce_pressure_service` | SUMMARY_ONLY | REUSED_NOW | ROUTE_HINT_ONLY | REUSED_NOW | REUSED_NOW | hr_sensitive | Count indicators only | PERMISSIONED_DETAIL_ONLY on supervision routes |
| probation | `routers/probation_routes` | `/staff/probation` | Stage flags | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | — | — | hr_sensitive | Not summarised in cards | Connect when safe counts exist |
| training matrix | `workforce_journey_service.training_matrix` | `/staff/training-matrix` | Expired/missing counts | SUMMARY_ONLY | REUSED_NOW | ROUTE_HINT_ONLY | REUSED_NOW | REUSED_NOW | manager_only | Compliance counts in dashboard | — |
| competencies | Academy modules | `/staff/training-matrix` | Module status | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | — | — | manager_only | Route hint | — |
| DBS / safer recruitment | `routers/recruitment_routes` | Legacy recruitment UI | — | NOT_SAFE_TO_SUMMARISE | — | — | — | — | confidential | Not exposed | Explicit permissioned routes only |
| staff wellbeing | `services/staff_wellbeing_service` | `/wellbeing` | Flags count (pressure service) | SUMMARY_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | REUSED_NOW | confidential | Route hint only in cards | No wellbeing narrative in summaries |
| staff actions | `services/intelligence_action_service` | `/actions` | Proposed/urgent actions, owner name | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | public_operational | Action titles + safe summaries | — |
| HR records | HR tables (various) | — | Raw notes | NOT_SAFE_TO_SUMMARISE | NOT_FOUND | NOT_FOUND | NOT_FOUND | — | confidential | Not queried | — |
| absence / sickness | Optional tables | — | — | NOT_FOUND | ROUTE_HINT_ONLY | — | — | — | hr_sensitive | Rota route hint | Add when absence service confirmed |
| team meetings | — | — | — | NOT_FOUND | — | — | — | — | — | — | Future |
| staff debrief | Handover draft sections | `/handover` | Free text in draft | PERMISSIONED_DETAIL_ONLY | REUSED_NOW | — | — | REUSED_NOW | public_operational | Editor section `staff-shift-context` | — |
| workforce alerts | `workforce_pressure_service` | Care Hub card | Pressure score, gaps | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | manager_only | Staffing risk items | — |

**Classifications used:** REUSED_NOW, ROUTE_HINT_ONLY, SUMMARY_ONLY, PERMISSIONED_DETAIL_ONLY, NOT_SAFE_TO_SUMMARISE, NOT_FOUND.

**API surface added:** `GET /api/workforce/context/*` via `routers/workforce_context_routes.py`.
