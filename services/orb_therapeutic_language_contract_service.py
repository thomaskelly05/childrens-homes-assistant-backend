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
    r"bad behaviour|naughty|defiant|non-?compliant|challenging behaviour|"
    r"chose to misbehave|just wanted attention|being difficult|behaved perfectly|"
    r"failed to engage|would not listen|overreacted|absconded|non compliant"
    r")\b",
    re.I,
)

# Judgemental or shaming phrases flagged by the therapeutic wording guard.
JUDGEMENTAL_PHRASE_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("attention_seeking", re.compile(r"\battention[\s-]?seeking\b", re.I)),
    ("manipulative", re.compile(r"\bmanipulative\b", re.I)),
    ("naughty", re.compile(r"\bnaughty\b", re.I)),
    ("bad_behaviour", re.compile(r"\bbad behaviour\b", re.I)),
    ("kicked_off", re.compile(r"\bkicked off\b", re.I)),
    ("refused_for_no_reason", re.compile(r"\brefused for no reason\b", re.I)),
    ("non_compliant", re.compile(r"\bnon-?compliant\b", re.I)),
    ("challenging_behaviour_bare", re.compile(r"\bchallenging behaviour\b(?!\s+(plan|support|approach|strategy))", re.I)),
    ("was_aggressive_bare", re.compile(r"\bwas aggressive\b(?!\s+(towards|to|when|after|because))", re.I)),
    ("calmed_down_bare", re.compile(r"\bcalmed down\b(?![\s\S]{0,80}\b(staff|supported|helped|offered|regulation)\b)", re.I)),
    ("chose_to_misbehave", re.compile(r"\bchose to misbehave\b", re.I)),
    ("just_wanted_attention", re.compile(r"\bjust wanted attention\b", re.I)),
    ("being_difficult", re.compile(r"\bbeing difficult\b", re.I)),
    ("behaved_perfectly", re.compile(r"\bbehaved perfectly\b", re.I)),
    ("failed_to_engage", re.compile(r"\bfailed to engage\b", re.I)),
    ("would_not_listen", re.compile(r"\bwould not listen\b", re.I)),
    ("refused_to_listen", re.compile(r"\brefused to listen\b", re.I)),
    ("seek_attention", re.compile(r"\bseek(?:ing)?\s+attention\b", re.I)),
    ("appeared_to_seek_attention", re.compile(r"\bappeared to seek attention\b", re.I)),
    ("overreacted", re.compile(r"\boverreacted\b", re.I)),
    ("lied_unqualified", re.compile(r"\b(lied|lying)\b(?![\s\S]{0,60}\b(recorded|evidence|said|stated|reported)\b)", re.I)),
    ("absconded", re.compile(r"\babsconded\b", re.I)),
)

# Simple deterministic replacements — internal-first, no OpenAI.
THERAPEUTIC_PHRASE_REPLACEMENTS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"\battention[\s-]?seeking\b", re.I), "communicating distress"),
    (re.compile(r"\bmanipulative\b", re.I), "behaviour that may have communicated an unmet need"),
    (re.compile(r"\bnaughty\b", re.I), "distressed"),
    (re.compile(r"\bbad behaviour\b", re.I), "behaviour that staff supported"),
    (re.compile(r"\bkicked off\b", re.I), "became distressed"),
    (re.compile(r"\brefused for no reason\b", re.I), "was not ready to"),
    (re.compile(r"\bnon-?compliant\b", re.I), "found it difficult to follow the request"),
    (re.compile(r"\bchallenging behaviour\b", re.I), "behaviour that may have communicated distress"),
    (re.compile(r"\bwas aggressive\b", re.I), "showed behaviour that staff observed and responded to"),
    (re.compile(r"\bchose to misbehave\b", re.I), "behaviour occurred"),
    (re.compile(r"\bjust wanted attention\b", re.I), "may have been communicating an unmet need"),
    (re.compile(r"\bbeing difficult\b", re.I), "found the situation difficult"),
    (re.compile(r"\bbehaved perfectly\b", re.I), "presented calmly"),
    (re.compile(r"\bfailed to engage\b", re.I), "was not ready to engage"),
    (re.compile(r"\bwould not listen\b", re.I), "was not ready to respond"),
    (re.compile(r"\brefused to listen\b", re.I), "was not ready to respond"),
    (re.compile(r"\bappeared to seek attention\b", re.I), "was observed to [add specific behaviour]"),
    (re.compile(r"\bseek(?:ing)?\s+attention\b", re.I), "communicating distress"),
    (re.compile(r"\boverreacted\b", re.I), "appeared distressed"),
    (re.compile(r"\babsconded\b", re.I), "went missing"),
    (re.compile(r"\bcalmed down\b", re.I), "settled with staff support"),
)

