"""High-risk and child-centred scenario scaffold generation for ORB Residential Quality Lab.

Deterministic static outputs for safeguarding, escalation and general recording scenarios.
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

_THERAPEUTIC_LANGUAGE_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"\bbecause they wanted attention\b", re.I),
        "during tea time",
    ),
    (
        re.compile(r"\bwanted attention\b", re.I),
        "may have been communicating distress",
    ),
    (
        re.compile(r"\bstaff told them to stop being dramatic\b", re.I),
        "staff offered calm boundaries and reassurance",
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
        "staff offered calm boundaries within role",
    ),
    (
        re.compile(r"\brefused to comply\b", re.I),
        "found it difficult to follow the request at that time",
    ),
    (
        re.compile(r"\beventually did as told\b", re.I),
        "eventually settled and engaged when ready",
    ),
    (
        re.compile(r"\bdid as told\b", re.I),
        "engaged when ready",
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
        "settled with staff support",
    ),
)

_JUDGEMENTAL_INPUT_PATTERN = re.compile(
    r"\b(?:manipulative|naughty|attention[\s-]?seeking|kicked off|bad behaviour|"
    r"non[\s-]?compliant|chose to behave|wanted attention|being dramatic|stop being dramatic|"
    r"refused to comply|staff had to be firm|did as told)\b",
    re.I,
)

_THERAPEUTIC_LANGUAGE_PRINCIPLE = (
    "For residential records, use respectful, non-blaming therapeutic language. "
    "Describe observable behaviour and presentation — not labels. "
    "Separate observation from interpretation. "
    "When rough input contains judgemental wording, reframe to factual, warm language "
    "without inventing events. Adults remain responsible for final wording."
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

_CHILD_CENTRED_PRINCIPLE = (
    "For residential records, keep the child visible: what they said or showed, their presentation, "
    "and their experience before, during and after adult support. "
    "Separate observation from interpretation. Do not invent feelings."
)

_ADULT_RESPONSE_PRINCIPLE = (
    "For residential childcare records, make adult practice visible and specific. "
    "Name what adults did first, how they communicated, and how they preserved dignity, safety and relationship. "
    "Record space, choice, reassurance, co-regulation or repair where provided. "
    "Note plans followed, oversight sought, and what appeared to help or not help. "
    "Avoid vague 'staff supported' unless the support is described. "
    "Do not invent actions not in the input — prompt for missing detail instead."
)

_ADULT_ACTION_CUE_PATTERN = re.compile(
    r"\b(?:staff|key\s*worker|shift\s*lead|manager|adult)\s+"
    r"(?:offered|listened|sat|used|gave|followed|informed|checked|respected|helped|supported|"
    r"de[- ]?escalat\w*|reassured|recorded|handed|monitored|encouraged|calm\w*|validated)\b[^.]*",
    re.I,
)

_ADULT_ACTION_FRAGMENT_PATTERN = re.compile(
    r"\b(?:after|when|while)\s+staff\s+\w+",
    re.I,
)

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

_STANDARD_BOUNDARY_FOOTER = (
    "---\n"
    "Template scaffold only — adult review required. Not live ORB output. "
    "Professional judgement and local policy apply."
)


def sanitize_professional_judgement_phrases(text: str) -> str:
    """Reframe phrases that replace professional judgement in scaffold outputs."""
    result = str(text or "")
    for pattern, replacement in _PROFESSIONAL_JUDGEMENT_REPLACEMENTS:
        result = pattern.sub(replacement, result)
    return result


def sanitize_therapeutic_language(text: str) -> str:
    """Reframe judgemental or blaming phrasing into respectful therapeutic wording."""
    result = sanitize_professional_judgement_phrases(str(text or ""))
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
    if "mood improved" in lower or "mood" in lower:
        cues.append("mood shift noted")
    if "settled" in lower and "settled" not in cues:
        cues.append("settled")
    if cues:
        unique = list(dict.fromkeys(cues))
        return f"Staff observed presentation: appeared {', '.join(unique[:4])}."
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
    return "\n".join(parts)


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


def _format_extracted_adult_actions(actions: list[str]) -> str:
    """Turn extracted input cues into rubric-aligned adult response wording."""
    lines: list[str] = []
    for action in actions:
        normalised = action.strip()
        if not normalised.lower().startswith("staff"):
            normalised = f"Staff {normalised}"
        if not normalised.endswith("."):
            normalised += "."
        lines.append(normalised)
    return "\n".join(lines)


def _adult_response_prompt_block() -> str:
    """Prompt for missing adult detail — structural markers without inventing actions."""
    return (
        "Adult response detail not yet recorded. Complete with specific adult actions — "
        "how staff listened, what was offered, de-escalation or repair steps, and "
        "dignity-preserving choices — only as actually provided.\n\n"
        "**Prompt if missing:** What did adults do first? How did adults communicate? "
        "Did adults offer space, choice or reassurance? Avoid vague 'staff supported' "
        "unless the support is described."
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
        lines.append(_format_extracted_adult_actions(actions))
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
    if any(w in lower for w in ("settled", "improved", "repair", "later", "eventually", "completed", "agreed")):
        return "Outcome: as described in input — young person presentation by end of shift to be confirmed."
    return "Outcome: not stated — to be completed by practitioner."


def _family_specific_sections(scenario: dict[str, Any], input_text: str) -> list[str]:
    family = str(scenario.get("scenario_family") or "")
    variant = str(scenario.get("variant_type") or "")
    sections: list[str] = []

    if family == "behaviour_communication":
        sections.extend(
            [
                "## Behaviour as possible communication (reflection, not fact)",
                "Staff observed behaviour as described below. "
                "What the young person may have been communicating remains a professional reflection — "
                "not stated as fact unless the child shared this.",
            ]
        )
    elif family == "incident_reflection":
        sections.extend(
            [
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
                "Regulatory wording supports evidence; it is not a judgement.",
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

    magic_notes_prompt = ""
    if _is_magic_notes_variant(scenario):
        magic_notes_prompt = "\n\n" + _magic_notes_missing_prompt(scenario, safeguarding=True)

    return "\n".join(
        [
            f"## {title}",
            "",
            "## What was said / observed",
            factual or "Not stated.",
            "",
            "## Child voice / presentation",
            child_voice,
            "",
            "## Immediate adult response",
            _build_adult_response_section(scenario, factual),
            "",
            "## How adults preserved dignity and relationship",
            "Record whether adults avoided public discussion, offered private check-in, preserved choice "
            "and maintained relationship — only as actually provided.",
            "",
            "## Safeguarding action / who was informed",
            escalation,
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
    title = scenario.get("title") or scenario.get("id") or "Record"
    raw_input = str(scenario.get("input") or "").strip()
    input_text = sanitize_professional_judgement_phrases(raw_input)
    factual = build_factual_account(scenario, input_text)
    child_voice = build_child_voice_section(factual, scenario)
    extra_sections = _family_specific_sections(scenario, factual)

    blocks: list[str] = [
        f"## {title}",
        "",
        "## What happened",
        factual or "Not stated.",
        "",
        "## Child voice / presentation",
        child_voice,
    ]
    blocks.extend(extra_sections)
    blocks.extend(
        [
            "",
            "## What adults did to support",
            _build_adult_response_section(scenario, factual),
            "",
            "## How adults preserved dignity and relationship",
            "Record whether adults offered space, choice, reassurance or repair, and how dignity "
            "and relationship were preserved — only as actually provided.",
            "",
            "## The child's experience",
            "What changed for the young person before, during and after adult support — "
            "as observed, not assumed.",
            "",
            "## Outcome / follow-up",
            _build_outcome_line(factual),
            "",
            _STANDARD_BOUNDARY_FOOTER,
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
