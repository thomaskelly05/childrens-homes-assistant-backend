# Staff Profile OS

## Purpose

Staff Profile OS unifies existing workforce, shift, training, supervision, probation, wellbeing and journey services into one **adult working-life profile** at `/staff/[id]`. It does not replace HR systems or rebuild the Intelligence Spine.

## Adult working-life profile

The profile answers operational questions for staff, seniors, deputies, RMs and RIs:

- Who is this person (identity, role, home)?
- What shift context applies?
- What actions do they own?
- What training, supervision or probation signals need attention?
- What handover or recording contribution applies?
- Where are permissioned detail routes?

## Systems reused

- `StaffProfileService` / `StaffTodayService` — access patterns
- `WorkforceJourneyService` — training matrix, supervision list, probation, profile rows
- `WorkforceIntelligenceService` — chronology, recording quality
- `workforce_context_service` — shift context
- `workforce_pressure_service` — pressure indicators
- `intelligence_action_service` — assigned actions
- `handover_intelligence_service` / `manager_daily_brief_service` — cross-links

## Safe summary model

`schemas/staff_profile_os.py` defines metadata-only items:

- Counts, dates, flags and route hints
- `safe_summary` sanitised (no notes, reflection, wellbeing narratives)
- Sensitivity: `public_operational`, `manager_only`, `hr_sensitive`, `confidential`

## Confidential boundaries

- No raw supervision notes in cards
- No wellbeing narratives in broad views
- No disciplinary/HR record bodies
- Detail remains in existing permissioned routes (`/staff/supervision`, `/staff/wellbeing`, etc.)

## API

- `GET /api/staff-profile-os/health`
- `GET /api/staff-profile-os/{staff_id}` — full dashboard
- `GET /api/staff-profile-os/{staff_id}/overview`
- `GET /api/staff-profile-os/{staff_id}/actions|training|supervision|wellbeing`

Auth required. Not available to standalone `/orb`.

## Care Hub / handover / daily brief

- Care Hub workforce card links to staff profiles, training, supervision
- Handover staff/shift section links to `/staff/{id}` when `staff_id` known
- Manager daily brief workforce section includes staff profile route hints

## ORB support

Operational prompts use `/assistant/orb?mode=manager_daily_brief` (or `action_priority`). No staff IDs in URLs.

Example prompts:

- Help me review this staff member's work priorities
- Help me prepare a supervision discussion
- What should be carried into handover?

## Limitations

- Without DB connection, summaries degrade to route hints
- Staff not in database return 404 (no fake staff)
- Manager prompts only for manager roles
- Notification workforce indicators unchanged (avoid duplication)

## Future redesign

- Per-staff shift assignment from rota
- Absence/sickness and debrief integration
- Finer home-level permission scoping
- Optional `staff_support` ORB mode when product map allows
