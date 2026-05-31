from __future__ import annotations

"""ORB Residential template library registry.

Standalone-safe templates for residential childcare practice. Each template
includes section prompts and cross-cutting lenses (child voice, safeguarding,
professional curiosity, evidence of impact, manager oversight, inspection).
"""

from typing import Any


def _section_prompts(heading: str) -> str:
    lower = heading.lower()
    if "child voice" in lower or "what matters" in lower:
        return "Record the child's words, presentation, wishes, feelings or what they may be communicating."
    if "impact" in lower or "outcome" in lower:
        return "Explain what changed for the child and how adults know the action made a difference."
    if "manager" in lower or "oversight" in lower or "review" in lower:
        return "Record management review, challenge, rationale, actions and follow-up date."
    if "safeguard" in lower or "escalat" in lower or "lado" in lower:
        return "Consider risk, protective factors, escalation, professional curiosity and local procedures."
    if "local" in lower or "locality" in lower or "community" in lower or "route" in lower:
        return "Use verified local knowledge only; do not invent local crime or safeguarding facts."
    if "ofsted" in lower or "sccif" in lower or "quality standard" in lower or "reg " in lower:
        return "Link to inspection evidence, Quality Standards and SCCIF themes where relevant."
    if "professional curiosity" in lower or "not yet known" in lower:
        return "What might be missing, minimised or unexplored? What would a DSL or RI ask next?"
    return "Complete factually, using child-centred and non-judgemental language."


def _template(
    *,
    template_id: str,
    title: str,
    category: str,
    purpose: str,
    audience: str,
    when_to_use: str,
    sections: list[str],
    export_options: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "id": template_id,
        "title": title,
        "category": category,
        "purpose": purpose,
        "who_it_is_for": audience,
        "when_to_use": when_to_use,
        "required_sections": sections,
        "sections": [
            {
                "heading": section,
                "prompt": _section_prompts(section),
                "placeholder": "[Complete this section]",
            }
            for section in sections
        ],
        "child_voice_prompt": "Where is the child's voice, presentation, wishes or feelings in this document?",
        "safeguarding_prompt": "What is the safeguarding meaning, escalation need and protective response?",
        "professional_curiosity_prompt": "What might be missing, minimised or unexplored by adults?",
        "evidence_of_impact_prompt": "What changed for the child and what evidence proves impact?",
        "manager_oversight_prompt": "What should a senior, registered manager or RI notice, challenge or review?",
        "ofsted_sccif_prompt": "What Quality Standards / SCCIF themes and inspection evidence does this support?",
        "export_options": export_options or ["markdown", "html", "pdf", "docx"],
        "standalone": True,
        "os_records_accessed": False,
    }


_CATEGORY_AUDIENCE: dict[str, str] = {
    "safeguarding": "Safeguarding leads, seniors, managers and multi-agency partners",
    "recording": "Residential support workers, seniors and managers",
    "care_planning": "Keyworkers, seniors, managers and placing authorities",
    "ofsted_sccif": "Registered managers, deputies and responsible individuals",
    "leadership_ri": "Registered managers, deputies and responsible individuals",
    "staff_supervision": "Seniors, managers and workforce leads",
    "locality": "Registered managers, safeguarding leads and placement teams",
    "learning_academy": "Staff, seniors, managers and training leads",
}