# Safeguarding terms that must not be softened by therapeutic repair.
SAFEGUARDING_PRESERVE_TERMS: tuple[str, ...] = (
    "violence",
    "assault",
    "sexual",
    "exploitation",
    "self-harm",
    "suicidal",
    "weapon",
    "injury",
    "harm",
    "abuse",
    "allegation",
    "lado",
    "police",
    "restraint",
)

UNIVERSAL_THERAPEUTIC_PRINCIPLES: tuple[str, ...] = (
    "Describe behaviour factually, not judgementally.",
    "Avoid shame, blame, labels and assumptions.",
    "Separate observation from interpretation.",
    "Consider behaviour as communication, without claiming certainty.",
    "Include the child's voice where known.",
    "Include emotional presentation where observed.",
    "Include what adults did to support regulation.",
    "Include relational repair after difficult moments.",
    "Use strengths-based and hopeful wording.",
    "Preserve accountability and safeguarding boundaries.",
    "Avoid diagnosing or making clinical claims.",
    "Avoid minimising risk or harm.",
    "Avoid adult-centred language that erases the child's experience.",
    "Avoid punitive wording unless policy/legal wording requires precision.",
    "Support reflective practice and professional curiosity.",
)

# Therapeutic marker groups per answer family — at least one alternative required when family applies.
FAMILY_THERAPEUTIC_MARKER_GROUPS: dict[str, list[tuple[str, tuple[str, ...]]]] = {
    "daily_record": [
        ("child_voice", ("child's voice", "young person said", "said ", "words", "views", "feelings")),
        ("emotional_presentation", ("presentation", "appeared", "mood", "emotional", "distress")),
        ("staff_support", ("staff supported", "staff offered", "staff responded", "adult response")),
        ("what_helped", ("what helped", "helped", "regulated", "calm", "settled")),
        ("strengths", ("strength", "positive", "chose", "engaged", "calm")),
        ("follow_up", ("follow-up", "follow up", "next", "plan", "review")),
    ],
    "incident_record": [
        ("antecedents", ("antecedent", "before", "context", "prior", "following")),
        ("emotional_presentation", ("presentation", "appeared", "distress", "dysregulated", "upset")),
        ("co_regulation", ("de-escalat", "co-regulation", "coregulation", "regulated", "calm", "space")),
        ("staff_support", ("staff supported", "staff responded", "staff offered", "adult response")),
        ("repair", ("repair", "restorative", "follow-up", "debrief")),
        ("learning", ("learning", "plan", "review", "pattern")),
    ],
    "keywork_session": [
        ("child_views", ("child's views", "young person said", "views", "voice", "feelings")),
        ("strengths", ("strength", "positive", "progress", "proud")),
        ("worries", ("worry", "worried", "concern", "difficult")),
        ("agreed_actions", ("agreed", "action", "next step", "plan")),
    ],
    "missing_return_record": [
        ("welfare_first", ("welfare", "safe", "injury", "distress", "check")),
        ("welcome_back", ("welcome", "return", "reconnect", "connection")),
        ("curiosity", ("curious", "what happened", "where", "who with", "account")),
        ("avoid_blame", ("without blame", "shame", "calm", "connection first")),
        ("child_account", ("young person said", "child's voice", "account", "words")),
        ("repair", ("repair", "reconnect", "follow-up", "key-work")),
    ],
    "suicidal_self_harm": [
        ("validate_distress", ("distress", "listened", "validated", "heard", "support")),
        ("immediate_safety", ("immediate", "safety", "do not leave", "not leave alone")),
        ("crisis_pathway", ("crisis", "manager", "escalat", "pathway", "plan")),
    ],
    "allegation_lado": [
        ("calm_listening", ("listen", "calm", "heard", "serious")),
        ("exact_words", ("exact words", "said", "record", "words")),
        ("no_investigation", ("do not investigate", "not investigate", "not decide truth")),
        ("escalation", ("manager", "lado", "dsl", "escalat", "notify")),
    ],
    "abuse_disclosure": [
        ("calm_listening", ("listen", "calm", "heard", "serious")),
        ("exact_words", ("exact words", "said", "record", "words")),
        ("no_investigation", ("do not investigate", "not investigate", "not decide truth")),
        ("escalation", ("manager", "social worker", "police", "safeguard")),
    ],
    "manager_oversight_note": [
        ("reflection", ("reflect", "learning", "learnt", "learned", "review")),
        ("patterns", ("pattern", "repeated", "trend", "theme")),
        ("child_communication", ("communicat", "child", "meaning", "voice")),
        ("plan_review", ("plan", "review", "update", "follow-up")),
    ],
    "reg44_visitor": [
        ("child_experience", ("child experience", "children", "feel safe", "listened")),
        ("relational_practice", ("relationship", "relational", "rapport", "trust")),
        ("therapeutic_evidence", ("therapeutic", "voice", "behaviour", "understand")),
    ],
    "ofsted_preparation": [
        ("child_experience", ("child experience", "children", "quality of care")),
        ("relational_practice", ("relationship", "relational", "rapport")),
        ("impact", ("impact", "outcome", "difference", "evidence")),
    ],
    "accessible_child_support_plan": [
        ("child_friendly", ("my support plan", "about me", "helps me")),
        ("strengths", ("dream", "aspiration", "like", "enjoy")),
        ("communication", ("widget", "communicat", "aac", "yes", "no", "stop", "help")),
        ("what_helps", ("helps me", "calm", "safe", "support")),
        ("adult_responses", ("adults should", "adult guidance", "support me")),
    ],
    "convert_to_recording_wording": [
        ("observation", ("observation", "observed", "factual", "seen", "heard")),
        ("staff_support", ("staff", "supported", "offered", "responded")),
        ("non_shaming", ("appeared", "distress", "difficult", "not ready")),
    ],
    "what_am_i_missing": [
        ("child_voice", ("child voice", "said", "words", "views")),
        ("curiosity", ("curious", "pattern", "professional curiosity", "consider")),
    ],
}

