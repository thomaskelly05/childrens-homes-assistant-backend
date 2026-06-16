"""
Quality Standards Intelligence Module
IndiCare AI

Purpose:
Provide deep, quality evidence reasoning aligned to the
Children’s Homes (England) Regulations 2015.

This module enables:
- inspection evidence preparation analysis
- Regulation 45 evaluation
- Manager oversight thinking
- Staff recording improvement
- Evidence-based decision-making
- Cross-standard understanding
"""

# =====================================================
# CORE QUALITY STANDARDS (FULL INTELLIGENCE MODEL)
# =====================================================

QUALITY_STANDARDS = {
    "reg_6_quality_of_care": {
        "name": "Quality and purpose of care",
        "intent": "Care must meet children’s needs and reflect the home’s purpose.",
        "inspectors_look_for": [
            "Is care individualised?",
            "Does daily practice reflect the child’s plan?",
            "Is the home consistent in approach?",
            "Is care meaningful, not just procedural?",
        ],
        "strong_evidence": [
            "Daily records reflect individual needs and plans",
            "Staff responses are consistent and intentional",
            "Children’s routines are structured and purposeful",
        ],
        "weak_evidence": [
            "Generic care approaches",
            "Plans not reflected in practice",
            "Task-based recording only",
        ],
        "child_impact": [
            "Child feels understood",
            "Child experiences consistency",
        ],
        "manager_checks": [
            "Are staff following plans consistently?",
            "Is care drifting into routine rather than purpose?",
        ],
    },

    "reg_7_child_voice": {
        "name": "Children’s views, wishes and feelings",
        "intent": "Children must influence decisions about their lives.",
        "inspectors_look_for": [
            "Is the child’s voice visible?",
            "Are views acted on?",
            "Does the child influence planning?",
        ],
        "strong_evidence": [
            "Direct quotes from the child",
            "Decisions influenced by child voice",
        ],
        "weak_evidence": [
            "Tokenistic child voice",
            "Adult interpretation only",
        ],
        "child_impact": [
            "Child feels heard",
            "Child has control where appropriate",
        ],
        "manager_checks": [
            "Is child voice consistent across records?",
            "Are staff genuinely listening or just recording?",
        ],
    },

    "reg_12_safeguarding": {
        "name": "Protection of children",
        "intent": "Children must be protected from harm.",
        "inspectors_look_for": [
            "Are risks understood?",
            "Are incidents followed up?",
            "Are safeguarding concerns escalated?",
        ],
        "strong_evidence": [
            "Clear factual safeguarding records",
            "Timely escalation",
            "Updated risk assessments",
        ],
        "weak_evidence": [
            "Vague safeguarding language",
            "No follow-up",
            "Repeated incidents without analysis",
        ],
        "child_impact": [
            "Child is safer",
            "Risk is reduced",
        ],
        "manager_checks": [
            "Are patterns being identified?",
            "Are we missing safeguarding escalation?",
        ],
    },

    "reg_13_leadership": {
        "name": "Leadership and management",
        "intent": "The home must be effectively led.",
        "inspectors_look_for": [
            "Do leaders know the home?",
            "Are weaknesses identified?",
            "Is oversight visible?",
        ],
        "strong_evidence": [
            "Manager comments show analysis",
            "Actions are completed and reviewed",
        ],
        "weak_evidence": [
            "No management oversight",
            "Repeated issues not addressed",
        ],
        "child_impact": [
            "Child receives consistent care",
            "Risks are managed effectively",
        ],
        "manager_checks": [
            "What do I know vs what is recorded?",
            "Where is my evidence of oversight?",
        ],
    },
}

# =====================================================
# CROSS-STANDARD THINKING ENGINE
# =====================================================

CROSS_STANDARD_REASONING = [
    "Safeguarding issues must update care planning",
    "Child voice must influence all decisions",
    "Leadership must be visible in all standards",
    "Care quality underpins every standard",
    "Recording links all standards together",
]

# =====================================================
# INSPECTION EVIDENCE TESTS
# =====================================================

EVIDENCE_TESTS = [
    "Is it specific?",
    "Does it show impact?",
    "Is the child’s voice present?",
    "Is there follow-up?",
    "Is management oversight visible?",
    "Does it align with plans?",
    "Does it identify patterns?",
]

# =====================================================
# RECORDING PROMPTS
# =====================================================

RECORDING_PROMPTS = [
    "What did staff see, hear, and do?",
    "What did the child say?",
    "What happened next?",
    "Who was informed?",
    "What was the outcome?",
    "What needs to happen next?",
]

# =====================================================
# REGULATION 45 LINK
# =====================================================

REG45_LINK = [
    "Use Quality Standards to evaluate care",
    "Identify strengths and weaknesses",
    "Track patterns across standards",
    "Link findings to actions",
]

# =====================================================
# DOWNGRADE RISK LOGIC
# =====================================================

DOWNGRADE_RISKS = [
    "Repeated weak recording",
    "No management oversight",
    "Safeguarding concerns not escalated",
    "Child voice missing",
    "Plans not updated",
    "Patterns not identified",
]

# =====================================================
# PRACTICE GUIDANCE
# =====================================================

PRACTICE_GUIDANCE = """
QUALITY STANDARDS THINKING MODEL

1. What standard is relevant?
2. What is evidenced?
3. What is missing?
4. What is the impact on the child?
5. What does this mean for practice?
6. What needs to happen next?

Always:
- Keep child central
- Focus on impact
- Be evidence-led
- Highlight gaps clearly
"""

# =====================================================
# OUTPUT RULES
# =====================================================

RULES = [
    "Use standards to strengthen answers, not dominate them",
    "Do not overstate compliance",
    "Do not invent evidence",
    "Focus on child impact",
    "Highlight gaps honestly",
]