_TEMPLATE_SPECS: list[tuple[str, str, str, list[str]]] = [
    # Safeguarding Templates
    ("safeguarding_concern_record", "Safeguarding concern record", "safeguarding", "Document a safeguarding concern factually and child-centred.", [
        "Concern summary", "Immediate safety and welfare", "What is known", "What is not yet known",
        "Child voice and presentation", "Professional curiosity", "Escalation and notifications",
        "Manager oversight", "Follow-up and learning",
    ]),
    ("lado_referral_preparation", "LADO referral preparation", "safeguarding", "Prepare proportionate information for LADO consideration.", [
        "Allegation or concern summary", "Chronology of key events", "Child voice and impact",
        "Staff involved", "Immediate actions taken", "Information still needed", "Manager review",
    ]),
    ("strategy_meeting_preparation", "Strategy meeting preparation", "safeguarding", "Structure multi-agency strategy discussion inputs.", [
        "Purpose of meeting", "Child profile and voice", "Current risks and protective factors",
        "Agency contributions", "Questions for the meeting", "Desired outcomes", "Manager oversight",
    ]),
    ("missing_return_conversation", "Missing from care return conversation", "safeguarding", "Guide a welfare-focused return conversation.", [
        "Return circumstances", "Immediate welfare check", "Child voice and presentation",
        "Push and pull factors", "Routes, locations and contacts", "Exploitation screening",
        "Professional curiosity", "Plan updates and manager review",
    ]),
    ("exploitation_screening", "Exploitation screening", "safeguarding", "Screen for CSE/CCE/county lines indicators without overclaiming.", [
        "Presentation and behaviour", "Relationships and contacts", "Locations and routes",
        "Gifts, debts and substances", "Digital/online risk", "Child voice", "Escalation and multi-agency response",
    ]),
    ("contextual_safeguarding_assessment", "Contextual safeguarding assessment", "safeguarding", "Assess risks in places, groups and communities.", [
        "Extra-familial context", "Peer and location risks", "Online/community dynamics",
        "Protective contexts", "Multi-agency intelligence", "Child voice", "Interventions and review",
    ]),
    ("body_map_summary", "Body map summary template", "safeguarding", "Record visible injuries factually with consent and dignity.", [
        "Observation details", "Body map reference", "Child voice", "Immediate actions",
        "Photography/consent notes", "Escalation", "Manager oversight",
    ]),
    ("incident_escalation", "Incident escalation template", "safeguarding", "Escalate significant incidents with clear facts.", [
        "Incident summary", "Immediate safety", "Notifications made", "Child voice",
        "Safeguarding considerations", "Recording completed", "Manager actions", "Learning and plan impact",
    ]),
    ("allegation_chronology", "Allegation chronology", "safeguarding", "Build a clear chronology for allegation management.", [
        "Key dates and events", "Who was involved", "What was said or observed",
        "Actions taken", "Information gaps", "Manager/DSL review",
    ]),
    ("multi_agency_safeguarding_update", "Multi-agency safeguarding update", "safeguarding", "Share factual updates across agencies.", [
        "Child overview", "Current risks", "Protective factors", "Recent incidents or concerns",
        "Child voice", "Actions since last meeting", "Questions for partners", "Next steps",
    ]),
    ("child_protection_concern_summary", "Child protection concern summary", "safeguarding", "Summarise CP concerns for meetings.", [
        "Concern", "Impact on child", "Chronology highlights", "Child voice",
        "Agency involvement", "Plan and protective measures", "Outstanding questions",
    ]),
    ("professional_curiosity_checklist", "Professional curiosity checklist", "safeguarding", "Prompt deeper safeguarding thinking.", [
        "What am I seeing?", "What might I be missing?", "What is the child communicating?",
        "What patterns exist?", "What would a DSL ask?", "What evidence do I need?", "Escalation and oversight",
    ]),
    # Recording Templates
    ("daily_record", "Daily record", "recording", "Capture the child's day with voice and impact.", [
        "Date and context", "What happened", "Child voice and presentation", "Staff response",
        "Outcome and impact", "Safeguarding notes", "Manager review if needed",
    ]),
    ("incident_record", "Incident record", "recording", "Record incidents with fact/interpretation separation.", [
        "Basic details", "What happened (facts)", "Immediate response", "Child voice",
        "Injuries or damage", "Notifications", "Learning and follow-up",
    ]),
    ("significant_incident_review", "Significant incident review", "recording", "Review a significant incident for learning.", [
        "Incident summary", "Timeline", "Child experience", "Safeguarding analysis",
        "Recording quality", "Manager oversight", "Actions and plan updates",
    ]),
    ("keywork_session", "Keywork session", "recording", "Document direct work and relationship building.", [
        "Purpose of session", "Child voice", "Discussion themes", "Emotional presentation",
        "Agreed actions", "Impact on relationship/plan", "Next session",
    ]),
    ("direct_work_summary", "Direct work summary", "recording", "Summarise direct work activity.", [
        "Aim of work", "Methods used", "Child voice", "Observations",
        "Progress", "Safeguarding notes", "Next steps",
    ]),
    ("manager_review_note", "Manager review", "recording", "Manager review of records or incidents.", [
        "Record/incident reviewed", "Strengths", "Gaps and queries", "Child voice check",
        "Safeguarding/oversight", "Required actions", "Review date",
    ]),
    ("staff_debrief_record", "Staff debrief", "recording", "Debrief staff after significant events.", [
        "Event summary", "Staff impact", "Practice strengths", "Concerns raised",
        "Safeguarding reflections", "Support offered", "Actions",
    ]),
    ("child_debrief", "Child debrief", "recording", "Document restorative conversation with child.", [
        "Purpose", "Child voice", "What was discussed", "Emotional response",
        "Repair/agreements", "Follow-up",
    ]),
    ("chronology_entry", "Chronology entry", "recording", "Add a precise chronology entry.", [
        "Date/time", "Event (facts)", "Source", "Child voice", "Significance", "Linked records",
    ]),
    ("handover_note", "Handover note", "recording", "Hand over shift information clearly.", [
        "Children overview", "Key events", "Risks and triggers", "Medication/health",
        "Safeguarding flags", "Tasks for next shift", "Manager instructions",
    ]),
    ("reflective_recording", "Reflective recording template", "recording", "Reflect on practice with child-centred learning.", [
        "Situation", "Thoughts and feelings", "Child experience lens", "What went well",
        "What to improve", "Learning and supervision needs",
    ]),
    # Care Planning Templates
    ("care_plan", "Care plan", "care_planning", "Child-centred care plan structure.", [
        "About the child", "What matters to the child", "Needs and strengths",
        "Daily support", "Relationships", "Safeguarding and risk", "Education and health",
        "Family time", "Child voice and participation", "Review and evidence of impact",
    ]),
    ("placement_plan", "Placement plan", "care_planning", "Plan placement-specific support.", [
        "Placement purpose", "Matching rationale", "Daily routines", "Risk and safeguarding",
        "Contact arrangements", "Review dates",
    ]),
    ("risk_assessment", "Risk assessment", "care_planning", "Dynamic risk assessment for the child.", [
        "Identified risks", "Triggers and context", "Protective factors", "Controls in place",
        "Child voice", "Staff response plan", "Escalation", "Review and evidence of impact",
    ]),
    ("behaviour_support_plan", "Behaviour support plan", "care_planning", "Therapeutic behaviour support planning.", [
        "Understanding behaviour", "Triggers", "Proactive strategies", "Reactive strategies",
        "Child voice", "Restrictive practice boundaries", "Review",
    ]),
    ("missing_from_care_plan", "Missing from care plan", "care_planning", "Plan for missing-from-care risk.", [
        "Risk factors", "Triggers and patterns", "Preventive strategies", "Return interview approach",
        "Routes and hotspots", "Multi-agency contacts", "Review",
    ]),
    ("exploitation_risk_plan", "Exploitation risk plan", "care_planning", "Plan responses to exploitation risk.", [
        "Indicators and context", "Relationships and contacts", "Locations/routes",
        "Digital risk", "Interventions", "Multi-agency plan", "Review",
    ]),
    ("health_plan", "Health plan", "care_planning", "Coordinate health and wellbeing support.", [
        "Health needs", "Appointments and actions", "Medication", "Consent/LAC health",
        "Child voice", "Review",
    ]),
    ("medication_support_plan", "Medication support plan", "care_planning", "Support safe medication practice.", [
        "Prescribed medication", "Administration", "Monitoring", "Missed dose protocol",
        "Communication with health", "Review",
    ]),
    ("education_plan", "Education plan", "care_planning", "Support education and PEP alignment.", [
        "Current provision", "Attendance", "SEND needs", "PEP actions",
        "Child voice", "Review",
    ]),
    ("family_time_plan", "Family time plan", "care_planning", "Plan family time safely and meaningfully.", [
        "Purpose of contact", "Arrangements", "Preparation and debrief", "Child voice",
        "Risk considerations", "Review",
    ]),
    ("independence_plan", "Independence plan", "care_planning", "Support preparation for independence.", [
        "Skills focus", "Daily living", "Safety and boundaries", "Child voice", "Review",
    ]),
    ("safety_plan", "Safety plan", "care_planning", "Immediate safety planning.", [
        "Current risks", "Warning signs", "Child and staff actions", "Safe adults/places",
        "Escalation", "Review",
    ]),
    ("emotional_wellbeing_plan", "Emotional wellbeing plan", "care_planning", "Support emotional health.", [
        "Presentation and needs", "Regulation strategies", "Relationships", "Therapeutic input",
        "Child voice", "Review",
    ]),
    # Ofsted / SCCIF Templates
    ("ofsted_readiness_review", "Ofsted readiness review", "ofsted_sccif", "Prepare inspection readiness thinking.", [
        "Home profile", "Strengths", "Gaps and risks", "Child experience evidence",
        "Safeguarding evidence", "Workforce evidence", "Leadership evidence", "Actions",
    ]),
    ("sccif_evidence_tracker", "SCCIF evidence tracker", "ofsted_sccif", "Track SCCIF-aligned evidence.", [
        "SCCIF theme", "What good looks like", "Current evidence", "Gaps",
        "Actions", "Owner", "Review date",
    ]),
    ("quality_standards_audit", "Quality Standards audit", "ofsted_sccif", "Audit against Quality Standards.", [
        "Standard", "Evidence seen", "Impact on children", "Gaps", "Improvement actions",
    ]),
    ("reg44_action_tracker", "Reg 44 action tracker", "ofsted_sccif", "Track Reg 44 visit actions.", [
        "Visit date", "Theme", "Finding", "Action", "Owner", "Due date", "Evidence of completion",
    ]),
    ("reg45_quality_review", "Reg 45 quality of care review", "ofsted_sccif", "Structure Reg 45 quality review.", [
        "Scope", "Child experience findings", "Safeguarding", "Care planning",
        "Workforce", "Leadership", "Recommendations",
    ]),
    ("leadership_evidence_summary", "Leadership evidence summary", "ofsted_sccif", "Summarise leadership impact evidence.", [
        "Leadership actions", "Oversight systems", "Impact on children", "Improvement trajectory",
    ]),
    ("child_experience_evidence_tracker", "Child experience evidence tracker", "ofsted_sccif", "Track child experience evidence.", [
        "Theme", "Examples", "Child voice", "Impact", "Gaps",
    ]),
    ("workforce_evidence_tracker", "Workforce evidence tracker", "ofsted_sccif", "Track workforce quality evidence.", [
        "Training/supervision", "Safer recruitment", "Staff stability", "Practice quality", "Gaps",
    ]),
    ("safeguarding_evidence_tracker", "Safeguarding evidence tracker", "ofsted_sccif", "Track safeguarding evidence.", [
        "Culture", "Incidents and learning", "Partnerships", "Child voice in safeguarding", "Gaps",
    ]),
    ("impact_evidence_tracker", "Impact evidence tracker", "ofsted_sccif", "Track evidence of impact.", [
        "Intervention", "Expected change", "Evidence seen", "Child voice", "Next steps",
    ]),
    # Leadership / RI Templates
    ("rm_monthly_review", "Registered Manager monthly review", "leadership_ri", "Monthly RM quality review.", [
        "Month overview", "Safeguarding themes", "Incidents and missing", "Child experience",
        "Workforce", "Regulatory actions", "Improvement priorities",
    ]),
    ("ri_visit_preparation", "RI visit preparation", "leadership_ri", "Prepare for RI visit.", [
        "Visit focus", "Evidence pack", "Known risks", "Questions anticipated",
        "Actions since last visit",
    ]),
    ("ri_challenge_log", "RI challenge log", "leadership_ri", "Log RI challenges and responses.", [
        "Challenge", "Evidence reviewed", "Provider response", "Impact on children", "Follow-up",
    ]),
    ("governance_review", "Governance review", "leadership_ri", "Provider governance review.", [
        "Oversight themes", "Performance data", "Safeguarding assurance", "Improvement plan status",
    ]),
    ("quality_assurance_summary", "Quality assurance summary", "leadership_ri", "Summarise QA activity.", [
        "Audits completed", "Strengths", "Non-compliance", "Actions", "Impact",
    ]),
    ("improvement_plan", "Improvement plan", "leadership_ri", "Structure service improvement.", [
        "Priority", "Root cause", "Actions", "Owner", "Timescale", "Success measures",
    ]),
    ("provider_oversight_report", "Provider oversight report", "leadership_ri", "Report provider oversight.", [
        "Homes in scope", "Themes", "Risks", "Support provided", "Escalations",
    ]),
    ("escalation_tracker", "Escalation tracker", "leadership_ri", "Track escalations and outcomes.", [
        "Issue", "Escalated to", "Date", "Response", "Outcome", "Learning",
    ]),
    ("supervision_quality_review", "Supervision quality review", "leadership_ri", "Review supervision quality.", [
        "Sample reviewed", "Strengths", "Gaps", "Safeguarding coverage", "Actions",
    ]),
    ("workforce_risk_review", "Workforce risk review", "leadership_ri", "Review workforce-related risks.", [
        "Staffing pressures", "Training gaps", "Conduct concerns", "Mitigations", "Actions",
    ]),
    # Staff / Supervision Templates
    ("staff_supervision", "Staff supervision", "staff_supervision", "Structure staff supervision.", [
        "Focus of supervision", "Practice discussed", "Emotional impact", "Safeguarding reflections",
        "Learning", "Agreed actions", "Next date",
    ]),
    ("reflective_supervision", "Reflective supervision", "staff_supervision", "Reflective supervision record.", [
        "Experience explored", "Feelings", "Practice analysis", "Child impact",
        "Learning", "Support needed", "Actions",
    ]),
    ("probation_review", "Probation review", "staff_supervision", "Probation period review.", [
        "Standards met", "Development areas", "Safeguarding competence", "Plan", "Decision",
    ]),
    ("competency_review", "Competency review", "staff_supervision", "Review staff competency.", [
        "Competency area", "Evidence", "Gaps", "Development plan", "Review date",
    ]),
    ("training_needs_analysis", "Training needs analysis", "staff_supervision", "Identify training needs.", [
        "Role", "Current strengths", "Gaps", "Recommended training", "Timescale",
    ]),
    ("staff_debrief_supervision", "Staff debrief", "staff_supervision", "Debrief after events (supervision).", [
        "Event", "Impact on staff", "Practice review", "Learning", "Support/actions",
    ]),
    ("practice_observation", "Practice observation", "staff_supervision", "Record practice observation.", [
        "Observed practice", "Strengths", "Development points", "Child impact", "Feedback given",
    ]),
    ("team_culture_reflection", "Team culture reflection", "staff_supervision", "Reflect on team culture.", [
        "Observed culture", "Impact on children", "Strengths", "Risks", "Actions",
    ]),
    ("safer_recruitment_checklist", "Safer recruitment checklist", "staff_supervision", "Safer recruitment checks.", [
        "Role", "Checks completed", "References", "Interview safeguards", "Decision",
    ]),
    ("induction_review", "Induction review", "staff_supervision", "Review staff induction.", [
        "Induction topics covered", "Competence", "Safeguarding understanding", "Further support",
    ]),
    # Locality / Community Risk Templates
    ("locality_risk_assessment", "Locality risk assessment", "locality", "Assess risks around the home locality.", [
        "Local area profile", "Transport routes", "Missing-from-care risks", "Exploitation risks",
        "Unknown adult/vehicle risks", "Online/digital risks", "Risky locations/hotspots",
        "Protective locations", "Community strengths", "Local safeguarding contacts",
        "Escalation arrangements", "Manager review", "Evidence of impact", "Review frequency",
    ]),
    ("community_risk_assessment", "Community risk assessment", "locality", "Assess community-based risks.", [
        "Community context", "Peer groups", "Locations", "Protective factors", "Actions",
    ]),
    ("transport_route_risk", "Transport route risk assessment", "locality", "Assess transport/route risks.", [
        "Routes used", "Risk points", "Protective measures", "Staff guidance", "Review",
    ]),
    ("missing_route_analysis", "Missing route analysis", "locality", "Analyse missing routes and patterns.", [
        "Known routes", "Hotspots", "Triggers", "Intelligence shared", "Plan updates",
    ]),
    ("hotspot_review", "Hotspot review", "locality", "Review location hotspots.", [
        "Location", "Concerns", "Incidents linked", "Multi-agency intel", "Actions",
    ]),
    ("contextual_safeguarding_map", "Contextual safeguarding map", "locality", "Map contextual risks.", [
        "Settings", "Groups", "Online contexts", "Risks", "Interventions",
    ]),
    ("local_authority_risk_summary", "Local authority risk summary", "locality", "Summarise LA-level risks.", [
        "Area profile", "Known themes", "Partnership contacts", "Implications for home",
    ]),
    ("police_community_intelligence_summary", "Police/community intelligence summary", "locality", "Summarise shared intelligence.", [
        "Source", "Intelligence summary", "Implications", "Actions", "Sharing boundaries",
    ]),
    ("online_community_risk_assessment", "Online/community risk assessment", "locality", "Assess online and community risks.", [
        "Online activity", "Platforms/contacts", "Community dynamics", "Protective factors", "Actions",
    ]),
    # Learning / Academy Templates
    ("micro_learning_session", "Micro-learning session", "learning_academy", "Five-minute team learning.", [
        "Learning objective", "Key messages", "Practice example", "Discussion questions", "Check understanding",
    ]),
    ("knowledge_check", "Knowledge check", "learning_academy", "Short knowledge check.", [
        "Topic", "Questions", "Expected answers", "Common mistakes", "Further learning",
    ]),
    ("reflective_learning_log", "Reflective learning log", "learning_academy", "Log reflective learning.", [
        "Experience", "Analysis", "Learning", "Application to practice", "Evidence for CPD",
    ]),
    ("practice_scenario", "Practice scenario", "learning_academy", "Scenario-based learning.", [
        "Scenario", "Discussion prompts", "Safeguarding lens", "Recording lens", "Debrief",
    ]),
    ("competency_evidence", "Competency evidence", "learning_academy", "Capture competency evidence.", [
        "Competency", "Practice described", "Reflection", "Manager/assessor comment",
    ]),
    ("cpd_note", "CPD note", "learning_academy", "Record CPD activity.", [
        "Activity", "Learning gained", "Application", "Time spent", "Evidence",
    ]),
    ("team_learning_discussion", "Team learning discussion", "learning_academy", "Facilitate team discussion.", [
        "Topic", "Prompts", "Ground rules", "Capture learning", "Actions",
    ]),
    ("learning_from_ofsted_report", "Learning from Ofsted report", "learning_academy", "Learn from inspection reports.", [
        "Theme from report", "Relevance to our practice", "What we do well", "Improvement actions",
    ]),
    ("learning_from_safeguarding_review", "Learning from safeguarding review", "learning_academy", "Learn from safeguarding reviews.", [
        "Review theme", "Practice implications", "Recording implications", "Leadership actions",
    ]),
]