FAMILIES_WITH_THERAPEUTIC_GUARD = frozenset(FAMILY_THERAPEUTIC_MARKER_GROUPS.keys()) | frozenset(
    {
        "dictate_finalisation",
        "orb_write_output",
        "template_generation",
        "document_review",
        "policy_practice_question",
        "parent_removal_conflict",
        "make_more_concise",
    }
)

THERAPEUTIC_QA_PROMPTS: list[dict[str, Any]] = [
    {
        "prompt_id": "therapeutic_daily_note_rewrite",
        "contract": "convert_to_recording_wording",
        "prompt": "Convert this judgemental daily note into therapeutic wording: He was attention seeking all evening.",
        "assertions": ["non_shaming", "child_centred", "staff_support"],
    },
    {
        "prompt_id": "therapeutic_attention_seeking_rewrite",
        "contract": "convert_to_recording_wording",
        "prompt": "Rewrite 'attention seeking' into child-centred recording language for a daily log.",
        "assertions": ["non_shaming", "no_diagnosis"],
    },
    {
        "prompt_id": "therapeutic_incident_repair",
        "contract": "incident_record",
        "prompt": "Help me record an incident where a child shouted, threw items and later repaired with staff.",
        "assertions": ["co_regulation", "repair", "child_voice", "non_shaming"],
    },
    {
        "prompt_id": "therapeutic_missing_return",
        "contract": "missing_return_record",
        "prompt": "She returned from missing — help me with a shame-free welcome-back conversation and record wording.",
        "assertions": ["non_shaming", "welfare_first", "curiosity"],
    },
    {
        "prompt_id": "therapeutic_self_harm_disclosure",
        "contract": "suicidal_self_harm",
        "prompt": "A young person disclosed self-harm — give validating but safe immediate response wording.",
        "assertions": ["validate_distress", "safety_escalation", "no_secrecy_promise"],
    },
    {
        "prompt_id": "therapeutic_autism_school_refusal",
        "contract": "daily_record",
        "prompt": "Child refusing school with autism and sensory needs — how should staff record this without framing refusal as defiance?",
        "assertions": ["non_shaming", "sensory", "curiosity", "no_defiance_framing"],
    },
    {
        "prompt_id": "therapeutic_gdd_widgets",
        "contract": "accessible_child_support_plan",
        "prompt": "GDD child communicating distress through widgets — support plan wording for staff.",
        "assertions": ["communication", "child_voice", "meaning"],
    },
    {
        "prompt_id": "therapeutic_keywork_family_contact",
        "contract": "keywork_session",
        "prompt": "Key-work session note about family contact worries — child-centred headings.",
        "assertions": ["child_voice", "feelings", "agreed_actions"],
    },
    {
        "prompt_id": "therapeutic_manager_oversight",
        "contract": "manager_oversight_note",
        "prompt": "Manager oversight note about repeated incidents — reflective learning wording.",
        "assertions": ["reflection", "learning", "patterns"],
    },
    {
        "prompt_id": "therapeutic_reg44_relational",
        "contract": "reg44_visitor",
        "prompt": "Reg 44 question: what evidence shows relational practice and how adults understand behaviour?",
        "assertions": ["relational_practice", "child_experience", "evidence"],
    },
    {
        "prompt_id": "therapeutic_supervision_restraint",
        "contract": "policy_practice_question",
        "prompt": "Staff supervision reflection after restraint — trauma-informed prompts.",
        "assertions": ["reflection", "co_regulation", "repair"],
    },
    {
        "prompt_id": "therapeutic_transitions_support_plan",
        "contract": "accessible_child_support_plan",
        "prompt": "Support plan for a child who struggles with transitions.",
        "assertions": ["what_helps", "child_friendly", "adult_responses"],
    },
    {
        "prompt_id": "therapeutic_behaviour_co_regulation",
        "contract": "daily_record",
        "prompt": "Behaviour support plan using co-regulation — what should daily recording include?",
        "assertions": ["co_regulation", "staff_support", "non_shaming"],
    },
    {
        "prompt_id": "therapeutic_restorative_repair",
        "contract": "incident_record",
        "prompt": "Restorative repair after harm to another child — recording scaffold.",
        "assertions": ["repair", "child_voice", "non_shaming"],
    },
    {
        "prompt_id": "therapeutic_complaint_staff_tone",
        "contract": "policy_practice_question",
        "prompt": "Complaint from child about staff tone — what to record with child-centred language?",
        "assertions": ["child_voice", "non_shaming", "escalation"],
    },
]

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


