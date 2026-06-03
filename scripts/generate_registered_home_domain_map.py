#!/usr/bin/env python3
"""Generate assistant/knowledge/indicare_registered_home_domain_map.json (55 domains)."""

from __future__ import annotations

import json
import os

DOMAINS = [
    ("admission_and_matching", "Admission and matching", "Matching, referrals, readiness and safe admission."),
    ("statement_of_purpose", "Statement of Purpose", "Home purpose, ethos and regulatory statement alignment."),
    ("childrens_guide", "Children's guide", "Accessible information for children about the home."),
    ("child_profile_story", "Child profile/story", "Lived narrative, identity and known history."),
    ("placement_plan", "Placement plan", "Placement agreement, duties and review triggers."),
    ("care_planning", "Care planning", "Holistic care plans, goals and review."),
    ("risk_assessment", "Risk assessment", "Dynamic risk identification and mitigation."),
    ("behaviour_support", "Behaviour support", "Behaviour as communication and support plans."),
    ("missing_from_home", "Missing from home", "Missing episodes, return and pattern thinking."),
    ("exploitation_cse_cce", "Exploitation/CSE/CCE/county lines", "Contextual safeguarding and exploitation indicators."),
    ("allegations_lado", "Allegations and LADO", "Allegations against adults and LADO pathways."),
    ("safeguarding_referrals", "Safeguarding referrals", "Referrals, thresholds and multi-agency response."),
    ("self_harm_suicide", "Self-harm/suicide risk", "Self-harm, suicidal ideation and safety planning."),
    ("health", "Health", "Physical health, GP and health plans."),
    ("mental_health_camhs", "Mental health/CAMHS/crisis", "Mental health support and crisis pathways."),
    ("medication_mar_prn", "Medication/MAR/PRN/errors", "Medication administration and error response."),
    ("education_attendance_pep", "Education/attendance/PEP", "Education, attendance and personal education plans."),
    ("send_ehcp_autism", "SEND/EHCP/autism/GDD", "SEND needs and specialist support."),
    ("family_time_contact", "Family time/contact", "Contact arrangements and relationship support."),
    ("identity_culture_religion", "Identity/culture/religion/belonging", "Identity, culture and belonging."),
    ("advocacy_complaints", "Advocacy/complaints", "Advocacy routes and complaints handling."),
    ("childrens_rights", "Children's rights", "Rights, participation and dignity."),
    ("positive_relationships", "Positive relationships", "Relational practice and repair."),
    ("restorative_practice", "Restorative practice/repair", "Repair after conflict or harm."),
    ("restraint_restrictive", "Restraint/physical intervention/restrictive practice", "Restrictive practice governance."),
    ("police_involvement", "Police involvement", "Police contact, crime and missing protocols."),
    ("emergency_services", "Emergency services", "999, ambulance and emergency response."),
    ("online_safety", "Online safety/devices/image sharing/grooming", "Digital safeguarding."),
    ("bullying_peer_risk", "Bullying/peer risk", "Peer-on-peer harm and group dynamics."),
    ("transitions_discharge", "Transitions/discharge/independence", "Moves, discharge and independence."),
    ("staff_conduct_safer_caring", "Staff conduct/safer caring", "Boundaries, conduct and safer caring."),
    ("safer_recruitment_dbs", "Safer recruitment/DBS/references", "Recruitment and suitability checks."),
    ("supervision_training", "Supervision/training/workforce competence", "Supervision and competence."),
    ("rota_staffing", "Rota/staffing levels/agency staff", "Staffing sufficiency and agency use."),
    ("manager_oversight", "Manager oversight", "Registered manager oversight and action."),
    ("ri_governance", "Responsible Individual governance", "Provider governance and assurance."),
    ("provider_drift", "Provider-level drift", "Drift, repeat weakness and improvement."),
    ("regulation_40", "Regulation 40 notifications", "Statutory notifications to Ofsted."),
    ("regulation_44", "Regulation 44 visits", "Independent person visits."),
    ("regulation_45", "Regulation 45 quality of care review", "Quality of care reviews."),
    ("ofsted_sccif", "Ofsted SCCIF", "Inspection framework and evidence."),
    ("document_readiness", "Document readiness", "Records and document quality for review."),
    ("chronology", "Chronology", "Chronological evidence and pattern."),
    ("handover_communication", "Handover/communication", "Shift handover and communication."),
    ("premises_fire_hs", "Premises/fire/H&S", "Premises safety and health and safety."),
    ("data_protection_sharing", "Data protection/information sharing", "GDPR and lawful sharing."),
    ("lscp_local_procedures", "LSCP/local procedures", "Local safeguarding partnership procedures."),
    ("social_worker_iro", "Social worker/IRO/placing authority", "Statutory partners and reviews."),
    ("parent_person_pr", "Parent/person with PR", "Parental responsibility and contact."),
    ("commissioner_la_oversight", "Commissioner/local authority oversight", "Commissioning and placement oversight."),
    ("finance_pocket_money", "Finance/pocket money/possessions", "Money, possessions and fairness."),
    ("food_nutrition_care", "Food/nutrition/clothing/personal care", "Daily care and dignity."),
    ("transport_community", "Transport/community access", "Community access and transport risk."),
    ("visitors_unauthorised_contact", "Visitors/unauthorised contact", "Visitors and unauthorised contact."),
    ("night_routines_sleep", "Night-time routines/sleep/bedroom safety", "Sleep, night routines and bedroom safety."),
]


