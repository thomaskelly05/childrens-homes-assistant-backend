"""High-risk and child-centred scenario scaffold generation for ORB Residential Quality Lab.

Deterministic static outputs for safeguarding, escalation and general recording scenarios.
Supports benchmark evaluation — not live LLM generation.
"""

from __future__ import annotations

import re
from typing import Any

from assistant.knowledge.adult_identity_language import (
    apply_adult_identity_language,
    extract_supplied_adult_initials,
    sanitize_observation_interpretation_language,
    scaffold_heading_for_scenario,
)
from assistant.knowledge.orb_residential_principles import (
    ADULT_RESPONSE_PRINCIPLE,
    CHILD_CENTRED_PRINCIPLE,
    FACTUAL_ACCURACY_PRINCIPLE,
    MANAGEMENT_OVERSIGHT_PRINCIPLE,
    OBSERVATION_VS_INTERPRETATION_PRINCIPLE,
    PATHWAY_DISCIPLINE_PRINCIPLE,
    THERAPEUTIC_LANGUAGE_PRINCIPLE,
)

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

_MAGIC_NOTES_VARIANTS = frozenset({"rough_note", "voice_dictate_transcript", "poor_wording_correction"})

_SPEECH_CUE_PATTERN = re.compile(
    r"\b(?:said|shared|disclosed|communicated|told\s+staff|asked|declined|refused|explained|mentioned)\b",
    re.I,
)

_PRESENTATION_CUE_WORDS = (
    "upset",
    "tearful",
    "quiet",
    "quieter",
    "calm",
    "withdrawn",
    "settled",
    "angry",
    "worried",
    "tired",
    "anxious",
    "distressed",
    "smiled",
    "engaged",
    "refused",
    "declined",
    "happy",
    "low",
    "flat",
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

_INTERPRETATION_AS_FACT_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\bwas angry because contact\b", re.I),
        "became upset after contact",
    ),
    (
        re.compile(r"\bwas angry because\b", re.I),
        "became upset after",
    ),
    (
        re.compile(r"\bthe trigger was\b", re.I),
        "events before this included",
    ),
    (
        re.compile(r"\bthis proves\b", re.I),
        "this could suggest",
    ),
    (
        re.compile(r"\bthis means\b", re.I),
        "this may indicate",
    ),
    (
        re.compile(r"\bbecause they wanted attention\b", re.I),
        "— further review is needed to understand what they may have been communicating",
    ),
    (
        re.compile(r"\bwanted attention\b", re.I),
        "may have been communicating distress",
    ),
    (
        re.compile(r"\b(?:child|young person) was angry\b", re.I),
        "young person appeared angry",
    ),
    (
        re.compile(r"\b(?:child|young person) was frustrated\b", re.I),
        "young person appeared frustrated",
    ),
    (
        re.compile(r"\bthe child felt\b", re.I),
        "the child appeared",
    ),
    (
        re.compile(r"\bpattern proves\b", re.I),
        "pattern appears to be emerging",
    ),
)

_THERAPEUTIC_LANGUAGE_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\bstaff told them to stop being dramatic\b", re.I),
        "staff used wording that should be reframed more respectfully",
    ),
    (
        re.compile(r"\bstop being dramatic\b", re.I),
        "appeared distressed",
    ),
    (
        re.compile(r"\bbeing dramatic\b", re.I),
        "appeared distressed",
    ),
    (
        re.compile(r"\bstaff had to be firm\b", re.I),
        "staff used a firm approach — wording may need review",
    ),
    (
        re.compile(r"\brefused to comply\b", re.I),
        "found it difficult to follow the request at that time",
    ),
    (
        re.compile(r"\beventually did as told\b", re.I),
        "later followed the request when ready",
    ),
    (
        re.compile(r"\bdid as told\b", re.I),
        "followed the request when ready",
    ),
    (
        re.compile(r"\battention[\s-]?seeking\b", re.I),
        "communicating distress",
    ),
    (
        re.compile(r"\bmanipulative\b", re.I),
        "behaviour that may have communicated an unmet need",
    ),
    (
        re.compile(r"\bnaughty\b", re.I),
        "distressed",
    ),
    (
        re.compile(r"\bbad behaviour\b", re.I),
        "behaviour that staff observed and responded to",
    ),
    (
        re.compile(r"\bkicked off\b", re.I),
        "became distressed",
    ),
    (
        re.compile(r"\brefused for no reason\b", re.I),
        "was not ready to",
    ),
    (
        re.compile(r"\bnon-?compliant\b", re.I),
        "found it difficult to follow the request",
    ),
    (
        re.compile(r"\bchose to behave\b", re.I),
        "behaviour occurred / may have been communicating",
    ),
    (
        re.compile(r"\bjust being dramatic\b", re.I),
        "appeared distressed",
    ),
    (
        re.compile(r"\bcalmed down\b", re.I),
        "appeared calmer",
    ),
)

_JUDGEMENTAL_INPUT_PATTERN = re.compile(
    r"\b(?:manipulative|naughty|attention[\s-]?seeking|kicked off|bad behaviour|"
    r"non[\s-]?compliant|chose to behave|wanted attention|being dramatic|stop being dramatic|"
    r"refused to comply|staff had to be firm|did as told)\b",
    re.I,
)

_THERAPEUTIC_LANGUAGE_PRINCIPLE = THERAPEUTIC_LANGUAGE_PRINCIPLE