CONVERT_TO_RECORDING_RE = re.compile(
    r"\bconvert\s+(?:this\s+)?to\s+recording|recording\s+wording|turn\s+(?:this\s+)?into\s+(?:a\s+)?record",
    re.I,
)

FORBIDDEN_RECORDING_CONCEPTS: tuple[str, ...] = (
    "attention seeking",
    "appeared to seek attention",
    "seeking attention",
    "refused to listen",
    "non-compliant",
    "challenging behaviour without context",
)


def is_convert_to_recording_request(text: str) -> bool:
    return bool(CONVERT_TO_RECORDING_RE.search(str(text or "")))


def build_convert_to_recording_scaffold(source_text: str) -> str:
    """Deterministic therapeutic recording scaffold for convert-to-recording prompts."""
    facts = extract_known_incident_facts(source_text)
    shorthand_terms = detect_adult_shorthand(source_text)
    shorthand = facts.get("shorthand_behaviour") or (shorthand_terms[0] if shorthand_terms else None)
    name = facts.get("young_person") or "the young person"
    pronoun = "him" if name.lower().endswith(("m", "n", "r")) and name.lower() not in {"kim", "sam"} else "them"
    if name.lower() in {"jamie", "james", "liam", "ryan", "ethan", "noah", "jack", "luke", "mason", "harry"}:
        pronoun = "him"
    elif name.lower() in {"sarah", "emma", "lily", "grace", "mia", "chloe", "lucy", "amy", "katie", "jade"}:
        pronoun = "her"
    elif name != "the young person":
        pronoun = "them"

    warning = _concise_shorthand_warning(shorthand)

    scaffold = (
        f"On [add date/time], {name} was observed to [add specific behaviours]. "
        f"Staff remained curious about what {name} may have been communicating and "
        f"supported {pronoun} by [add staff response]. {name} responded by [add outcome]."
    )

    return "\n".join(
        [
            warning,
            "",
            "Recording wording scaffold:",
            scaffold,
            "",
            "Include:",
            "* observable behaviour (what was seen/heard)",
            f"* {name}'s voice (their words where known)",
            "* staff response",
            "* outcome",
            "",
            "Use observable behaviour and therapeutic curiosity — avoid judgemental labels.",
        ]
    )


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


