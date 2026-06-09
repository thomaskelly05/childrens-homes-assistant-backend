"""ORB therapeutic language contract — person-centred, recording-ready residential language.

Separate from, but compatible with, the no-invented-facts recording contract in
``orb_recording_contract_service``. Applies across Chat, Voice, Dictate, Write and actions.
"""

from __future__ import annotations

import re
from typing import Any

from services.orb_recording_contract_service import (
    build_no_invented_facts_contract_block,
    extract_known_incident_facts,
    extract_young_person_name,
    incident_missing_checklist,
    is_incident_report_draft_request,
    shorthand_to_observable_prompt,
)

ADULT_SHORTHAND_RE = re.compile(
    r"\b("
    r"kicked off|kicking off|played up|attention[\s-]?seeking|manipulative|"
    r"had a meltdown|was difficult|refused|aggressive|challenging moment|"
    r"bad behaviour|naughty|defiant|non-?compliant"
    r")\b",
    re.I,
)

GENERIC_WEAK_PHRASES: tuple[str, ...] = (
    "challenging moment",
    "difficult behaviour",
    "being disruptive",
    "what to do now",
    "good practice",
    "risks to avoid",
    "it is essential",
    "subsequent escalation",
    "therapeutic interventions",
    "ensure that the record is ofsted ready",
    "safeguarding practices",
    "underlying issues",
    "maintain clarity and transparency",
)

SHORT_RESIDENTIAL_MAX_WORDS = 15
SHORT_RESIDENTIAL_MAX_CHARS = 140

RESIDENTIAL_CONTEXT_TERMS: tuple[str, ...] = (
    "family time",
    "family contact",
    "contact",
    "young person",
    "looked after",
    "children's home",
    "childrens home",
    "care home",
    "on shift",
    "keywork",
    "placement",
    "residential",
    "ofsted",
    "safeguarding",
    "daily record",
    "incident",
    "handover",
    "reg 44",
    "reg 45",
)

RESIDENTIAL_INCIDENT_HEADINGS: tuple[str, ...] = (
    "Safety first",
    "Recording language warning",
    "What is known",
    "What to clarify",
    "Recording wording scaffold",
    "Follow-up",
)

CONCISE_RESIDENTIAL_HEADINGS: tuple[str, ...] = RESIDENTIAL_INCIDENT_HEADINGS

PREFERRED_THERAPEUTIC_CONCEPTS: tuple[str, ...] = (
    "became emotionally dysregulated",
    "appeared unsettled",
    "appeared distressed",
    "needed support to regulate",
    "behaviour may have communicated distress or unmet need",
    "family time may have been emotionally significant",
    "remain curious about the meaning behind the behaviour",
    "record what was seen, heard and done",
    "avoid assumptions about motivation",
)

EPISTEMIC_MODIFIERS: tuple[str, ...] = (
    "appeared",
    "was observed",
    "was described as",
    "the adult reported",
    "this may indicate",
    "consider whether",
)


def detect_adult_shorthand(text: str) -> list[str]:
    return list({match.group(0).lower() for match in ADULT_SHORTHAND_RE.finditer(str(text or ""))})


def is_residential_incident_scenario(text: str) -> bool:
    """True when a short residential behaviour/recording scenario needs full brain activation."""
    value = str(text or "").strip()
    if not value:
        return False
    if is_incident_report_draft_request(value):
        return True
    lowered = value.lower()
    has_shorthand = bool(ADULT_SHORTHAND_RE.search(value))
    has_residential_context = any(term in lowered for term in RESIDENTIAL_CONTEXT_TERMS)
    has_child_name = bool(extract_young_person_name(value))
    if has_shorthand and (has_residential_context or has_child_name):
        return True
    if has_child_name and has_residential_context and any(
        term in lowered for term in ("after", "following", "today", "unsettled", "dysregulated", "upset")
    ):
        return True
    return False


def is_short_residential_scenario(text: str) -> bool:
    """True for brief one-line residential behaviour prompts needing concise recording support."""
    value = str(text or "").strip()
    if not is_residential_incident_scenario(value):
        return False
    if is_incident_report_draft_request(value):
        return False
    word_count = len(value.split())
    return word_count <= SHORT_RESIDENTIAL_MAX_WORDS or len(value) <= SHORT_RESIDENTIAL_MAX_CHARS


