"""High-risk scenario scaffold generation for ORB Residential Quality Lab.

Deterministic static outputs for safeguarding and escalation scenarios.
Supports benchmark evaluation — not live LLM generation.
"""

from __future__ import annotations

import re
from typing import Any

_ESCALATION_SAFEGUARDING_FLAGS = frozenset(
    {"partial_disclosure", "escalation_required", "strategy_meeting", "escalation_pathway"}
)

_HIGH_RISK_RECORD_TYPES = frozenset(
    {
        "safeguarding_concern",
        "strategy_safeguarding_discussion",
        "missing_episode_note",
        "multi_agency_discussion",
    }
)

_PROFESSIONAL_JUDGEMENT_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\bno safeguarding concern\b", re.I),
        "no immediate safeguarding indicators reported — responsible adult to review",
    ),
    (
        re.compile(r"\bno further action(?: is)? needed\b", re.I),
        "follow-up to be confirmed by responsible adult",
    ),
    (
        re.compile(r"\bno concerns\b(?!\s+from)", re.I),
        "no concerns identified at this stage — responsible adult to review",
    ),
    (
        re.compile(r"\bthis is safe\b", re.I),
        "immediate safety appeared maintained — responsible adult to review",
    ),
    (
        re.compile(r"\bno need for (?:manager|dsl|mash)\b", re.I),
        "management oversight to be considered per local policy",
    ),
)

_FAMILY_ESCALATION_GUIDANCE: dict[str, str] = {
    "safeguarding": (
        "Follow the home's safeguarding procedure and inform the appropriate senior/manager without delay. "
        "Record what was said or observed, who was informed and what action was taken. "
        "Do not investigate beyond your role; preserve the child's words and follow local safeguarding pathways."
    ),
    "missing from care": (
        "Follow local missing-from-care procedure and inform manager/on-call without delay. "
        "Record chronology, welfare check and return conversation. "
        "Consider exploitation indicators and ensure required notifications are considered by responsible adults."
    ),
    "allegation": (
        "Follow allegation/safeguarding procedure immediately. "
        "Record facts without investigating beyond role. "
        "Inform designated safeguarding lead and manager per local policy."
    ),
    "handover": (
        "If safeguarding themes are present, ensure handover includes who was informed and what follow-up is required. "
        "Seek management oversight where concerns may indicate risk."
    ),
    "meetings": (
        "Record what was discussed factually. "
        "ORB supports reflection; adults remain responsible for professional decisions and escalation."
    ),
    "magic_notes": (
        "Safeguarding detail incomplete — record who was informed, escalation pathway followed and what remains unclear. "
        "Responsible adult to confirm any required notifications or referrals."
    ),
}

_DEFAULT_ESCALATION_GUIDANCE = (
    "Follow the home's safeguarding procedure and inform the appropriate senior/manager without delay. "
    "Record what was said or observed, who was informed and what action was taken. "
    "Seek management oversight and ensure any required notifications or referrals are considered by the responsible adults."
)

_ADULT_BOUNDARY_FOOTER = (
    "---\n"
    "Draft only — adult review required. "
    "This supports reflection and recording; it is not a safeguarding decision. "
    "Professional judgement and local policy apply."
)


def sanitize_professional_judgement_phrases(text: str) -> str:
    """Reframe phrases that replace professional judgement in scaffold outputs."""
    result = str(text or "")
    for pattern, replacement in _PROFESSIONAL_JUDGEMENT_REPLACEMENTS:
        result = pattern.sub(replacement, result)
    return result


def needs_safeguarding_escalation(scenario: dict[str, Any]) -> bool:
    """Whether scenario requires safeguarding escalation language in output."""
    safeguarding_flags = list(scenario.get("safeguarding_flags") or [])
    if any(f in _ESCALATION_SAFEGUARDING_FLAGS for f in safeguarding_flags):
        return True
    if str(scenario.get("scenario_family") or "") == "safeguarding":
        return True
    if str(scenario.get("record_type") or "") in _HIGH_RISK_RECORD_TYPES:
        return True
    if str(scenario.get("difficulty") or "") == "high-risk":
        regulatory = scenario.get("regulatory_context") or []
        if isinstance(regulatory, str):
            regulatory = [regulatory]
        high_risk_contexts = {"safeguarding", "missing from care", "allegation"}
        if any(c in high_risk_contexts for c in regulatory):
            return True
    variant_type = str(scenario.get("variant_type") or "")
    if variant_type == "safeguarding_escalation":
        return True
    return False


