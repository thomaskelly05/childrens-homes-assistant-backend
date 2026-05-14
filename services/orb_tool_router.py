from __future__ import annotations

from typing import Any

from schemas.orb import OrbModeDecision


CARE_TOOLS = [
    "search_chronology",
    "open_young_person_workspace",
    "create_daily_note_draft",
    "create_incident_draft",
    "create_safeguarding_concern_draft",
    "create_action_draft",
    "generate_handover",
    "generate_lac_review_draft",
    "generate_reg45_section",
    "identify_evidence_gaps",
    "summarise_records_with_citations",
    "ask_inspector_style_challenge",
]

GENERAL_TOOLS = [
    "general_qna",
    "writing",
    "planning",
    "summarising",
    "calculations",
    "reminders_future_foundation",
    "calendar_future_foundation",
    "email_future_foundation",
]

LIVE_TOOLS = ["weather", "sports", "web_search", "news"]


def tools_for_decision(decision: OrbModeDecision, message: str | None = None) -> list[dict[str, Any]]:
    """Return the tool manifest Orb may use for this turn.

    The manifest is intentionally descriptive: care writes are draft-only until
    a future confirmed-write endpoint records approval and audit metadata.
    """

    brain = decision.brain
    tools: list[str]
    if brain == "web_research_brain":
        tools = LIVE_TOOLS
    elif brain == "productivity_brain":
        tools = ["writing", "planning", "summarising", "calculations"]
    elif brain == "general_assistant_brain":
        tools = ["general_qna"]
    elif brain == "inspector_brain":
        tools = [
            "summarise_records_with_citations",
            "identify_evidence_gaps",
            "ask_inspector_style_challenge",
            "sccif_quality_standards_reference",
        ]
    elif brain == "report_writer_brain":
        tools = ["summarise_records_with_citations", "generate_reg45_section", "generate_lac_review_draft", "pending_draft"]
    elif brain == "voice_recording_brain":
        tools = [
            "create_daily_note_draft",
            "create_incident_draft",
            "create_safeguarding_concern_draft",
            "create_action_draft",
            "pending_draft",
        ]
    else:
        tools = ["search_chronology", "generate_handover", "summarise_records_with_citations", "identify_evidence_gaps"]

    return [
        {
            "name": tool,
            "category": _category_for_tool(tool),
            "requires_confirmation": tool.endswith("_draft") or tool == "pending_draft",
            "requires_citations": decision.requires_citations and tool in CARE_TOOLS + ["pending_draft", "sccif_quality_standards_reference"],
        }
        for tool in tools
    ]


def _category_for_tool(tool: str) -> str:
    if tool in LIVE_TOOLS:
        return "current_facts"
    if tool in {"writing", "planning", "summarising", "calculations"}:
        return "productivity"
    if tool == "general_qna":
        return "general"
    if tool.endswith("_draft") or tool == "pending_draft":
        return "draft_write_safety"
    if "sccif" in tool or "challenge" in tool:
        return "inspection"
    return "care_records"

