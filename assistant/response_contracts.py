from __future__ import annotations

"""
assistant/response_contracts.py

Elite production response contracts for IndiCare Assistant.

Purpose:
- Define expected response shape per mode
- Support safe recording
- Support standalone and OS-embedded behaviour
- Strengthen evidence and citation discipline
- Support UI rendering and quality checks
"""

from typing import Any


RESPONSE_CONTRACTS: dict[str, dict[str, Any]] = {
    "knowledge": {
        "ui_label": "Knowledge answer",
        "purpose": "Explain children’s homes knowledge, regulation, guidance, or practice clearly.",
        "required_sections": ["Answer", "Practice meaning", "Source basis"],
        "optional_sections": ["Key points", "What to check locally", "Example wording"],
        "tone": ["clear", "plain English", "professionally cautious"],
        "evidence_rules": [
            "Do not invent legislation, regulation numbers, Ofsted wording, or statutory requirements.",
            "If the answer is based on general practice rather than a confirmed source, say so.",
            "Distinguish law, statutory guidance, Ofsted framework, and practice advice.",
        ],
        "citation_rules": [
            "Use source labels where available.",
            "Do not create fake citations.",
        ],
        "safety_rules": [
            "Do not present legal or safeguarding thresholds as final decisions.",
            "Encourage local policy, safeguarding procedure, or manager consultation where relevant.",
        ],
        "forbidden": [
            "Invented statutory duties",
            "Overconfident legal claims",
            "Unverified Ofsted grade predictions",
        ],
        "validation_hints": ["source", "basis", "practice"],
    },

    "guidance": {
        "ui_label": "Practice guidance",
        "purpose": "Give practical, child-centred support for residential childcare practice.",
        "required_sections": ["Practical answer", "What this means in practice"],
        "optional_sections": ["Recording note", "Follow-up prompts"],
        "tone": ["practical", "calm", "direct", "supportive", "person-centred"],
        "evidence_rules": [
            "Do not claim unseen evidence exists.",
            "Make assumptions visible.",
            "Use general practice reasoning only where no record evidence is supplied.",
        ],
        "citation_rules": [
            "Cite only supplied sources or visible evidence.",
        ],
        "safety_rules": [
            "Escalate safeguarding concerns where indicated.",
            "Do not minimise risk.",
        ],
        "forbidden": [
            "Generic waffle",
            "Unsafe reassurance",
            "Advice that bypasses manager or safeguarding procedure",
            "challenging moment",
            "What to Do Now",
            "Good Practice",
            "Risks to Avoid",
            "kicked off as final record language",
            "It is essential",
            "therapeutic interventions",
            "subsequent escalation",
            "safeguarding practices",
            "underlying issues",
            "maintain clarity and transparency",
        ],
        "validation_hints": ["practical", "action", "record"],
    },

    "recording": {
        "ui_label": "Professional record",
        "purpose": "Produce factual, defensible recording suitable for a children’s home record.",
        "required_sections": ["Record text"],
        "optional_sections": ["Missing information to confirm", "Recording checks"],
        "tone": ["neutral", "factual", "professional", "non-judgemental"],
        "evidence_rules": [
            "Use only information supplied by the user.",
            "Do not add incidents, motives, outcomes, timings, injuries, disclosures, or actions not provided.",
            "Separate observation, report, action, and outcome.",
        ],
        "citation_rules": [
            "If OS record evidence is supplied, cite exact citation_ref values.",
            "Do not invent record IDs.",
        ],
        "safety_rules": [
            "Do not polish away safeguarding concerns.",
            "Include escalation or follow-up where the facts indicate it.",
        ],
        "forbidden": [
            "Attention-seeking",
            "Manipulative",
            "Just behaviour",
            "No concerns where concerns exist",
            "Handled perfectly",
        ],
        "validation_hints": ["staff observed", "child said", "staff supported", "outcome"],
    },

    "rewrite": {
        "ui_label": "Professional rewrite",
        "purpose": "Improve wording while preserving meaning and facts.",
        "required_sections": ["Rewritten text"],
        "optional_sections": ["What I changed", "Remaining gaps"],
        "tone": ["professional", "clear", "factual"],
        "evidence_rules": [
            "Do not change the meaning.",
            "Do not add facts.",
            "Do not remove safeguarding concern or uncertainty.",
        ],
        "citation_rules": [
            "Preserve any supplied citations.",
            "Do not add new citations unless evidence is visible.",
        ],
        "safety_rules": [
            "Do not soften serious concerns into vague language.",
            "Keep uncertainty visible.",
        ],
        "forbidden": [
            "Changing the factual account",
            "Making weak practice sound stronger than evidenced",
            "Removing risk or escalation detail",
        ],
        "validation_hints": ["rewritten"],
    },

    "handover": {
        "ui_label": "Handover",
        "purpose": "Create a clear shift handover focused on safety, continuity, and next actions.",
        "required_sections": ["Summary", "Current risks", "Actions for next shift"],
        "optional_sections": ["Presentation", "Positive moments", "Outstanding follow-up"],
        "tone": ["concise", "practical", "shift-ready"],
        "evidence_rules": [
            "Do not invent events from the shift.",
            "State if key handover details are missing.",
        ],
        "citation_rules": [
            "Use record citations only if supplied.",
        ],
        "safety_rules": [
            "Prioritise live risks and unfinished actions.",
            "Include escalation needs where relevant.",
        ],
        "forbidden": [
            "Vague handover",
            "Missing risk information",
            "Unclear ownership of actions",
        ],
        "validation_hints": ["next shift", "risk", "action"],
    },

    "incident": {
        "ui_label": "Incident record",
        "purpose": "Structure an incident account in factual, chronological, defensible language.",
        "required_sections": ["Incident summary", "Staff response", "Outcome", "Follow-up"],
        "optional_sections": ["Antecedents", "Child voice", "Notifications", "Management review"],
        "tone": ["chronological", "factual", "neutral"],
        "evidence_rules": [
            "Do not invent triggers, intent, motives, or outcomes.",
            "Separate what happened before, during, and after.",
            "Include what is unknown.",
            "Never invent quotes, staff actions, emotional states, injuries, damage or follow-up plans.",
            "Treat adult shorthand (e.g. 'kicking off') as wording to clarify into observable behaviour.",
            "Use placeholders and a missing-information checklist where detail is absent.",
        ],
        "citation_rules": [
            "Cite incident or record evidence where supplied.",
        ],
        "safety_rules": [
            "Flag safeguarding, medical, police, LADO, or management follow-up where indicated.",
            "Do not minimise serious incidents.",
        ],
        "forbidden": [
            "Blaming language",
            "Unsupported motive",
            "Missing follow-up where risk exists",
            "challenging moment",
            "being disruptive",
            "kicked off as final record language without clarification",
            "It is essential",
            "therapeutic interventions",
            "subsequent escalation",
            "became emotionally dysregulated as unsupported fact",
        ],
        "validation_hints": ["incident", "staff response", "outcome", "follow-up", "child voice", "observable"],
    },

    "chronology": {
        "ui_label": "Chronology",
        "purpose": "Present events in clear date/time order.",
        "required_sections": ["Chronology"],
        "optional_sections": ["Source", "Analysis", "Gaps"],
        "tone": ["ordered", "factual", "clear"],
        "evidence_rules": [
            "Do not fill timeline gaps with assumptions.",
            "Label analysis separately from chronology.",
        ],
        "citation_rules": [
            "Use source references where supplied.",
            "Never invent dates or record IDs.",
        ],
        "safety_rules": [
            "Highlight missing dates, unclear sequence, or serious escalation gaps.",
        ],
        "forbidden": [
            "Invented chronology",
            "Mixed facts and analysis without labels",
        ],
        "validation_hints": ["date", "time", "event", "source"],
    },

    "safeguarding": {
        "ui_label": "Safeguarding response",
        "purpose": "Support immediate safety, escalation, recording, and professional judgement.",
        "required_sections": [
            "Immediate safety",
            "What is known",
            "Concerns",
            "Actions required",
            "Recording requirements",
        ],
        "optional_sections": ["Who to inform", "What remains unclear", "Manager review"],
        "tone": ["clear", "direct", "calm", "safety-first"],
        "evidence_rules": [
            "Do not determine final safeguarding thresholds.",
            "Do not invent disclosures, injuries, or risks.",
            "State what is known and what is not confirmed.",
        ],
        "citation_rules": [
            "Cite only visible evidence.",
        ],
        "safety_rules": [
            "Lead with immediate safety if there may be current risk.",
            "Encourage safeguarding procedure, manager/on-call, social worker, police, emergency services, or LADO where indicated.",
            "Do not delay urgent action for reflective discussion.",
        ],
        "forbidden": [
            "False reassurance",
            "Downplaying risk",
            "Telling the user not to report",
            "Replacing safeguarding procedure",
        ],
        "validation_hints": ["immediate safety", "known", "concern", "action", "record"],
    },

    "reflection": {
        "ui_label": "Reflective practice",
        "purpose": "Support learning, emotional processing, and better future practice.",
        "required_sections": ["Reflection", "What went well", "What could be strengthened", "Learning"],
        "optional_sections": ["Supervision prompts", "Team learning", "Next time"],
        "tone": ["supportive", "curious", "non-blaming", "practical"],
        "evidence_rules": [
            "Do not invent details about the event.",
            "Hold uncertainty carefully.",
        ],
        "citation_rules": [
            "Citations are optional unless evidence is supplied.",
        ],
        "safety_rules": [
            "If safeguarding risk appears live, prioritise safety before reflection.",
            "Do not over-therapise staff experience.",
        ],
        "forbidden": [
            "Blame",
            "Clinical diagnosis",
            "Ignoring risk",
        ],
        "validation_hints": ["reflection", "learning", "next"],
    },

    "mentor": {
        "ui_label": "Mentor support",
        "purpose": "Act as a supportive, practical team mentor.",
        "required_sections": ["Guidance", "Practical steps"],
        "optional_sections": ["Reassurance", "What to avoid", "Suggested wording"],
        "tone": ["warm", "steady", "practical", "confidence-building"],
        "evidence_rules": [
            "Do not claim knowledge of local policy unless provided.",
        ],
        "citation_rules": [
            "Use source basis where relevant.",
        ],
        "safety_rules": [
            "Do not replace manager support or safeguarding escalation.",
        ],
        "forbidden": [
            "Over-reassurance",
            "Unsafe shortcuts",
        ],
        "validation_hints": ["guidance", "steps"],
    },

    "supervision": {
        "ui_label": "Supervision support",
        "purpose": "Support reflective supervision, practice development, and accountability.",
        "required_sections": ["Discussion points", "Analysis", "Actions"],
        "optional_sections": ["Strengths", "Development needs", "Manager prompts"],
        "tone": ["balanced", "reflective", "developmental", "accountable"],
        "evidence_rules": [
            "Separate staff reflection from evidence.",
            "Do not make unsupported conclusions about staff conduct.",
        ],
        "citation_rules": [
            "Cite evidence only when supplied.",
        ],
        "safety_rules": [
            "Escalate safeguarding or conduct concerns where indicated.",
        ],
        "forbidden": [
            "Blame-based supervision",
            "Ignoring unsafe practice",
        ],
        "validation_hints": ["discussion", "analysis", "actions"],
    },

    "manager_review": {
        "ui_label": "Manager review",
        "purpose": "Provide management oversight, accountability, quality assurance, and action focus.",
        "required_sections": ["Summary", "Strengths", "Concerns", "Actions", "Management oversight"],
        "optional_sections": ["Evidence gaps", "Patterns", "Plan review", "Supervision points"],
        "tone": ["analytical", "clear", "accountable", "proportionate"],
        "evidence_rules": [
            "Use evidence before judgement.",
            "Identify gaps and limitations.",
            "Distinguish one-off concern from pattern.",
        ],
        "citation_rules": [
            "Use exact citation_ref values for OS evidence.",
            "Do not invent citations.",
        ],
        "safety_rules": [
            "Highlight safeguarding, practice, staffing, or oversight risks.",
            "Frame actions with ownership and review.",
        ],
        "forbidden": [
            "Unsupported management assurance",
            "Generic audit language",
            "Hiding weak evidence",
        ],
        "validation_hints": ["summary", "strength", "concern", "action", "oversight"],
    },

    "ofsted_view": {
        "ui_label": "Ofsted view",
        "purpose": "Give an inspection-aligned view of evidence, strengths, weaknesses, and risk.",
        "required_sections": [
            "What looks positive",
            "What may concern an inspector",
            "What evidence is missing",
            "Inspection risk",
            "Actions to strengthen readiness",
        ],
        "optional_sections": ["Child’s lived experience", "Quality Standards link", "Manager/RI assurance"],
        "tone": ["realistic", "balanced", "evidence-led", "non-alarmist"],
        "evidence_rules": [
            "Do not predict a grade from limited evidence.",
            "Use language such as may, could, suggests, indicates.",
            "Focus on child impact and leadership grip.",
        ],
        "citation_rules": [
            "Cite visible record evidence.",
            "Use source labels for statutory or Ofsted basis where available.",
        ],
        "safety_rules": [
            "Highlight serious safeguarding or leadership risks clearly.",
            "Do not exaggerate minor issues.",
        ],
        "forbidden": [
            "Definite grade prediction",
            "Fear-based wording",
            "Invented inspector comments",
        ],
        "validation_hints": ["positive", "concern", "missing", "risk", "action"],
    },

    "reg45": {
        "ui_label": "Regulation 45 review",
        "purpose": "Evaluate the quality of care and improvement actions in a Reg 45 style.",
        "required_sections": [
            "Quality of care",
            "Children’s experiences and progress",
            "Safeguarding and protection",
            "Leadership and management",
            "Strengths",
            "Areas for development",
            "Actions required",
            "Evidence limitations",
        ],
        "optional_sections": ["Themes and patterns", "Previous actions", "RI/provider assurance"],
        "tone": ["evaluative", "evidence-led", "balanced", "improvement-focused"],
        "evidence_rules": [
            "Be evaluative, not descriptive only.",
            "Use multiple evidence sources where visible.",
            "Do not invent themes or outcomes.",
            "State evidence limitations clearly.",
        ],
        "citation_rules": [
            "Use exact citation_ref values where evidence supports findings.",
            "Do not create fake Reg 45 evidence.",
        ],
        "safety_rules": [
            "Identify urgent safeguarding or leadership concerns clearly.",
            "Actions should be specific, owned, and reviewable.",
        ],
        "forbidden": [
            "Generic Reg 45 filler",
            "Unsupported assurance",
            "Actions with no owner or review point",
        ],
        "validation_hints": ["quality of care", "experience", "safeguarding", "leadership", "actions"],
    },

    "support_plan": {
        "ui_label": "Support plan",
        "purpose": "Create practical, child-centred support or risk planning guidance.",
        "required_sections": ["Need", "Triggers", "Protective factors", "Staff actions", "Review"],
        "optional_sections": ["Communication needs", "Sensory needs", "Escalation", "Child voice"],
        "tone": ["practical", "child-centred", "clear", "usable by staff"],
        "evidence_rules": [
            "Do not invent needs, diagnoses, triggers, or risks.",
            "Use the child’s known plan or provided information where supplied.",
        ],
        "citation_rules": [
            "Cite plan or record evidence if visible.",
        ],
        "safety_rules": [
            "Include escalation for increased risk.",
            "Avoid punitive or coercive strategies.",
            "For autism, LD, GDD, or communication needs, include reasonable adjustments where relevant.",
        ],
        "forbidden": [
            "Punitive strategies",
            "Unsupported diagnosis",
            "Generic behaviour plan with no individualisation",
        ],
        "validation_hints": ["need", "trigger", "staff", "review"],
    },
}


