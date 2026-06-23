"""Default structured component assignments for key ORB templates.

Maps canonical template IDs to sections, tables, charts and home document context.
Uses orb_template_library_registry — no duplicate template definitions.
"""

from __future__ import annotations

from typing import Any

from schemas.orb_template_working_document import OrbTemplateChartType, OrbTemplateTableType

# Table column presets by table type
TABLE_COLUMN_PRESETS: dict[str, list[str]] = {
    "action_plan_table": ["Action", "Owner", "Due date", "Status", "Evidence"],
    "risk_matrix_table": ["Risk", "Likelihood", "Impact", "Mitigation", "Owner"],
    "chronology_table": ["Date/time", "Event", "Who was involved", "Source", "Notes"],
    "evidence_tracker_table": ["Theme", "Evidence", "Gap", "Owner", "Review date"],
    "audit_checklist_table": ["Item", "Compliant?", "Evidence", "Action needed"],
    "medication_audit_table": ["Medication", "MAR checked", "Issue", "Action", "Owner"],
    "incident_review_table": ["Date", "Incident type", "Theme", "Learning", "Action"],
    "supervision_action_table": ["Action", "From supervision", "Owner", "Due", "Complete"],
    "complaints_tracker_table": ["Complaint ref", "Theme", "Stage", "Response", "Outcome"],
    "education_progress_table": ["Area", "Progress", "Barrier", "Support", "Review"],
    "health_appointments_table": ["Appointment", "Date", "Attended?", "Outcome", "Follow-up"],
    "missing_from_care_tracker": ["Episode date", "Duration", "Return circumstances", "Risk update"],
    "reg_44_evidence_table": ["Visit date", "Theme", "Finding", "Action", "Evidence"],
    "reg_45_action_table": ["Action", "From Reg 45 review", "Owner", "Due", "Status"],
    "sccif_evidence_tracker": ["Judgement area", "Evidence", "Child impact", "Gap", "Action"],
    "staff_training_tracker": ["Training", "Staff", "Due", "Completed", "Competency"],
    "location_risk_table": ["Location/route", "Risk", "Protective factor", "Mitigation"],
    "home_document_reference_table": ["Home document", "Relevant section", "How used", "Reviewed by"],
}

# Chart empty-state guidance
CHART_EMPTY_GUIDANCE: dict[str, str] = {
    "incident_trend_line_chart": "Add incident dates and themes to the chronology table to plot trends.",
    "missing_episode_trend_chart": "Add missing episode data to the tracker table to show trends.",
    "restraint_frequency_chart": "Add restraint episode data before generating frequency charts.",
    "medication_error_trend_chart": "Add medication error records to the audit table for trend analysis.",
    "complaint_theme_bar_chart": "Add complaint themes to the tracker table to visualise patterns.",
    "supervision_completion_chart": "Add supervision completion data to the action tracker.",
    "training_completion_chart": "Add training completion rows to the staff training tracker.",
    "reg_45_action_completion_chart": "Add Reg 45 actions with status to show completion progress.",
    "audit_score_chart": "Add audit scores to the checklist table for score visualisation.",
    "placement_stability_timeline": "Add placement events to the chronology table for stability timeline.",
    "education_attendance_chart": "Add attendance data to the education progress table.",
    "health_appointment_completion_chart": "Add appointment attendance to the health appointments table.",
    "safeguarding_theme_chart": "Add safeguarding themes to evidence or incident tables.",
}

# Home document type allowances by template category / template id
TEMPLATE_HOME_DOCUMENT_TYPES: dict[str, list[str]] = {
    "reg45_quality_review": [
        "statement_of_purpose",
        "safeguarding_policy",
        "missing_from_care_policy",
        "medication_policy",
        "physical_intervention_policy",
    ],
    "reg44_action_tracker": ["statement_of_purpose", "safeguarding_policy"],
    "sccif_evidence_tracker": [
        "statement_of_purpose",
        "safeguarding_policy",
        "staff_supervision_policy",
    ],
    "locality_risk_assessment": ["statement_of_purpose", "risk_assessment"],
    "staff_supervision": ["staff_supervision_policy"],
    "medication_error_record": ["medication_policy"],
    "medication_refusal_record": ["medication_policy"],
    "physical_intervention_record": ["physical_intervention_policy"],
    "missing_return_conversation": ["missing_from_care_policy"],
    "safeguarding_concern_record": ["safeguarding_policy"],
    "aac_child_voice_record": ["communication_plan"],
    "orb_communicate_support_pack_record": ["communication_plan"],
}

