"""British children's home safeguarding terminology — residential defaults vs education-only DSL."""

from __future__ import annotations

import re

EDUCATION_SAFEGUARDING_CONTEXT_RE = re.compile(
    r"\b(?:school|college|education|kcsie|virtual\s+school|school\s+dsl|attendance|exclusion|"
    r"pep\b|sen\s+coordinator|headteacher|teacher|classroom|curriculum)\b",
    re.I,
)

DSL_IN_ANSWER_RE = re.compile(
    r"\b(?:DSL|Designated\s+Safeguarding\s+Lead|school\s+DSL)\b",
    re.I,
)

MEDICATION_ERROR_RE = re.compile(
    r"\b(?:medication\s+error|administration\s+error|so\s+the\s+error\s+is\s+not\s+repeated|"
    r"the\s+error\s+is\s+not\s+repeated)\b",
    re.I,
)
MEDICATION_ERROR_IN_PROMPT_RE = re.compile(
    r"\b(?:medication\s+error|wrong\s+dose|given\s+wrong|administration\s+error)\b",
    re.I,
)
MEDICATION_REFUSAL_IN_PROMPT_RE = re.compile(
    r"\b(?:refused\s+medication|refusing\s+medication|refuses\s+medication|medication\s+refusal|"
    r"won'?t\s+take\s+(?:their\s+)?(?:medication|medicine|meds|tablets))\b",
    re.I,
)

DIAGNOSIS_FIREWALL_EXCLUSION_RE = re.compile(
    r"\b(?:"
    r"(?:support|care|placement|behaviour|communication|sensory|education)\s+plan.{0,40}(?:changed|updated|reviewed|amended)|"
    r"(?:changed|updated|reviewed|amended).{0,40}(?:support|care|placement|behaviour|communication)\s+plan|"
    r"how\s+(?:should|to|do)\s+(?:staff|we|i)\s+record|"
    r"(?:daily\s+record|record\s+this|evidence.{0,40}voice)|"
    r"(?:gestures?|symbols?|aac).{0,40}(?:daily\s+record|record|evidence)|"
    r"communicate\s+mainly\s+through\s+(?:gestures?|symbols?)"
    r")\b",
    re.I,
)

RESIDENTIAL_ESCALATION_MANAGER = "manager / on-call manager"
RESIDENTIAL_ESCALATION_SAFEGUARDING = "manager / on-call manager / safeguarding lead"
RESIDENTIAL_ESCALATION_ALLEGATION = (
    "Registered Manager / on-call manager / LADO route and local allegations procedure"
)
RESIDENTIAL_ESCALATION_HEALTH = "health professional / NHS 111 / GP / emergency services where relevant"

DEFAULT_RESIDENTIAL_ROLES: tuple[str, ...] = (
    "manager",
    "on-call manager",
    "safeguarding lead",
    "Registered Manager",
    "Responsible Individual",
    "placing authority",
    "social worker",
    "LADO",
    "EDT",
    "police",
)


def is_education_safeguarding_context(text: str) -> bool:
    """True when the user prompt is explicitly about school/education safeguarding."""
    return bool(EDUCATION_SAFEGUARDING_CONTEXT_RE.search(str(text or "")))


def find_inappropriate_dsl_reference(answer: str, *, source_text: str = "") -> list[str]:
    """Return DSL/education-only safeguarding terms used outside an education context."""
    if is_education_safeguarding_context(source_text):
        return []
    hits: list[str] = []
    for match in DSL_IN_ANSWER_RE.finditer(str(answer or "")):
        term = match.group(0)
        if term not in hits:
            hits.append(term)
    return hits


def is_medication_refusal_prompt(text: str) -> bool:
    """True when the prompt is about medication refusal rather than a medication error."""
    source = str(text or "")
    if MEDICATION_ERROR_IN_PROMPT_RE.search(source):
        return False
    return bool(MEDICATION_REFUSAL_IN_PROMPT_RE.search(source))


def is_medication_error_prompt(text: str) -> bool:
    """True when the prompt explicitly describes a medication error."""
    return bool(MEDICATION_ERROR_IN_PROMPT_RE.search(str(text or "")))


def find_inappropriate_medication_error_reference(answer: str, *, source_text: str = "") -> list[str]:
    """Medication error wording is inappropriate unless the prompt mentions an error."""
    if MEDICATION_ERROR_IN_PROMPT_RE.search(str(source_text or "")):
        return []
    hits: list[str] = []
    for match in MEDICATION_ERROR_RE.finditer(str(answer or "")):
        term = match.group(0)
        if term not in hits:
            hits.append(term)
    return hits


def sanitize_medication_error_wording(answer: str, *, source_text: str = "") -> str:
    """Remove medication-error framing from refusal/routine health answers."""
    if MEDICATION_ERROR_IN_PROMPT_RE.search(str(source_text or "")):
        return str(answer or "")
    result = str(answer or "")
    replacements: tuple[tuple[re.Pattern[str], str], ...] = (
        (
            re.compile(
                r"review the handover system so the error is not repeated\.?",
                re.I,
            ),
            (
                "follow home medication policy, notify the manager or on-call manager as required, "
                "and monitor for health risks."
            ),
        ),
        (
            re.compile(r"\b(?:this may be|could be)\s+a\s+medication\s+error\b[^.!?]*[.!?]?", re.I),
            "Record the refusal on the MAR and follow home medication policy.",
        ),
        (re.compile(r"\bmedication\s+error\b", re.I), "medication concern"),
        (re.compile(r"\badministration\s+error\b", re.I), "administration concern"),
    )
    for pattern, replacement in replacements:
        result = pattern.sub(replacement, result)
    return result


def should_skip_diagnosis_firewall(message: str) -> bool:
    """Plan-change, recording and AAC child-voice prompts are not diagnosis requests."""
    return bool(DIAGNOSIS_FIREWALL_EXCLUSION_RE.search(str(message or "")))