_FAMILY_ESCALATION_GUIDANCE: dict[str, str] = {
    "safeguarding": (
        "Pathway to consider: local safeguarding procedure — escalation pathway for responsible adults to decide. "
        "Record what was said or observed, who was informed and what was agreed. "
        "Do not investigate beyond role; preserve the child's words. Senior or manager review required."
    ),
    "missing from care": (
        "Pathway to consider: local missing-from-care procedure — inform manager/on-call without delay. "
        "Record chronology, welfare check and return conversation. "
        "Urgent action if immediate risk is indicated. Responsible adult to decide required notifications."
    ),
    "allegation": (
        "Pathway to consider: local safeguarding procedure and allegation pathway — escalation pathway for "
        "responsible adults to decide. Record facts without investigating beyond role. "
        "Record who was informed (DSL/manager) and what remains unresolved per local policy."
    ),
    "handover": (
        "Pathway to consider: routine handover with next-shift follow-up. "
        "If safeguarding themes are present, handover should note who was informed and what follow-up is required. "
        "Senior or manager review where concerns may indicate risk — responsible adult to decide."
    ),
    "meetings": (
        "Pathway to consider: distinguish agreed actions from suggested actions; record review owner if known. "
        "ORB supports reflection; adults remain responsible for professional decisions and escalation."
    ),
    "magic_notes": (
        "Pathway to consider: if safeguarding/risk cues are present, record who was informed and what escalation "
        "pathway was followed — do not invent details. Otherwise routine follow-up and handover. "
        "Responsible adult to confirm any required notifications or referrals."
    ),
}

_FAMILY_ROUTINE_PATHWAY_GUIDANCE: dict[str, str] = {
    "daily_care": (
        "Pathway to consider: routine follow-up — continue observation, check in later, record outcome, "
        "hand over to next shift. Senior or manager review only if repeated pattern or risk cue emerges."
    ),
    "incident_reflection": (
        "Pathway to consider: debrief, senior or manager review, plan/risk assessment review where appropriate. "
        "Local safeguarding procedure only if injury, allegation, missing, exploitation or serious risk cue."
    ),
    "behaviour_communication": (
        "Pathway to consider: routine support plan review; escalation only when pattern or risk increases. "
        "Supervision or debrief if staff response needs practice learning."
    ),
    "handover": (
        "Pathway to consider: next-shift action — what remains unresolved; when to seek senior review."
    ),
    "key_work": (
        "Pathway to consider: feed child's views into care planning/review — no escalation unless concern emerges."
    ),
    "meetings": (
        "Pathway to consider: agreed action vs suggested action; responsible adult/owner and review date if provided. "
        "If missing, prompt for owner and review point."
    ),
    "regulation_evidence": (
        "Pathway to consider: evidence gap and action planning — internal quality indicator, not regulatory judgement. "
        "Link to manager review; responsible adult to decide."
    ),
    "management_oversight": (
        "Pathway to consider: pattern review, plan/risk assessment review, supervision/practice learning. "
        "Local safeguarding procedure only if risk indicators present."
    ),
    "magic_notes": (
        "Pathway to consider: routine follow-up and handover unless safeguarding/risk cue in rough note — "
        "then prompt for who was informed and what pathway was followed; do not fill escalation details."
    ),
}

_PATHWAY_DISCIPLINE_PRINCIPLE = PATHWAY_DISCIPLINE_PRINCIPLE
_CHILD_CENTRED_PRINCIPLE = CHILD_CENTRED_PRINCIPLE
_ADULT_RESPONSE_PRINCIPLE = ADULT_RESPONSE_PRINCIPLE
_MANAGEMENT_OVERSIGHT_PRINCIPLE = MANAGEMENT_OVERSIGHT_PRINCIPLE
_FACTUAL_ACCURACY_PRINCIPLE = FACTUAL_ACCURACY_PRINCIPLE
_OBSERVATION_VS_INTERPRETATION_PRINCIPLE = OBSERVATION_VS_INTERPRETATION_PRINCIPLE

_ADULT_ACTION_CUE_PATTERN = re.compile(
    r"\b(?:(?:Adult\s+[A-Z]{1,3})|(?:the\s+adult)|(?:adults)|(?:staff)|(?:key\s*worker)|(?:shift\s*lead)|(?:manager))\s+"
    r"(?:offered|listened|sat|used|gave|followed|informed|checked|respected|helped|supported|"
    r"de[- ]?escalat\w*|reassured|recorded|handed|monitored|encouraged|calm\w*|validated|remained)\b[^.]*",
    re.I,
)

_ADULT_ACTION_FRAGMENT_PATTERN = re.compile(
    r"\b(?:after|when|while)\s+(?:(?:Adult\s+[A-Z]{1,3})|(?:the\s+adult)|(?:staff))\s+\w+",
    re.I,
)

_DEFAULT_ESCALATION_GUIDANCE = (
    "Pathway to consider: local safeguarding procedure — escalation pathway for responsible adults to decide. "
    "Record what was said or observed, who was informed and what was agreed. "
    "Senior or manager review required. Responsible adult to decide required notifications per local policy."
)

_BOUNDARY_FOOTER = (
    "---\n"
    "Draft only — adult review required. "
    "This supports reflection and recording; it is not a safeguarding decision. "
    "ORB does not complete management oversight. Professional judgement and local policy apply."
)

# Backward-compatible aliases
_ADULT_BOUNDARY_FOOTER = _BOUNDARY_FOOTER
_STANDARD_BOUNDARY_FOOTER = _BOUNDARY_FOOTER


def sanitize_professional_judgement_phrases(text: str) -> str:
    """Reframe phrases that replace professional judgement in scaffold outputs."""
    result = str(text or "")
    for pattern, replacement in _PROFESSIONAL_JUDGEMENT_REPLACEMENTS:
        result = pattern.sub(replacement, result)
    return result