def _build_registry() -> dict[str, dict[str, Any]]:
    registry: dict[str, dict[str, Any]] = {}
    for spec in _TEMPLATE_SPECS:
        template_id, title, category, purpose, sections = spec
        registry[template_id] = _template(
            template_id=template_id,
            title=title,
            category=category,
            purpose=purpose,
            audience=_CATEGORY_AUDIENCE.get(category, "Residential childcare professionals"),
            when_to_use=f"Use when preparing or completing: {title.lower()}.",
            sections=sections,
        )
    return registry


ORB_TEMPLATE_REGISTRY: dict[str, dict[str, Any]] = _build_registry()

ORB_TEMPLATE_CATEGORIES: list[dict[str, Any]] = [
    {"id": "safeguarding", "label": "Safeguarding Templates", "count": sum(1 for t in ORB_TEMPLATE_REGISTRY.values() if t["category"] == "safeguarding")},
    {"id": "recording", "label": "Recording Templates", "count": sum(1 for t in ORB_TEMPLATE_REGISTRY.values() if t["category"] == "recording")},
    {"id": "care_planning", "label": "Care Planning Templates", "count": sum(1 for t in ORB_TEMPLATE_REGISTRY.values() if t["category"] == "care_planning")},
    {"id": "ofsted_sccif", "label": "Ofsted / SCCIF Templates", "count": sum(1 for t in ORB_TEMPLATE_REGISTRY.values() if t["category"] == "ofsted_sccif")},
    {"id": "leadership_ri", "label": "Leadership / RI Templates", "count": sum(1 for t in ORB_TEMPLATE_REGISTRY.values() if t["category"] == "leadership_ri")},
    {"id": "staff_supervision", "label": "Staff / Supervision Templates", "count": sum(1 for t in ORB_TEMPLATE_REGISTRY.values() if t["category"] == "staff_supervision")},
    {"id": "locality", "label": "Locality / Community Risk Templates", "count": sum(1 for t in ORB_TEMPLATE_REGISTRY.values() if t["category"] == "locality")},
    {"id": "learning_academy", "label": "Learning / Academy Templates", "count": sum(1 for t in ORB_TEMPLATE_REGISTRY.values() if t["category"] == "learning_academy")},
]