def build_therapeutic_language_contract_block(*, include_headings: bool = True) -> str:
    lines = [
        "============================================================",
        "THERAPEUTIC LANGUAGE CONTRACT (ORB Residential)",
        "",
        "Compatible with the no-invented-facts recording contract.",
        "",
        "1. Do not use adult shorthand as final record language.",
        "   Examples to treat as shorthand needing clarification:",
        "   kicked off, played up, attention seeking, manipulative, aggressive (unless observable behaviour supports it),",
        "   refused (without context), was difficult, had a meltdown (unless agreed language).",
        "",
        "2. Translate shorthand into safe recording prompts.",
        "   Say clearly that shorthand must be clarified into observable behaviour before finalising.",
        "",
        "3. Use therapeutic, person-centred phrasing where facts are not yet confirmed:",
        *[f"   • {concept}" for concept in PREFERRED_THERAPEUTIC_CONCEPTS],
        "",
        "4. Do not overstate facts — use appeared / was observed / was described as / the adult reported /",
        "   this may indicate / consider whether where facts are not confirmed.",
        "",
        "5. Keep the child central — prompt for presentation, words/views, emotional meaning, needs,",
        "   and how adults responded therapeutically.",
        "",
        "6. Keep the adult accountable — staff response, de-escalation, risk reduction,",
        "   manager notification where relevant, follow-up/restorative work.",
        "",
        "7. Keep wording factual, respectful and recording-ready — child voice, staff response,",
        "   risk/harm/damage, outcome, manager oversight when relevant.",
        "",
        "Preferred natural residential wording:",
        "   • First, check everyone is safe.",
        "   • Use shorthand only as shorthand, not final recording wording.",
        "   • Record what was seen, heard and done.",
        "   • Add the child's words when they are ready to share them.",
        "   • Consider whether contact or school was emotionally significant — do not assume.",
        "",
        "Forbidden weak/generic formulations:",
        *[f"   • {phrase}" for phrase in GENERIC_WEAK_PHRASES],
        "   • Invented behaviour (shouted, kicked furniture, calmed down) unless provided",
        "   • Assumed emotional states (frustrated, angry, upset) unless stated by the adult",
        "   • Stating 'became emotionally dysregulated' as fact without observable support",
    ]
    if include_headings:
        lines.extend(
            [
                "",
                "Preferred residential incident response headings (not generic advice headings):",
                *[f"   • {heading}" for heading in RESIDENTIAL_INCIDENT_HEADINGS],
            ]
        )
    return "\n".join(lines)