MODE_ALIASES = {
    "plain_response": "guidance",
    "default": "guidance",
    "practical_response": "guidance",
    "professional_rewrite": "rewrite",
    "structured_record": "recording",
    "daily_note": "recording",
    "daily_log": "recording",
    "handover_note": "handover",
    "incident_record": "incident",
    "incident_summary": "incident",
    "chronology_entry": "chronology",
    "safeguarding_note": "safeguarding",
    "reflective_debrief": "reflection",
    "supervision_reflection": "supervision",
    "manager_update": "manager_review",
    "management_review": "manager_review",
    "inspection_review": "ofsted_view",
    "quality_review": "ofsted_view",
    "structured_report": "reg45",
    "reg45_report": "reg45",
    "risk_summary": "support_plan",
    "plan": "support_plan",
}


def normalise_contract_mode(mode: str | None) -> str:
    value = str(mode or "").strip().lower()
    return MODE_ALIASES.get(value, value or "guidance")


def get_contract(mode: str | None) -> dict[str, Any]:
    return RESPONSE_CONTRACTS.get(
        normalise_contract_mode(mode),
        RESPONSE_CONTRACTS["guidance"],
    )


def get_required_sections(mode: str | None) -> list[str]:
    return list(get_contract(mode).get("required_sections", []))


