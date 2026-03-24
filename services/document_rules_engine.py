from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class FieldRule:
    key: str
    label: str
    help_text: str
    required: bool = False
    tone: str = "professional"
    style: str = "factual"


@dataclass
class WorkflowRule:
    key: str
    label: str
    description: str
    required: bool = False
    auto_task_type: str | None = None
    default_due_days: int | None = None
    manager_review: bool = False


@dataclass
class DocumentRule:
    document_type: str
    title: str
    description: str
    therapeutic_style: bool = True
    field_rules: list[FieldRule] = field(default_factory=list)
    default_quality_standards: list[str] = field(default_factory=list)
    ai_actions: list[str] = field(default_factory=list)
    link_targets: list[str] = field(default_factory=list)
    workflow_rules: list[WorkflowRule] = field(default_factory=list)
    manager_review_required: bool = False


DOCUMENT_RULES: dict[str, DocumentRule] = {
    "daily_note": DocumentRule(
        document_type="daily_note",
        title="Daily Note",
        description="Daily record of presentation, care, activities, progress, and actions.",
        field_rules=[
            FieldRule(
                key="mood",
                label="Mood / presentation",
                help_text="Record how the young person presented across the shift. Use clear, observed, non-judgemental wording.",
                required=True,
                style="factual",
            ),
            FieldRule(
                key="activities",
                label="Activities and engagement",
                help_text="Record what the young person did, how they engaged, what support was offered, and any meaningful progress.",
                required=True,
                style="factual",
            ),
            FieldRule(
                key="education_update",
                label="Education update",
                help_text="Include attendance, engagement, barriers, achievements, and any adult follow-up needed.",
            ),
            FieldRule(
                key="health_update",
                label="Health update",
                help_text="Record appointments, medication, symptoms, wellbeing, or health-related observations and action taken.",
            ),
            FieldRule(
                key="family_update",
                label="Family / contact update",
                help_text="Record family contact, impact on presentation, child’s views, and any agreed next steps.",
            ),
            FieldRule(
                key="behaviour_update",
                label="Behaviour / regulation",
                help_text="Describe behaviour factually. Include context, possible triggers, support used, and outcome.",
            ),
            FieldRule(
                key="young_person_voice",
                label="Young person’s voice",
                help_text="Record the young person’s wishes, views, feelings, or direct words where relevant.",
                style="therapeutic",
            ),
            FieldRule(
                key="positives",
                label="Positives / achievements",
                help_text="Record strengths, effort, progress, positive interactions, and anything to celebrate.",
                style="therapeutic",
            ),
            FieldRule(
                key="actions_required",
                label="Actions required",
                help_text="List anything that still needs doing, who should do it, and what the next shift or manager needs to know.",
                required=True,
                style="action",
            ),
        ],
        default_quality_standards=["1", "3", "7"],
        ai_actions=[
            "improve_wording",
            "spell_check",
            "make_therapeutic",
            "make_more_factual",
            "suggest_missing_details",
            "suggest_quality_standards",
            "suggest_links",
        ],
        link_targets=[
            "chronology_events",
            "health_records",
            "education_records",
            "family_contact_records",
            "tasks",
            "monthly_reviews",
        ],
        workflow_rules=[
            WorkflowRule(
                key="handover_if_needed",
                label="Create handover if needed",
                description="If there are outstanding concerns or next-shift actions, create or update handover.",
                auto_task_type="handover_follow_up",
                default_due_days=0,
            ),
        ],
    ),
    "incident": DocumentRule(
        document_type="incident",
        title="Incident Record",
        description="Structured incident record with accountability, follow-up, and linked safeguarding / risk actions.",
        therapeutic_style=True,
        field_rules=[
            FieldRule(
                key="incident_datetime",
                label="Date and time of incident",
                help_text="Record when the incident happened as accurately as possible.",
                required=True,
            ),
            FieldRule(
                key="location",
                label="Location",
                help_text="Record where the incident happened.",
                required=True,
            ),
            FieldRule(
                key="antecedent",
                label="Antecedent / context",
                help_text="Record what happened before the incident, including triggers, requests, interactions, environmental changes, or known stressors. Avoid blame or assumption.",
                required=True,
            ),
            FieldRule(
                key="description",
                label="What happened",
                help_text="Record the sequence of events factually and clearly. Include observed behaviour and significant words used where relevant.",
                required=True,
            ),
            FieldRule(
                key="staff_response",
                label="Staff response",
                help_text="Record what staff did in order, including de-escalation, boundaries, support, protective actions, and who was informed.",
                required=True,
            ),
            FieldRule(
                key="child_response",
                label="Young person response",
                help_text="Record how the young person responded to support, redirection, or intervention.",
            ),
            FieldRule(
                key="outcome",
                label="Outcome",
                help_text="Record how the incident ended, whether anyone was hurt, what was repaired or restored, and the young person’s presentation afterwards.",
                required=True,
            ),
            FieldRule(
                key="child_voice",
                label="Young person’s voice",
                help_text="Record the young person’s view, explanation, reflection, or direct words where appropriate.",
                style="therapeutic",
            ),
            FieldRule(
                key="restorative_follow_up",
                label="Restorative follow-up",
                help_text="Record any repair, reflection, apology, relationship repair, or emotional support offered after the incident.",
                style="therapeutic",
            ),
            FieldRule(
                key="actions_taken",
                label="Immediate and follow-up actions",
                help_text="Record notifications made, actions taken, what still needs doing, and who is responsible.",
                required=True,
                style="action",
            ),
        ],
        default_quality_standards=["12", "13"],
        ai_actions=[
            "improve_wording",
            "spell_check",
            "make_therapeutic",
            "make_more_factual",
            "check_safeguarding_language",
            "suggest_missing_details",
            "suggest_notifications",
            "suggest_quality_standards",
            "suggest_links",
        ],
        link_targets=[
            "chronology_events",
            "risk_assessments",
            "risk_reviews",
            "safeguarding_records",
            "tasks",
            "monthly_reviews",
        ],
        workflow_rules=[
            WorkflowRule(
                key="manager_review",
                label="Manager review",
                description="Manager must review incident wording, actions, oversight, and any learning.",
                required=True,
                manager_review=True,
            ),
            WorkflowRule(
                key="chronology_link",
                label="Chronology link",
                description="Add incident to chronology where it is significant or relevant to the young person’s journey.",
                required=True,
                auto_task_type="chronology_update",
                default_due_days=0,
            ),
            WorkflowRule(
                key="risk_review",
                label="Risk review",
                description="Check whether this incident requires a risk assessment review or update.",
                required=True,
                auto_task_type="risk_review",
                default_due_days=1,
                manager_review=True,
            ),
            WorkflowRule(
                key="safeguarding_check",
                label="Safeguarding check",
                description="Confirm whether safeguarding threshold is met and whether referrals or notifications are needed.",
                required=True,
                auto_task_type="safeguarding_check",
                default_due_days=0,
                manager_review=True,
            ),
        ],
        manager_review_required=True,
    ),
    "health_record": DocumentRule(
        document_type="health_record",
        title="Health Record",
        description="Health appointment, health concern, medication, or professional update.",
        field_rules=[
            FieldRule(
                key="record_type",
                label="Health record type",
                help_text="State whether this is an appointment, concern, outcome, review, or treatment note.",
                required=True,
            ),
            FieldRule(
                key="event_datetime",
                label="Date and time",
                help_text="Record when the health event happened.",
                required=True,
            ),
            FieldRule(
                key="title",
                label="Title",
                help_text="Use a short, clear heading, for example CAMHS review or GP appointment.",
                required=True,
            ),
            FieldRule(
                key="summary",
                label="Summary",
                help_text="Record the appointment or health event clearly, including why it happened and key information shared.",
                required=True,
            ),
            FieldRule(
                key="professional_name",
                label="Professional involved",
                help_text="Record the name and role of the professional involved if known.",
            ),
            FieldRule(
                key="outcome",
                label="Outcome",
                help_text="Record the advice, decision, diagnosis, treatment, or agreed next step.",
                required=True,
            ),
        ],
        default_quality_standards=["1", "10"],
        ai_actions=[
            "improve_wording",
            "spell_check",
            "make_therapeutic",
            "make_more_factual",
            "suggest_missing_details",
            "suggest_quality_standards",
            "suggest_links",
        ],
        link_targets=[
            "chronology_events",
            "support_plans",
            "tasks",
            "monthly_reviews",
            "medication_profiles",
        ],
        workflow_rules=[
            WorkflowRule(
                key="health_follow_up",
                label="Follow-up action check",
                description="Confirm whether appointments, monitoring, prescriptions, or parental / professional updates are needed.",
                required=True,
                auto_task_type="health_follow_up",
                default_due_days=1,
            ),
        ],
    ),
    "keywork": DocumentRule(
        document_type="keywork",
        title="Keywork Session",
        description="Reflective and child-centred keywork record linked to progress, planning, and standards.",
        field_rules=[
            FieldRule(
                key="topic",
                label="Topic",
                help_text="State the main focus of the keywork session.",
                required=True,
            ),
            FieldRule(
                key="purpose",
                label="Purpose",
                help_text="Explain why this session took place and what it aimed to support.",
                required=True,
            ),
            FieldRule(
                key="summary",
                label="Discussion summary",
                help_text="Summarise what was discussed in a clear and child-centred way.",
                required=True,
            ),
            FieldRule(
                key="child_voice",
                label="Young person’s voice",
                help_text="Record the young person’s views, feelings, wishes, and reflections.",
                required=True,
                style="therapeutic",
            ),
            FieldRule(
                key="reflective_analysis",
                label="Reflection / analysis",
                help_text="Record what this means for the young person’s progress, needs, risks, or support.",
                style="reflective",
            ),
            FieldRule(
                key="actions_agreed",
                label="Actions agreed",
                help_text="Record agreed actions, who will do them, and by when.",
                required=True,
                style="action",
            ),
        ],
        default_quality_standards=["1", "2", "7"],
        ai_actions=[
            "improve_wording",
            "spell_check",
            "make_therapeutic",
            "suggest_missing_details",
            "suggest_quality_standards",
            "suggest_links",
        ],
        link_targets=[
            "chronology_events",
            "support_plans",
            "tasks",
            "monthly_reviews",
        ],
        workflow_rules=[
            WorkflowRule(
                key="plan_update_check",
                label="Plan update check",
                description="Check whether the support plan or targets should be updated after this session.",
                auto_task_type="support_plan_review",
                default_due_days=3,
            ),
        ],
    ),
    "support_plan": DocumentRule(
        document_type="support_plan",
        title="Support Plan",
        description="Therapeutic plan describing needs, triggers, proactive support, and agreed responses.",
        field_rules=[
            FieldRule(
                key="presenting_need",
                label="Presenting need",
                help_text="Describe the need this plan is responding to and why support is required.",
                required=True,
            ),
            FieldRule(
                key="summary",
                label="Plan summary",
                help_text="Summarise the plan in clear, practical language.",
                required=True,
            ),
            FieldRule(
                key="child_voice",
                label="Young person’s voice",
                help_text="Record what the young person says helps, what matters to them, and how they want to be supported.",
                required=True,
                style="therapeutic",
            ),
            FieldRule(
                key="proactive_strategies",
                label="Proactive strategies",
                help_text="Record what staff should do early to support regulation, engagement, and stability.",
                required=True,
            ),
            FieldRule(
                key="pace_guidance",
                label="Pacing / approach guidance",
                help_text="Record how staff should approach conversations, requests, routines, transitions, and emotional support.",
            ),
            FieldRule(
                key="triggers",
                label="Triggers",
                help_text="Record known triggers, stressors, patterns, or context that can increase vulnerability or dysregulation.",
            ),
            FieldRule(
                key="protective_factors",
                label="Protective factors",
                help_text="Record strengths, relationships, routines, interests, and support that reduce risk and increase stability.",
            ),
        ],
        default_quality_standards=["1", "2", "3"],
        ai_actions=[
            "improve_wording",
            "spell_check",
            "make_therapeutic",
            "make_more_practical",
            "suggest_missing_details",
            "suggest_quality_standards",
            "suggest_links",
        ],
        link_targets=[
            "risk_assessments",
            "tasks",
            "monthly_reviews",
        ],
        workflow_rules=[
            WorkflowRule(
                key="target_check",
                label="Target check",
                description="Confirm whether measurable targets need to be added or updated.",
                auto_task_type="target_review",
                default_due_days=3,
            ),
            WorkflowRule(
                key="review_date_check",
                label="Review date check",
                description="Ensure the plan has a clear review date and owner.",
                required=True,
                auto_task_type="plan_review",
                default_due_days=28,
            ),
        ],
        manager_review_required=True,
    ),
}


