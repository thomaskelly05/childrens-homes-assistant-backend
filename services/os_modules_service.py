from __future__ import annotations

from datetime import datetime
from typing import Any


class OSModulesService:
    """Defines the full IndiCare OS information architecture.

    This gives the frontend and assistant one consistent source of truth for the
    operating system modules: child journey, staff journey, documents,
    safeguarding, audits, inspection readiness and QA.
    """

    def modules(self) -> dict[str, Any]:
        return {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "modules": [
                self.child_journey(),
                self.staff_journey(),
                self.documents(),
                self.safeguarding(),
                self.quality_and_inspection(),
                self.workforce(),
                self.rostering(),
                self.academy(),
                self.assistant(),
            ],
            "home_screen": {
                "primary_route": "/os-dashboard",
                "young_people_route": "/young-people-shell",
                "staff_route": "/staff-profiles",
                "documents_route": "/documents-hub",
                "safeguarding_route": "/safeguarding-hub",
                "quality_route": "/quality-hub",
            },
        }

    def child_journey(self) -> dict[str, Any]:
        return {
            "key": "child_journey",
            "title": "Child's Journey",
            "description": "Referral to impact assessment, admission, living in the home, reviews, transition and leaving care.",
            "route": "/young-people-shell",
            "stages": [
                "Referral received",
                "Matching and impact assessment",
                "Placement planning",
                "Admission and welcome",
                "Settling-in review",
                "Daily lived experience",
                "Health, education and family time",
                "Keywork and direct work",
                "Risk and safeguarding review",
                "Statutory reviews and care planning",
                "Independence and transition",
                "Leaving the home",
                "Post-placement reflection",
            ],
            "record_types": [
                "referral",
                "impact_assessment",
                "matching_decision",
                "placement_plan",
                "admission_record",
                "settling_in_review",
                "daily_note",
                "incident",
                "health_record",
                "education_record",
                "family_time_record",
                "keywork_session",
                "direct_work_session",
                "risk_assessment",
                "safeguarding_record",
                "statutory_review",
                "independence_plan",
                "transition_plan",
                "exit_summary",
            ],
        }

    def staff_journey(self) -> dict[str, Any]:
        return {
            "key": "staff_journey",
            "title": "Staff Journey",
            "description": "Application, safer recruitment, onboarding, induction, probation, supervision, appraisal, development and exit.",
            "route": "/staff-profiles",
            "stages": [
                "Application",
                "Interview",
                "Safer recruitment checks",
                "Offer and contract",
                "Onboarding",
                "Induction",
                "Probation",
                "Active employment",
                "Supervision",
                "Appraisal",
                "Competency observations",
                "Training and Academy",
                "Capability or support plan",
                "Exit interview",
                "Leaver review",
            ],
            "record_types": [
                "application_record",
                "interview_record",
                "safer_recruitment_checklist",
                "dbs_check",
                "reference_check",
                "right_to_work_check",
                "contract_record",
                "onboarding_checklist",
                "induction_checklist",
                "probation_review",
                "supervision_record",
                "appraisal_record",
                "competency_observation",
                "training_record",
                "return_to_work_record",
                "capability_record",
                "disciplinary_record",
                "exit_interview",
            ],
        }

    def documents(self) -> dict[str, Any]:
        return {
            "key": "documents",
            "title": "Documents Hub",
            "description": "One designated home and young person document space with evidence, versions and review dates.",
            "route": "/documents-hub",
            "areas": [
                "Home documents",
                "Young person documents",
                "Staff documents",
                "Policies and procedures",
                "Evidence library",
                "Inspection evidence",
                "Archived documents",
            ],
            "record_types": [
                "home_document",
                "young_person_document",
                "staff_document",
                "policy_document",
                "procedure_document",
                "evidence_item",
                "document_review",
                "document_version",
            ],
        }

    def safeguarding(self) -> dict[str, Any]:
        return {
            "key": "safeguarding",
            "title": "Safeguarding Hub",
            "description": "Track concerns, notifications, allegations, LADO, missing, body maps and safeguarding chronology.",
            "route": "/safeguarding-hub",
            "areas": [
                "Safeguarding tracker",
                "Notifications tracker",
                "Allegations and LADO",
                "Missing from home",
                "Physical intervention and restraint",
                "Injuries and body maps",
                "Police, EDT and social worker contacts",
                "Safeguarding chronology",
            ],
            "record_types": [
                "safeguarding_concern",
                "ofsted_notification",
                "placing_authority_notification",
                "lado_referral",
                "allegation_record",
                "missing_from_home_record",
                "return_home_interview",
                "body_map",
                "injury_record",
                "disclosure_record",
                "restraint_record",
                "physical_intervention_record",
                "police_contact",
                "edt_contact",
                "social_worker_contact",
            ],
        }

    def quality_and_inspection(self) -> dict[str, Any]:
        return {
            "key": "quality_and_inspection",
            "title": "Quality, Audits and Inspection",
            "description": "Reg 44, Reg 45, audits, QA actions, Ofsted readiness and leadership oversight.",
            "route": "/quality-hub",
            "areas": [
                "Reg 44 visits",
                "Reg 45 reviews",
                "Ofsted readiness",
                "Internal audits",
                "Quality assurance actions",
                "Leadership oversight",
                "SCCIF evidence",
                "Quality Standards mapping",
            ],
            "record_types": [
                "reg44_visit",
                "reg44_action",
                "reg45_review",
                "reg45_action",
                "internal_audit",
                "qa_action",
                "ofsted_readiness_check",
                "leadership_oversight_log",
                "sccif_evidence_item",
                "quality_standard_evidence",
            ],
        }

    def workforce(self) -> dict[str, Any]:
        return {
            "key": "workforce",
            "title": "Workforce Oversight",
            "description": "Team risk, supervision, training, competency and safer staffing intelligence.",
            "route": "/staff-profiles",
            "record_types": ["staff_profile", "staff_action", "staff_today", "competency_evidence", "supervision_record"],
        }

    def rostering(self) -> dict[str, Any]:
        return {
            "key": "rostering",
            "title": "Rostering and Safe Staffing",
            "description": "Shifts, check-ins, staffing safety, role cover and training validity.",
            "route": "/rostering",
            "record_types": ["roster_shift", "roster_assignment", "staff_checkin", "safe_staffing_warning"],
        }

    def academy(self) -> dict[str, Any]:
        return {
            "key": "academy",
            "title": "Academy",
            "description": "Training, evidence portfolios, qualifications and workforce development.",
            "route": "/academy",
            "record_types": ["training_module", "training_assignment", "evidence_portfolio", "certificate", "qualification"],
        }

    def assistant(self) -> dict[str, Any]:
        return {
            "key": "assistant",
            "title": "IndiCare Assistant",
            "description": "Operational co-pilot for summaries, inspection, safeguarding and next actions.",
            "route": "/assistant",
            "record_types": ["assistant_conversation", "assistant_context", "assistant_summary"],
        }