def build_universal_therapeutic_language_contract_block(*, include_principles: bool = True) -> str:
    """Universal therapeutic language contract for ORB Residential answer families."""
    lines = [
        "============================================================",
        "UNIVERSAL THERAPEUTIC LANGUAGE CONTRACT (ORB Residential)",
        "",
        "Compatible with recording, safeguarding and no-invented-facts contracts.",
        "Therapeutic language must not weaken immediate safety or statutory escalation.",
        "",
    ]
    if include_principles:
        lines.append("Principles:")
        lines.extend(f"{index}. {principle}" for index, principle in enumerate(UNIVERSAL_THERAPEUTIC_PRINCIPLES, start=1))
        lines.append("")
    lines.extend(
        [
            "Forbidden or discouraged as final record language:",
            "attention seeking, manipulative, naughty, bad behaviour, kicked off, refused for no reason,",
            "non-compliant, challenging behaviour (without context), was aggressive (without observable detail),",
            "calmed down (without what helped), chose to misbehave, just wanted attention, being difficult,",
            "behaved perfectly, failed to engage, would not listen, overreacted, lied (unless evidenced), absconded.",
            "",
            "Preferred therapeutic wording:",
            "appeared distressed; communicated distress through…; found it difficult to…; was not ready to…;",
            "needed time and space; staff offered…; staff supported regulation by…; the young person said…;",
            "this may indicate…; staff should remain curious about…; repair was supported by….",
            "",
            "Do not diagnose trauma, intent or motivation. Do not replace managers, therapists or statutory roles.",
        ]
    )
    return "\n".join(lines)


def find_judgemental_phrases(text: str) -> list[str]:
    """Return ids of judgemental/shaming phrases detected in answer text."""
    hits: list[str] = []
    for phrase_id, pattern in JUDGEMENTAL_PHRASE_PATTERNS:
        if pattern.search(str(text or "")):
            hits.append(phrase_id)
    return hits


def _answer_preserves_safeguarding_clarity(text: str) -> bool:
    lowered = str(text or "").lower()
    return any(term in lowered for term in SAFEGUARDING_PRESERVE_TERMS)