def build_residential_scenario_prompt_block(source_text: str) -> str:
    """Prompt block for short residential behaviour scenarios (chat/voice)."""
    facts = extract_known_incident_facts(source_text)
    for shorthand in detect_adult_shorthand(source_text):
        if not facts.get("shorthand_behaviour"):
            facts = {**facts, "shorthand_behaviour": shorthand}
    name = facts.get("young_person") or "the young person"
    therapeutic = build_therapeutic_language_contract_block()
    no_invent = build_no_invented_facts_contract_block(record_kind="incident_report")
    concise = is_short_residential_scenario(source_text)

    known_lines = ["What is known from the adult (use only this):"]
    if facts.get("young_person"):
        known_lines.append(f"• Young person: {name}")
    if facts.get("happened_today") or facts.get("happened_morning"):
        known_lines.append("• Timing: this morning / today (exact time still needed)")
    if facts.get("refused_school"):
        known_lines.append(f"• {name} refused school")
    if facts.get("followed_family_contact") or facts.get("followed_contact"):
        known_lines.append("• Context: after contact / family time")
    if facts.get("shorthand_behaviour"):
        known_lines.append(
            f'• Adult shorthand: "{facts["shorthand_behaviour"]}" — clarify into observable behaviour'
        )
    if len(known_lines) == 1:
        known_lines.append("• A residential behaviour or recording scenario was described — clarify facts.")

    if concise:
        structure = [
            "",
            "SHORT RESIDENTIAL SCENARIO — concise recording-support format (not a long essay):",
            "1. Safety first — one short sentence (e.g. 'First, check [name] and everyone nearby are safe.').",
            "2. Recording language warning — shorthand must be clarified, not used as final wording.",
            "3. What is known — 2 to 4 bullets from adult input only.",
            "4. What to clarify — concise checklist (observable behaviour, child voice, staff response,",
            "   risk/harm/damage, outcome, manager oversight if relevant).",
            "5. Recording wording scaffold — short, with placeholders, no invented facts.",
            "6. Follow-up/manager lens — one short paragraph only if relevant.",
            "",
            "Use plain headings: What is known, What to clarify, Recording wording scaffold, Follow-up.",
            "Do NOT produce a long essay, generic advice sections, or repeated missing-info lists.",
            "Do NOT use: 'It is essential…', 'challenging moment', 'therapeutic interventions',",
            "'subsequent escalation', 'safeguarding practices', 'underlying issues'.",
            "Do NOT state emotional dysregulation as fact — use appeared / was described as / may have / if observed.",
            "Do NOT diagnose motivation or assume contact/school significance without child voice or evidence.",
        ]
    else:
        structure = [
            "",
            "Required response order for this residential scenario:",
            "1. Safety first (brief).",
            "2. Recording-safe interpretation — shorthand must be clarified; do not use as final wording.",
            "3. What is known (bullet list from adult input only).",
            "4. What to clarify (observable behaviour, child voice, staff response, risk/harm/damage, outcome).",
            "5. Recording wording scaffold with placeholders — no invented facts.",
            "6. Follow-up/manager lens if relevant.",
            "",
            "Do NOT use generic headings such as 'What to Do Now', 'Good Practice', or 'Risks to Avoid'.",
            "Do NOT say the child 'had a challenging moment', was 'disruptive', or invent staff actions or quotes.",
        ]
    return "\n".join([therapeutic, "", no_invent, "", *known_lines, *structure])


def _concise_shorthand_warning(shorthand: str | None) -> str:
    if not shorthand:
        return (
            "Keep the wording factual and respectful. Record what was seen, heard and done — "
            "not assumptions about motivation."
        )
    return (
        f"I would not use '{shorthand}' as final recording language. Treat it as shorthand and "
        "clarify what was actually seen or heard."
    )


def _concise_known_bullets(facts: dict[str, Any], name: str, shorthand: str | None) -> list[str]:
    bullets: list[str] = []
    if facts.get("refused_school"):
        timing = "this morning" if facts.get("happened_morning") else "today"
        bullets.append(f"{name} refused school {timing}.")
        if shorthand or facts.get("shorthand_behaviour"):
            bullets.append("The situation escalated afterwards.")
    elif shorthand:
        bullets.append(f"{name} was described as '{shorthand}'.")
    elif facts.get("young_person"):
        bullets.append(f"A behaviour concern was raised about {name}.")

    if facts.get("followed_contact") or facts.get("followed_family_contact"):
        if not any("after contact" in b.lower() or "family time" in b.lower() for b in bullets):
            bullets.append("This happened after contact.")
        if shorthand and "played up" in shorthand.lower():
            bullets.append(
                "The link with contact may be emotionally significant, but do not assume this "
                f"without {name}'s voice or observable evidence."
            )
    elif facts.get("refused_school") and shorthand:
        pass
    elif not bullets:
        bullets.append("A residential behaviour scenario was described.")

    bullets.append("More detail is needed before this can be finalised as a record.")
    return bullets[:4]


def _concise_clarify_questions(facts: dict[str, Any], name: str, shorthand: str | None) -> list[str]:
    questions: list[str] = []
    if facts.get("refused_school"):
        questions.append(f"What did {name} say about school?")
    if shorthand:
        questions.append(
            f"What did '{shorthand}' look like: shouting, crying, leaving the area, damaging items, "
            "refusing support, threat/risk, or something else?"
        )
    else:
        questions.append("What was seen or heard in observable terms?")
    questions.extend(
        [
            "Who was present?",
            f"What did staff do to support {name}?",
            "Was there any risk, harm or damage?",
            "What was the outcome?",
        ]
    )
    if facts.get("followed_contact") or facts.get("followed_family_contact"):
        questions.append("Does this need manager oversight or follow-up?")
    elif facts.get("refused_school"):
        questions.append(
            f"Consider whether {name}'s worries about school need a key-work conversation, "
            "manager oversight, school liaison or review of support plans."
        )
    return questions


