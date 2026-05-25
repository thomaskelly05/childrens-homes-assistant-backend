# Staff Profile OS connection map

| Area | Existing backend route/service | Existing frontend route/component | Data available | Safe summary available? | Connect staff profile now? | Care Hub now? | Daily brief now? | Handover now? | Sensitivity | After this pass | Gap / next action |
|------|-------------------------------|-----------------------------------|----------------|-------------------------|---------------------------|---------------|------------------|---------------|-------------|-----------------|-------------------|
| identity/profile | `StaffProfileService`, `WorkforceJourneyService.staff_profile`, `/api/workforce-os/staff/{id}/profile` | `/staff/[id]`, `staff-profile-os-dashboard` | Name, role, home, status | Yes | REUSED_NOW | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | public_operational | Overview header from Staff Profile OS | Home name from homes table |
| role/home assignment | `workforce_journey` profile overview | `/staff/[id]` | role, home_id | Yes | REUSED_NOW | — | — | — | public_operational | Role/home in overview | Permissions matrix hints |
| permissions | `staff_profile_service._ensure_can_view` | settings staff access | role-based | Route hints only | ROUTE_HINT_ONLY | — | — | — | manager_only | Access via enforce_access | Fine-grained home scoping |
| shift context | `ShiftService`, `workforce_context_service` | `/shifts/current` | shift lead, count, gaps | Yes | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | public_operational | Shift section + Care Hub lead link | Per-staff shift assignment |
| rota/rostering | `roster_assignments`, `/rostering` | `/rostering` | assignment rows | Count only | SUMMARY_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | public_operational | Rota route hints | Live rota API per staff |
| staff on shift | `workforce_context.build_staff_on_shift` | Care Hub card | names, counts | Yes | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | public_operational | Metadata counts | Named staff profile links from rota |
| shift lead | `ShiftContextSummary.shift_lead_id` | Care Hub, handover | lead id/name | Yes | REUSED_NOW | REUSED_NOW | REUSED_NOW | REUSED_NOW | public_operational | `/staff/{id}` when id known | — |
| assigned actions | `intelligence_action_service` | `/actions` | titles, priority, owner | Yes (no bodies) | REUSED_NOW | Partial | Partial | REUSED_NOW | public_operational | Actions section | Owner_id filtering accuracy |
| recording contribution | `WorkforceIntelligenceService.recording_quality` | `/staff/recording-quality` | scores, history count | Yes | REUSED_NOW | — | — | — | public_operational | Recording section | — |
| handover responsibility | `handover_intelligence_service` | `/handover` | shift lead, actions | Yes | REUSED_NOW | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | REUSED_NOW | public_operational | Handover section + links | — |
| supervision | `workforce_journey.list_supervision` | `/staff/supervision` | record count, status | Yes (no notes) | REUSED_NOW | ROUTE_HINT_ONLY | Count in brief | ROUTE_HINT_ONLY | hr_sensitive | Supervision section | Due-date engine |
| probation | `workforce_journey.probation` | `/staff/probation` | review count | Yes | REUSED_NOW | — | — | — | manager_only | Probation section | — |
| appraisal | optional DB tables | `/staff/appraisals` | rows | NOT_SAFE_TO_SUMMARISE | ROUTE_HINT_ONLY | — | — | — | hr_sensitive | Route hint only | Enable when module ready |
| training matrix | `workforce_journey.training_matrix` | `/staff/training-matrix` | due/expired/missing counts | Yes | REUSED_NOW | REUSED_NOW | REUSED_NOW | ROUTE_HINT_ONLY | manager_only | Training section | Per-item due dates in cards |
| qualifications | `staff_qualifications` | profile detail | count | Count only | SUMMARY_ONLY | — | — | — | hr_sensitive | Qualification count | — |
| competencies | Academy modules | `/academy` | module status | Route hints | ROUTE_HINT_ONLY | — | — | — | public_operational | Via training routes | Academy card on profile OS |
| DBS / safer recruitment | `staff_safer_recruitment_checks` | `/staff/safer-recruitment` | presence flag | Route hint only | ROUTE_HINT_ONLY | — | — | — | hr_sensitive | Recruitment route hint | No fake DBS data |
| recruitment | recruitment routes (flagged) | `/staff/recruitment` | — | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | — | — | — | hr_sensitive | Route hint | Module flagged off |
| absence/sickness | NOT_FOUND | — | — | — | NOT_FOUND | — | — | — | hr_sensitive | — | Add when absence service exists |
| wellbeing | `staff_wellbeing_checkins` | `/staff/wellbeing` | flag count | Count only | SUMMARY_ONLY | ROUTE_HINT_ONLY | — | — | confidential | Wellbeing section | No narratives in cards |
| staff debrief | NOT_FOUND | — | — | — | NOT_FOUND | — | — | — | confidential | — | Future debrief OS |
| team meeting | NOT_FOUND | — | — | — | NOT_FOUND | — | — | — | public_operational | — | — |
| workforce pressure | `workforce_pressure_service` | `/staff/risk` | score, state | Yes | REUSED_NOW | Partial | Partial | Partial | manager_only | Journey section item | — |
| workforce journey | `WorkforceIntelligenceService.chronology` | `/staff/[id]/chronology` | event count | Yes | REUSED_NOW | ROUTE_HINT_ONLY | ROUTE_HINT_ONLY | — | public_operational | Journey section | Event type breakdown in cards |
| HR records | permissioned HR routes | — | — | NOT_SAFE_TO_SUMMARISE | PERMISSIONED_DETAIL_ONLY | — | — | — | hr_sensitive | Not in cards | — |
