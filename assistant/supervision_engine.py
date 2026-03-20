from __future__ import annotations

from typing import Any


SUPERVISION_THEMES = {
    "emotional_impact": [
        "emotional impact of the work",
        "how the experience sat with the staff member",
        "what may still feel unresolved",
    ],
    "decision_making": [
        "decision-making under pressure",
        "what informed the response at the time",
        "what felt clear and what felt uncertain",
    ],
    "relationship_based_practice": [
        "relationship-based practice",
        "how the interaction may have affected trust, safety, or connection",
        "whether the response matched the child’s known needs and communication style",
    ],
    "team_consistency": [
        "consistency of team response",
        "whether there were shared expectations and follow-through",
        "whether handover or planning gaps were present",
    ],
    "recording_and_accountability": [
        "quality of recording",
        "whether facts, concerns, and actions were clearly separated",
        "what might need stronger management or safeguarding oversight",
    ],
    "learning_and_next_steps": [
        "what can be carried forward",
        "what may need review in plans, routines, risk tools, or team communication",
        "what support the staff member may need next",
    ],
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _select_supervision_themes(message: str, mode: str, safeguarding_level: str) -> list[str]:
    text = _safe_string(message).lower()
    selected = []

    if mode in {"supervision", "manager_review", "reflective"}:
        selected.extend([
            "emotional_impact",
            "decision_making",
            "learning_and_next_steps",
        ])

    if any(word in text for word in ["team", "handover", "inconsistent", "consistency", "staff response"]):
        selected.append("team_consistency")

    if any(word in text for word in ["record", "write up", "incident", "chronology", "factual", "log"]):
        selected.append("recording_and_accountability")

    if any(word in text for word in ["relationship", "attachment", "trust", "repair", "communication"]):
        selected.append("relationship_based_practice")

    if safeguarding_level in {"heightened", "urgent"}:
        selected.append("recording_and_accountability")
        selected.append("decision_making")

    # preserve order, remove duplicates
    seen = set()
    ordered = []
    for item in selected:
        if item not in seen:
            seen.add(item)
            ordered.append(item)

    if not ordered:
        ordered = ["decision_making", "learning_and_next_steps"]

    return ordered[:4]


def maybe_build_supervision_context(
    message: str,
    mode: str,
    safeguarding_level: str = "normal",
    history: list[dict[str, Any]] | None = None,
) -> str:
    """
    Builds supervision-oriented context for the main assistant prompt.
    Returns empty string unless supervision-style framing is likely to help.
    """

    if mode not in {"supervision", "manager_review", "reflective"}:
        return ""

    themes = _select_supervision_themes(message, mode, safeguarding_level)

    lines = [
        "Where useful, shape part of the response so it could support reflective supervision or management discussion.",
        "Keep the tone neutral, professionally grounded, and non-accusatory.",
        "Do not diagnose, over-interpret, or speculate beyond the information provided.",
        "Do not let supervision framing replace practical task completion if the user has asked for a concrete output.",
        "",
        "Potential supervision / management discussion themes:",
    ]

    for theme in themes:
        theme_points = SUPERVISION_THEMES.get(theme, [])
        lines.append(f"• {theme.replace('_', ' ').title()}:")
        for point in theme_points:
            lines.append(f"  - {point}")

    if safeguarding_level in {"heightened", "urgent"}:
        lines.append("")
        lines.append("Additional caution:")
        lines.append("• Keep safeguarding responsibilities, escalation, and factual recording clear.")
        lines.append("• Reflective or supervisory thinking must not blur immediate action or accountability.")

    return "\n".join(lines).strip()