def _resolve_escalation_guidance(scenario: dict[str, Any]) -> str:
    regulatory = scenario.get("regulatory_context") or []
    if isinstance(regulatory, str):
        regulatory = [regulatory]
    family = str(scenario.get("scenario_family") or "")
    feature = str(scenario.get("feature_target") or "")

    for ctx in regulatory:
        key = str(ctx).lower()
        if key in _FAMILY_ESCALATION_GUIDANCE:
            return _FAMILY_ESCALATION_GUIDANCE[key]

    if family in _FAMILY_ESCALATION_GUIDANCE:
        return _FAMILY_ESCALATION_GUIDANCE[family]

    if feature == "Magic Notes":
        return _FAMILY_ESCALATION_GUIDANCE["magic_notes"]

    return _DEFAULT_ESCALATION_GUIDANCE


def _extract_child_voice_hint(input_text: str) -> str:
    lower = input_text.lower()
    if any(m in lower for m in ("young person said", "child said", "yp said", "they said", "disclosed", "shared")):
        return "Young person communicated as described above. Words used recorded where provided."
    return "Young person presentation: Not stated unless provided in input."


def build_high_risk_safeguarding_scaffold(scenario: dict[str, Any]) -> str:
    """Structured scaffold for high-risk safeguarding scenario families."""
    title = scenario.get("title") or scenario.get("id") or "Record"
    raw_input = str(scenario.get("input") or "").strip()
    input_text = sanitize_professional_judgement_phrases(raw_input)
    escalation = _resolve_escalation_guidance(scenario)
    child_voice = _extract_child_voice_hint(input_text)
    variant_type = str(scenario.get("variant_type") or "")

    magic_notes_prompt = ""
    if variant_type in {"rough_note", "voice_dictate_transcript", "poor_wording_correction"} or str(
        scenario.get("feature_target") or ""
    ) == "Magic Notes":
        magic_notes_prompt = (
            "\n\n**Missing detail to complete:** Who was informed? What safeguarding action was taken? "
            "What remains unclear and requires management review?"
        )

    return "\n".join(
        [
            f"## {title}",
            "",
            "## What was said / observed",
            input_text or "Not stated.",
            "",
            "## Child voice / presentation",
            child_voice,
            "",
            "## Immediate adult response",
            "Staff listened, recorded what was said or observed, and responded supportively within role. "
            "Specific actions: Not stated unless provided — to be completed by practitioner.",
            "",
            "## Safeguarding action / who was informed",
            escalation,
            "",
            "## Management oversight",
            "Seek management oversight and ensure any required notifications or referrals are considered by the responsible adults.",
            "",
            "## Outcome / current presentation",
            "Not stated — to be completed by practitioner.",
            "",
            "## Follow-up / review required",
            "Follow-up and review required by responsible adult. "
            "If there is immediate risk, follow emergency safeguarding procedures.",
            magic_notes_prompt,
            "",
            _ADULT_BOUNDARY_FOOTER,
        ]
    ).strip()


def build_standard_scaffold(scenario: dict[str, Any]) -> str:
    """Generic scaffold for lower-risk scenarios — with professional judgement boundary."""
    title = scenario.get("title") or scenario.get("id")
    input_text = sanitize_professional_judgement_phrases(str(scenario.get("input") or "").strip())
    return "\n".join(
        [
            f"## {title}",
            "",
            "## What happened",
            input_text,
            "",
            "## Adult response",
            "Not stated in output — to be completed by practitioner.",
            "",
            "## Outcome",
            "Not stated.",
            "",
            "---",
            "Template scaffold only — adult review required. Not live ORB output. "
            "Professional judgement and local policy apply.",
        ]
    )


def build_quality_lab_scaffold(scenario: dict[str, Any]) -> str:
    """Select appropriate scaffold for a quality lab scenario."""
    if needs_safeguarding_escalation(scenario):
        return build_high_risk_safeguarding_scaffold(scenario)
    return build_standard_scaffold(scenario)
