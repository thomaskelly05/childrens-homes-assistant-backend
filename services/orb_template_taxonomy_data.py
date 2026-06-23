"""Full residential template taxonomy metadata — extends canonical ORB_TEMPLATE_REGISTRY.

This module does NOT duplicate template definitions. It maps lifecycle groups (A–J),
station availability, regulation anchors, save destinations and governance metadata
onto template_ids in services/orb_template_library_registry.py.
"""

from __future__ import annotations

from typing import Any, Literal

LifecycleGroupId = Literal[
    "A", "B", "C", "D", "E", "F", "G", "H", "I", "J"
]

OrbStationId = Literal[
    "chat", "dictate", "voice", "write", "records", "communicate", "templates"
]

SafeguardingLevel = Literal["standard", "elevated", "high_risk"]

SaveDestination = Literal[
    "records_drafts",
    "records_final",
    "documents",
    "handover",
    "reports",
    "communicate_pack",
    "standalone_saved",
]

LIFECYCLE_GROUPS: dict[str, dict[str, str]] = {
    "A": {
        "id": "A",
        "label": "Referral, matching and admission",
        "description": "From referral through first placement days.",
    },
    "B": {
        "id": "B",
        "label": "Care planning and placement support",
        "description": "Placement plans, reviews and dynamic risk updates.",
    },
    "C": {
        "id": "C",
        "label": "Daily care and recording",
        "description": "Routine care, keywork, handover and chronology.",
    },
    "D": {
        "id": "D",
        "label": "Safeguarding and high-risk practice",
        "description": "Safeguarding concerns, missing, exploitation and allegations.",
    },
    "E": {
        "id": "E",
        "label": "Incident, behaviour and restorative practice",
        "description": "Incidents, restraint, de-escalation and repair.",
    },
    "F": {
        "id": "F",
        "label": "Family, identity and relationships",
        "description": "Contact, identity, life story and relationship repair.",
    },
    "G": {
        "id": "G",
        "label": "Education, health and SEND",
        "description": "Education, health, medication and communication needs.",
    },
    "H": {
        "id": "H",
        "label": "Rights, complaints and advocacy",
        "description": "Complaints, advocacy, participation and rights.",
    },
    "I": {
        "id": "I",
        "label": "Leadership, inspection and governance",
        "description": "Reg 44/45, oversight, supervision and audit.",
    },
    "J": {
        "id": "J",
        "label": "Transition, moving on and later-life records",
        "description": "Pathway, leaving care and life story closure.",
    },
}

_DEFAULT_STATIONS: list[str] = ["templates", "write", "dictate", "records"]
_CHAT_STATIONS: list[str] = ["chat", "templates", "write", "dictate", "voice", "records"]
_COMMUNICATE_STATIONS: list[str] = ["communicate", "templates", "write", "records"]

# Compact taxonomy: template_id, title, group, family, stations, safeguarding, roles, save_dest, anchors, follow_ups
_TAXONOMY_ROW = tuple[str, str, str, str, list[str], str, list[str], str, list[str], list[str]]

