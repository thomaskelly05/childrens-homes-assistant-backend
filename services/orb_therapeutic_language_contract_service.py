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
)

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
    "Immediate safety and regulation",
    "What is known",
    "What needs clarifying",
    "Recording wording scaffold",
    "Child voice",
    "Adult response",
    "Safeguarding and risk lens",
    "Follow-up and manager oversight",
)

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
        "7. Keep the record Ofsted-ready — factual description, child voice, safeguarding/risk,",
        "   adult response, outcome, follow-up, manager oversight when relevant.",
        "",
        "Forbidden weak/generic formulations:",
        *[f"   • {phrase}" for phrase in GENERIC_WEAK_PHRASES],
        "   • Invented behaviour (shouted, kicked furniture, calmed down) unless provided",
        "   • Assumed emotional states (frustrated, angry, upset) unless stated by the adult",
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

    known_lines = ["What is known from the adult (use only this):"]
    if facts.get("young_person"):
        known_lines.append(f"• Young person: {name}")
    if facts.get("happened_today"):
        known_lines.append("• Timing: today (exact time still needed)")
    if facts.get("followed_family_contact"):
        known_lines.append("• Context: followed family time / family contact")
    if facts.get("shorthand_behaviour"):
        known_lines.append(
            f'• Adult shorthand: "{facts["shorthand_behaviour"]}" — clarify into observable behaviour'
        )
    if len(known_lines) == 1:
        known_lines.append("• A residential behaviour or recording scenario was described — clarify facts.")

    structure = [
        "",
        "Required response order for this residential scenario:",
        "1. Immediate safety and regulation (brief).",
        "2. Recording-safe interpretation — explain shorthand must be clarified; do not use it as final wording.",
        "3. What is known (bullet list from adult input only).",
        "4. What needs clarifying / what is missing (time, location, who was present, observable behaviour,",
        "   child's presentation, child's words/views, staff response, risk/harm/damage, outcome, follow-up).",
        "5. Recording wording scaffold with placeholders — no invented facts.",
        "6. Therapeutic follow-up prompts (curiosity about meaning behind behaviour, regulation support).",
        "7. Manager/safeguarding lens if relevant.",
        "",
        "Do NOT use generic headings such as 'What to Do Now', 'Good Practice', or 'Risks to Avoid'.",
        "Do NOT say the child 'had a challenging moment', was 'disruptive', or invent staff actions or quotes.",
    ]
    return "\n".join([therapeutic, "", no_invent, "", *known_lines, *structure])


