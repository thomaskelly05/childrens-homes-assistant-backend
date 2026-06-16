"""Adult identity, record-heading and live-output wording discipline for ORB Residential."""

from __future__ import annotations

import re
from typing import Any

ADULT_IDENTITY_PRINCIPLE = (
    "Do not default to 'staff' in child records. Where adult initials are supplied, use Adult [initials] "
    "(for example Adult TK, Adult JS). Where initials are not supplied, use 'the adult' or 'adults'. "
    "Do not invent initials. Ask for initials or use generic adult wording. "
    "If roles are supplied without initials, use the waking night adult, the shift lead, the Registered Manager "
    "or the key worker only where appropriate."
)

SELF_COMMENTARY_PRINCIPLE = (
    "When creating a record, provide the record itself. Do not add a self-assessment or explanation after the record "
    "unless the user explicitly asks why the wording is better or requests commentary."
)

RECORD_HEADING_DISCIPLINE_PRINCIPLE = (
    "Match headings to the record type requested. Daily records use headings such as Daily Record, "
    "Presentation and Support, Child's Voice / Presentation, Adult Response, and Outcome / Handover. "
    "Do not use Incident Summary, Incident or Behaviour Incident for daily records unless the user asked "
    "for an incident record."
)

DAILY_RECORD_HEADINGS: tuple[str, ...] = (
    "Daily Record",
    "Presentation and Support",
    "Child's Voice / Presentation",
    "Adult Response",
    "Outcome / Handover",
)

INCIDENT_RECORD_HEADINGS: tuple[str, ...] = (
    "Incident Reflection",
    "Brief summary",
    "What was observed",
    "Adult response and de-escalation",
    "Outcome / follow-up",
)

HANDOVER_RECORD_HEADINGS: tuple[str, ...] = (
    "Handover Note",
    "Child's current presentation",
    "Risks or vulnerabilities for next shift",
    "What helped today",
    "Management or safeguarding notes",
)

THERAPEUTIC_RECORDING_PHRASES: tuple[str, ...] = (
    "gave Child A space",
    "did not place pressure on Child A to speak",
    "checked in gently",
    "remained nearby",
    "offered reassurance",
    "acknowledged what Child A shared",
    "supported Child A's sense of safety and choice",
    "appeared calmer",
    "this was handed over",
    "if Child A wishes to talk",
)

OBSERVATION_VS_INTERPRETATION_GUIDANCE: tuple[str, ...] = (
    "Use 'appeared calmer' rather than 'mood improved' unless the input states mood improved.",
    "Use 'appeared more settled' rather than 'was relaxed' or 'seemed relaxed'.",
    "Do not state internal emotion as fact unless the child said it.",
    "Preserve direct quotes with 'said'.",
    "Use 'appeared', 'was observed', 'not yet known' for presentation.",
)

_ADULT_INITIALS_PATTERN = re.compile(r"\bAdult\s+([A-Z]{1,3})\b")
_ROLE_WITHOUT_INITIALS_PATTERN = re.compile(
    r"\b(the waking night adult|the shift lead|the registered manager|the key worker)\b",
    re.I,
)
_DAILY_RECORD_REQUEST = re.compile(
    r"\b(?:create|write|draft|turn|make)\b.{0,40}\b(?:a\s+)?daily\s+record\b",
    re.I,
)
_INCIDENT_RECORD_REQUEST = re.compile(
    r"\b(?:incident\s+(?:record|report|reflection|summary)|behaviour\s+incident|record\s+an?\s+incident)\b",
    re.I,
)
_EXPLANATION_REQUEST = re.compile(
    r"\b(?:why\s+is\s+this\b.+?\bwording\s+better|why\s+is\s+this\s+better|"
    r"explain\s+(?:the\s+)?(?:wording|record)|why\s+did\s+you\s+(?:write|choose))\b",
    re.I,
)

_SELF_COMMENTARY_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\bthis\s+record\s+(?:maintains|uses|demonstrates|reflects)\s+(?:a\s+)?(?:factual|child-centred|therapeutic)",
        re.I,
    ),
    re.compile(r"\bthe\s+(?:above\s+)?record\s+is\s+(?:factual|child-centred|therapeutic|professional)\b", re.I),
    re.compile(r"\bthis\s+(?:draft\s+)?(?:is|remains)\s+(?:factual|child-centred|therapeutic)\b", re.I),
    re.compile(r"\bI\s+have\s+(?:written|created|maintained)\s+(?:a\s+)?(?:factual|child-centred)\b", re.I),
)

_OBSERVATION_INTERPRETATION_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\bmood\s+improved\b", re.I), "appeared calmer"),
    (re.compile(r"\bseemed\s+relaxed\b", re.I), "appeared more settled"),
    (re.compile(r"\bwas\s+relaxed\b", re.I), "appeared more settled"),
    (re.compile(r"\bseemed\s+calmer\b", re.I), "appeared calmer"),
)

_STAFF_TO_ADULT_RE = re.compile(r"\bStaff\b")


def extract_supplied_adult_initials(text: str) -> list[str]:
    """Return Adult XX initials explicitly supplied in input — never invent."""
    seen: list[str] = []
    for match in _ADULT_INITIALS_PATTERN.finditer(str(text or "")):
        initial = match.group(1).upper()
        if initial not in seen:
            seen.append(initial)
    return seen