_TAXONOMY_SPECS: list[_TAXONOMY_ROW] = [
    # A — Referral, matching and admission
    ("referral_summary", "Referral summary", "A", "referral_admission", _DEFAULT_STATIONS, "elevated", ["manager", "placement_team"], "records_drafts", ["care_planning", "quality_purpose"], ["Complete matching assessment", "Share with placement panel"]),
    ("matching_assessment", "Matching assessment", "A", "referral_admission", _DEFAULT_STATIONS, "elevated", ["manager", "placement_team"], "records_drafts", ["care_planning", "positive_relationships"], ["Admission planning checklist", "Welcome plan"]),
    ("impact_risk_summary", "Impact risk summary", "A", "referral_admission", _DEFAULT_STATIONS, "high_risk", ["manager", "safeguarding_lead"], "records_drafts", ["protection_children", "care_planning"], ["Initial risk and needs summary"]),
    ("admission_planning_checklist", "Admission planning checklist", "A", "referral_admission", _DEFAULT_STATIONS, "elevated", ["manager", "senior"], "records_drafts", ["care_planning", "leadership_management"], ["Welcome plan", "First 24 hours record"]),
    ("welcome_plan", "Welcome plan", "A", "referral_admission", _CHAT_STATIONS, "standard", ["keyworker", "senior", "manager"], "records_drafts", ["views_wishes_feelings", "quality_purpose"], ["First 24 hours record"]),
    ("first_24_hours_record", "First 24 hours record", "A", "referral_admission", _CHAT_STATIONS, "elevated", ["support_worker", "senior", "manager"], "records_drafts", ["quality_purpose", "care_planning"], ["First 72 hours review"]),
    ("first_72_hours_review", "First 72 hours review", "A", "referral_admission", _DEFAULT_STATIONS, "elevated", ["manager", "keyworker"], "records_drafts", ["care_planning", "quality_purpose"], ["Placement plan contribution"]),
    ("initial_risk_needs_summary", "Initial risk and needs summary", "A", "referral_admission", _DEFAULT_STATIONS, "high_risk", ["manager", "safeguarding_lead"], "records_drafts", ["protection_children", "care_planning"], ["Risk assessment update"]),
    ("placement_planning_evidence_summary", "Placement planning evidence summary", "A", "referral_admission", _DEFAULT_STATIONS, "elevated", ["manager", "keyworker"], "records_final", ["care_planning", "sccif_experiences_progress"], ["Care plan review note"]),
    # B — Care planning and placement support
    ("placement_plan", "Placement plan contribution", "B", "care_planning", _DEFAULT_STATIONS, "elevated", ["keyworker", "manager"], "records_final", ["care_planning", "quality_purpose"], ["Risk assessment update"]),
    ("care_plan_review_note", "Care plan review note", "B", "care_planning", _DEFAULT_STATIONS, "standard", ["keyworker", "manager"], "records_drafts", ["care_planning", "views_wishes_feelings"], ["Behaviour support plan review"]),
    ("risk_assessment", "Risk assessment update", "B", "care_planning", _CHAT_STATIONS, "elevated", ["keyworker", "senior", "manager"], "records_final", ["protection_children", "care_planning"], ["Missing risk update"]),
    ("behaviour_support_plan", "Behaviour support plan", "B", "care_planning", _DEFAULT_STATIONS, "elevated", ["keyworker", "manager"], "records_final", ["positive_relationships", "care_planning"], ["Positive behaviour support reflection"]),
    ("positive_behaviour_support_reflection", "Positive behaviour support reflection", "B", "care_planning", _CHAT_STATIONS, "standard", ["support_worker", "keyworker"], "records_drafts", ["positive_relationships", "care_planning"], ["Plan review date"]),
    ("missing_from_care_plan", "Missing risk update", "B", "care_planning", _DEFAULT_STATIONS, "high_risk", ["manager", "safeguarding_lead"], "records_final", ["protection_children", "care_planning"], ["Return home conversation record"]),
    ("exploitation_risk_plan", "Exploitation risk update", "B", "care_planning", _DEFAULT_STATIONS, "high_risk", ["manager", "safeguarding_lead"], "records_final", ["protection_children", "care_planning"], ["Exploitation concern record if indicators escalate"]),
    ("health_plan", "Health plan update", "B", "care_planning", _DEFAULT_STATIONS, "elevated", ["keyworker", "manager"], "records_final", ["health_wellbeing", "care_planning"], ["Health appointment record"]),
    ("education_plan", "Education plan update", "B", "care_planning", _DEFAULT_STATIONS, "standard", ["keyworker", "manager"], "records_final", ["education", "care_planning"], ["PEP contribution"]),
    ("independence_plan", "Independence plan", "B", "care_planning", _DEFAULT_STATIONS, "standard", ["keyworker", "manager"], "records_final", ["enjoyment_achievement", "care_planning"], ["Transition / moving-on plan"]),
    ("transition_moving_on_plan", "Transition / moving-on plan", "B", "care_planning", ["templates", "write", "records"], "elevated", ["keyworker", "manager"], "records_final", ["care_planning", "quality_purpose"], ["Pathway / leaving care contribution"]),
    # C — Daily care and recording
    ("daily_record", "Daily record", "C", "daily_recording", _CHAT_STATIONS, "standard", ["support_worker", "senior"], "records_drafts", ["quality_purpose", "views_wishes_feelings"], ["Handover note", "Manager review if significant"]),
    ("morning_routine_record", "Morning routine record", "C", "daily_recording", _CHAT_STATIONS, "standard", ["support_worker"], "records_drafts", ["quality_purpose", "health_wellbeing"], ["Daily record"]),
    ("bedtime_routine_record", "Bedtime routine record", "C", "daily_recording", _CHAT_STATIONS, "standard", ["support_worker"], "records_drafts", ["quality_purpose", "health_wellbeing"], ["Daily record"]),
    ("meal_food_concern_record", "Meal / food concern record", "C", "daily_recording", _CHAT_STATIONS, "elevated", ["support_worker", "senior"], "records_drafts", ["health_wellbeing", "quality_purpose"], ["Health plan update if pattern emerges"]),
    ("activity_record", "Activity record", "C", "daily_recording", _CHAT_STATIONS, "standard", ["support_worker"], "records_drafts", ["enjoyment_achievement", "views_wishes_feelings"], ["Daily record"]),
    ("keywork_session", "Keywork session note", "C", "daily_recording", _CHAT_STATIONS, "standard", ["keyworker"], "records_drafts", ["views_wishes_feelings", "care_planning"], ["Care plan review note"]),
    ("direct_work_summary", "Direct work note", "C", "daily_recording", _CHAT_STATIONS, "standard", ["keyworker", "support_worker"], "records_drafts", ["views_wishes_feelings", "positive_relationships"], ["Child voice note"]),
    ("child_voice_note", "Child voice note", "C", "daily_recording", _CHAT_STATIONS, "standard", ["support_worker", "keyworker"], "records_drafts", ["views_wishes_feelings", "quality_purpose"], ["Link to care plan review"]),
    ("handover_note", "Handover note", "C", "daily_recording", ["dictate", "voice", "write", "records", "templates"], "elevated", ["support_worker", "senior"], "handover", ["leadership_management", "quality_purpose"], ["Manager oversight if safeguarding flags"]),
    ("chronology_entry", "Chronology entry", "C", "daily_recording", _DEFAULT_STATIONS, "elevated", ["senior", "manager"], "records_final", ["records", "protection_children"], ["Safeguarding concern if significant"]),
    # D — Safeguarding and high-risk practice
    ("safeguarding_concern_record", "Safeguarding concern record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "sccif_help_protection"], ["Manager/DSL escalation", "Multi-agency notification"]),
    ("self_harm_suicide_concern_record", "Self-harm / suicide concern record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "health_wellbeing"], ["Immediate manager/on-call", "CAMHS/health pathway"]),
    ("missing_from_care_record", "Missing from care record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "notifications"], ["Return home conversation", "Missing plan review"]),
    ("missing_return_conversation", "Return home conversation record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "views_wishes_feelings"], ["Missing plan update", "Manager review"]),
    ("exploitation_screening", "Exploitation concern record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "sccif_help_protection"], ["Multi-agency strategy", "Exploitation risk plan"]),
    ("online_safety_concern_record", "Online safety concern record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "care_planning"], ["Contextual safeguarding assessment"]),
    ("hsb_concern_record", "Harmful sexual behaviour concern record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["manager", "safeguarding_lead"], "records_final", ["protection_children", "sccif_help_protection"], ["Specialist consultation", "LADO if staff involved"]),
    ("substance_use_concern_record", "Substance use concern record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "health_wellbeing"], ["Health pathway", "Risk plan update"]),
    ("fire_ligature_environmental_safety_record", "Fire / ligature / environmental safety record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "health_wellbeing"], ["Environmental risk review", "Manager oversight"]),
    ("allegation_chronology", "Allegation against staff / LADO record", "D", "safeguarding", _DEFAULT_STATIONS, "high_risk", ["manager", "safeguarding_lead"], "records_final", ["protection_children", "staff_fitness"], ["LADO referral preparation"]),
    ("whistleblowing_concern_record", "Whistleblowing concern record", "D", "safeguarding", _DEFAULT_STATIONS, "high_risk", ["all_staff"], "records_final", ["leadership_management", "protection_children"], ["RI/provider escalation"]),
    ("bullying_peer_harm_record", "Bullying / peer-on-peer harm record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "positive_relationships"], ["Restorative conversation", "Behaviour support plan"]),
    ("police_involvement_arrest_record", "Police involvement / arrest record", "D", "safeguarding", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "notifications"], ["Manager notification", "Legal advice if needed"]),
    # E — Incident, behaviour and restorative practice
    ("incident_record", "Incident record", "E", "incident_behaviour", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["protection_children", "quality_purpose"], ["Manager oversight", "Debrief"]),
    ("physical_intervention_record", "Physical intervention record", "E", "incident_behaviour", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["behaviour_restraint", "protection_children"], ["Staff and child debrief", "Manager review"]),
    ("de_escalation_reflection", "De-escalation reflection", "E", "incident_behaviour", _CHAT_STATIONS, "elevated", ["support_worker", "senior"], "records_drafts", ["positive_relationships", "care_planning"], ["Behaviour support plan review"]),
    ("restorative_conversation_note", "Restorative conversation note", "E", "incident_behaviour", _CHAT_STATIONS, "elevated", ["keyworker", "senior"], "records_drafts", ["positive_relationships", "views_wishes_feelings"], ["Repair and relationship reflection"]),
    ("damage_property_reflection", "Damage to property reflection", "E", "incident_behaviour", _CHAT_STATIONS, "elevated", ["support_worker", "senior"], "records_drafts", ["positive_relationships", "quality_purpose"], ["Restorative conversation"]),
    ("consequence_sanction_proportionality_review", "Consequence / sanction proportionality review", "E", "incident_behaviour", _DEFAULT_STATIONS, "elevated", ["manager", "senior"], "records_drafts", ["positive_relationships", "care_planning"], ["Behaviour support plan update"]),
    ("repair_relationship_reflection", "Repair and relationship reflection", "E", "incident_behaviour", _CHAT_STATIONS, "standard", ["keyworker", "support_worker"], "records_drafts", ["positive_relationships", "views_wishes_feelings"], ["Keywork session note"]),
    ("staff_debrief_record", "Staff debrief note", "E", "incident_behaviour", ["dictate", "voice", "write", "records"], "elevated", ["senior", "manager"], "records_drafts", ["leadership_management", "staff_supervision"], ["Supervision preparation"]),
    ("child_debrief", "Young person debrief note", "E", "incident_behaviour", _CHAT_STATIONS, "elevated", ["keyworker", "senior"], "records_drafts", ["views_wishes_feelings", "positive_relationships"], ["Care plan review if needed"]),
    ("manager_review_note", "Manager oversight note", "E", "incident_behaviour", _DEFAULT_STATIONS, "elevated", ["manager"], "records_final", ["leadership_management", "quality_purpose"], ["Audit action if systemic issue"]),
    # F — Family, identity and relationships
    ("family_time_plan", "Family time / contact record", "F", "family_identity", _CHAT_STATIONS, "elevated", ["support_worker", "keyworker"], "records_drafts", ["positive_relationships", "views_wishes_feelings"], ["Contact change support note"]),
    ("contact_change_support_note", "Contact change support note", "F", "family_identity", _CHAT_STATIONS, "elevated", ["keyworker", "manager"], "records_drafts", ["positive_relationships", "care_planning"], ["Family time plan update"]),
    ("family_disclosure_after_contact_record", "Family disclosure after contact record", "F", "family_identity", _CHAT_STATIONS, "high_risk", ["support_worker", "senior"], "records_final", ["protection_children", "positive_relationships"], ["Safeguarding concern if needed"]),
    ("identity_culture_religion_support_note", "Identity / culture / religion support note", "F", "family_identity", _CHAT_STATIONS, "standard", ["keyworker", "support_worker"], "records_drafts", ["views_wishes_feelings", "quality_purpose"], ["Life story contribution"]),
    ("life_story_contribution", "Life story contribution", "F", "family_identity", _CHAT_STATIONS, "standard", ["keyworker"], "records_drafts", ["views_wishes_feelings", "quality_purpose"], ["Memory / photo record"]),
    ("memory_photo_important_event_record", "Memory / photo / important event record", "F", "family_identity", _CHAT_STATIONS, "standard", ["keyworker", "support_worker"], "records_drafts", ["views_wishes_feelings", "enjoyment_achievement"], ["Life story contribution"]),
    ("relationship_repair_note", "Relationship repair note", "F", "family_identity", _CHAT_STATIONS, "standard", ["keyworker", "senior"], "records_drafts", ["positive_relationships", "views_wishes_feelings"], ["Restorative conversation"]),
    # G — Education, health and SEND
    ("school_refusal_record", "School refusal record", "G", "education_health_send", _CHAT_STATIONS, "elevated", ["keyworker", "support_worker"], "records_drafts", ["education", "health_wellbeing"], ["Education attendance support note"]),
    ("education_attendance_support_note", "Education attendance support note", "G", "education_health_send", _DEFAULT_STATIONS, "elevated", ["keyworker", "manager"], "records_drafts", ["education", "care_planning"], ["Virtual School update"]),
    ("pep_contribution", "PEP contribution", "G", "education_health_send", _DEFAULT_STATIONS, "standard", ["keyworker", "manager"], "records_final", ["education", "care_planning"], ["Education plan update"]),
    ("virtual_school_update", "Virtual School update", "G", "education_health_send", _DEFAULT_STATIONS, "standard", ["keyworker", "manager"], "records_drafts", ["education", "care_planning"], ["PEP contribution"]),
    ("health_appointment_record", "Health appointment record", "G", "education_health_send", _CHAT_STATIONS, "elevated", ["support_worker", "keyworker"], "records_drafts", ["health_wellbeing", "care_planning"], ["Health plan update"]),
    ("medication_refusal_record", "Medication refusal record", "G", "education_health_send", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["health_wellbeing", "protection_children"], ["Clinical advice", "Manager notification"]),
    ("medication_error_record", "Medication error record", "G", "education_health_send", _CHAT_STATIONS, "high_risk", ["all_staff"], "records_final", ["health_wellbeing", "protection_children"], ["Incident record", "Clinical pathway"]),
    ("camhs_mental_health_appointment_note", "CAMHS / mental health appointment note", "G", "education_health_send", _DEFAULT_STATIONS, "elevated", ["keyworker", "manager"], "records_drafts", ["health_wellbeing", "care_planning"], ["Emotional wellbeing plan update"]),
    ("autism_sensory_support_record", "Autism / sensory support record", "G", "education_health_send", _CHAT_STATIONS, "standard", ["support_worker", "keyworker"], "records_drafts", ["health_wellbeing", "views_wishes_feelings"], ["Behaviour support plan update"]),
    ("learning_disability_communication_record", "Learning disability communication record", "G", "education_health_send", _CHAT_STATIONS, "standard", ["support_worker", "keyworker"], "records_drafts", ["views_wishes_feelings", "health_wellbeing"], ["AAC / child voice record"]),
    ("aac_child_voice_record", "AAC / symbols / gestures child voice record", "G", "education_health_send", _COMMUNICATE_STATIONS, "standard", ["support_worker", "keyworker"], "records_drafts", ["views_wishes_feelings", "quality_purpose"], ["Communicate support pack if helpful"]),
    # H — Rights, complaints and advocacy
    ("complaint_record", "Complaint record", "H", "rights_advocacy", _CHAT_STATIONS, "elevated", ["all_staff"], "records_final", ["complaints", "views_wishes_feelings"], ["Manager response", "Advocacy referral if requested"]),
    ("advocacy_referral_note", "Advocacy referral note", "H", "rights_advocacy", _DEFAULT_STATIONS, "elevated", ["keyworker", "manager"], "records_drafts", ["views_wishes_feelings", "complaints"], ["Independent visitor note"]),
    ("independent_visitor_note", "Independent visitor note", "H", "rights_advocacy", _DEFAULT_STATIONS, "standard", ["keyworker", "manager"], "records_drafts", ["views_wishes_feelings", "independent_visits"], ["Young person's feedback summary"]),
    ("rights_discussion_record", "Rights discussion record", "H", "rights_advocacy", _CHAT_STATIONS, "standard", ["keyworker", "support_worker"], "records_drafts", ["views_wishes_feelings", "quality_purpose"], ["Participation / choice record"]),
    ("participation_choice_record", "Participation / choice record", "H", "rights_advocacy", _CHAT_STATIONS, "standard", ["keyworker", "support_worker"], "records_drafts", ["views_wishes_feelings", "quality_purpose"], ["Young person's meeting preparation"]),
    ("young_person_meeting_preparation", "Young person's meeting preparation", "H", "rights_advocacy", _CHAT_STATIONS, "standard", ["keyworker"], "records_drafts", ["views_wishes_feelings", "care_planning"], ["Young person's feedback summary"]),
    ("young_person_feedback_summary", "Young person's feedback summary", "H", "rights_advocacy", _CHAT_STATIONS, "standard", ["keyworker", "manager"], "records_drafts", ["views_wishes_feelings", "quality_purpose"], ["Care plan review note"]),
    # I — Leadership, inspection and governance
    ("reg44_action_tracker", "Reg 44 evidence summary", "I", "leadership_governance", _DEFAULT_STATIONS, "elevated", ["manager", "responsible_individual"], "reports", ["reg44", "leadership_management"], ["Audit action plan"]),
    ("reg45_quality_review", "Reg 45 quality of care review section", "I", "leadership_governance", _DEFAULT_STATIONS, "elevated", ["manager", "responsible_individual"], "reports", ["reg45", "quality_of_care_review"], ["Lessons learned review"]),
    ("ofsted_readiness_review", "Ofsted / SCCIF evidence summary", "I", "leadership_governance", _DEFAULT_STATIONS, "elevated", ["manager"], "reports", ["sccif_experiences_progress", "sccif_leadership"], ["Quality Standards evidence note"]),
    ("quality_standards_evidence_note", "Quality Standards evidence note", "I", "leadership_governance", _DEFAULT_STATIONS, "elevated", ["manager"], "reports", ["quality_standards", "sccif_experiences_progress"], ["Regulation evidence tracker"]),
    ("regulation_evidence_tracker", "Regulation evidence tracker", "I", "leadership_governance", _DEFAULT_STATIONS, "elevated", ["manager", "responsible_individual"], "reports", ["records", "leadership_management"], ["Reg 44 evidence summary"]),
    ("rm_monthly_review", "Manager monthly oversight note", "I", "leadership_governance", _DEFAULT_STATIONS, "elevated", ["manager"], "records_final", ["leadership_management", "quality_purpose"], ["RI briefing"]),
    ("ri_visit_preparation", "Responsible Individual briefing", "I", "leadership_governance", _DEFAULT_STATIONS, "elevated", ["manager", "responsible_individual"], "reports", ["leadership_management", "sccif_leadership"], ["Governance review"]),
    ("staff_supervision", "Supervision preparation", "I", "leadership_governance", ["dictate", "write", "records", "templates"], "standard", ["manager", "senior"], "records_drafts", ["staff_supervision", "leadership_management"], ["Staff supervision record"]),
    ("staff_practice_concern_record", "Staff practice concern record", "I", "leadership_governance", _DEFAULT_STATIONS, "high_risk", ["manager"], "records_final", ["staff_fitness", "leadership_management"], ["Supervision", "Capability if needed"]),
    ("poor_recording_quality_reflection", "Poor recording quality reflection", "I", "leadership_governance", _DEFAULT_STATIONS, "elevated", ["manager", "senior"], "records_drafts", ["records", "leadership_management"], ["Team learning discussion"]),
    ("team_meeting_action_log", "Team meeting action log", "I", "leadership_governance", _DEFAULT_STATIONS, "standard", ["manager", "senior"], "records_drafts", ["leadership_management", "staff_supervision"], ["Audit action plan"]),
    ("audit_action_plan", "Audit action plan", "I", "leadership_governance", _DEFAULT_STATIONS, "elevated", ["manager"], "reports", ["leadership_management", "records"], ["Lessons learned review"]),
    ("lessons_learned_review", "Lessons learned review", "I", "leadership_governance", _DEFAULT_STATIONS, "elevated", ["manager"], "reports", ["leadership_management", "sccif_help_protection"], ["Improvement plan"]),
    # J — Transition, moving on and later-life
    ("transition_planning_note", "Transition planning note", "J", "transition_moving_on", _DEFAULT_STATIONS, "elevated", ["keyworker", "manager"], "records_final", ["care_planning", "quality_purpose"], ["Pathway / leaving care contribution"]),
    ("pathway_leaving_care_contribution", "Pathway / leaving care contribution", "J", "transition_moving_on", _DEFAULT_STATIONS, "elevated", ["keyworker", "manager"], "records_final", ["care_planning", "enjoyment_achievement"], ["Moving-on support plan"]),
    ("moving_on_support_plan", "Moving-on support plan", "J", "transition_moving_on", _DEFAULT_STATIONS, "elevated", ["keyworker", "manager"], "records_final", ["care_planning", "quality_purpose"], ["Final placement summary"]),
    ("final_placement_summary", "Final placement summary", "J", "transition_moving_on", _DEFAULT_STATIONS, "elevated", ["manager", "keyworker"], "records_final", ["care_planning", "quality_purpose"], ["Life story letter"]),
    ("life_story_letter", "Life story letter", "J", "transition_moving_on", ["write", "templates", "records"], "standard", ["keyworker"], "records_final", ["views_wishes_feelings", "quality_purpose"], ["Later-life record explanation"]),
    ("later_life_record_explanation", "Later-life record explanation", "J", "transition_moving_on", _DEFAULT_STATIONS, "standard", ["keyworker", "manager"], "records_final", ["views_wishes_feelings", "records"], ["Positive memory record"]),
    ("ending_support_reflection", "Ending support reflection", "J", "transition_moving_on", _CHAT_STATIONS, "standard", ["keyworker", "support_worker"], "records_drafts", ["views_wishes_feelings", "positive_relationships"], ["Final placement summary"]),
    ("positive_memory_record", "Positive memory record", "J", "transition_moving_on", _CHAT_STATIONS, "standard", ["keyworker", "support_worker"], "records_drafts", ["views_wishes_feelings", "enjoyment_achievement"], ["Life story contribution"]),
    # Communicate support pack (cross-cutting)
    ("orb_communicate_support_pack_record", "ORB Communicate support pack", "H", "communicate", _COMMUNICATE_STATIONS, "standard", ["support_worker", "keyworker"], "communicate_pack", ["views_wishes_feelings", "quality_purpose"], ["Communication reflection record"]),
]


def _build_taxonomy_registry() -> dict[str, dict[str, Any]]:
    registry: dict[str, dict[str, Any]] = {}
    for row in _TAXONOMY_SPECS:
        (
            template_id,
            title,
            group,
            family,
            stations,
            safeguarding,
            roles,
            save_dest,
            anchors,
            follow_ups,
        ) = row
        entry = {
            "template_id": template_id,
            "title": title,
            "lifecycle_group": group,
            "lifecycle_family": family,
            "lifecycle_group_label": LIFECYCLE_GROUPS[group]["label"],
            "station_availability": list(stations),
            "safeguarding_level": safeguarding,
            "who_can_use": list(roles),
            "save_destination": save_dest,
            "regulation_anchors": list(anchors),
            "suggested_follow_up_actions": list(follow_ups),
            "review_before_use_reminder": (
                "Review and adapt before use. Supports professional judgement — "
                "does not guarantee compliance or replace local policy."
            ),
            "compliance_disclaimer": (
                "Practice and evidence prompts only — not a compliance guarantee."
            ),
        }
        if template_id not in registry:
            registry[template_id] = entry
    return registry


ORB_TEMPLATE_TAXONOMY: dict[str, dict[str, Any]] = _build_taxonomy_registry()

# Unique template IDs required by full residential taxonomy (for coverage checks)
FULL_RESIDENTIAL_TAXONOMY_TEMPLATE_IDS: frozenset[str] = frozenset(ORB_TEMPLATE_TAXONOMY.keys())