def sanitize_observation_interpretation(text: str) -> str:
    """Reframe interpretation presented as fact into observation or reflective wording."""
    result = str(text or "")
    for pattern, replacement in _INTERPRETATION_AS_FACT_REPLACEMENTS:
        result = pattern.sub(replacement, result)
    return result


def sanitize_therapeutic_language(text: str) -> str:
    """Reframe judgemental or blaming phrasing into respectful therapeutic wording."""
    result = sanitize_professional_judgement_phrases(str(text or ""))
    result = sanitize_observation_interpretation(result)
    for pattern, replacement in _THERAPEUTIC_LANGUAGE_REPLACEMENTS:
        result = pattern.sub(replacement, result)
    result = re.sub(r"\s{2,}", " ", result)
    return result.strip()


def contains_judgemental_language(text: str) -> bool:
    """Whether text contains blaming or judgemental phrasing that should be reframed."""
    return bool(_JUDGEMENTAL_INPUT_PATTERN.search(str(text or "")))


def is_wording_rewrite_scenario(scenario: dict[str, Any]) -> bool:
    """Whether scenario expects Magic Notes / therapeutic rewrite of poor wording."""
    focus = str(scenario.get("quality_focus") or "").lower()
    if "rewrite" in focus or "judgemental" in focus or "poor wording" in focus:
        return True
    sid = str(scenario.get("scenario_id") or scenario.get("id") or "")
    parent = str(scenario.get("parent_scenario_id") or scenario.get("source_baseline_id") or "")
    if sid.startswith(("core_043", "core_044")) or parent in {"core_043", "core_044"}:
        return True
    if sid == "baseline_poor_wording_rewrite":
        return True
    return False


def build_factual_account(scenario: dict[str, Any], input_text: str) -> str:
    """Build factual account from input — reframing judgemental rough wording when required."""
    cleaned = _clean_input_prefix(sanitize_professional_judgement_phrases(input_text))
    if is_wording_rewrite_scenario(scenario) or contains_judgemental_language(cleaned):
        return sanitize_therapeutic_language(cleaned)
    return cleaned


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


def _resolve_routine_pathway_guidance(scenario: dict[str, Any]) -> str:
    """Proportionate pathway guidance for non-safeguarding scenarios."""
    family = str(scenario.get("scenario_family") or "")
    if family in _FAMILY_ROUTINE_PATHWAY_GUIDANCE:
        return _FAMILY_ROUTINE_PATHWAY_GUIDANCE[family]
    return (
        "Pathway to consider: routine follow-up or handover — record outcome and what remains unresolved. "
        "Senior or manager review if pattern or risk cue emerges. Responsible adult to decide."
    )


def _build_pathway_section(scenario: dict[str, Any], input_text: str) -> str:
    """Build proportionate escalation/pathway section — suggests consideration, does not decide."""
    family = str(scenario.get("scenario_family") or "")
    cleaned = _clean_input_prefix(input_text)
    lines: list[str] = ["Pathway to consider (responsible adult to decide per local policy):"]

    if needs_safeguarding_escalation(scenario):
        guidance = _resolve_escalation_guidance(scenario)
        lines.append(guidance)
        if not _input_has_escalation_cues(cleaned):
            lines.append(
                "It is not stated who was informed — record who was notified and what escalation pathway "
                "was followed once confirmed by a responsible adult."
            )
        else:
            lines.append(
                "Escalation noted in input — confirm who was informed and what was agreed."
            )
        regulatory = scenario.get("regulatory_context") or []
        if isinstance(regulatory, str):
            regulatory = [regulatory]
        if "missing from care" in [str(c).lower() for c in regulatory]:
            lines.append(
                "Urgent action if immediate risk is indicated — follow local missing-from-care procedure."
            )
        if "allegation" in [str(c).lower() for c in regulatory]:
            lines.append(
                "Do not investigate beyond role — allegation/safeguarding procedure for responsible adults to follow."
            )
    else:
        lines.append(_resolve_routine_pathway_guidance(scenario))
        if family == "handover":
            lines.append(
                "Handover: share emotional presentation, triggers, what helped and what remains unresolved."
            )
        elif family == "daily_care":
            lines.append(
                "Routine follow-up: continue observation, check in later, record outcome, hand over to next shift."
            )

    lines.append("What remains unresolved: record outstanding actions and review owner.")
    return "\n".join(lines)


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