def _triggers(domain_id: str, name: str) -> list[str]:
    base = domain_id.replace("_", " ").split()
    words = [w for w in name.lower().replace("/", " ").replace("-", " ").split() if len(w) > 3]
    extra: dict[str, list[str]] = {
        "missing_from_home": ["missing", "absent", "awol", "return home", "rhi"],
        "allegations_lado": ["allegation", "lado", "hurt me", "staff conduct"],
        "self_harm_suicide": ["self-harm", "self harm", "suicide", "cuts"],
        "restraint_restrictive": ["restraint", "physical intervention", "held"],
        "exploitation_cse_cce": ["exploit", "cse", "cce", "county lines", "cannabis"],
        "ofsted_sccif": ["ofsted", "sccif", "inspection"],
        "general_shift_support": ["what do i do", "on shift", "help", "not sure"],
    }
    return list(dict.fromkeys((extra.get(domain_id) or words[:4]) + base[:2]))


def _domain(domain_id: str, name: str, description: str) -> dict:
    trig = _triggers(domain_id, name)
    return {
        "domain_id": domain_id,
        "name": name,
        "description": description,
        "triggers": trig,
        "quality_standards": ["qs7_protection"] if "safeguard" in domain_id or "missing" in domain_id else ["qs1_quality_and_purpose"],
        "professional_lenses": ["registered_manager", "residential_support_worker"],
        "records_to_check": ["daily_record", "incident", "risk_assessment", "care_plan"],
        "evidence_markers": ["child_voice", "adult_action", "follow_up", "manager_oversight"],
        "risk_markers": ["immediate_safety", "pattern", "escalation"],
        "common_gaps": ["missing child voice", "no manager review", "unclear escalation"],
        "trusted_source_needs": ["dfe_childrens_homes_regulations_guide", "working_together_safeguarding"],
        "minimum_answer_requirements": [
            "immediate safety where relevant",
            "what to record",
            "who to inform",
            "what ORB cannot decide",
        ],
        "related_services": [
            "orb_residential_brain_catalog_service",
            "orb_institutional_depth_frame_service",
            "orb_quality_standards_brain_service",
        ],
        "scenario_tests": [f"{domain_id}_smoke"],
        "adult_needs_to_know": [
            f"Adults need clear, practical guidance on {name.lower()}.",
            "Separate facts from assumptions; do not invent case details.",
        ],
        "answer_lens": ["Start with safest practical next step.", "Use plain shift-ready language."],
        "evidence_questions": ["What happened?", "Who knows?", "What was recorded?", "What changed?"],
        "boundaries": ["No statutory threshold decisions.", "No diagnosis or grade prediction."],
    }


def main() -> None:
    out_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "assistant",
        "knowledge",
        "indicare_registered_home_domain_map.json",
    )
    payload = {
        "version": "indicare_intelligence_10",
        "domain_count": len(DOMAINS),
        "domains": [_domain(did, name, desc) for did, name, desc in DOMAINS],
    }
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"Wrote {len(DOMAINS)} domains to {out_path}")


if __name__ == "__main__":
    main()
