from __future__ import annotations

from typing import Any


REFLECTIVE_QUESTIONS = [
    "What part of the situation stands out most when you think back on it?",
    "What do you notice about how you felt in that moment?",
    "What do you think felt most uncertain or difficult in the situation?",
    "When you reflect on the interaction now, what seems most important?",
    "What do you think you were noticing about the young person's behaviour at the time?",
    "What part of the experience stayed with you afterwards?",
    "What do you feel you might want to understand better about what happened?",
    "Sometimes it helps to slow the moment down — what do you remember noticing first?",
    "If you were exploring this in supervision, what part of the situation might you want to talk through?",
    "What do you think you might want to reflect on further?",
]

MODE_REFLECTION_HINTS = {
    "reflective": [
        "Support reflective thinking without becoming vague.",
        "Acknowledge emotional and relational complexity where relevant.",
        "Help the user notice what stood out, what felt difficult, and what may need further thought.",
    ],
    "supervision": [
        "Shape reflection in a way that would be useful in supervision.",
        "Help identify themes worth discussing with a manager or supervisor.",
        "Keep the reflection professionally grounded and workable.",
    ],
    "manager_review": [
        "Support reflective oversight without becoming critical for the sake of it.",
        "Notice patterns, tensions, drift, or learning points where relevant.",
    ],
}

SAFEGUARDING_REFLECTION_HINTS = {
    "normal": [],
    "watchful": [
        "Keep reflection anchored to facts and professional curiosity.",
        "Avoid speculation where safeguarding concerns may be emerging.",
    ],
    "heightened": [
        "Keep reflective content carefully bounded.",
        "Do not let reflection blur recording, escalation, or safeguarding responsibilities.",
        "Support calm thinking while keeping risk visible.",
    ],
    "urgent": [
        "Do not over-prioritise reflection where urgent safety action is needed.",
        "Any reflective content must stay secondary to immediate safety and escalation.",
    ],
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _pick_reflective_questions(message: str, max_questions: int = 3) -> list[str]:
    text = _safe_string(message).lower()

    tailored = []

    if any(word in text for word in ["unsure", "not sure", "uncertain", "difficult", "challenging"]):
        tailored.append("What do you think felt most uncertain or difficult in the situation?")

    if any(word in text for word in ["felt", "feel", "upset", "overwhelmed", "stayed with me"]):
        tailored.append("What do you notice about how you felt in that moment?")
        tailored.append("What part of the experience stayed with you afterwards?")

    if any(word in text for word in ["supervision", "debrief", "reflect", "reflection"]):
        tailored.append("If you were exploring this in supervision, what part of the situation might you want to talk through?")

    if any(word in text for word in ["incident", "interaction", "argument", "restraint", "missing", "injury"]):
        tailored.append("Sometimes it helps to slow the moment down — what do you remember noticing first?")
        tailored.append("When you reflect on the interaction now, what seems most important?")

    if not tailored:
        tailored = REFLECTIVE_QUESTIONS[:]

    # keep order, remove duplicates
    seen = set()
    result = []
    for q in tailored + REFLECTIVE_QUESTIONS:
        if q not in seen:
            seen.add(q)
            result.append(q)
        if len(result) >= max_questions:
            break

    return result


def maybe_build_reflection_context(
    message: str,
    mode: str,
    safeguarding_level: str = "normal",
    history: list[dict[str, Any]] | None = None,
) -> str:
    """
    Builds reflection context for the main assistant prompt.
    Returns an empty string unless reflective framing would genuinely help.
    """

    if mode not in {"reflective", "supervision", "manager_review"}:
        return ""

    questions = _pick_reflective_questions(message, max_questions=3)
    mode_hints = MODE_REFLECTION_HINTS.get(mode, [])
    safeguarding_hints = SAFEGUARDING_REFLECTION_HINTS.get(safeguarding_level, [])

    lines = [
        "Use reflective support where it genuinely helps this response.",
        "Do not let reflective content prevent practical task completion.",
    ]

    lines.extend(mode_hints)
    lines.extend(safeguarding_hints)

    if questions:
        lines.append("")
        lines.append("Useful reflective questions for this request:")
        for q in questions:
            lines.append(f"• {q}")

    return "\n".join(lines).strip()
