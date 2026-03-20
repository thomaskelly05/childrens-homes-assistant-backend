from __future__ import annotations

from typing import Any


# ---------------------------------------------------------
# Real-time safeguarding triage
# ---------------------------------------------------------

URGENT_KEYWORDS = [
    "not breathing",
    "unconscious",
    "collapsed",
    "overdose",
    "suicide attempt",
    "trying to kill themselves",
    "trying to kill himself",
    "trying to kill herself",
    "severe bleeding",
    "bleeding heavily",
    "ambulance",
    "life threatening",
    "medical emergency",
    "seizure",
]

HEIGHTENED_KEYWORDS = [
    "self harm",
    "self-harm",
    "cutting",
    "cut herself",
    "cut himself",
    "burned themselves",
    "suicidal",
    "suicide note",
    "wants to die",
    "kill myself",
    "kill himself",
    "kill herself",
    "missing from home",
    "gone missing",
    "abscond",
    "ran away",
    "sexual exploitation",
    "criminal exploitation",
    "cse",
    "cce",
    "allegation against staff",
    "staff allegation",
    "physical assault",
    "serious injury",
    "restraint concern",
    "restrictive practice",
    "neglect",
    "serious violence",
    "weapon",
    "police called",
]

WATCHFUL_KEYWORDS = [
    "bruise",
    "mark",
    "injury",
    "unexplained injury",
    "unexplained bruise",
    "concern",
    "worried",
    "distressed",
    "withdrawn",
    "change in behaviour",
    "not eating",
    "poor sleep",
    "awake all night",
    "fearful",
    "anxious",
    "low mood",
    "unsafe relationship",
]


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(keyword in text for keyword in keywords)


def assess_safeguarding_level(message: str, history: list[dict[str, Any]] | None = None) -> str:
    """
    Assess immediate safeguarding concern level for live assistant routing.

    Returns one of:
    - normal
    - watchful
    - heightened
    - urgent
    """

    parts = [(message or "").lower()]

    if history:
        for item in history[-6:]:
            content = (item.get("message") or "").lower().strip()
            if content:
                parts.append(content)

    text = " ".join(parts)

    if _contains_any(text, URGENT_KEYWORDS):
        return "urgent"

    if _contains_any(text, HEIGHTENED_KEYWORDS):
        return "heightened"

    if _contains_any(text, WATCHFUL_KEYWORDS):
        return "watchful"

    return "normal"


# ---------------------------------------------------------
# Pattern detection for reflection / supervision / review
# ---------------------------------------------------------

PATTERN_KEYWORDS = {
    "aggression": [
        "hit", "hitting", "punch", "punched", "kick", "kicked",
        "aggressive", "threatened", "violent", "violence"
    ],
    "missing_from_home": [
        "ran away", "missing", "abscond", "gone missing", "missing from home"
    ],
    "self_harm": [
        "cut", "cutting", "self harm", "self-harm", "hurt themselves",
        "hurt himself", "hurt herself", "burned themselves"
    ],
    "sleep_disruption": [
        "awake all night", "no sleep", "did not sleep", "poor sleep", "sleep disturbance"
    ],
    "emotional_distress": [
        "distressed", "overwhelmed", "tearful", "low mood", "shut down", "shutdown", "meltdown"
    ],
    "staff_burnout": [
        "exhausted", "overwhelmed", "burnout", "drained", "emotionally tired"
    ],
    "injury_concerns": [
        "bruise", "mark", "injury", "unexplained injury", "unexplained bruise"
    ],
    "safeguarding_concerns": [
        "concern", "safeguarding", "disclosure", "neglect", "allegation"
    ],
}


def detect_safeguarding_patterns(reflections: list[str]) -> list[dict[str, Any]]:
    """
    Detect recurring themes across multiple reflections, notes, or summaries.
    Useful for supervision, management review, and learning patterns.
    """

    text = " ".join((item or "") for item in reflections).lower()
    results: list[dict[str, Any]] = []

    for theme, words in PATTERN_KEYWORDS.items():
        count = 0

        for word in words:
            count += text.count(word)

        if count > 0:
            results.append({
                "theme": theme,
                "count": count
            })

    results.sort(key=lambda item: item["count"], reverse=True)
    return results


# backwards compatibility with your old function name
def detect_patterns(reflections: list[str]) -> list[dict[str, Any]]:
    return detect_safeguarding_patterns(reflections)