def get_document_rule(document_type: str) -> DocumentRule | None:
    return DOCUMENT_RULES.get((document_type or "").strip().lower())


def list_document_rules() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for rule in DOCUMENT_RULES.values():
        rows.append(
            {
                "document_type": rule.document_type,
                "title": rule.title,
                "description": rule.description,
                "therapeutic_style": rule.therapeutic_style,
                "default_quality_standards": rule.default_quality_standards,
                "ai_actions": rule.ai_actions,
                "link_targets": rule.link_targets,
                "manager_review_required": rule.manager_review_required,
                "field_rules": [
                    {
                        "key": f.key,
                        "label": f.label,
                        "help_text": f.help_text,
                        "required": f.required,
                        "tone": f.tone,
                        "style": f.style,
                    }
                    for f in rule.field_rules
                ],
                "workflow_rules": [
                    {
                        "key": w.key,
                        "label": w.label,
                        "description": w.description,
                        "required": w.required,
                        "auto_task_type": w.auto_task_type,
                        "default_due_days": w.default_due_days,
                        "manager_review": w.manager_review,
                    }
                    for w in rule.workflow_rules
                ],
            }
        )

    return rows


def get_document_rule_payload(document_type: str) -> dict[str, Any]:
    rule = get_document_rule(document_type)
    if not rule:
        return {}

    return {
        "document_type": rule.document_type,
        "title": rule.title,
        "description": rule.description,
        "therapeutic_style": rule.therapeutic_style,
        "default_quality_standards": rule.default_quality_standards,
        "ai_actions": rule.ai_actions,
        "link_targets": rule.link_targets,
        "manager_review_required": rule.manager_review_required,
        "field_rules": [
            {
                "key": f.key,
                "label": f.label,
                "help_text": f.help_text,
                "required": f.required,
                "tone": f.tone,
                "style": f.style,
            }
            for f in rule.field_rules
        ],
        "workflow_rules": [
            {
                "key": w.key,
                "label": w.label,
                "description": w.description,
                "required": w.required,
                "auto_task_type": w.auto_task_type,
                "default_due_days": w.default_due_days,
                "manager_review": w.manager_review,
            }
            for w in rule.workflow_rules
        ],
    }