class OrbTemplateLibraryRegistry:
    def list_templates(
        self,
        *,
        category: str | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        items = list(ORB_TEMPLATE_REGISTRY.values())
        if category:
            items = [t for t in items if t["category"] == category]
        if search:
            q = search.lower()
            items = [
                t
                for t in items
                if q in t["title"].lower() or q in t["purpose"].lower() or q in t["id"]
            ]
        return [
            {
                "id": t["id"],
                "title": t["title"],
                "category": t["category"],
                "purpose": t["purpose"],
                "who_it_is_for": t["who_it_is_for"],
                "when_to_use": t["when_to_use"],
                "section_count": len(t["required_sections"]),
                "export_options": t["export_options"],
            }
            for t in sorted(items, key=lambda x: (x["category"], x["title"]))
        ]

    def get_template(self, template_id: str) -> dict[str, Any] | None:
        return ORB_TEMPLATE_REGISTRY.get(template_id)

    def categories(self) -> list[dict[str, Any]]:
        return ORB_TEMPLATE_CATEGORIES

    def resolve_template_id(self, message: str) -> str | None:
        text = (message or "").lower()
        wants_template = "template" in text or "create a" in text or "generate" in text
        for template_id, template in ORB_TEMPLATE_REGISTRY.items():
            slug = template_id.replace("_", " ")
            if slug in text:
                return template_id
            title = template["title"].lower()
            if wants_template and title in text:
                return template_id
        aliases = {
            "missing from care return": "missing_return_conversation",
            "locality risk": "locality_risk_assessment",
            "daily note": "daily_record",
            "lado": "lado_referral_preparation",
        }
        for phrase, tid in aliases.items():
            if phrase in text:
                return tid
        return None


orb_template_library_registry = OrbTemplateLibraryRegistry()