def resolve_adult_reference(*, initials: list[str], index: int = 0, plural: bool = False) -> str:
    if initials:
        label = f"Adult {initials[index % len(initials)]}"
        return label
    return "adults" if plural else "the adult"


def apply_adult_identity_language(text: str, *, supplied_initials: list[str] | None = None) -> str:
    """Replace generic Staff defaults with supplied Adult XX or the adult/adults."""
    value = str(text or "")
    if not value.strip():
        return value
    initials = supplied_initials if supplied_initials is not None else extract_supplied_adult_initials(value)
    if initials:
        primary = f"Adult {initials[0]}"

        def _replace_staff(match: re.Match[str]) -> str:
            return primary

        return _STAFF_TO_ADULT_RE.sub(_replace_staff, value)
  # No initials — prefer the adult wording unless Staff is in original user context
    return _STAFF_TO_ADULT_RE.sub("The adult", value)


def sanitize_observation_interpretation_language(text: str) -> str:
    """Reframe over-interpretive presentation wording into factual observation language."""
    result = str(text or "")
    for pattern, replacement in _OBSERVATION_INTERPRETATION_REPLACEMENTS:
        result = pattern.sub(replacement, result)
    return result


def sanitize_live_record_output(text: str, *, source_text: str = "") -> str:
    """Apply adult identity and observation/interpretation discipline to record output."""
    initials = extract_supplied_adult_initials(source_text)
    cleaned = sanitize_observation_interpretation_language(text)
    if initials or _STAFF_TO_ADULT_RE.search(cleaned):
        cleaned = apply_adult_identity_language(cleaned, supplied_initials=initials)
    return cleaned


def is_daily_record_request(text: str) -> bool:
    lowered = str(text or "").lower()
    if _DAILY_RECORD_REQUEST.search(text or ""):
        return True
    if "daily record" in lowered and any(
        verb in lowered for verb in ("create", "write", "draft", "from the following", "rough notes")
    ):
        return True
    return False


def is_incident_record_request(text: str) -> bool:
    return bool(_INCIDENT_RECORD_REQUEST.search(str(text or "")))


def user_explicitly_requests_explanation(text: str) -> bool:
    return bool(_EXPLANATION_REQUEST.search(str(text or "")))


def is_self_commentary_paragraph(text: str) -> bool:
    """Detect post-record self-assessment paragraphs that should not appear by default."""
    value = str(text or "").strip()
    if not value:
        return False
    return any(pattern.search(value) for pattern in _SELF_COMMENTARY_PATTERNS)


def headings_for_record_context(
    *,
    prompt_text: str = "",
    record_type: str | None = None,
) -> list[str]:
    rt = (record_type or "").strip().lower()
    if rt in {"daily_record", "general_dictation"} or (
        not rt and is_daily_record_request(prompt_text) and not is_incident_record_request(prompt_text)
    ):
        return list(DAILY_RECORD_HEADINGS)
    if rt in {"incident_report", "behaviour_reflection", "physical_intervention"} or is_incident_record_request(
        prompt_text
    ):
        return list(INCIDENT_RECORD_HEADINGS)
    if rt == "handover":
        return list(HANDOVER_RECORD_HEADINGS)
    return list(DAILY_RECORD_HEADINGS)


def build_adult_identity_prompt_block() -> str:
    lines = [
        "============================================================",
        "ADULT IDENTITY LANGUAGE",
        "",
        ADULT_IDENTITY_PRINCIPLE,
        "",
        "Examples:",
        "• Adult TK gave Child A space and did not place pressure on them to speak before they were ready.",
        "• Adult JS checked in later in a calm and gentle way.",
        "• Adults continued to offer reassurance.",
        "• The adult handed over to the next shift that tomorrow's adults should check in gently if Child A wishes to talk.",
        "",
        RECORD_HEADING_DISCIPLINE_PRINCIPLE,
        "",
        "Daily record headings (when a daily record is requested):",
        *[f"• {heading}" for heading in DAILY_RECORD_HEADINGS],
        "",
        SELF_COMMENTARY_PRINCIPLE,
        "",
        "Therapeutic relational wording (use where supported by input — do not invent):",
        *[f"• {phrase}" for phrase in THERAPEUTIC_RECORDING_PHRASES],
        "",
        "Observation vs interpretation:",
        *[f"• {rule}" for rule in OBSERVATION_VS_INTERPRETATION_GUIDANCE],
    ]
    return "\n".join(lines)


def scaffold_heading_for_scenario(scenario: dict[str, Any]) -> str:
    record_type = str(scenario.get("record_type") or "")
    family = str(scenario.get("scenario_family") or "")
    title = str(scenario.get("title") or scenario.get("id") or "Record")
    if record_type == "daily_record" or family == "daily_care":
        if re.search(r"\bincident\b", title, re.I):
            return "Daily Record"
        return title if re.search(r"\bdaily\s+record\b", title, re.I) else "Daily Record"
    if record_type in {"incident_report", "behaviour_reflection", "physical_intervention"}:
        return title
    if record_type == "handover" or family == "handover":
        return "Handover Note" if "handover" not in title.lower() else title
    return title


def daily_scaffold_section_headings() -> list[tuple[str, str]]:
    """Section key to heading label for daily_care scaffold outputs."""
    return [
        ("presentation", "Presentation and Support"),
        ("child_voice", "Child's Voice / Presentation"),
        ("adult_response", "Adult Response"),
        ("outcome", "Outcome / Handover"),
    ]
