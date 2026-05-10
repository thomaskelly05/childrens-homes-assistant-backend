from __future__ import annotations

import re
from typing import Any


URGENT_KEYWORDS = [
    "not breathing",
    "unconscious",
    "collapsed",
    "overdose",
    "suicide attempt",
    "attempted suicide",
    "trying to kill themselves",
    "trying to kill himself",
    "trying to kill herself",
    "severe bleeding",
    "bleeding heavily",
    "ambulance",
    "life threatening",
    "life-threatening",
    "medical emergency",
    "seizure",
    "strangulation",
    "strangled",
    "hanging",
    "attempted hanging",
]

HEIGHTENED_KEYWORDS = [
    "self harm",
    "self-harm",
    "cutting",
    "suicidal",
    "suicide note",
    "wants to die",
    "want to die",
    "kill myself",
    "kill himself",
    "kill herself",
    "kill themselves",
    "missing from home",
    "gone missing",
    "absconded",
    "ran away",
    "sexual exploitation",
    "criminal exploitation",
    "cse",
    "cce",
    "county lines",
    "allegation against staff",
    "staff allegation",
    "staff hurt them",
    "physical assault",
    "assaulted",
    "serious injury",
    "restraint concern",
    "restrictive practice",
    "neglect",
    "serious violence",
    "weapon",
    "police called",
    "police attended",
    "disclosure",
    "disclosed",
    "exploitation",
    "child protection",
    "lado",
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
    "changed behaviour",
    "not eating",
    "poor sleep",
    "awake all night",
    "fearful",
    "anxious",
    "low mood",
    "unsafe relationship",
    "upset",
    "tearful",
    "shut down",
    "shutdown",
    "meltdown",
]

DISCLOSURE_PATTERNS = [
    r"\bsaid staff hurt (him|her|them)\b",
    r"\bsaid a staff member hurt (him|her|them)\b",
    r"\bdisclosed.*staff\b",
    r"\ballegation against staff\b",
    r"\bstaff member (hit|hurt|assaulted)\b",
]

URGENT_PATTERNS = [
    r"\btrying to kill (himself|herself|themselves)\b",
    r"\bnot breathing\b",
    r"\bunconscious\b",
    r"\bbleeding heavily\b",
    r"\blife[\s-]?threatening\b",
    r"\bmedical emergency\b",
    r"\boverdose\b",
    r"\bstrangl(ed|ation)\b",
]

HEIGHTENED_PATTERNS = [
    r"\bmissing from home\b",
    r"\bgone missing\b",
    r"\bran away\b",
    r"\bsexual exploitation\b",
    r"\bcriminal exploitation\b",
    r"\bself[\s-]?harm\b",
    r"\bkill (myself|himself|herself|themselves)\b",
    r"\bsuicid(al|e note)\b",
    r"\brestraint concern\b",
    r"\brestrictive practice\b",
    r"\bcounty lines\b",
    r"\b(cse|cce)\b",
]


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_text(
    message: str,
    history: list[dict[str, Any]] | None = None,
    limit: int = 6,
) -> str:
    parts = [_safe_string(message).lower()]

    if history:
        for item in history[-limit:]:
            if not isinstance(item, dict):
                continue

            content = _safe_string(item.get("message") or item.get("content")).lower()
            if content:
                parts.append(content)

    return " ".join(part for part in parts if part).strip()


def _contains_phrase(text: str, phrase: str) -> bool:
    phrase = phrase.lower().strip()

    if not phrase:
        return False

    if " " in phrase or "-" in phrase:
        return phrase in text

    pattern = rf"\b{re.escape(phrase)}\b"
    return re.search(pattern, text) is not None


def _contains_any(text: str, keywords: list[str]) -> bool:
    return any(_contains_phrase(text, keyword) for keyword in keywords)


def _matches_any_pattern(text: str, patterns: list[str]) -> bool:
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in patterns)


def assess_safeguarding_level(
    message: str,
    history: list[dict[str, Any]] | None = None,
) -> str:
    """
    Returns:
    - normal
    - watchful
    - heightened
    - urgent
    """
    text = _normalise_text(message, history)

    if not text:
        return "normal"

    if _matches_any_pattern(text, URGENT_PATTERNS) or _contains_any(
        text,
        URGENT_KEYWORDS,
    ):
        return "urgent"

    if _matches_any_pattern(text, DISCLOSURE_PATTERNS):
        return "heightened"

    if _matches_any_pattern(text, HEIGHTENED_PATTERNS) or _contains_any(
        text,
        HEIGHTENED_KEYWORDS,
    ):
        return "heightened"

    if _contains_any(text, WATCHFUL_KEYWORDS):
        return "watchful"

    return "normal"


PATTERN_KEYWORDS = {
    "aggression": [
        "hit",
        "hitting",
        "punch",
        "punched",
        "kick",
        "kicked",
        "aggressive",
        "threatened",
        "violent",
        "violence",
        "assault",
        "assaulted",
    ],
    "missing_from_home": [
        "ran away",
        "missing",
        "abscond",
        "absconded",
        "gone missing",
        "missing from home",
    ],
    "self_harm": [
        "cut",
        "cutting",
        "self harm",
        "self-harm",
        "hurt themselves",
        "hurt himself",
        "hurt herself",
        "burned themselves",
        "burnt themselves",
    ],
    "sleep_disruption": [
        "awake all night",
        "no sleep",
        "did not sleep",
        "poor sleep",
        "sleep disturbance",
    ],
    "emotional_distress": [
        "distressed",
        "overwhelmed",
        "tearful",
        "low mood",
        "shut down",
        "shutdown",
        "meltdown",
        "anxious",
        "fearful",
        "withdrawn",
    ],
    "staff_burnout": [
        "exhausted",
        "overwhelmed",
        "burnout",
        "drained",
        "emotionally tired",
    ],
    "injury_concerns": [
        "bruise",
        "mark",
        "injury",
        "unexplained injury",
        "unexplained bruise",
    ],
    "safeguarding_concerns": [
        "concern",
        "safeguarding",
        "disclosure",
        "disclosed",
        "neglect",
        "allegation",
    ],
}


def _count_matches(text: str, phrase: str) -> int:
    phrase = phrase.lower().strip()

    if not phrase:
        return 0

    if " " in phrase or "-" in phrase:
        return text.count(phrase)

    pattern = rf"\b{re.escape(phrase)}\b"
    return len(re.findall(pattern, text))


def detect_safeguarding_patterns(reflections: list[str]) -> list[dict[str, Any]]:
    text = " ".join(_safe_string(item) for item in reflections).lower().strip()
    results: list[dict[str, Any]] = []

    if not text:
        return results

    for theme, words in PATTERN_KEYWORDS.items():
        count = sum(_count_matches(text, word) for word in words)

        if count > 0:
            results.append(
                {
                    "theme": theme,
                    "count": count,
                }
            )

    results.sort(key=lambda item: item["count"], reverse=True)
    return results


def detect_patterns(reflections: list[str]) -> list[dict[str, Any]]:
    return detect_safeguarding_patterns(reflections)