def get_optional_sections(mode: str | None) -> list[str]:
    return list(get_contract(mode).get("optional_sections", []))


def get_contract_rules(mode: str | None) -> dict[str, list[str]]:
    contract = get_contract(mode)
    return {
        "tone": list(contract.get("tone", [])),
        "evidence_rules": list(contract.get("evidence_rules", [])),
        "citation_rules": list(contract.get("citation_rules", [])),
        "safety_rules": list(contract.get("safety_rules", [])),
        "forbidden": list(contract.get("forbidden", [])),
    }


def build_contract_prompt_block(
    mode: str | None,
    *,
    assistant_surface: str = "standalone",
    requires_evidence_grounding: bool = False,
) -> str:
    resolved_mode = normalise_contract_mode(mode)
    contract = get_contract(resolved_mode)

    lines = [
        "============================================================",
        "RESPONSE CONTRACT",
        "",
        f"Mode: {resolved_mode}",
        f"UI label: {contract.get('ui_label', '')}",
        f"Purpose: {contract.get('purpose', '')}",
        f"Assistant surface: {assistant_surface}",
        f"Requires evidence grounding: {requires_evidence_grounding}",
        "",
        "Required sections:",
    ]

    for section in contract.get("required_sections", []):
        lines.append(f"• {section}")

    optional = contract.get("optional_sections", [])
    if optional:
        lines.append("")
        lines.append("Optional sections:")
        for section in optional:
            lines.append(f"• {section}")

    for label, key in [
        ("Tone", "tone"),
        ("Evidence rules", "evidence_rules"),
        ("Citation rules", "citation_rules"),
        ("Safety rules", "safety_rules"),
        ("Forbidden outputs", "forbidden"),
    ]:
        values = contract.get(key, [])
        if values:
            lines.append("")
            lines.append(f"{label}:")
            for item in values:
                lines.append(f"• {item}")

    if assistant_surface == "standalone":
        lines.extend(
            [
                "",
                "Standalone rule:",
                "• Do not imply access to records, plans, chronology, or home data unless supplied by the user.",
            ]
        )

    if requires_evidence_grounding:
        lines.extend(
            [
                "",
                "Evidence-grounded rule:",
                "• If evidence is missing or limited, state that clearly before giving conclusions.",
                "• Do not answer record-specific questions using general practice knowledge alone.",
            ]
        )

    lines.extend(
        [
            "",
            "Apply this structure where useful.",
            "If the user asked for a direct draft, prioritise the draft and keep checks brief.",
        ]
    )

    return "\n".join(lines).strip()


def validate_response_structure(mode: str | None, response_text: str) -> dict[str, Any]:
    resolved_mode = normalise_contract_mode(mode)
    contract = get_contract(resolved_mode)
    text = (response_text or "").lower()

    missing: list[str] = []

    for section in contract.get("required_sections", []):
        section_text = section.lower()
        if section_text not in text:
            missing.append(section)

    hints = contract.get("validation_hints", [])
    present_hints = [hint for hint in hints if hint.lower() in text]

    return {
        "mode": resolved_mode,
        "ui_label": contract.get("ui_label", ""),
        "missing_sections": missing,
        "present_validation_hints": present_hints,
        "is_valid": len(missing) == 0,
    }


def contract_to_ui_schema(mode: str | None) -> dict[str, Any]:
    resolved_mode = normalise_contract_mode(mode)
    contract = get_contract(resolved_mode)

    return {
        "mode": resolved_mode,
        "ui_label": contract.get("ui_label", ""),
        "purpose": contract.get("purpose", ""),
        "required_sections": contract.get("required_sections", []),
        "optional_sections": contract.get("optional_sections", []),
        "validation_hints": contract.get("validation_hints", []),
    }