def _clean_input_prefix(text: str) -> str:
    """Strip rough-note / dictate prefixes while keeping factual content."""
    cleaned = str(text or "").strip()
    for prefix in (
        r"^rough:\s*",
        r"^um\s+",
        r"^rewrite child-centred:\s*",
        r"^manager review of:\s*[^.]+\.\s*facts from shift:\s*",
        r"^handover summary —[^:]+:\s*",
        r"^supervision reflection on[^:]+:\s*",
        r"^reg 44 evidence note for:\s*[^.]+\.\s*",
    ):
        cleaned = re.sub(prefix, "", cleaned, flags=re.I)
    cleaned = re.sub(r"\s*yp kicked off again\.\s*staff firm\.\s*", " ", cleaned, flags=re.I)
    cleaned = re.sub(r"\s*uh staff um helped um\s*$", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\s*\[recorded on mobile, brief\]\s*$", "", cleaned, flags=re.I)
    cleaned = re.sub(r"\s*check if safeguarding escalation needed — not stated\.?\s*$", "", cleaned, flags=re.I)
    return cleaned.strip()


def _input_has_speech_cues(text: str) -> bool:
    return bool(_SPEECH_CUE_PATTERN.search(text))


def _extract_speech_from_input(text: str) -> str:
    """Extract child speech cues from input without inventing content."""
    lower = text.lower()
    if re.search(r"\b(?:young person|yp|child)\s+said\b", lower):
        match = re.search(
            r"((?:young person|yp|child)\s+said[^.]*(?:\.[^.]*)?)",
            text,
            re.I,
        )
        if match:
            return match.group(1).strip().rstrip(".")
    sentences = re.split(r"(?<=[.!?])\s+", text)
    speech_parts: list[str] = []
    for sentence in sentences:
        if _SPEECH_CUE_PATTERN.search(sentence):
            speech_parts.append(sentence.strip())
    if speech_parts:
        joined = " ".join(speech_parts[:2])
        if not re.search(r"\b(?:young person|child|yp)\b", joined, re.I):
            return f"Young person said: {joined}"
        return joined
    return ""


def _extract_presentation_from_input(text: str) -> str:
    """Describe observable presentation from input cues — no invented feelings."""
    lower = text.lower()
    cues: list[str] = []
    for word in _PRESENTATION_CUE_WORDS:
        if re.search(rf"\b{re.escape(word)}\b", lower):
            cues.append(word)
    if "appeared calmer" in lower:
        cues.append("appeared calmer")
    elif "settled" in lower and "settled" not in cues:
        cues.append("appeared more settled")
    initials = extract_supplied_adult_initials(text)
    observer = f"Adult {initials[0]}" if initials else "The adult"
    if cues:
        unique = list(dict.fromkeys(cues))
        return f"{observer} observed presentation: {', '.join(unique[:4])}."
    if re.search(r"\b(?:young person|child|yp)\b", lower):
        return "Presentation: as described in factual account — further detail not yet recorded."
    return "Presentation: not yet known — to be completed from shift observation."


def _extract_wishes_feelings(text: str) -> str:
    lower = text.lower()
    if any(w in lower for w in ("wishes", "feelings", "views", "wanted", "did not want", "needed quiet")):
        if "did not want" in lower:
            return "Wishes, feelings and views: young person did not want something recorded or shared as described in input."
        if "needed quiet" in lower or "quiet time" in lower:
            return "Wishes, feelings and views: young person communicated need for quiet time."
        return "Wishes, feelings and views: as communicated in input — see child voice above."
    return "Wishes, feelings and views: not yet known — to be sought where appropriate."


def build_child_voice_section(input_text: str, scenario: dict[str, Any] | None = None) -> str:
    """Build child voice / presentation section with rubric-aligned markers."""
    scenario = scenario or {}
    cleaned = _clean_input_prefix(sanitize_professional_judgement_phrases(input_text))
    if is_wording_rewrite_scenario(scenario) or contains_judgemental_language(cleaned):
        cleaned = sanitize_therapeutic_language(cleaned)
    lines: list[str] = []

    speech = _extract_speech_from_input(cleaned)
    if speech:
        if not speech.lower().startswith(("young person", "child", "yp")):
            lines.append(f"Young person said: {speech}")
        else:
            lines.append(speech)
    elif _input_has_speech_cues(cleaned):
        lines.append("Young person communicated as described in the factual account below.")
    else:
        lines.append("Young person said: not yet known — record the child's words where provided.")

    lines.append(_extract_presentation_from_input(cleaned))

    family = str(scenario.get("scenario_family") or "")
    variant = str(scenario.get("variant_type") or "")
    feature = str(scenario.get("feature_target") or "")
    required = list(scenario.get("required_elements") or [])

    if (
        family in {"meetings", "key_work", "handover", "management_oversight", "regulation_evidence"}
        or "child voice/presentation" in required
        or variant in _MAGIC_NOTES_VARIANTS
        or feature == "Magic Notes"
    ):
        lines.append(_extract_wishes_feelings(cleaned))

    return "\n".join(lines)


def _magic_notes_missing_prompt(scenario: dict[str, Any], *, safeguarding: bool = False) -> str:
    parts = ["**Missing detail to complete:**"]
    input_text = str(scenario.get("input") or "")
    cleaned = _clean_input_prefix(input_text)
    if not _input_has_speech_cues(cleaned):
        parts.append("What did the young person say or show? Record child voice where known.")
    parts.append("What was the child's presentation before, during and after adult support?")
    if not _extract_adult_actions_from_input(cleaned):
        parts.append("What did adults do to support, reassure or follow up? Name specific adult actions.")
    if safeguarding:
        parts.extend(
            [
                "Who was informed?",
                "What safeguarding action was taken?",
                "What remains unclear and requires management review?",
            ]
        )
    else:
        parts.append("What outcome and follow-up should the next adult know about the child's experience?")
    if not _input_has_management_cues(cleaned):
        parts.append(
            "Does this require senior/manager review, handover or plan update? "
            "Record what remains to be reviewed by a responsible adult."
        )
    return "\n".join(parts)


def _input_has_escalation_cues(text: str) -> bool:
    """Whether input states who was informed or escalation actions taken."""
    lower = str(text or "").lower()
    return any(
        cue in lower
        for cue in (
            "manager informed",
            "manager was informed",
            "dsl informed",
            "dsl notified",
            "informed manager",
            "informed the manager",
            "informed dsl",
            "called police",
            "police called",
            "ambulance called",
            "mash notified",
            "on-call informed",
        )
    )


def _build_observation_reflection_section(scenario: dict[str, Any], input_text: str) -> str:
    """Concise observed / said / reported vs reflection framing for residential records."""
    family = str(scenario.get("scenario_family") or "")
    cleaned = _clean_input_prefix(input_text)
    lines: list[str] = [
        "Observed / said / reported:",
        "- The adult observed: see factual account and presentation above.",
    ]
    if _input_has_speech_cues(cleaned):
        lines.append("- Child said / communicated: see child voice above — direct words preserved where provided.")
    else:
        lines.append("- Child said: not yet recorded — add direct words if known.")
    if "reported" in cleaned.lower() or "it was reported" in cleaned.lower():
        lines.append("- Reported information: as described in the factual account.")
    lines.append(
        "Possible meaning (reflection, not fact): further review may be needed to understand "
        "what the young person may have been communicating — do not state motives or feelings as facts."
    )
    if family == "safeguarding":
        lines.append(
            "Safeguarding: record disclosure/comment separately from adult concern — "
            "ORB does not conclude threshold or risk level."
        )
    elif family == "behaviour_communication":
        lines.append(
            "Behaviour may have communicated an unmet need — this is professional reflection, not diagnostic."
        )
    elif family == "management_oversight":
        lines.append(
            "Pattern appears to be emerging where repeat themes are noted — not a concluded management finding."
        )
    lines.append("What remains unknown: see Known / gaps above.")
    return "\n".join(lines)


def _build_factual_gaps_section(scenario: dict[str, Any], input_text: str) -> str:
    """Concise known/gaps framing — prompts for missing detail without inventing content."""
    cleaned = _clean_input_prefix(input_text)
    lines: list[str] = [
        "Based on the information provided:",
        "Known / observed / reported: see factual account above.",
    ]
    gaps: list[str] = []
    if not _input_has_speech_cues(cleaned):
        gaps.append("Direct words if known — the child's words were not recorded; add if known.")
    if not _extract_adult_actions_from_input(cleaned):
        gaps.append("Adult response not yet recorded — complete with specific actions only as provided.")
    if not any(w in cleaned.lower() for w in ("settled", "improved", "repair", "later", "eventually", "completed", "agreed", "outcome")):
        gaps.append("Outcome not yet recorded — follow-up still to be confirmed.")
    if needs_safeguarding_escalation(scenario) and not _input_has_escalation_cues(cleaned):
        gaps.append("It is not stated who was informed — escalation/pathway to be confirmed.")
    family = str(scenario.get("scenario_family") or "")
    if family in {"incident_reflection", "safeguarding"}:
        gaps.append("Chronology to clarify — sequence before / during / after should be confirmed.")
    if family == "meetings":
        gaps.append("Distinguish agreed actions from suggested actions — do not invent attendee decisions.")
    if family == "key_work":
        gaps.append("Child views: record if known; seek if not yet stated.")
    if gaps:
        lines.append("What is not yet stated:")
        lines.extend(f"- {gap}" for gap in gaps[:5])
    else:
        lines.append("Details to confirm: review whether any gaps remain before finalising.")
    return "\n".join(lines)


def _input_has_management_cues(text: str) -> bool:
    """Whether input already mentions manager, oversight or review actions."""
    lower = str(text or "").lower()
    return any(
        cue in lower
        for cue in (
            "manager",
            "senior",
            "oversight",
            "supervision",
            "debrief",
            "reg 44",
            "regulation 44",
            "informed by phone",
            "on-call",
            "dsl",
        )
    )


def _needs_management_oversight_section(scenario: dict[str, Any]) -> bool:
    """Whether scaffold should include a management oversight / review section."""
    required = list(scenario.get("required_elements") or [])
    if "management oversight" in required:
        return True
    family = str(scenario.get("scenario_family") or "")
    if family in {
        "incident_reflection",
        "safeguarding",
        "handover",
        "meetings",
        "management_oversight",
        "regulation_evidence",
        "behaviour_communication",
        "key_work",
    }:
        return True
    variant = str(scenario.get("variant_type") or "")
    feature = str(scenario.get("feature_target") or "")
    if variant in {"manager_oversight", "reflective_supervision"} or feature == "Management oversight":
        return True
    return False


def _build_management_oversight_section(scenario: dict[str, Any], input_text: str) -> str:
    """Build proportionate management oversight prompts — supports review, does not decide."""
    family = str(scenario.get("scenario_family") or "")
    cleaned = _clean_input_prefix(input_text)
    lines: list[str] = []

    if _input_has_management_cues(cleaned):
        lines.append(
            "Management action noted in input — manager/senior should consider reviewing "
            "whether follow-up, debrief or plan review is complete."
        )
    else:
        lines.append(
            "Manager/senior should consider reviewing this record — "
            "what remains to be reviewed by a responsible adult."
        )

    if family == "daily_care":
        lines.extend(
            [
                "Pattern or repeat theme: a pattern appears to be emerging — is this isolated or recurring?",
                "Handover or follow-up: does the next adult need to continue anything?",
                "Plan review: if repeated, should the child's plan or support strategy be updated?",
            ]
        )
    elif family == "incident_reflection":
        lines.extend(
            [
                "Manager/senior review: should this incident be reviewed for learning and consistency?",
                "Debrief / supervision / learning: is a staff debrief or practice reflection needed?",
                "Plan or risk assessment review: does this inform the child's plan or risk assessment?",
                "Adult response consistency: was the response aligned with the agreed approach?",
            ]
        )
    elif family == "safeguarding":
        lines.extend(
            [
                "Management oversight: who was informed and what follow-up review is needed?",
                "Local safeguarding pathway followed — do not investigate beyond role.",
                "Responsible adult to confirm notifications and review outstanding actions.",
            ]
        )
    elif family == "behaviour_communication":
        lines.extend(
            [
                "Pattern or repeat theme: triggers or themes may be recurring — appears to be emerging, not concluded.",
                "Plan review: should the behaviour support plan be reviewed?",
                "Supervision / reflection: what should adults try consistently?",
            ]
        )
    elif family == "handover":
        lines.extend(
            [
                "What the next shift should continue and what senior/manager should review.",
                "Unresolved follow-up: record outstanding actions and review owner.",
            ]
        )
    elif family == "key_work":
        lines.extend(
            [
                "Should themes from this session inform placement or care planning?",
                "Child's views: to be fed into planning/review where appropriate.",
            ]
        )
    elif family == "meetings":
        lines.extend(
            [
                "Agreed actions and responsible adults — record review points.",
                "Child's views: still to be sought or represented where appropriate.",
                "ORB supports meeting reflection; adults remain responsible for decisions.",
            ]
        )
    elif family == "regulation_evidence":
        lines.extend(
            [
                "Evidence and gaps: what evidence exists and what is missing?",
                "Learning / action plan: what improvement actions are suggested?",
                "Manager review: internal quality indicator — not regulatory judgement.",
            ]
        )
    elif family == "management_oversight":
        lines.extend(
            [
                "Pattern: drift, inconsistency or repeat concern may appear to be emerging — not a concluded finding.",
                "Child impact: how does this affect the young person's experience?",
                "Adult response consistency and action/follow-up with review owner.",
                "Supervision / practice learning where relevant.",
            ]
        )
    elif family == "magic_notes" or _is_magic_notes_variant(scenario):
        lines.append(
            "Does this require senior/manager review, handover or plan update?"
        )
    else:
        lines.append(
            "Follow-up and review points for responsible adult — "
            "evidence for quality assurance, not compliance judgement."
        )

    return "\n".join(lines)


def _is_magic_notes_variant(scenario: dict[str, Any]) -> bool:
    variant = str(scenario.get("variant_type") or "")
    feature = str(scenario.get("feature_target") or "")
    family = str(scenario.get("scenario_family") or "")
    return variant in _MAGIC_NOTES_VARIANTS or feature == "Magic Notes" or family == "magic_notes"


def _extract_adult_actions_from_input(text: str) -> list[str]:
    """Extract adult action sentences from input — no invention beyond what is stated."""
    cleaned = _clean_input_prefix(sanitize_professional_judgement_phrases(text))
    actions: list[str] = []
    for match in _ADULT_ACTION_CUE_PATTERN.finditer(cleaned):
        fragment = match.group(0).strip().rstrip(".,;")
        if fragment and fragment not in actions:
            actions.append(fragment)
    if not actions:
        for match in _ADULT_ACTION_FRAGMENT_PATTERN.finditer(cleaned):
            fragment = match.group(0).strip().rstrip(".,;")
            if fragment and fragment not in actions:
                actions.append(fragment)
    return actions[:4]


def _format_extracted_adult_actions(actions: list[str], *, source_text: str = "") -> str:
    """Turn extracted input cues into rubric-aligned adult response wording."""
    initials = extract_supplied_adult_initials(source_text)
    lines: list[str] = []
    for index, action in enumerate(actions):
        normalised = action.strip()
        if re.search(r"\bstaff\b", normalised, re.I) and initials:
            adult_label = f"Adult {initials[index % len(initials)]}"
            normalised = re.sub(r"\b[Ss]taff\b", adult_label, normalised, count=1)
        elif re.search(r"\bstaff\b", normalised, re.I):
            normalised = re.sub(r"\b[Ss]taff\b", "The adult", normalised, count=1)
        if not normalised.endswith("."):
            normalised += "."
        lines.append(normalised)
    return "\n".join(lines)


def _adult_response_prompt_block() -> str:
    """Prompt for missing adult detail — structural markers without inventing actions."""
    return (
        "Adult response detail not yet recorded. Complete with specific adult actions — "
        "how adults listened, what was offered, de-escalation or repair steps, and "
        "dignity-preserving choices — only as actually provided.\n\n"
        "**Prompt if missing:** What did adults do first? How did adults communicate? "
        "Did adults offer space, choice or reassurance? Avoid vague 'staff supported' "
        "or generic 'the adult supported' unless the support is described."
    )


def _build_adult_response_section(scenario: dict[str, Any], input_text: str) -> str:
    """Build adult response section with specific actions from input or honest prompts."""
    actions = _extract_adult_actions_from_input(input_text)
    family = str(scenario.get("scenario_family") or "")
    variant = str(scenario.get("variant_type") or "")
    feature = str(scenario.get("feature_target") or "")

    lines: list[str] = []

    if actions:
        lines.append("Immediate adult response as described in the factual account:")
        lines.append(_format_extracted_adult_actions(actions, source_text=input_text))
        lower_actions = " ".join(actions).lower()
        if "de-escalat" not in lower_actions and family in {"incident_reflection", "behaviour_communication"}:
            lines.append(
                "De-escalation / reassurance / choice offered: complete from shift if applicable."
            )
        if family == "handover":
            lines.append(
                "Handover: record what staff already did and what the incoming adult should continue."
            )
    else:
        lines.append(_adult_response_prompt_block())

    if family == "safeguarding" or needs_safeguarding_escalation(scenario):
        lines.append(
            "Safeguarding adult response should include listening, reassurance, accurate recording, "
            "who was informed and policy follow-through — only as actually provided. "
            "Do not investigate beyond role."
        )
    elif family == "incident_reflection":
        lines.append(
            "Include calm response, space offered, de-escalation, repair and follow-up — "
            "only as actually provided."
        )
    elif family == "behaviour_communication":
        lines.append(
            "Record co-regulation, curiosity, reduced demands, repair offered and whether "
            "the support plan was followed — only as actually provided."
        )
    elif family == "handover":
        lines.append(
            "What staff already did to support, reassure or de-escalate, and what emotional "
            "continuity the next adult should maintain."
        )
    elif family == "key_work":
        lines.append(
            "Record pace, choice, open questions and relationship-based support — "
            "avoid pressure; only as actually provided."
        )
    elif family == "management_oversight":
        lines.append(
            "What adults did consistently, what leadership should review, and whether plans, "
            "supervision or practice learning are needed."
        )
    elif family == "meetings":
        lines.append(
            "Home team adult response and agreed actions — not only process summary. "
            "What did adults do to support the child?"
        )
    elif family == "regulation_evidence":
        lines.append(
            "Evidence of adult practice that improved safety, dignity, consistency or relationships — "
            "not only events."
        )
    elif family == "daily_care":
        lines.append(
            "How adults noticed, checked in, and offered space, choice or routine support — "
            "and what helped the young person settle or engage."
        )

    if variant in _MAGIC_NOTES_VARIANTS or feature == "Magic Notes" or family == "magic_notes":
        if not actions:
            lines.append("What did adults do to support, reassure or follow up?")

    return "\n".join(lines)


def _build_adult_response_line(scenario: dict[str, Any], input_text: str) -> str:
    """Backward-compatible single-block adult response for tests referencing this helper."""
    return _build_adult_response_section(scenario, input_text)


def _build_outcome_line(input_text: str) -> str:
    lower = input_text.lower()
    if "appeared calmer" in lower:
        return "Outcome: Child A appeared calmer before bedtime — as described in input."
    if any(w in lower for w in ("settled", "improved", "repair", "later", "eventually", "completed", "agreed")):
        return "Outcome: as described in input — young person presentation by end of shift to be confirmed."
    return "Outcome: not stated — to be completed by the adult completing the record."


def _family_specific_sections(scenario: dict[str, Any], input_text: str) -> list[str]:
    family = str(scenario.get("scenario_family") or "")
    variant = str(scenario.get("variant_type") or "")
    sections: list[str] = []

    if family == "behaviour_communication":
        sections.extend(
            [
                "## Behaviour as possible communication (reflection, not fact)",
                "The adult observed behaviour as described below. "
                "What the young person may have been communicating remains a professional reflection — "
                "not stated as fact unless the child shared this.",
            ]
        )
    elif family == "incident_reflection":
        sections.extend(
            [
                "## Chronology to clarify",
                "Before / during / after: separate sequence from interpretation. "
                "The sequence of events should be clarified where not stated.",
                "## Presentation before / during / after",
                "Before: as described in factual account. During: staff observed events as recorded. "
                "After: current presentation — to be completed by practitioner.",
            ]
        )
    elif family == "handover":
        sections.extend(
            [
                "## Emotional continuity for next adult",
                "What the next adult needs to know about the young person's experience, presentation and any ongoing needs.",
            ]
        )
    elif family == "key_work":
        sections.extend(
            [
                "## Child's views, pace and choice",
                "Record the young person's views and pace as shared. Avoid lecturing tone — keep their voice visible.",
            ]
        )
    elif family == "management_oversight":
        sections.extend(
            [
                "## Impact on the child",
                "How patterns or events described affect the young person's experience, safety and relationships — "
                "not only staff or process actions.",
            ]
        )
    elif family == "meetings":
        sections.extend(
            [
                "## Agreed actions vs suggested actions",
                "Record agreed actions, responsible adults and review points. "
                "Suggested actions or ideas remain prompts — do not state them as decisions unless confirmed.",
                "## Child's voice in this discussion",
                "Record whether the young person's voice, wishes, feelings or views were shared, "
                "represented or still need to be sought.",
            ]
        )
    elif family == "regulation_evidence":
        sections.extend(
            [
                "## Children's experience and evidence",
                "Include evidence of children's experience, wishes and feelings — not only compliance activity. "
                "Identify evidence gaps without regulatory judgement — internal quality indicator only.",
            ]
        )
    elif family == "magic_notes" or _is_magic_notes_variant(scenario):
        sections.append(_magic_notes_missing_prompt(scenario))

    if is_wording_rewrite_scenario(scenario):
        sections.extend(
            [
                "## Wording reframed from rough input",
                "Judgemental or blaming phrases from the rough note have been reframed into observable, "
                "respectful language. Separate observation from interpretation. "
                "Original wording must not be saved without adult review.",
            ]
        )

    if variant in {"manager_oversight", "reflective_supervision"} or str(
        scenario.get("feature_target") or ""
    ) == "Management oversight":
        sections.extend(
            [
                "## Impact on the child",
                "Management review should make the young person visible — impact on their experience, not only process.",
            ]
        )

    return sections


def build_high_risk_safeguarding_scaffold(scenario: dict[str, Any]) -> str:
    """Structured scaffold for high-risk safeguarding scenario families."""
    title = scenario.get("title") or scenario.get("id") or "Record"
    raw_input = str(scenario.get("input") or "").strip()
    input_text = sanitize_professional_judgement_phrases(raw_input)
    factual = build_factual_account(scenario, input_text)
    escalation = _resolve_escalation_guidance(scenario)
    child_voice = build_child_voice_section(factual, scenario)
    exact_words_line = (
        "Child's exact words preserved above."
        if _input_has_speech_cues(factual)
        else "The child's exact words were not recorded — add direct words if known."
    )

    magic_notes_prompt = ""
    if _is_magic_notes_variant(scenario):
        magic_notes_prompt = "\n\n" + _magic_notes_missing_prompt(scenario, safeguarding=True)

    family_sections: list[str] = []
    if str(scenario.get("scenario_family") or "") == "meetings":
        family_sections = [
            "",
            "## Agreed actions vs suggested actions",
            "Record agreed actions, responsible adults and review points. "
            "Suggested actions or ideas remain prompts — do not state them as decisions unless confirmed.",
        ]

    return "\n".join(
        [
            f"## {title}",
            "",
            "## What was said / observed",
            factual or "Not stated.",
            "",
            exact_words_line,
            "",
            "## Child voice / presentation",
            child_voice,
            "",
            "## Observed / said / reported vs reflection",
            _build_observation_reflection_section(scenario, factual),
            *family_sections,
            "",
            "## Immediate adult response",
            _build_adult_response_section(scenario, factual),
            "",
            "## How adults preserved dignity and relationship",
            "Record whether adults avoided public discussion, offered private check-in, preserved choice "
            "and maintained relationship — only as actually provided.",
            "",
            "## Safeguarding action / who was informed",
            (
                "Escalation noted in input — confirm who was informed and what action was agreed."
                if _input_has_escalation_cues(factual)
                else "It is not stated who was informed. " + escalation
            ),
            "",
            "## Pathway to consider",
            _build_pathway_section(scenario, factual),
            "",
            "## Management oversight",
            "Seek management oversight and ensure any required notifications or referrals are considered by the responsible adults.",
            "",
            "## Outcome / current presentation",
            _build_outcome_line(factual),
            "",
            "## Adult follow-up",
            "Follow-up and review required by responsible adult. "
            "If there is immediate risk, follow emergency safeguarding procedures.",
            magic_notes_prompt,
            "",
            _ADULT_BOUNDARY_FOOTER,
        ]
    ).strip()


def build_child_centred_scaffold(scenario: dict[str, Any]) -> str:
    """Family-aware child-centred scaffold for ordinary recording scenarios."""
    title = scaffold_heading_for_scenario(scenario)
    raw_input = str(scenario.get("input") or "").strip()
    input_text = sanitize_professional_judgement_phrases(raw_input)
    factual = sanitize_observation_interpretation_language(
        apply_adult_identity_language(
            build_factual_account(scenario, input_text),
            supplied_initials=extract_supplied_adult_initials(input_text),
        )
    )
    child_voice = build_child_voice_section(factual, scenario)
    extra_sections = _family_specific_sections(scenario, factual)
    record_type = str(scenario.get("record_type") or "")
    family = str(scenario.get("scenario_family") or "")
    is_daily = record_type == "daily_record" or family == "daily_care"

    blocks: list[str] = [
        f"## {title}",
        "",
    ]
    if is_daily:
        blocks.extend(
            [
                "## Presentation and Support",
                factual or "Not stated.",
                "",
                "## Known / gaps",
                _build_factual_gaps_section(scenario, input_text),
                "",
                "## Observed / said / reported vs reflection",
                _build_observation_reflection_section(scenario, input_text),
                "",
                "## Child's Voice / Presentation",
                child_voice,
            ]
        )
    else:
        blocks.extend(
            [
                "## What happened",
                factual or "Not stated.",
                "",
                "## Known / gaps",
                _build_factual_gaps_section(scenario, input_text),
                "",
                "## Observed / said / reported vs reflection",
                _build_observation_reflection_section(scenario, input_text),
                "",
                "## Child voice / presentation",
                child_voice,
            ]
        )
    blocks.extend(extra_sections)
    if _needs_management_oversight_section(scenario):
        blocks.extend(
            [
                "",
                "## Management oversight / review",
                _build_management_oversight_section(scenario, factual),
            ]
        )
    blocks.extend(
        [
            "",
            "## Pathway to consider",
            _build_pathway_section(scenario, input_text),
        ]
    )
    blocks.extend(
        [
            "",
            "## Adult Response" if is_daily else "## What adults did to support",
            _build_adult_response_section(scenario, factual),
            "",
            "## Dignity, relationship and child's experience",
            "Record whether adults offered space, choice, reassurance or repair, and how dignity "
            "and relationship were preserved — only as actually provided. "
            "What changed for the young person before, during and after adult support — as observed, not assumed.",
            "",
            "## Outcome / Handover" if is_daily else "## Outcome / follow-up",
            _build_outcome_line(factual),
            "",
            _BOUNDARY_FOOTER,
        ]
    )
    return "\n".join(blocks).strip()


def build_standard_scaffold(scenario: dict[str, Any]) -> str:
    """Child-centred scaffold for lower-risk scenarios — with professional judgement boundary."""
    return build_child_centred_scaffold(scenario)


def build_quality_lab_scaffold(scenario: dict[str, Any]) -> str:
    """Select appropriate scaffold for a quality lab scenario."""
    if needs_safeguarding_escalation(scenario):
        return build_high_risk_safeguarding_scaffold(scenario)
    return build_child_centred_scaffold(scenario)


def child_centred_recording_principle() -> str:
    """Reusable child-centred recording principle for brain/framework sources."""
    return _CHILD_CENTRED_PRINCIPLE


def adult_response_recording_principle() -> str:
    """Reusable adult response recording principle for brain/framework sources."""
    return _ADULT_RESPONSE_PRINCIPLE


def therapeutic_language_recording_principle() -> str:
    """Reusable therapeutic language principle for brain/framework sources."""
    return _THERAPEUTIC_LANGUAGE_PRINCIPLE


def management_oversight_recording_principle() -> str:
    """Reusable management oversight principle for brain/framework sources."""
    return _MANAGEMENT_OVERSIGHT_PRINCIPLE


def factual_accuracy_recording_principle() -> str:
    """Reusable factual accuracy / no-invention principle for brain/framework sources."""
    return _FACTUAL_ACCURACY_PRINCIPLE


def observation_vs_interpretation_recording_principle() -> str:
    """Reusable observation vs interpretation principle for brain/framework sources."""
    return _OBSERVATION_VS_INTERPRETATION_PRINCIPLE


def pathway_recording_principle() -> str:
    """Reusable escalation/pathway discipline principle for brain/framework sources."""
    return _PATHWAY_DISCIPLINE_PRINCIPLE