def build_safe_residential_scenario_scaffold(source_text: str) -> str:
    """Deterministic recording-ready scaffold for short residential scenarios."""
    facts = extract_known_incident_facts(source_text)
    shorthand_terms = detect_adult_shorthand(source_text)
    shorthand = facts.get("shorthand_behaviour") or (shorthand_terms[0] if shorthand_terms else None)
    name = facts.get("young_person") or "[Young person]"

    known_bullets: list[str] = []
    if facts.get("young_person"):
        known_bullets.append(f"{name} became unsettled today." if facts.get("happened_today") else f"{name} became unsettled.")
    if facts.get("followed_family_contact"):
        known_bullets.append("This followed family time.")
    known_bullets.append("You need support to record what happened.")
    if not facts.get("young_person") and not facts.get("followed_family_contact"):
        known_bullets = ["A residential behaviour scenario was described.", "You need support to record what happened."]

    shorthand_note = ""
    if shorthand:
        shorthand_note = (
            f"\n\nI would treat '{shorthand}' as adult shorthand and avoid using it as the final record "
            "wording until you clarify what was actually seen or heard."
        )

    missing = "\n".join(f"• {item}" for item in incident_missing_checklist(name if facts.get("young_person") else None))

    if shorthand:
        scaffold_wording = (
            f"Following family time today, {name} was described as becoming unsettled."
            if facts.get("followed_family_contact") and facts.get("happened_today")
            else f"{name} was described as becoming unsettled."
        )
        scaffold_wording += (
            " Staff should record the specific observable behaviour, "
            f"{name}'s presentation and any words used by {name}. "
            "The record should consider whether family time may have been emotionally significant "
            f"for {name} and what support they needed to regulate."
        )
    else:
        scaffold_wording = (
            f"[Add observable sequence — what was seen and heard regarding {name}. "
            "Avoid assumptions about motivation.]"
        )

    known_section = "\n".join(f"• {line}" for line in known_bullets)

    return f"""I can help you record this safely.{shorthand_note}

### Immediate safety and regulation
Check everyone is safe now. If there is immediate risk, follow your home's safeguarding procedure.

### What is known
{known_section}

### What needs clarifying
Before writing the incident/daily record, add:
• time and location
• who was present
• what {name} did or said in observable terms
• {name}'s emotional presentation
• {name}'s words/views
• staff response
• whether there was any risk, harm or damage
• outcome
• follow-up needed

### Recording wording scaffold
{scaffold_wording}

### Child voice
[Add {name}'s words if known. If {name} was not ready to speak, record that staff will seek their views when they are calm.]

### Adult response
[Add what staff did to support {name}, reduce risk and help them regulate.]

### Safeguarding and risk lens
[Add whether there was any risk to {name}, others, staff or property. Add whether any safeguarding escalation, physical intervention, manager notification or external agency contact was required.]

### Follow-up and manager oversight
[Add any agreed actions, restorative conversation, key-work session, contact plan review, risk assessment update or manager oversight.]

### Missing information before finalising
{missing}

### Suggested follow-up prompts
• What exactly did you see or hear{f' when you say "{shorthand}"' if shorthand else ''}?
• Where were you and who else was present?
• What did {name} say, if anything?
• What did staff do to support and keep everyone safe?
• How did things end?
• Does a manager need to review this today?"""


def uses_weak_generic_phrasing(text: str) -> bool:
    lowered = str(text or "").lower()
    return any(phrase in lowered for phrase in GENERIC_WEAK_PHRASES)


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
        "presentation",
        "observable",
        "staff response",
        "adult response",
        "safeguard",
        "manager",
        "unsettled",
        "dysregulat",
        "regulate",
        "family time",
        "meaning behind",
        "unmet need",
    )
    return sum(1 for marker in markers if marker in lowered) >= 4


def response_meets_residential_scenario_contract(text: str, source_text: str) -> dict[str, Any]:
    """Heuristic contract check for tests."""
    return {
        "no_weak_generic_phrasing": not uses_weak_generic_phrasing(text),
        "shorthand_treated_correctly": treats_shorthand_as_clarification_needed(text, source_text),
        "includes_therapeutic_prompts": response_includes_therapeutic_prompts(text),
        "includes_child_voice_prompt": "child voice" in str(text or "").lower() or "words/views" in str(text or "").lower(),
        "includes_observable_prompt": "observable" in str(text or "").lower(),
        "includes_staff_response_prompt": "staff response" in str(text or "").lower() or "adult response" in str(text or "").lower(),
        "includes_safeguarding_prompt": "safeguard" in str(text or "").lower() or "risk" in str(text or "").lower(),
        "includes_manager_prompt": "manager" in str(text or "").lower(),
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
        "build_therapeutic_language_contract_block": staticmethod(build_therapeutic_language_contract_block),
        "build_residential_scenario_prompt_block": staticmethod(build_residential_scenario_prompt_block),
        "build_safe_residential_scenario_scaffold": staticmethod(build_safe_residential_scenario_scaffold),
        "uses_weak_generic_phrasing": staticmethod(uses_weak_generic_phrasing),
        "treats_shorthand_as_clarification_needed": staticmethod(treats_shorthand_as_clarification_needed),
        "response_includes_therapeutic_prompts": staticmethod(response_includes_therapeutic_prompts),
        "response_meets_residential_scenario_contract": staticmethod(response_meets_residential_scenario_contract),
        "shorthand_to_observable_prompt": staticmethod(shorthand_to_observable_prompt),
    },
)()