def apply_deterministic_therapeutic_repairs(text: str) -> tuple[str, list[str]]:
    """Apply simple phrase replacements without OpenAI. Returns repaired text and applied repair ids."""
    value = str(text or "")
    applied: list[str] = []
    for pattern, replacement in THERAPEUTIC_PHRASE_REPLACEMENTS:
        if pattern.search(value):
            phrase_id = pattern.pattern.replace("\\b", "").replace("(?i)", "")[:40]
            value = pattern.sub(replacement, value)
            applied.append(phrase_id)
    return value, applied


def find_missing_therapeutic_markers(answer: str, *, family_id: str | None) -> list[str]:
    """Return therapeutic marker group ids missing from the answer for the contract family."""
    groups = FAMILY_THERAPEUTIC_MARKER_GROUPS.get(family_id or "", [])
    if not groups:
        return []
    lowered = (answer or "").lower()
    missing: list[str] = []
    for group_id, alternatives in groups:
        if not any(alt in lowered for alt in alternatives):
            missing.append(group_id)
    return missing


def validate_therapeutic_wording(
    answer: str,
    *,
    family_id: str | None = None,
    source_text: str | None = None,
) -> dict[str, Any]:
    """Therapeutic wording guard for final-answer validation."""
    _ = source_text
    judgemental = find_judgemental_phrases(answer)
    missing_markers = find_missing_therapeutic_markers(answer, family_id=family_id)
    safeguarding_preserved = True
    if family_id in {"suicidal_self_harm", "allegation_lado", "abuse_disclosure"}:
        safeguarding_preserved = _answer_preserves_safeguarding_clarity(answer)
    passed = not judgemental and safeguarding_preserved
    return {
        "passed": passed,
        "judgemental_phrases": judgemental,
        "missing_therapeutic_markers": missing_markers,
        "safeguarding_clarity_preserved": safeguarding_preserved,
        "repair_recommended": bool(judgemental),
    }


def score_therapeutic_readiness(
    answer: str,
    *,
    family_id: str | None = None,
    prompt: str = "",
) -> dict[str, Any]:
    """Score therapeutic support for knowledge gap audit (0-5 scales and pass/fail flags)."""
    text = str(answer or "")
    lowered = text.lower()
    prompt_lower = str(prompt or "").lower()

    def _scale(markers: tuple[str, ...], *, base: int = 0) -> int:
        hits = sum(1 for marker in markers if marker in lowered)
        if hits >= 4:
            return 5
        if hits >= 3:
            return 4
        if hits >= 2:
            return 3
        if hits >= 1:
            return 2
        return base

    therapeutic_language = _scale(
        ("appeared", "distress", "supported", "communicat", "curious", "repair", "regulated", "voice"),
        base=1 if text else 0,
    )
    trauma_informed = _scale(
        ("trauma", "pace", "regulation", "co-regulation", "coregulation", "safety", "connection", "repair"),
        base=1 if text else 0,
    )
    relational_practice = _scale(
        ("relationship", "relational", "rapport", "trust", "repair", "reconnect", "welcome"),
        base=1 if text else 0,
    )
    child_voice = _scale(
        ("child's voice", "young person said", "views", "feelings", "words", "said "),
        base=1 if "child voice" in prompt_lower else 0,
    )

    judgemental = find_judgemental_phrases(text)
    non_shaming_language = "pass" if not judgemental else "fail"

    co_regulation_relevant = family_id in {
        "incident_record",
        "daily_record",
        "suicidal_self_harm",
        "missing_return_record",
    } or any(term in prompt_lower for term in ("incident", "restraint", "behaviour", "dysregulated"))
    co_regulation_present = (
        "pass"
        if any(term in lowered for term in ("co-regulation", "coregulation", "de-escalat", "regulated", "staff supported"))
        else ("n/a" if not co_regulation_relevant else "fail")
    )

    restorative_relevant = family_id in {"incident_record", "missing_return_record"} or "repair" in prompt_lower
    restorative_repair_present = (
        "pass"
        if any(term in lowered for term in ("repair", "restorative", "reconnect", "debrief"))
        else ("n/a" if not restorative_relevant else "fail")
    )

    curiosity_relevant = family_id in {
        "manager_oversight_note",
        "what_am_i_missing",
        "missing_return_record",
        "policy_practice_question",
    } or "curious" in prompt_lower
    professional_curiosity_present = (
        "pass"
        if any(term in lowered for term in ("curious", "curiosity", "pattern", "consider whether", "may indicate"))
        else ("n/a" if not curiosity_relevant else "fail")
    )

    therapeutic_readiness_score = round(
        (therapeutic_language + trauma_informed + relational_practice + child_voice) / 4 * 20,
        1,
    )

    return {
        "therapeutic_language": therapeutic_language,
        "trauma_informed": trauma_informed,
        "relational_practice": relational_practice,
        "child_voice": child_voice,
        "non_shaming_language": non_shaming_language,
        "co_regulation_present": co_regulation_present,
        "restorative_repair_present": restorative_repair_present,
        "professional_curiosity_present": professional_curiosity_present,
        "therapeutic_readiness_score": therapeutic_readiness_score,
        "judgemental_phrases": judgemental,
        "openai_needed_for_therapeutic_rewrite": bool(judgemental) and len(text.split()) > 25,
    }


