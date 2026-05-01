from __future__ import annotations

from typing import Any, Literal


AssistantMode = Literal[
    "guidance",
    "recording",
    "rewrite",
    "handover",
    "incident",
    "chronology",
    "safeguarding",
    "reflection",
    "mentor",
    "supervision",
    "manager_review",
    "ofsted_view",
    "reg45",
    "planning",
    "support_plan",
    "knowledge",
]


# -----------------------------------------------------
# MODE KEYWORDS (INTENT DETECTION)
# -----------------------------------------------------
MODE_KEYWORDS = {
    "recording": [
        "write",
        "record",
        "log",
        "daily note",
        "daily log",
        "entry",
    ],
    "rewrite": [
        "rewrite",
        "reword",
        "improve wording",
        "make professional",
    ],
    "handover": [
        "handover",
        "shift handover",
    ],
    "incident": [
        "incident",
        "what happened",
        "incident report",
    ],
    "chronology": [
        "chronology",
        "timeline",
    ],
    "safeguarding": [
        "safeguarding",
        "concern",
        "bruise",
        "injury",
        "risk",
        "missing",
        "exploitation",
        "allegation",
        "disclosure",
    ],
    "reflection": [
        "reflect",
        "reflection",
        "what could i have done",
        "learning",
    ],
    "mentor": [
        "advice",
        "how should i handle",
        "what should i do",
    ],
    "supervision": [
        "supervision",
        "supervise",
        "development",
    ],
    "manager_review": [
        "manager",
        "review",
        "oversight",
        "audit",
    ],
    "ofsted_view": [
        "ofsted",
        "inspection",
        "sccif",
    ],
    "reg45": [
        "reg 45",
        "reg45",
        "quality of care review",
    ],
    "planning": [
        "plan",
        "strategy",
    ],
    "support_plan": [
        "risk assessment",
        "support plan",
        "care plan",
    ],
    "knowledge": [
        "what is",
        "explain",
        "definition",
        "law",
        "regulation",
    ],
}


# -----------------------------------------------------
# PRIORITY ORDER (CRITICAL FOR SAFETY + OFSTED)
# -----------------------------------------------------
MODE_PRIORITY = [
    "safeguarding",
    "incident",
    "chronology",
    "handover",
    "recording",
    "rewrite",
    "manager_review",
    "ofsted_view",
    "reg45",
    "support_plan",
    "planning",
    "reflection",
    "supervision",
    "mentor",
    "knowledge",
    "guidance",
]


# -----------------------------------------------------
# MODE DESCRIPTION (FOR DEBUG / EXPLAINABILITY)
# -----------------------------------------------------
MODE_DESCRIPTIONS = {
    "guidance": "General practice guidance and advice",
    "recording": "Professional record writing",
    "rewrite": "Improve wording professionally",
    "handover": "Shift handover summaries",
    "incident": "Incident recording and analysis",
    "chronology": "Timeline / event sequence",
    "safeguarding": "Safeguarding-focused response",
    "reflection": "Reflective practice support",
    "mentor": "Supportive staff guidance",
    "supervision": "Supervision and development support",
    "manager_review": "Management oversight and audit",
    "ofsted_view": "Inspection and Ofsted-aligned view",
    "reg45": "Regulation 45 quality of care review",
    "planning": "General planning support",
    "support_plan": "Structured care/support planning",
    "knowledge": "Factual / regulatory knowledge",
}


# -----------------------------------------------------
# HELPERS
# -----------------------------------------------------
def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _score_mode(message: str, keywords: list[str]) -> int:
    score = 0
    for kw in keywords:
        if kw in message:
            score += 2 if len(kw.split()) > 1 else 1
    return score


# -----------------------------------------------------
# MODE DETECTION
# -----------------------------------------------------
def detect_mode(message: str) -> AssistantMode:
    text = _safe_string(message).lower()

    if not text:
        return "guidance"

    scores: dict[str, int] = {}

    for mode, keywords in MODE_KEYWORDS.items():
        score = _score_mode(text, keywords)
        if score > 0:
            scores[mode] = score

    if not scores:
        return "guidance"

    # sort by score then priority
    sorted_modes = sorted(
        scores.items(),
        key=lambda x: (-x[1], MODE_PRIORITY.index(x[0]) if x[0] in MODE_PRIORITY else 999),
    )

    return sorted_modes[0][0]  # best match


# -----------------------------------------------------
# CONTEXT-AWARE MODE OVERRIDE
# -----------------------------------------------------
def resolve_mode(
    *,
    message: str,
    user_context: dict[str, Any] | None = None,
    runtime: dict[str, Any] | None = None,
) -> AssistantMode:
    user_context = user_context or {}
    runtime = runtime or {}

    detected = detect_mode(message)

    # 🔴 SAFEGUARDING OVERRIDE
    safeguarding_level = _safe_string(runtime.get("safeguarding_level")).lower()
    if safeguarding_level in {"urgent", "heightened"}:
        return "safeguarding"

    # 🔴 REPORT / REG45 OVERRIDE
    report_type = _safe_string(user_context.get("report_type")).lower()
    if report_type in {"reg45", "quality_of_care"}:
        return "reg45"

    # 🔴 OS EVIDENCE CONTEXT
    if user_context.get("requires_evidence_grounding"):
        if detected in {"knowledge", "guidance"}:
            return "manager_review"

    return detected


# -----------------------------------------------------
# MODE METADATA (FOR UI / LOGGING / DEBUGGING)
# -----------------------------------------------------
def get_mode_metadata(mode: AssistantMode) -> dict[str, Any]:
    return {
        "mode": mode,
        "description": MODE_DESCRIPTIONS.get(mode, ""),
        "priority": MODE_PRIORITY.index(mode) if mode in MODE_PRIORITY else None,
    }
