from __future__ import annotations

import re
from typing import Any, Literal


ResponseMode = Literal[
    "default",
    "record",
    "rewrite",
    "handover",
    "incident",
    "chronology",
    "safeguarding",
    "reflection",
    "manager_review",
    "ofsted_view",
    "reg45",
    "plan",
    "support_plan",
]


MODE_ALIASES = {
    "plain_response": "default",
    "practical": "default",
    "practical_response": "default",
    "structured_record": "record",
    "daily_note": "record",
    "daily_log": "record",
    "professional_rewrite": "rewrite",
    "handover_note": "handover",
    "incident_record": "incident",
    "incident_summary": "incident",
    "chronology_entry": "chronology",
    "safeguarding_note": "safeguarding",
    "supervision_reflection": "reflection",
    "reflective_debrief": "reflection",
    "manager_update": "manager_review",
    "management_review": "manager_review",
    "inspection_review": "ofsted_view",
    "quality_review": "ofsted_view",
    "structured_report": "reg45",
    "reg45_report": "reg45",
    "risk_summary": "support_plan",
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_mode(mode: str | None) -> str:
    value = _safe_string(mode).lower()
    return MODE_ALIASES.get(value, value or "default")


def _has_heading(text: str) -> bool:
    return bool(re.search(r"(^|\n)\s{0,3}(#{1,4}\s+|[A-Z][A-Z\s/()-]{3,}:)", text))


def _has_citation(text: str) -> bool:
    return bool(re.search(r"\[[A-Za-z][A-Za-z0-9_\-]*:\d+[A-Za-z0-9_\-]*\]", text))


def _bulletise(items: list[str]) -> str:
    return "\n".join(f"• {item}" for item in items if _safe_string(item))


def _section(title: str, body: str | list[str]) -> str:
    if isinstance(body, list):
        body = _bulletise(body)

    body = _safe_string(body)
    if not body:
        return ""

    return f"{title}\n{body}".strip()


def _join_sections(*sections: str) -> str:
    return "\n\n".join(section.strip() for section in sections if section.strip()).strip()


def _append_evidence_note(text: str, metadata: dict[str, Any]) -> str:
    evidence_available = bool(
        metadata.get("evidence_index")
        or metadata.get("sources")
        or metadata.get("source_count")
    )

    requires_evidence = bool(metadata.get("requires_evidence_grounding"))
    assistant_surface = _safe_string(metadata.get("assistant_surface")).lower()

    if evidence_available and not _has_citation(text):
        return _join_sections(
            text,
            "Evidence note\nEvidence appears to be available, but no inline citation was included in the generated text. Review against the source list before relying on this as a record-based conclusion.",
        )

    if requires_evidence and assistant_surface == "os_embedded" and not evidence_available:
        return _join_sections(
            "Evidence limitation\nNo scoped record evidence is visible in this response. Do not treat this as a record-based conclusion.",
            text,
        )

    return text


def _wrap_if_unstructured(text: str, title: str) -> str:
    if _has_heading(text):
        return text
    return _section(title, text)


def format_response(
    text: str,
    *,
    mode: ResponseMode | str = "default",
    metadata: dict[str, Any] | None = None,
) -> str:
    metadata = metadata or {}
    text = _safe_string(text)

    if not text:
        return ""

    mode = _normalise_mode(mode)

    formatters = {
        "record": _format_record,
        "rewrite": _format_rewrite,
        "handover": _format_handover,
        "incident": _format_incident,
        "chronology": _format_chronology,
        "safeguarding": _format_safeguarding,
        "reflection": _format_reflection,
        "manager_review": _format_manager_review,
        "ofsted_view": _format_ofsted_view,
        "reg45": _format_reg45,
        "plan": _format_plan,
        "support_plan": _format_plan,
    }

    formatter = formatters.get(mode, _format_default)
    formatted = formatter(text, metadata)

    return _append_evidence_note(formatted, metadata).strip()


def infer_response_mode(
    *,
    output_type: str = "",
    task_type: str = "",
    mode: str = "",
    message: str = "",
) -> str:
    combined = " ".join(
        [
            _safe_string(output_type).lower(),
            _safe_string(task_type).lower(),
            _safe_string(mode).lower(),
            _safe_string(message).lower(),
        ]
    )

    for key, value in MODE_ALIASES.items():
        if key in combined:
            return value

    if "ofsted" in combined or "inspection" in combined or "sccif" in combined:
        return "ofsted_view"

    if "reg 45" in combined or "reg45" in combined or "quality of care review" in combined:
        return "reg45"

    if "handover" in combined:
        return "handover"

    if "incident" in combined:
        return "incident"

    if "chronology" in combined or "timeline" in combined:
        return "chronology"

    if "safeguarding" in combined:
        return "safeguarding"

    if "reflect" in combined or "supervision" in combined or "debrief" in combined:
        return "reflection"

    if "manager" in combined or "oversight" in combined or "audit" in combined:
        return "manager_review"

    if "plan" in combined or "risk assessment" in combined or "support strategy" in combined:
        return "support_plan"

    if "rewrite" in combined or "reword" in combined or "improve" in combined:
        return "rewrite"

    if "record" in combined or "daily note" in combined or "daily log" in combined:
        return "record"

    return "default"


def _format_default(text: str, metadata: dict[str, Any]) -> str:
    return text


def _format_rewrite(text: str, metadata: dict[str, Any]) -> str:
    return text


def _format_record(text: str, metadata: dict[str, Any]) -> str:
    return _wrap_if_unstructured(text, "Daily record")


def _format_handover(text: str, metadata: dict[str, Any]) -> str:
    if _has_heading(text):
        return text

    return _join_sections(
        _section("Handover summary", text),
        _section(
            "Next shift focus",
            [
                "Check any outstanding actions.",
                "Continue agreed support strategies.",
                "Escalate any change in risk, presentation, or safeguarding concern.",
            ],
        ),
    )


def _format_incident(text: str, metadata: dict[str, Any]) -> str:
    if _has_heading(text):
        return text

    return _join_sections(
        _section("Incident summary", text),
        _section(
            "Recording checks",
            [
                "Confirm times, location, people present, staff response, and outcome.",
                "Separate what was seen, heard, reported, and inferred.",
                "Ensure any safeguarding, medical, management, or professional notifications are recorded.",
            ],
        ),
    )


def _format_chronology(text: str, metadata: dict[str, Any]) -> str:
    if _has_heading(text):
        return text

    return _join_sections(
        _section("Chronology", text),
        _section(
            "Chronology checks",
            [
                "Keep events in date and time order.",
                "Use factual wording.",
                "Include source/reference where available.",
                "Do not add interpretation unless clearly labelled as analysis.",
            ],
        ),
    )


def _format_safeguarding(text: str, metadata: dict[str, Any]) -> str:
    safeguarding_level = _safe_string(metadata.get("safeguarding_level")).lower()

    priority = ""
    if safeguarding_level in {"heightened", "urgent"}:
        priority = _section(
            "Immediate safeguarding priority",
            [
                "Prioritise immediate safety.",
                "Follow the home’s safeguarding, on-call, medical, police, or emergency procedures where indicated.",
                "Record exact facts, times, actions taken, people informed, and the current outcome.",
            ],
        )

    return _join_sections(
        priority,
        _wrap_if_unstructured(text, "Safeguarding note"),
    )


def _format_reflection(text: str, metadata: dict[str, Any]) -> str:
    if _has_heading(text):
        return text

    return _join_sections(
        _section("Reflective practice", text),
        _section(
            "Helpful reflection prompts",
            [
                "What was the child communicating through their presentation or behaviour?",
                "What helped or escalated the situation?",
                "What should the team repeat, avoid, or review next time?",
            ],
        ),
    )


def _format_manager_review(text: str, metadata: dict[str, Any]) -> str:
    if _has_heading(text):
        return text

    return _join_sections(
        _section("Manager review", text),
        _section(
            "Manager oversight checks",
            [
                "Is the concern, action, outcome, and follow-up clear?",
                "Does this indicate a one-off issue or an emerging pattern?",
                "Does the child’s plan, risk assessment, or support strategy need review?",
                "Is further oversight, supervision, audit, or escalation needed?",
            ],
        ),
    )


def _format_ofsted_view(text: str, metadata: dict[str, Any]) -> str:
    if _has_heading(text):
        return text

    return _join_sections(
        _section("Ofsted-aligned view", text),
        _section(
            "What an inspector may look for",
            [
                "The child’s lived experience.",
                "Clear evidence of impact.",
                "Safeguarding response and follow-up.",
                "Management oversight.",
                "Consistency between plans and daily practice.",
                "What is missing, vague, or unsupported.",
            ],
        ),
    )


def _format_reg45(text: str, metadata: dict[str, Any]) -> str:
    if _has_heading(text):
        return text

    return _join_sections(
        _section("Regulation 45 review", text),
        _section(
            "Reg 45 evaluation checks",
            [
                "What does the evidence show about the quality of care?",
                "What are the strengths and areas for development?",
                "What patterns are visible across records?",
                "What is the impact on children?",
                "What actions are needed, by whom, and how will progress be reviewed?",
            ],
        ),
    )


def _format_plan(text: str, metadata: dict[str, Any]) -> str:
    if _has_heading(text):
        return text

    return _join_sections(
        _section("Support plan", text),
        _section(
            "Plan checks",
            [
                "Is the child’s need clearly described?",
                "Are triggers, protective factors, and communication needs included?",
                "Are staff responses practical and consistent?",
                "Is review or escalation required?",
            ],
        ),
    )