def run_therapeutic_qa_assertions(answer: str, *, assertions: list[str]) -> dict[str, bool]:
    """Evaluate therapeutic QA prompt assertions against an answer."""
    lowered = str(answer or "").lower()
    results: dict[str, bool] = {}
    for assertion in assertions:
        if assertion == "non_shaming":
            results[assertion] = not find_judgemental_phrases(answer)
        elif assertion == "child_centred":
            results[assertion] = any(
                term in lowered for term in ("young person", "child", "said", "voice", "views", "feelings")
            )
        elif assertion == "staff_support":
            results[assertion] = any(term in lowered for term in ("staff supported", "staff offered", "staff responded"))
        elif assertion == "co_regulation":
            results[assertion] = any(
                term in lowered for term in ("co-regulation", "coregulation", "de-escalat", "regulated", "staff supported")
            )
        elif assertion == "repair":
            results[assertion] = any(term in lowered for term in ("repair", "restorative", "reconnect"))
        elif assertion == "child_voice":
            results[assertion] = any(term in lowered for term in ("child voice", "young person said", "views", "words"))
        elif assertion == "no_diagnosis":
            results[assertion] = not any(
                term in lowered for term in ("diagnosed", "has adhd", "is autistic because", "definitely trauma")
            )
        elif assertion == "welfare_first":
            results[assertion] = any(term in lowered for term in ("welfare", "safe", "check", "injury"))
        elif assertion == "curiosity":
            results[assertion] = any(term in lowered for term in ("curious", "curiosity", "what happened", "consider"))
        elif assertion == "validate_distress":
            results[assertion] = any(term in lowered for term in ("distress", "heard", "listened", "validated", "support"))
        elif assertion == "safety_escalation":
            results[assertion] = any(term in lowered for term in ("safety", "manager", "immediate", "escalat", "crisis"))
        elif assertion == "no_secrecy_promise":
            results[assertion] = "promise not to tell" not in lowered and "won't tell anyone" not in lowered
        elif assertion == "sensory":
            results[assertion] = any(term in lowered for term in ("sensory", "processing", "autism", "overwhelm"))
        elif assertion == "no_defiance_framing":
            results[assertion] = "defiant" not in lowered and "non-compliant" not in lowered
        elif assertion == "communication":
            results[assertion] = any(term in lowered for term in ("widget", "communicat", "aac", "symbol"))
        elif assertion == "meaning":
            results[assertion] = any(term in lowered for term in ("meaning", "communicat", "distress", "understand"))
        elif assertion == "feelings":
            results[assertion] = any(term in lowered for term in ("feelings", "worried", "upset", "anxious"))
        elif assertion == "agreed_actions":
            results[assertion] = any(term in lowered for term in ("agreed", "action", "next step", "plan"))
        elif assertion == "reflection":
            results[assertion] = any(term in lowered for term in ("reflect", "learning", "learnt", "learned"))
        elif assertion == "learning":
            results[assertion] = any(term in lowered for term in ("learning", "learnt", "learned", "review"))
        elif assertion == "patterns":
            results[assertion] = any(term in lowered for term in ("pattern", "repeated", "trend"))
        elif assertion == "relational_practice":
            results[assertion] = any(term in lowered for term in ("relational", "relationship", "rapport", "trust"))
        elif assertion == "child_experience":
            results[assertion] = any(term in lowered for term in ("child experience", "children", "feel safe", "listened"))
        elif assertion == "evidence":
            results[assertion] = any(term in lowered for term in ("evidence", "record", "chronology", "oversight"))
        elif assertion == "what_helps":
            results[assertion] = any(term in lowered for term in ("helps", "calm", "safe", "support"))
        elif assertion == "child_friendly":
            results[assertion] = any(term in lowered for term in ("my support plan", "about me", "helps me"))
        elif assertion == "adult_responses":
            results[assertion] = any(term in lowered for term in ("adults should", "adult guidance", "staff supported"))
        elif assertion == "escalation":
            results[assertion] = any(term in lowered for term in ("manager", "complaint", "escalat", "notify", "record"))
        else:
            results[assertion] = True
    return results