def _concise_recording_scaffold(facts: dict[str, Any], name: str, shorthand: str | None) -> str:
    if facts.get("refused_school"):
        timing = "This morning" if facts.get("happened_morning") else "Today"
        return (
            f"{timing}, {name} did not attend school. Following this, {name} was described as "
            "[add observable behaviour]. Staff responded by [add staff response]. "
            f"{name}'s words/views were [add child voice or not yet captured]. "
            "The outcome was [add outcome]."
        )
    if facts.get("followed_contact") or facts.get("followed_family_contact"):
        return (
            f"Following contact, {name} was described as [add observable behaviour]. "
            f"Staff observed [add presentation]. {name} said [add child voice if known]. "
            f"Staff supported {name} by [add adult response]. The outcome was [add outcome]."
        )
    return (
        f"{name} was described as [add observable behaviour]. Staff observed [add presentation]. "
        f"{name} said [add child voice if known]. Staff responded by [add staff response]. "
        "The outcome was [add outcome]."
    )


def _concise_follow_up(facts: dict[str, Any], name: str) -> str:
    if facts.get("refused_school"):
        return (
            f"Consider whether {name}'s worries about school need a key-work conversation, "
            "manager oversight, school liaison or review of support plans."
        )
    if facts.get("followed_contact") or facts.get("followed_family_contact"):
        return (
            f"Consider whether contact was emotionally significant for {name}, whether a key-work "
            "conversation, manager oversight or contact plan review is needed."
        )
    return (
        f"Add whether a manager was informed if there was risk, harm, damage or ongoing concern."
    )


def build_safe_residential_scenario_scaffold(source_text: str) -> str:
    """Deterministic concise recording-support scaffold for short residential scenarios."""
    facts = extract_known_incident_facts(source_text)
    shorthand_terms = detect_adult_shorthand(source_text)
    shorthand = facts.get("shorthand_behaviour") or (shorthand_terms[0] if shorthand_terms else None)
    name = facts.get("young_person") or "the young person"

    safety_line = f"First, check {name} and everyone nearby are safe."
    warning = _concise_shorthand_warning(shorthand)
    known_bullets = _concise_known_bullets(facts, name, shorthand)
    clarify = _concise_clarify_questions(facts, name, shorthand)
    scaffold = _concise_recording_scaffold(facts, name, shorthand)
    follow_up = _concise_follow_up(facts, name)

    known_section = "\n".join(f"• {line}" for line in known_bullets)
    clarify_section = "\n".join(f"• {q}" for q in clarify)

    parts = [
        safety_line,
        "",
        warning,
        "",
        "What is known:",
        "",
        known_section,
        "",
        "What to clarify:",
        "",
        clarify_section,
        "",
        "Recording wording scaffold:",
        scaffold,
    ]
    if follow_up:
        parts.extend(["", "Follow-up:", follow_up])
    return "\n".join(parts)


def uses_weak_generic_phrasing(text: str) -> bool:
    lowered = str(text or "").lower()
    return any(phrase in lowered for phrase in GENERIC_WEAK_PHRASES)


def uses_forbidden_generic_phrasing(text: str) -> bool:
    return uses_weak_generic_phrasing(text)


def states_dysregulation_as_unsupported_fact(text: str, source_text: str) -> bool:
    """True when output states dysregulation as fact without support from the adult."""
    output = str(text or "").lower()
    source = str(source_text or "").lower()
    dysregulation_patterns = (
        r"\bbecame emotionally dysregulated\b",
        r"\bwas emotionally dysregulated\b",
        r"\bbecame dysregulated\b",
        r"\bwas dysregulated\b",
    )
    source_supports = any(
        term in source
        for term in (
            "dysregulated",
            "dysregulation",
            "unsettled",
            "overwhelmed",
            "heightened",
            "escalated",
            "meltdown",
        )
    )
    for pattern in dysregulation_patterns:
        if re.search(pattern, output):
            if re.search(r"\b(appeared|was described as|may have|if observed|consider whether)\b", output):
                continue
            if not source_supports:
                return True
    return False


