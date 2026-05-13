from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from services.assistant_context_service import AssistantMode, SharedAssistantContext
from services.assistant_security import contains_prompt_injection_attempt, safe_string


VALID_ASSISTANT_MODES: set[str] = set(AssistantMode.__args__)  # type: ignore[attr-defined]

REPORT_WRITER_MODES = {
    "report_writer",
    "reg44_action_plan",
    "reg45_writer",
    "lac_review_writer",
    "safeguarding_chronology",
    "manager_oversight_report",
    "ofsted_evidence_pack",
}

SAFETY_RULES = [
    "Do not diagnose.",
    "Do not make unsupported safeguarding conclusions.",
    "Use 'records indicate' or 'evidence suggests' when describing records.",
    "Identify missing evidence.",
    "Require adult or manager review for draft outputs.",
    "Cite source records for record-specific answers.",
    "Respect RBAC and home scope.",
]


def normalise_mode(mode: str | None) -> str:
    clean = safe_string(mode).lower().replace("-", "_")
    return clean if clean in VALID_ASSISTANT_MODES else "embedded"


def assert_safe_assistant_message(message: str) -> str:
    clean = safe_string(message)
    if not clean:
        raise HTTPException(status_code=400, detail="Message is required.")
    if contains_prompt_injection_attempt(clean):
        raise HTTPException(status_code=400, detail="Prompt injection attempt detected.")
    return clean


def is_record_specific_question(message: str, context: SharedAssistantContext) -> bool:
    text = safe_string(message).lower()
    record_terms = {
        "this record",
        "this incident",
        "this chronology",
        "this report",
        "this document",
        "selected record",
        "current record",
        "for this young person",
        "last 7 days",
        "last seven days",
        "reg 44",
        "reg44",
        "reg 45",
        "reg45",
        "lac review",
        "ofsted",
        "sccif",
        "evidence",
        "chronology",
        "actions",
        "safeguarding",
    }
    return bool(context.selected_record_id or context.selected_young_person_id or any(term in text for term in record_terms))


def suggested_prompts_for_context(context: SharedAssistantContext) -> list[str]:
    route = safe_string(context.current_route).lower()
    workspace = safe_string(context.current_workspace_type).lower()
    if "chronology" in route or workspace == "chronology":
        return [
            "Summarise this chronology.",
            "What patterns do you notice?",
            "Which events link to safeguarding?",
            "Which events should be included in Reg 45?",
        ]
    if "incident" in route or "safeguarding" in route or workspace in {"incident", "safeguarding"}:
        return [
            "Summarise this incident.",
            "What follow-up is required?",
            "Does this suggest a risk assessment review?",
            "Is a Reg 40 consideration needed?",
        ]
    if "regulatory" in route or "ofsted" in route or workspace == "regulatory":
        return [
            "What evidence supports SCCIF protection?",
            "What gaps exist for leadership and management?",
            "Prepare a Reg 44 action plan summary.",
            "What is needed for Reg 45?",
        ]
    if "report" in route or workspace == "reports":
        return [
            "Draft this section using cited evidence.",
            "What citations support this claim?",
            "What evidence gaps remain?",
            "Improve this wording professionally.",
        ]
    if context.selected_young_person_id:
        return [
            "Summarise this young person's last 7 days with citations.",
            "What has changed since the last review?",
            "What are the current risks and protective factors?",
            "What evidence is missing for the next LAC review?",
        ]
    if context.assistant_mode == "standalone":
        return [
            "Summarise the home's safeguarding position this month.",
            "What Reg 44 actions are outstanding?",
            "Prepare a Reg 45 evidence overview.",
            "Which young people have the most evidence gaps?",
        ]
    return [
        "What are today's highest priorities?",
        "Which actions are overdue?",
        "What evidence gaps need management oversight?",
        "What safeguarding issues need review?",
    ]


def context_summary(context: SharedAssistantContext) -> dict[str, Any]:
    return {
        "mode": context.assistant_mode,
        "workspace": context.current_workspace_type,
        "route": context.current_route,
        "home_id": context.home_id,
        "selected_young_person_id": context.selected_young_person_id,
        "selected_record_type": context.selected_record_type,
        "selected_record_id": context.selected_record_id,
        "selected_report_id": context.selected_report_id,
        "selected_document_id": context.selected_document_id,
    }
