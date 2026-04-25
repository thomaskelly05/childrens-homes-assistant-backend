from __future__ import annotations

from typing import Any


UNIVERSAL_AI_RECORDING_RULES = [
    "Use only information provided in the visible record/context.",
    "Do not invent facts, dates, names, events, outcomes, risks, or actions.",
    "If evidence is missing, say what is not visible.",
    "Separate facts from interpretation or professional judgement.",
    "Use neutral, factual, defensible residential care language.",
    "Do not make final safeguarding, clinical, legal, or regulatory decisions.",
    "Use citations where record evidence is available, formatted as [record_type:record_id].",
    "If a record has no ID, cite the record type and clearly state that the ID is not visible.",
    "Make uncertainty visible rather than filling gaps.",
    "Any suggested actions must be framed for staff/manager review.",
]


SCHEMAS = {
    "handover": {
        "title": "Shift Handover",
        "purpose": "A concise, useful operational handover for the next staff team.",
        "sections": [
            "Key events on shift",
            "Presentation and wellbeing",
            "Important conversations, disclosures, or notable comments",
            "Incidents, concerns, or changes",
            "Actions taken by staff",
            "Health, medication, appointments, or routine issues",
            "What the next shift needs to know",
            "What needs monitoring, follow-up, or escalation",
            "What is not visible / missing evidence",
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
            "What staff did",
            "Outcome / current presentation",
            "Who was informed",
            "Recording, review, or follow-up required",
            "What is not visible / missing evidence",
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
            "Source / record reference",
        ],
        "style_notes": [
            "Keep entries sequential and concise.",
            "Focus on relevance and factual clarity.",
            "Avoid repeated narrative wording.",
            "Use date/time order where dates are visible.",
            "If dates are missing, state that clearly.",
        ],
    },
    "manager_update": {
        "title": "Manager Update",
        "purpose": "A concise management-facing summary with oversight, risks, and next steps.",
        "sections": [
            "Brief overview",
            "Key concerns / issues",
            "Actions already taken",
            "Outstanding risks, contradictions, or gaps",
            "What may need management review",
            "Recommended next steps",
            "What is not visible / missing evidence",
        ],
        "style_notes": [
            "Write with oversight and accountability in mind.",
            "Keep it concise and decision-useful.",
            "Make risk, uncertainty, and review points visible.",
            "Recommendations must be for manager review, not final decisions.",
        ],
    },
    "support_plan": {
        "title": "Support Plan",
        "purpose": "A child-specific support structure that staff can actually follow on shift.",
        "sections": [
            "Presenting needs / context",
            "What staff are noticing",
            "Known triggers / patterns",
            "What appears to help",
            "What staff should do",
            "What staff should avoid",
            "What should be recorded",
            "What needs review",
            "What is not visible / missing evidence",
        ],
        "style_notes": [
            "Make it child-specific, not generic.",
            "Use practical staff actions.",
            "Keep language clear and non-punitive.",
            "Include review points where relevant.",
            "Do not invent triggers, patterns, or strategies that are not evidenced.",
        ],
    },
    "reflective_debrief": {
        "title": "Reflective Debrief",
        "purpose": "A structured debrief focused on staff reflection, learning, and supervision usefulness.",
        "sections": [
            "What happened from the staff perspective",
            "What stood out",
            "What felt difficult, uncertain, or emotionally loaded",
            "What may have shaped decision-making",
            "What may need more thought",
            "Possible learning / supervision points",
            "Practical follow-up required",
        ],
        "style_notes": [
            "Do not over-analyse children.",
            "Keep the tone reflective but grounded.",
            "Support learning without blame.",
            "Do not let reflection replace practical follow-up where it is needed.",
            "Avoid making unsupported conclusions about motives or intent.",
        ],
    },
    "safeguarding_note": {
        "title": "Safeguarding Note",
        "purpose": "A factual note that helps staff organise concerns clearly, safely, and defensibly.",
        "sections": [
            "Nature of concern",
            "What was observed or disclosed",
            "Relevant context",
            "Immediate actions taken",
            "Who was informed",
            "What needs to happen next",
            "What is not visible / missing evidence",
        ],
        "style_notes": [
            "Stay factual and neutral.",
            "Do not make the final safeguarding decision.",
            "Keep escalation and recording clear.",
            "Avoid speculation.",
            "If urgent harm or immediate safety is suggested, advise staff to follow the home safeguarding procedure and escalate to the appropriate manager/designated safeguarding lead immediately.",
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
            "What is not visible / missing evidence",
        ],
        "style_notes": [
            "Keep the log factual and proportionate.",
            "Avoid over-writing.",
            "Make the child’s day visible without speculation.",
            "Avoid judgemental, punitive, or emotive wording.",
        ],
    },
    "professional_rewrite": {
        "title": "Professional Rewrite",
        "purpose": "A clearer, more professional version of the user's wording while staying true to the facts.",
        "sections": [
            "Rewritten version",
            "Optional notes on wording improvements or remaining gaps",
        ],
        "style_notes": [
            "Keep the meaning anchored to the original content.",
            "Do not invent facts or outcomes.",
            "Use clear, professional, defensible language.",
            "Preserve important uncertainty rather than making the wording sound more certain than the original evidence supports.",
        ],
    },
    "practical_response": {
        "title": "Practical Response",
        "purpose": "A direct, useful response for residential care staff when no more specific schema is a better fit.",
        "sections": [
            "What matters most here",
            "Suggested staff response / next steps",
            "What should be recorded / handed over / reviewed if relevant",
            "What is not visible / missing evidence",
        ],
        "style_notes": [
            "Keep the answer practical and relevant.",
            "Do not become generic if the user has given specific details.",
            "Use headings only where they improve clarity.",
            "Frame actions as staff/manager review points where professional judgement is required.",
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
    "rewrite": "professional_rewrite",
    "safeguarding": "safeguarding_note",
    "practical": "practical_response",
    "general_practice": "practical_response",
    "factual": "practical_response",
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def get_schema(schema_name: str) -> dict[str, Any] | None:
    return SCHEMAS.get(_safe_string(schema_name))


def get_schema_for_mode(mode: str, safeguarding_level: str = "normal") -> dict[str, Any] | None:
    """
    Choose a schema from task mode and safeguarding level.
    Safeguarding can override operational recording-style tasks.
    """
    safe_mode = _safe_string(mode)
    safe_safeguarding_level = _safe_string(safeguarding_level).lower()

    if safe_safeguarding_level in {"heightened", "urgent"} and safe_mode in {
        "recording",
        "incident_summary",
        "practical",
        "general_practice",
        "factual",
    }:
        return SCHEMAS.get("safeguarding_note")

    schema_name = MODE_TO_SCHEMA.get(safe_mode, "practical_response")
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
            safe_section = _safe_string(section)
            if safe_section:
                lines.append(f"• {safe_section}")

    if style_notes:
        lines.append("")
        lines.append("Style notes:")
        for note in style_notes:
            safe_note = _safe_string(note)
            if safe_note:
                lines.append(f"• {safe_note}")

    lines.append("")
    lines.append("Universal safety and evidence rules:")
    for rule in UNIVERSAL_AI_RECORDING_RULES:
        lines.append(f"• {rule}")

    lines.append("")
    lines.append(
        "When summarising records, include a short 'What is not visible / missing evidence' section if relevant."
    )
    lines.append(
        "When giving recommendations, phrase them as suggested follow-up for staff or manager review, not as final decisions."
    )
    lines.append(
        "If the user asks for a conclusion that is not supported by the visible records, explain what evidence would be needed."
    )
    lines.append("")
    lines.append(
        "Use this structure flexibly. Keep the answer relevant to the actual request rather than forcing every section in."
    )

    return "\n".join(lines).strip()