# Document type inference by template category
_CATEGORY_DOCUMENT_TYPE: dict[str, str] = {
    "recording": "short_record",
    "safeguarding": "long_record",
    "care_planning": "care_plan_contribution",
    "ofsted_sccif": "evidence_pack",
    "leadership_ri": "report",
    "staff_supervision": "supervision_document",
    "locality": "risk_assessment",
    "learning_academy": "report",
}


def _table(
    table_id: str,
    table_type: OrbTemplateTableType,
    title: str,
    *,
    guidance: str | None = None,
) -> dict[str, Any]:
    return {
        "table_id": table_id,
        "table_type": table_type,
        "title": title,
        "columns": TABLE_COLUMN_PRESETS.get(table_type, ["Column 1", "Column 2", "Column 3"]),
        "rows": [],
        "editable": True,
        "guidance": guidance,
        "empty_state_guidance": "Add rows as you gather evidence. Do not invent data.",
    }


def _chart(
    chart_id: str,
    chart_type: OrbTemplateChartType,
    title: str,
    source_table_id: str,
    *,
    optional: bool = True,
) -> dict[str, Any]:
    return {
        "chart_id": chart_id,
        "chart_type": chart_type,
        "title": title,
        "source_table_id": source_table_id,
        "data": {},
        "optional": optional,
        "has_data": False,
        "empty_state_guidance": CHART_EMPTY_GUIDANCE.get(
            chart_type,
            "Add data to the linked table before generating this chart.",
        ),
    }


