import re


MODE_KEYWORDS = {
    "factual": [
        "how often",
        "timescale",
        "statutory",
        "regulation",
        "requirement",
        "legal",
        "policy",
        "guidance",
        "ofsted",
        "review frequency",
        "lac review",
        "pep",
        "supervision frequency",
        "quality standard",
        "children's homes regulations",
        "childrens homes regulations",
        "sccif",
    ],
    "handover": [
        "handover",
        "shift handover",
        "end of shift",
        "pass on",
        "what should i hand over",
    ],
    "recording": [
        "daily log",
        "record this",
        "write this up",
        "log entry",
        "body map",
        "bruise",
        "injury",
        "observation",
        "recording",
        "incident record",
        "factual record",
    ],
    "incident_summary": [
        "incident summary",
        "incident report",
        "summarise the incident",
        "summary of incident",
        "review this incident",
    ],
    "chronology": [
        "chronology",
        "timeline",
        "sequence of events",
        "put this in order",
    ],
    "support_planning": [
        "support plan",
        "care plan",
        "risk assessment",
        "strategy",
        "how should we support",
        "support this child",
        "plan for",
        "routine plan",
        "transition plan",
        "communication profile",
    ],
    "manager_review": [
        "manager update",
        "manager summary",
        "as a manager",
        "review this as a manager",
        "audit this",
        "quality check this",
        "what would ofsted think",
    ],
    "rewrite": [
        "rewrite",
        "make this better",
        "improve this",
        "make this more professional",
        "reword",
        "phrase this better",
        "clean this up",
    ],
    "reflective": [
        "i felt",
        "i feel",
        "i'm unsure",
        "i am unsure",
        "not sure",
        "difficult",
        "challenging",
        "what should i think",
        "how should i think",
        "what could i have done",
        "what can i learn",
        "reflection",
        "reflect",
        "supervision",
        "debrief",
    ],
}


PRIORITY_ORDER = [
    "factual",
    "handover",
    "recording",
    "incident_summary",
    "chronology",
    "support_planning",
    "manager_review",
    "rewrite",
    "reflective",
]


def _contains_phrase(text: str, phrase: str) -> bool:
    return phrase in text


def _score_mode(text: str, keywords: list[str]) -> int:
    return sum(1 for kw in keywords if _contains_phrase(text, kw))


def detect_mode(message: str) -> str:
    """
    Determines which primary response mode IndiCare should use.

    Returns one of:
    - factual
    - handover
    - recording
    - incident_summary
    - chronology
    - support_planning
    - manager_review
    - rewrite
    - reflective
    - practical
    """

    text = (message or "").lower().strip()

    if not text:
        return "practical"

    # strong direct pattern matches first
    if re.search(r"\b(write|draft)\b.*\bhandover\b", text):
        return "handover"

    if re.search(r"\b(write|draft)\b.*\b(incident|incident report|incident summary)\b", text):
        return "incident_summary"

    if re.search(r"\b(write|draft|create)\b.*\b(chronology|timeline)\b", text):
        return "chronology"

    if re.search(r"\b(audit|quality check|manager review)\b", text) or "what would ofsted think" in text:
        return "manager_review"

    if re.search(r"\b(rewrite|reword|improve)\b", text):
        return "rewrite"

    scores = {
        mode: _score_mode(text, keywords)
        for mode, keywords in MODE_KEYWORDS.items()
    }

    best_score = max(scores.values()) if scores else 0
    if best_score == 0:
        return "practical"

    # if multiple modes tie, use priority order
    tied_modes = [mode for mode, score in scores.items() if score == best_score]

    for mode in PRIORITY_ORDER:
        if mode in tied_modes:
            return mode

    return "practical"