def treats_shorthand_as_clarification_needed(text: str, source_text: str) -> bool:
    """Heuristic: output refers to shorthand as needing clarification, not as final record language."""
    shorthand_terms = detect_adult_shorthand(source_text)
    if not shorthand_terms:
        return True
    lowered = str(text or "").lower()
    clarification_markers = (
        "shorthand",
        "clarif",
        "observable",
        "what was seen",
        "what was heard",
        "described as",
        "adult shorthand",
        "avoid using it as the final",
        "final record wording",
    )
    has_clarification = any(marker in lowered for marker in clarification_markers)
    # Shorthand may appear when explaining it — but not as the main formulation alone
    uses_shorthand_as_fact = any(
        phrase in lowered
        for phrase in shorthand_terms
        if not any(marker in lowered for marker in clarification_markers)
    )
    if uses_shorthand_as_fact and not has_clarification:
        return False
    return has_clarification or not any(term in lowered for term in shorthand_terms)


def response_includes_therapeutic_prompts(text: str) -> bool:
    lowered = str(text or "").lower()
    markers = (
        "child voice",
        "child's voice",
        "words/views",
        "words",
        "presentation",
        "observable",
        "staff response",
        "staff do",
        "staff supported",
        "adult response",
        "safeguard",
        "risk",
        "harm",
        "damage",
        "manager",
        "outcome",
        "shorthand",
        "clarif",
    )
    return sum(1 for marker in markers if marker in lowered) >= 4


def response_meets_residential_scenario_contract(text: str, source_text: str) -> dict[str, Any]:
    """Heuristic contract check for tests."""
    lowered = str(text or "").lower()
    return {
        "no_weak_generic_phrasing": not uses_weak_generic_phrasing(text),
        "shorthand_treated_correctly": treats_shorthand_as_clarification_needed(text, source_text),
        "includes_therapeutic_prompts": response_includes_therapeutic_prompts(text),
        "includes_child_voice_prompt": any(
            term in lowered for term in ("child voice", "words/views", "said [", "words were", f"{extract_young_person_name(source_text) or 'young person'}'s words".lower())
        ),
        "includes_observable_prompt": "observable" in lowered or "what was seen" in lowered,
        "includes_staff_response_prompt": any(
            term in lowered for term in ("staff response", "staff do", "staff supported", "adult response", "staff responded")
        ),
        "includes_safeguarding_prompt": any(term in lowered for term in ("risk", "harm", "damage", "safeguard")),
        "includes_manager_prompt": "manager" in lowered,
        "no_unsupported_dysregulation": not states_dysregulation_as_unsupported_fact(text, source_text),
        "is_concise": len(str(text or "").split()) <= 450 if is_short_residential_scenario(source_text) else True,
    }


orb_therapeutic_language_contract_service = type(
    "OrbTherapeuticLanguageContractService",
    (),
    {
        "ADULT_SHORTHAND_RE": ADULT_SHORTHAND_RE,
        "GENERIC_WEAK_PHRASES": GENERIC_WEAK_PHRASES,
        "RESIDENTIAL_INCIDENT_HEADINGS": RESIDENTIAL_INCIDENT_HEADINGS,
        "detect_adult_shorthand": staticmethod(detect_adult_shorthand),
        "is_residential_incident_scenario": staticmethod(is_residential_incident_scenario),
        "is_short_residential_scenario": staticmethod(is_short_residential_scenario),
        "build_therapeutic_language_contract_block": staticmethod(build_therapeutic_language_contract_block),
        "build_residential_scenario_prompt_block": staticmethod(build_residential_scenario_prompt_block),
        "build_safe_residential_scenario_scaffold": staticmethod(build_safe_residential_scenario_scaffold),
        "uses_weak_generic_phrasing": staticmethod(uses_weak_generic_phrasing),
        "uses_forbidden_generic_phrasing": staticmethod(uses_forbidden_generic_phrasing),
        "states_dysregulation_as_unsupported_fact": staticmethod(states_dysregulation_as_unsupported_fact),
        "treats_shorthand_as_clarification_needed": staticmethod(treats_shorthand_as_clarification_needed),
        "response_includes_therapeutic_prompts": staticmethod(response_includes_therapeutic_prompts),
        "response_meets_residential_scenario_contract": staticmethod(response_meets_residential_scenario_contract),
        "shorthand_to_observable_prompt": staticmethod(shorthand_to_observable_prompt),
    },
)()