def suggest_document_links(document_type: str, payload: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    rule = get_document_rule(document_type)
    if not rule:
        return []

    payload = payload or {}
    text = " ".join(str(v or "") for v in payload.values()).lower()
    suggestions: list[dict[str, Any]] = []

    for target in rule.link_targets:
        reason = f"Linked from {rule.title}"

        if target == "health_records" and any(x in text for x in ["gp", "camhs", "appointment", "medication", "hospital", "health"]):
            reason = "Health-related content detected"
        elif target == "education_records" and any(x in text for x in ["school", "attendance", "teacher", "education", "college"]):
            reason = "Education-related content detected"
        elif target == "family_contact_records" and any(x in text for x in ["family", "mum", "dad", "contact", "phone call", "visit"]):
            reason = "Family/contact content detected"
        elif target == "risk_assessments" and any(x in text for x in ["risk", "unsafe", "aggressive", "abscond", "missing", "self-harm"]):
            reason = "Risk-related content detected"
        elif target == "safeguarding_records" and any(x in text for x in ["safeguard", "disclosure", "police", "lado", "exploitation", "harm"]):
            reason = "Safeguarding-related content detected"

        suggestions.append(
            {
                "target": target,
                "reason": reason,
                "suggested": True,
            }
        )

    return suggestions


def build_workflow_tasks(document_type: str) -> list[dict[str, Any]]:
    rule = get_document_rule(document_type)
    if not rule:
        return []

    rows: list[dict[str, Any]] = []

    for item in rule.workflow_rules:
        rows.append(
            {
                "workflow_key": item.key,
                "title": item.label,
                "description": item.description,
                "required": item.required,
                "task_type": item.auto_task_type,
                "default_due_days": item.default_due_days,
                "manager_review": item.manager_review,
            }
        )

    return rows
