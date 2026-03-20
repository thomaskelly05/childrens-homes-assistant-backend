from __future__ import annotations

from typing import Any


SUPERVISION_THEMES = {
    "emotional_impact": [
        "the emotional impact of the work on the staff member",
        "what may still feel unresolved or sit heavily afterwards",
        "whether the staff member may need space to think, debrief, or feel supported",
    ],
    "decision_making": [
        "decision-making under pressure",
        "what informed the response at the time",
        "what felt clear and what felt uncertain in the moment",
    ],
    "relationship_based_practice": [
        "relationship-based practice",
        "how the interaction may have affected trust, safety, connection, or repair",
        "whether the response matched the child’s known needs, developmental presentation, and communication style",
    ],
    "team_consistency": [
        "consistency of team response",
        "whether expectations, boundaries, and follow-through were shared",
        "whether handover, planning, or communication gaps were present",
    ],
    "recording_and_accountability": [
        "quality of recording",
        "whether facts, concerns, and actions were clearly separated",
        "what might need stronger management oversight, safeguarding oversight, or clearer follow-up",
    ],
    "leadership_oversight": [
        "whether management oversight was strong enough",
        "whether support, review, direction, or escalation pathways were clear",
        "whether the home’s response reflected good leadership and management oversight",
    ],
    "learning_and_next_steps": [
        "what can be carried forward into future practice",
        "what may need review in plans, routines, risk tools, or team communication",
        "what support, learning, or follow-up may be needed next",
    ],
}


REFLECTIVE_MODES = {"supervision", "manager_review", "reflective"}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _contains_any(text: str, words: list[str]) -> bool:
    return any(word in text for word in words)


def _select_supervision_themes(message: str, mode: str, safeguarding_level: str) -> list[str]:
    text = _safe_string(message).lower()
    selected: list[str] = []

    if mode in {"supervision", "reflective"}:
        selected.extend([
            "emotional_impact",
            "decision_making",
            "learning_and_next_steps",
        ])

    if mode == "manager_review":
        selected.extend([
            "decision_making",
            "recording_and_accountability",
            "leadership_oversight",
            "learning_and_next_steps",
        ])

    if _contains_any(text, ["team", "handover", "inconsistent", "consistency", "staff response", "mixed messages"]):
        selected.append("team_consistency")

    if _contains_any(text, ["record", "write up", "incident", "chronology", "factual", "log", "body map", "daily log"]):
        selected.append("recording_and_accountability")

    if _contains_any(text, ["relationship", "attachment", "trust", "repair", "communication", "connection"]):
        selected.append("relationship_based_practice")

    if safeguarding_level in {"heightened", "urgent"}:
        selected.append("recording_and_accountability")
        selected.append("decision_making")
        selected.append("leadership_oversight")

    # preserve order, remove duplicates
    seen = set()
    ordered = []
    for item in selected:
        if item not in seen:
            seen.add(item)
            ordered.append(item)

    if not ordered:
        ordered = ["decision_making", "learning_and_next_steps"]

    return ordered[:5]


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

    if mode not in REFLECTIVE_MODES:
        return ""

    themes = _select_supervision_themes(message, mode, safeguarding_level)

    lines = [
        "Where useful, shape part of the response so it could support reflective supervision, management discussion, or practice oversight.",
        "Keep the tone calm, professionally grounded, and non-accusatory.",
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
        lines.append("• Reflective or supervisory thinking must not blur immediate action, reporting, or accountability.")
        lines.append("• Where there may be risk, allegation, injury, or significant concern, practical safeguarding action takes priority over reflective exploration.")

    return "\n".join(lines).strip()
