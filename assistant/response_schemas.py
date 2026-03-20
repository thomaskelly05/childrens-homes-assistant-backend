from __future__ import annotations

from typing import Any


SCHEMAS = {
    "handover": {
        "title": "Shift Handover",
        "purpose": "A concise but useful operational handover for the next staff team.",
        "sections": [
            "Key events on shift",
            "Presentation and wellbeing",
            "Important conversations or disclosures",
            "Incidents / concerns",
            "Actions taken",
            "Medication / health / appointments",
            "What the next shift needs to know",
            "What needs monitoring / follow-up",
        ],
        "style_notes": [
            "Keep it concise, clear, and practical.",
            "Prioritise what the next shift actually needs to know.",
            "Use factual, neutral wording.",
            "Do not pad the handover with generic detail.",
        ],
    },
    "incident_summary": {
        "title": "Incident Summary",
        "purpose": "A factual and defensible summary of an incident.",
        "sections": [
            "Incident overview",
            "What was observed",
            "What the child said",
            "Staff actions taken",
            "Outcome / current presentation",
            "Who was informed",
            "Recording / follow-up required",
        ],
        "style_notes": [
            "Separate observation from interpretation.",
            "Avoid loaded or speculative language.",
            "Be neutral, specific, and defensible.",
            "Do not overstate certainty.",
        ],
    },
    "chronology": {
        "title": "Chronology",
        "purpose": "A clear sequence of relevant events in date/time order.",
        "sections": [
            "Date / time",
            "Event / information received",
            "Action taken",
            "Outcome / next step",
        ],
        "style_notes": [
            "Keep entries sequential and concise.",
            "Focus on relevance and factual clarity.",
            "Avoid repeated narrative wording.",
        ],
    },
    "manager_update": {
        "title": "Manager Update",
        "purpose": "A concise management-facing summary with oversight and next steps.",
        "sections": [
            "Brief overview",
            "Key concerns / issues",
            "Actions already taken",
            "Outstanding risks or gaps",
            "What may need management review",
            "Recommended next steps",
        ],
        "style_notes": [
            "Write with oversight and accountability in mind.",
            "Keep it concise and decision-useful.",
            "Make risk, uncertainty, and review points visible.",
        ],
    },
    "support_plan": {
        "title": "Support Plan",
        "purpose": "A child-specific support structure that staff can actually follow on shift.",
        "sections": [
            "Presenting needs / context",
            "What staff are noticing",
            "Known triggers / patterns",
            "What helps",
            "What staff should do",
            "What staff should avoid",
            "What should be recorded",
            "What needs review",
        ],
        "style_notes": [
            "Make it child-specific, not generic.",
            "Use practical staff actions.",
            "Keep language clear and non-punitive.",
            "Include review points where relevant.",
        ],
    },
    "reflective_debrief": {
        "title": "Reflective Debrief",
        "purpose": "A structured debrief focused on staff reflection and learning.",
        "sections": [
            "What happened from the staff perspective",
            "What stood out",
            "What felt difficult or uncertain",
            "What may have influenced decision-making",
            "What may be useful to think about further",
            "Possible learning / supervision points",
        ],
        "style_notes": [
            "Do not over-analyse children.",
            "Keep the tone reflective but grounded.",
            "Support learning without blame.",
        ],
    },
    "safeguarding_note": {
        "title": "Safeguarding Note",
        "purpose": "A factual note that helps staff organise concerns clearly and safely.",
        "sections": [
            "Nature of concern",
            "What was observed / disclosed",
            "Relevant context",
            "Immediate actions taken",
            "Who was informed",
            "What needs to happen next",
        ],
        "style_notes": [
            "Stay factual and neutral.",
            "Do not make the final safeguarding decision.",
            "Keep escalation and recording clear.",
            "Avoid speculation.",
        ],
    },
    "daily_log": {
        "title": "Daily Log",
        "purpose": "A clear, professional daily record of the child’s day.",
        "sections": [
            "Overview of the day",
            "Presentation and mood",
            "Activities / engagement",
            "Education / appointments / routine",
            "Health / medication / eating / sleep relevance",
            "Incidents or concerns",
            "Staff support provided",
            "End-of-day position / handover points",
        ],
        "style_notes": [
            "Keep the log factual and proportionate.",
            "Avoid over-writing.",
            "Make the child’s day visible without speculation.",
        ],
    },
}


MODE_TO_SCHEMA = {
    "handover": "handover",
    "recording": "daily_log",
    "incident_summary": "incident_summary",
    "chronology": "chronology",
    "support_planning": "support_plan",
    "manager_review": "manager_update",
    "reflective": "reflective_debrief",
    "supervision": "reflective_debrief",
    "safeguarding": "safeguarding_note",
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def get_schema(schema_name: str) -> dict[str, Any] | None:
    return SCHEMAS.get(schema_name)


def get_schema_for_mode(mode: str, safeguarding_level: str = "normal") -> dict[str, Any] | None:
    """
    Choose a schema from task mode and safeguarding level.
    Safeguarding can override where helpful.
    """
    mode = _safe_string(mode)

    if safeguarding_level in {"heightened", "urgent"} and mode in {"recording", "incident_summary", "practical"}:
        return SCHEMAS.get("safeguarding_note")

    schema_name = MODE_TO_SCHEMA.get(mode)
    if not schema_name:
        return None

    return SCHEMAS.get(schema_name)


def schema_to_prompt_block(schema: dict[str, Any] | None) -> str:
    """
    Turn a schema into prompt-ready guidance for the model.
    """
    if not schema:
        return ""

    title = _safe_string(schema.get("title"))
    purpose = _safe_string(schema.get("purpose"))
    sections = schema.get("sections") or []
    style_notes = schema.get("style_notes") or []

    lines = [
        "Use the following response structure where it fits the user's request.",
    ]

    if title:
        lines.append(f"Output type: {title}")

    if purpose:
        lines.append(f"Purpose: {purpose}")

    if sections:
        lines.append("")
        lines.append("Suggested sections:")
        for section in sections:
            lines.append(f"• {section}")

    if style_notes:
        lines.append("")
        lines.append("Style notes:")
        for note in style_notes:
            lines.append(f"• {note}")

    return "\n".join(lines).strip()