# Key template component assignments (Part 8)
TEMPLATE_COMPONENT_ASSIGNMENTS: dict[str, dict[str, Any]] = {
    "daily_record": {
        "document_type": "short_record",
        "section_overrides": {
            "What happened": {"section_type": "narrative", "orb_assist_enabled": True},
            "Child voice and presentation": {"section_type": "narrative", "required": True},
            "Manager review if needed": {"section_type": "checklist", "required": False},
        },
        "extra_sections": [
            {
                "section_id": "before_saving_checklist",
                "heading": "Before saving checklist",
                "section_type": "checklist",
                "guidance": "Check child voice, fact/interpretation separation, and safeguarding before saving.",
                "required": True,
                "orb_assist_enabled": False,
            }
        ],
    },
    "reg45_quality_review": {
        "document_type": "review_document",
        "home_document_context_allowed": True,
        "tables": [
            _table("sccif_evidence", "sccif_evidence_tracker", "SCCIF evidence summary"),
            _table("trends", "chronology_table", "Monthly / quarterly trends"),
            _table("actions", "reg_45_action_table", "Action plan"),
        ],
        "charts": [
            _chart("action_completion", "reg_45_action_completion_chart", "Action completion", "actions"),
        ],
        "section_overrides": {
            "Scope": {"section_type": "narrative"},
            "Recommendations": {"section_type": "action_plan"},
        },
    },
    "reg44_action_tracker": {
        "document_type": "evidence_pack",
        "tables": [
            _table("visit_evidence", "reg_44_evidence_table", "Visit evidence"),
            _table("actions", "action_plan_table", "Action tracker"),
        ],
        "section_overrides": {
            "Finding": {"section_type": "evidence"},
        },
        "extra_sections": [
            {
                "section_id": "children_views",
                "heading": "Children's views",
                "section_type": "narrative",
                "guidance": "Record children's views from the visit where shared.",
                "required": True,
            },
            {
                "section_id": "manager_response",
                "heading": "Manager response",
                "section_type": "narrative",
                "guidance": "Registered manager response to findings and actions.",
                "required": True,
            },
        ],
    },
    "significant_incident_review": {
        "document_type": "review_document",
        "tables": [
            _table("chronology", "chronology_table", "Incident chronology"),
            _table("themes", "incident_review_table", "Theme summary"),
            _table("actions", "action_plan_table", "Action plan"),
        ],
        "charts": [
            _chart("incident_trend", "incident_trend_line_chart", "Incident trend", "chronology"),
        ],
        "extra_sections": [
            {
                "section_id": "manager_oversight",
                "heading": "Manager oversight",
                "section_type": "narrative",
                "guidance": "Senior review, challenge and learning oversight.",
                "required": True,
            }
        ],
    },
    "quality_standards_audit": {
        "document_type": "audit",
        "home_document_context_allowed": True,
        "allowed_home_document_types": ["medication_policy"],
        "tables": [
            _table("audit_checklist", "audit_checklist_table", "Audit checklist"),
            _table("medication_summary", "medication_audit_table", "Medication error / refusal summary"),
            _table("actions", "action_plan_table", "Action plan"),
        ],
        "charts": [
            _chart("med_trend", "medication_error_trend_chart", "Medication error trend", "medication_summary"),
        ],
    },
    "locality_risk_assessment": {
        "document_type": "risk_assessment",
        "home_document_context_allowed": True,
        "tables": [
            _table("local_risks", "location_risk_table", "Local risk factors"),
            _table("protective", "risk_matrix_table", "Protective factors"),
            _table("actions", "action_plan_table", "Action plan"),
        ],
        "extra_sections": [
            {
                "section_id": "review_signoff",
                "heading": "Review and sign-off",
                "section_type": "signatures",
                "guidance": "Manager review date and sign-off.",
                "required": True,
            }
        ],
    },
    "staff_supervision": {
        "document_type": "supervision_document",
        "home_document_context_allowed": True,
        "tables": [
            _table("actions", "supervision_action_table", "Action tracker"),
        ],
        "section_overrides": {
            "Practice discussed": {"section_type": "reflection"},
            "Safeguarding reflections": {"section_type": "reflection"},
        },
        "extra_sections": [
            {
                "section_id": "reflection_prompts",
                "heading": "Reflection prompts",
                "section_type": "reflection",
                "guidance": "What went well? What was difficult? What is the child impact?",
                "required": True,
            }
        ],
    },
    "care_plan_review_note": {
        "document_type": "review_document",
        "tables": [
            _table("chronology", "chronology_table", "Placement chronology"),
            _table("risk_protective", "risk_matrix_table", "Risk and protective factors"),
            _table("multi_agency", "action_plan_table", "Multi-agency actions"),
        ],
        "extra_sections": [
            {
                "section_id": "child_voice",
                "heading": "Child voice",
                "section_type": "narrative",
                "guidance": "Child's views on placement stability and what would help.",
                "required": True,
            }
        ],
    },
    "sccif_evidence_tracker": {
        "document_type": "evidence_pack",
        "home_document_context_allowed": True,
        "tables": [
            _table("evidence", "sccif_evidence_tracker", "Evidence by judgement area"),
            _table("gaps", "action_plan_table", "Gaps and action plan"),
        ],
        "charts": [
            _chart("progress", "audit_score_chart", "Progress chart", "evidence", optional=True),
        ],
        "extra_sections": [
            {
                "section_id": "child_impact",
                "heading": "Child impact commentary",
                "section_type": "narrative",
                "guidance": "How does evidence show impact on children's experiences?",
                "required": True,
            }
        ],
    },
    "rights_discussion_record": {
        "document_type": "long_record",
        "extra_sections": [
            {
                "section_id": "child_friendly_explanation",
                "heading": "Child-friendly explanation",
                "section_type": "narrative",
                "guidance": "Age-appropriate explanation of access to records.",
                "required": True,
            },
            {
                "section_id": "child_view",
                "heading": "Child view",
                "section_type": "narrative",
                "guidance": "What the child wants included or changed.",
                "required": True,
            },
            {
                "section_id": "disagreement_addendum",
                "heading": "Disagreement / addendum",
                "section_type": "narrative",
                "required": False,
            },
            {
                "section_id": "adult_reflection",
                "heading": "Adult reflection",
                "section_type": "reflection",
                "guidance": "Staff reflection on child participation and rights.",
                "required": True,
            },
        ],
    },
}


def get_component_assignment(template_id: str) -> dict[str, Any]:
    return TEMPLATE_COMPONENT_ASSIGNMENTS.get(template_id, {})


def infer_document_type(category: str, template_id: str) -> str:
    assignment = get_component_assignment(template_id)
    if assignment.get("document_type"):
        return assignment["document_type"]
    return _CATEGORY_DOCUMENT_TYPE.get(category, "long_record")