orb_therapeutic_language_contract_service = type(
    "OrbTherapeuticLanguageContractService",
    (),
    {
        "ADULT_SHORTHAND_RE": ADULT_SHORTHAND_RE,
        "GENERIC_WEAK_PHRASES": GENERIC_WEAK_PHRASES,
        "RESIDENTIAL_INCIDENT_HEADINGS": RESIDENTIAL_INCIDENT_HEADINGS,
        "UNIVERSAL_THERAPEUTIC_PRINCIPLES": UNIVERSAL_THERAPEUTIC_PRINCIPLES,
        "FAMILY_THERAPEUTIC_MARKER_GROUPS": FAMILY_THERAPEUTIC_MARKER_GROUPS,
        "THERAPEUTIC_QA_PROMPTS": THERAPEUTIC_QA_PROMPTS,
        "detect_adult_shorthand": staticmethod(detect_adult_shorthand),
        "is_residential_incident_scenario": staticmethod(is_residential_incident_scenario),
        "is_short_residential_scenario": staticmethod(is_short_residential_scenario),
        "build_therapeutic_language_contract_block": staticmethod(build_therapeutic_language_contract_block),
        "build_universal_therapeutic_language_contract_block": staticmethod(build_universal_therapeutic_language_contract_block),
        "build_residential_scenario_prompt_block": staticmethod(build_residential_scenario_prompt_block),
        "build_safe_residential_scenario_scaffold": staticmethod(build_safe_residential_scenario_scaffold),
        "uses_weak_generic_phrasing": staticmethod(uses_weak_generic_phrasing),
        "uses_forbidden_generic_phrasing": staticmethod(uses_forbidden_generic_phrasing),
        "states_dysregulation_as_unsupported_fact": staticmethod(states_dysregulation_as_unsupported_fact),
        "treats_shorthand_as_clarification_needed": staticmethod(treats_shorthand_as_clarification_needed),
        "response_includes_therapeutic_prompts": staticmethod(response_includes_therapeutic_prompts),
        "response_meets_residential_scenario_contract": staticmethod(response_meets_residential_scenario_contract),
        "find_judgemental_phrases": staticmethod(find_judgemental_phrases),
        "apply_deterministic_therapeutic_repairs": staticmethod(apply_deterministic_therapeutic_repairs),
        "find_missing_therapeutic_markers": staticmethod(find_missing_therapeutic_markers),
        "validate_therapeutic_wording": staticmethod(validate_therapeutic_wording),
        "score_therapeutic_readiness": staticmethod(score_therapeutic_readiness),
        "run_therapeutic_qa_assertions": staticmethod(run_therapeutic_qa_assertions),
        "shorthand_to_observable_prompt": staticmethod(shorthand_to_observable_prompt),
    },
)()
