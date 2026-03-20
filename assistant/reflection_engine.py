from __future__ import annotations

from typing import Any


REFLECTIVE_QUESTIONS = [
    "What part of the situation stands out most when you look back on it now?",
    "What do you notice about how you felt in that moment?",
    "What felt most uncertain, difficult, or emotionally loaded at the time?",
    "When you think back on the interaction, what seems most important now?",
    "What were you noticing about the young person, the environment, and the team around you at the time?",
    "What part of the experience stayed with you afterwards?",
    "What do you feel you may want to understand better about what happened?",
    "If you slow the moment down, what do you remember noticing first?",
    "If this came to supervision, what part of it would feel most important to talk through?",
    "What, if anything, do you think this situation may be asking the team to think about more carefully?",
]

MODE_REFLECTION_HINTS = {
    "reflective": [
        "Support reflective thinking without becoming vague or over-abstract.",
        "Acknowledge emotional and relational complexity where relevant.",
        "Help the user notice what stood out, what felt difficult, and what may need further thought.",
    ],
    "supervision": [
        "Shape reflection in a way that would be useful in supervision.",
        "Help identify themes, tensions, patterns, or questions worth exploring with a manager or supervisor.",
        "Keep the reflection grounded, professionally useful, and realistic.",
    ],
    "manager_review": [
        "Support reflective oversight without becoming critical for the sake of it.",
        "Notice patterns, drift, tensions, leadership issues, or learning points where relevant.",
        "Keep any reflective framing proportionate and tied to improvement.",
    ],
}

SAFEGUARDING_REFLECTION_HINTS = {
    "normal": [],
    "watchful": [
        "Keep reflection anchored to facts, curiosity, and careful observation.",
        "Avoid speculation where safeguarding concerns may be emerging.",
    ],
    "heightened": [
        "Keep reflective content carefully bounded.",
        "Do not let reflection blur recording, escalation, or safeguarding responsibilities.",
        "Support calm thinking while keeping risk, accountability, and next steps visible.",
    ],
    "urgent": [
        "Do not over-prioritise reflection where urgent safety action is needed.",
        "Any reflective content must stay secondary to immediate safety, medical needs, and escalation.",
    ],
}


EMOTION_WORDS = [
    "felt",
    "feel",
    "upset",
    "overwhelmed",
    "shaken",
    "angry",
    "frustrated",
    "stayed with me",
    "difficult",
    "challenging",
    "drained",
]

UNCERTAINTY_WORDS = [
    "unsure",
    "not sure",
    "uncertain",
    "didn't know",
    "did not know",
    "confused",
    "unclear",
]

INCIDENT_WORDS = [
    "incident",
    "interaction",
    "argument",
    "restraint",
    "missing",
    "injury",
    "bruise",
    "disclosure",
    "assault",
    "self harm",
    "self-harm",
]

TEAM_WORDS = [
    "team",
    "staff",
    "colleague",
    "manager",
    "handover",
    "consistency",
]

SUPERVISION_WORDS = [
    "supervision",
    "debrief",
    "reflect",
    "reflection",
    "learning",
]


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _contains_any(text: str, words: list[str]) -> bool:
    return any(word in text for word in words)


def _pick_reflective_questions(
    message: str,
    mode: str,
    safeguarding_level: str,
    max_questions: int = 3,
) -> list[str]:
    text = _safe_string(message).lower()
    tailored: list[str] = []

    if _contains_any(text, UNCERTAINTY_WORDS):
        tailored.append("What felt most uncertain, difficult, or emotionally loaded at the time?")

    if _contains_any(text, EMOTION_WORDS):
        tailored.append("What do you notice about how you felt in that moment?")
        tailored.append("What part of the experience stayed with you afterwards?")

    if _contains_any(text, INCIDENT_WORDS):
        tailored.append("If you slow the moment down, what do you remember noticing first?")
        tailored.append("When you think back on the interaction, what seems most important now?")

    if _contains_any(text, TEAM_WORDS) or mode in {"manager_review", "supervision"}:
        tailored.append("What, if anything, do you think this situation may be asking the team to think about more carefully?")

    if _contains_any(text, SUPERVISION_WORDS) or mode == "supervision":
        tailored.append("If this came to supervision, what part of it would feel most important to talk through?")

    # In heightened safeguarding, keep questions tighter and more bounded
    if safeguarding_level == "heightened":
        tailored.append("What needs to stay clearly factual, and what may need further thought later in supervision?")
    elif safeguarding_level == "urgent":
        tailored = [
            "What needs to happen immediately for safety, and what reflection can wait until later?",
        ]

    if not tailored:
        tailored = REFLECTIVE_QUESTIONS[:]

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

    questions = _pick_reflective_questions(
        message=message,
        mode=mode,
        safeguarding_level=safeguarding_level,
        max_questions=3 if safeguarding_level != "urgent" else 1,
    )

    mode_hints = MODE_REFLECTION_HINTS.get(mode, [])
    safeguarding_hints = SAFEGUARDING_REFLECTION_HINTS.get(safeguarding_level, [])

    lines = [
        "Use reflective support only where it genuinely helps this response.",
        "Do not let reflective content replace practical help, recording clarity, or safeguarding action.",
        "Keep any reflection connected to the actual situation described.",
    ]

    lines.extend(mode_hints)
    lines.extend(safeguarding_hints)

    if questions:
        lines.append("")
        lines.append("Useful reflective questions for this request:")
        for q in questions:
            lines.append(f"• {q}")

    return "\n".join(lines).strip()
