"""
Inspection Readiness Knowledge Module
IndiCare AI

Purpose:
Provide Ofsted-grade inspection thinking for UK residential children’s homes.

This module helps IndiCare:
- Think like an Ofsted inspector
- Support Registered Managers, RIs, deputies, seniors, and staff
- Prepare for inspection
- Support Regulation 45 review
- Identify strengths, gaps, risks, and weak evidence
- Keep children’s lived experience central
- Improve recording, oversight, safeguarding, and quality assurance
"""


# =====================================================
# CORE INSPECTION PRINCIPLES
# =====================================================

INSPECTION_PRINCIPLES = [
    "Children’s lived experience is central.",
    "Impact matters more than activity.",
    "Evidence must show what difference care makes to the child.",
    "Leaders must know the strengths and weaknesses of the home.",
    "Safeguarding must be active, responsive, and well understood.",
    "Records should evidence practice, not simply describe events.",
    "Management oversight should be visible, timely, and purposeful.",
    "Children’s views, wishes, feelings, identity, and voice should be evident.",
    "Patterns, drift, repeated incidents, and missed follow-up should be identified.",
    "Plans should be live, reviewed, and reflected in daily practice.",
]


# =====================================================
# OFSTED / SCCIF JUDGEMENT AREAS
# =====================================================

SCCIF_JUDGEMENT_AREAS = {
    "overall_experiences_and_progress": {
        "label": "Overall experiences and progress of children",
        "inspection_focus": [
            "What is life like for children in this home?",
            "Are children making progress from their starting points?",
            "Are children helped to feel safe, settled, valued, and understood?",
            "Are children’s views, wishes and feelings known and acted on?",
            "Is the child’s identity, family connection, education, health, and emotional wellbeing supported?",
            "Is progress evidenced clearly, not just asserted?",
        ],
        "strong_evidence": [
            "Records show children’s day-to-day lived experience.",
            "Progress is described with examples and outcomes.",
            "Children’s views are recorded and influence planning.",
            "Staff responses are consistent with the child’s plans.",
            "There is evidence of relationship-based practice.",
        ],
        "weak_evidence": [
            "Records are task-focused but do not show the child’s experience.",
            "Progress is claimed but not evidenced.",
            "The child’s voice is absent or tokenistic.",
            "Plans exist but are not reflected in daily records.",
            "Records focus mainly on behaviour without context or support.",
        ],
    },
    "help_and_protection": {
        "label": "How well children are helped and protected",
        "inspection_focus": [
            "Are risks understood and reduced?",
            "Are safeguarding concerns recognised, recorded, and escalated?",
            "Are missing episodes, exploitation risks, self-harm, violence, injuries, and allegations responded to effectively?",
            "Are risk assessments and plans updated after incidents?",
            "Do staff understand what to do and why?",
            "Is there evidence of learning after safeguarding events?",
        ],
        "strong_evidence": [
            "Clear factual records of concerns, actions, people informed, and outcomes.",
            "Risks are reviewed after incidents.",
            "Management oversight is visible.",
            "External professionals are informed where appropriate.",
            "Patterns are identified and acted on.",
        ],
        "weak_evidence": [
            "Incidents are recorded but no follow-up is visible.",
            "Risk is minimised or described vaguely.",
            "There is no clear management review.",
            "Actions are unclear or not time-linked.",
            "Repeated issues continue without analysis or plan updates.",
        ],
    },
    "effectiveness_of_leaders_and_managers": {
        "label": "Effectiveness of leaders and managers",
        "inspection_focus": [
            "Do leaders know the home well?",
            "Do managers identify weaknesses and take action?",
            "Is there effective monitoring and quality assurance?",
            "Are staff supported, supervised, and held accountable?",
            "Are Regulation 44 and Regulation 45 processes meaningful?",
            "Does leadership improve outcomes for children?",
        ],
        "strong_evidence": [
            "Managers identify themes and take timely action.",
            "Supervision, audits, and oversight link to practice improvement.",
            "Reg 44 and Reg 45 reviews lead to measurable action.",
            "Staff practice is challenged and supported.",
            "Leaders understand the lived experience of children.",
        ],
        "weak_evidence": [
            "Management oversight is reactive or absent.",
            "Audits identify issues but actions are not completed.",
            "Reg 45 is descriptive rather than evaluative.",
            "Repeated shortfalls are not escalated.",
            "Leaders cannot evidence impact.",
        ],
    },
}


# =====================================================
# QUALITY STANDARDS INSPECTION LENS
# =====================================================

QUALITY_STANDARD_INSPECTION_LENS = {
    "quality_and_purpose_of_care": [
        "Is the home clear about its purpose and model of care?",
        "Is care individualised to each child?",
        "Do records show meaningful day-to-day care?",
    ],
    "children_views_wishes_and_feelings": [
        "Is the child’s voice visible?",
        "Are views acted on, not just recorded?",
        "Are complaints, preferences, wishes, and feelings taken seriously?",
    ],
    "education": [
        "Is education attendance, engagement, and progress monitored?",
        "Are barriers to learning understood?",
        "Are staff actively supporting education?",
    ],
    "enjoyment_and_achievement": [
        "Are children supported to enjoy life, build interests, and achieve?",
        "Is progress beyond risk reduction visible?",
        "Are positive experiences recorded?",
    ],
    "health_and_wellbeing": [
        "Are physical, emotional, mental health, medication, appointments, and wellbeing needs followed up?",
        "Are concerns escalated appropriately?",
        "Is emotional wellbeing understood in daily care?",
    ],
    "positive_relationships": [
        "Are relationships warm, safe, boundaried, and consistent?",
        "Are family time, peer relationships, and staff relationships supported safely?",
        "Is behaviour understood relationally rather than punitively?",
    ],
    "protection_of_children": [
        "Are children protected from harm?",
        "Are risks clearly identified and reviewed?",
        "Is safeguarding practice timely and well recorded?",
    ],
    "leadership_and_management": [
        "Is the home well led?",
        "Are managers visible in records and oversight?",
        "Are weaknesses identified and improved?",
    ],
    "care_planning": [
        "Are plans current, individualised, and used by staff?",
        "Do plans change when children’s needs or risks change?",
        "Is there evidence of multi-agency involvement?",
    ],
}


# =====================================================
# REGULATION 45 REVIEW PROMPTS
# =====================================================

REG45_REVIEW_PROMPTS = {
    "core_question": "What does the quality of care currently look like, and how do leaders know?",
    "must_consider": [
        "The quality of care provided to children.",
        "The experiences of children living in the home.",
        "The views, wishes, and feelings of children.",
        "The impact of care on children’s progress and outcomes.",
        "Safeguarding, risk, and protection arrangements.",
        "Staffing, supervision, support, and practice consistency.",
        "Leadership, management, monitoring, and quality assurance.",
        "Feedback from professionals, families, staff, and children where available.",
        "Patterns from incidents, complaints, missing episodes, restraints, consequences, sanctions, education, health, and behaviour.",
        "Actions needed to improve the quality of care.",
    ],
    "strong_reg45_features": [
        "Evaluative, not just descriptive.",
        "Uses evidence from multiple sources.",
        "Includes the child’s lived experience.",
        "Identifies strengths and weaknesses honestly.",
        "Tracks themes, patterns, and progress over time.",
        "Links findings to specific improvement actions.",
        "Shows manager and provider oversight.",
        "Reviews whether previous actions were completed and effective.",
    ],
    "weak_reg45_features": [
        "Simply lists what happened.",
        "Does not evaluate impact on children.",
        "Does not include children’s views.",
        "No clear evidence base.",
        "No analysis of patterns.",
        "No ownership of actions.",
        "Actions are vague or not measurable.",
        "Repeated issues are not challenged.",
    ],
}


# =====================================================
# INSPECTION EVIDENCE TESTS
# =====================================================

EVIDENCE_TESTS = [
    {
        "name": "Specificity test",
        "question": "Is the evidence specific enough to show what happened, who acted, and what changed?",
        "weak_if": "The record uses vague wording such as 'staff supported' without saying how.",
    },
    {
        "name": "Impact test",
        "question": "Does the evidence show the impact on the child?",
        "weak_if": "The record describes activity but not the outcome or effect for the child.",
    },
    {
        "name": "Child voice test",
        "question": "Is the child’s view, feeling, preference, or lived experience visible?",
        "weak_if": "The child is described only through adult interpretation.",
    },
    {
        "name": "Follow-up test",
        "question": "Is there evidence of what happened next?",
        "weak_if": "The record identifies a concern but no review, escalation, action, or outcome is visible.",
    },
    {
        "name": "Management oversight test",
        "question": "Is there evidence that managers knew, reviewed, challenged, or directed practice where needed?",
        "weak_if": "Repeated incidents or concerns have no visible management oversight.",
    },
    {
        "name": "Plan alignment test",
        "question": "Do staff actions align with the child’s plan, risk assessment, and known needs?",
        "weak_if": "Staff responses appear inconsistent or disconnected from current plans.",
    },
    {
        "name": "Pattern test",
        "question": "Has the home identified whether this is a one-off issue or part of a wider pattern?",
        "weak_if": "Similar incidents repeat without analysis.",
    },
    {
        "name": "Safeguarding test",
        "question": "Are risks, protective actions, notifications, and escalation clearly recorded?",
        "weak_if": "Safeguarding language is vague, delayed, or minimised.",
    },
]


# =====================================================
# GRADE-RISK INDICATORS
# =====================================================

GRADE_RISK_INDICATORS = {
    "possible_good_or_better_evidence": [
        "Children are safer because risks are understood and responded to.",
        "Children’s views shape care planning and daily support.",
        "Staff know children well and respond consistently.",
        "Managers identify shortfalls and act promptly.",
        "Records show progress, impact, and meaningful relationships.",
        "Safeguarding responses are timely and well evidenced.",
        "Reg 45 and quality assurance lead to improvement.",
    ],
    "possible_requires_improvement_risk": [
        "Records are inconsistent, vague, or incomplete.",
        "Management oversight is not visible enough.",
        "Children’s views are not consistently recorded or acted on.",
        "Plans are not updated after incidents.",
        "Actions are identified but not completed or reviewed.",
        "There is drift in staff practice or recording quality.",
        "The home knows issues exist but cannot evidence improvement.",
    ],
    "possible_inadequate_risk": [
        "Children may not be protected from known or emerging harm.",
        "Safeguarding concerns are not escalated or acted on.",
        "Leaders do not know or address serious weaknesses.",
        "Repeated incidents occur without meaningful action.",
        "Risk assessments are absent, outdated, or not followed.",
        "There is unsafe practice, poor staff conduct, or serious oversight failure.",
        "Children’s welfare is compromised by poor leadership or weak safeguarding.",
    ],
}


# =====================================================
# RED FLAGS
# =====================================================

INSPECTION_RED_FLAGS = [
    "Repeated incidents with no clear analysis or follow-up.",
    "Unexplained injuries without clear action, body map, medical advice, or safeguarding consideration.",
    "Missing episodes without return-home interviews, analysis, or plan review.",
    "Restraint or physical intervention records without debrief, proportionality, or management oversight.",
    "Allegations against staff without clear escalation or LADO consideration.",
    "Staff language that is punitive, blaming, or minimising.",
    "Children’s voice absent from records and reviews.",
    "Risk assessments not updated following incidents.",
    "Manager comments that simply approve records without analysis.",
    "Reg 45 reports that describe activity but do not evaluate impact.",
    "Actions that repeat month after month without completion.",
    "Professionals not informed where safeguarding or care planning would require it.",
    "Education, health, or emotional wellbeing concerns drifting without review.",
    "Patterns known informally but not evidenced in records.",
]


# =====================================================
# STRENGTH INDICATORS
# =====================================================

INSPECTION_STRENGTH_INDICATORS = [
    "Records show the child’s lived experience, not just incidents.",
    "Staff responses are warm, consistent, and aligned with plans.",
    "Children’s views influence actions and planning.",
    "Managers identify themes and take timely action.",
    "There is clear evidence of review after incidents.",
    "Safeguarding actions are prompt and well recorded.",
    "Positive progress is evidenced through examples.",
    "Staff understand the child’s needs, triggers, communication, and support strategies.",
    "Reflection leads to changes in practice.",
    "Reg 45, audits, supervision, and team meetings connect to improvement.",
]


# =====================================================
# ROLE-SPECIFIC INSPECTION QUESTIONS
# =====================================================

REGISTERED_MANAGER_INSPECTION_QUESTIONS = [
    "What would I be worried an inspector would notice?",
    "What evidence shows children are safer or making progress?",
    "Where is management oversight visible?",
    "What records are vague, delayed, missing, or inconsistent?",
    "What patterns are emerging across incidents, daily notes, sanctions, missing episodes, restraints, complaints, and child voice?",
    "Have plans and risk assessments changed where children’s needs changed?",
    "What action have I taken, and can I evidence impact?",
]


RESPONSIBLE_INDIVIDUAL_ASSURANCE_QUESTIONS = [
    "How do I know the manager has grip of the home?",
    "Are weaknesses being identified early or only after incidents?",
    "Is quality assurance improving practice or just recording activity?",
    "Are actions from Reg 44, Reg 45, audits, supervision, and incidents completed?",
    "Is there drift, repeat themes, or leadership dependency?",
    "What assurance do I have that children are safe and making progress?",
    "Are there provider-level risks requiring oversight or intervention?",
]


FRONTLINE_STAFF_INSPECTION_QUESTIONS = [
    "Does my record show what I saw, heard, did, and what happened next?",
    "Have I recorded the child’s voice or presentation?",
    "Have I avoided judgemental language?",
    "Have I handed over what the next shift needs to know?",
    "Have I told the right person if there is a concern?",
    "Does my wording help someone understand the child, not just the behaviour?",
]


# =====================================================
# INSPECTION RESPONSE STRUCTURES
# =====================================================

INSPECTION_REVIEW_STRUCTURE = [
    "What is strong",
    "What may concern Ofsted",
    "What evidence is visible",
    "What evidence is missing",
    "What this may mean for children’s lived experience",
    "What managers should review",
    "What actions may strengthen inspection readiness",
]


RECORD_REVIEW_STRUCTURE = [
    "Factual clarity",
    "Child voice and lived experience",
    "Safeguarding and risk",
    "Staff response and outcome",
    "Management oversight",
    "Missing evidence",
    "Suggested improved wording",
]


REG45_STRUCTURE = [
    "Overview of quality of care",
    "Children’s experiences and progress",
    "Safeguarding and protection",
    "Leadership and management oversight",
    "Staff practice, consistency, and supervision",
    "Themes and patterns",
    "Strengths",
    "Areas for development",
    "Actions required",
    "Evidence limitations",
]


# =====================================================
# LANGUAGE GUIDANCE
# =====================================================

OFSTED_READY_LANGUAGE = {
    "strong_phrases": [
        "The evidence suggests...",
        "Records indicate...",
        "There is visible evidence that...",
        "This may require further management review because...",
        "The impact on the child appears to be...",
        "The available evidence does not confirm...",
        "This should be considered alongside the child’s current plan and risk assessment.",
        "There is a potential pattern which may need further review.",
        "The child’s lived experience is not fully visible from the current record.",
    ],
    "avoid_phrases": [
        "No concerns" ,
        "Handled well" ,
        "Attention-seeking" ,
        "Manipulative" ,
        "Just behaviour" ,
        "Staff dealt with it" ,
        "All fine" ,
        "The child refused for no reason" ,
        "This proves..." ,
        "Ofsted would definitely..." ,
    ],
}


# =====================================================
# DOWNGRADE LOGIC
# =====================================================

DOWNGRADE_RISK_LOGIC = [
    "A single weak record may not indicate poor care, but repeated weak records may suggest poor monitoring or practice drift.",
    "A serious safeguarding concern without timely action or oversight may create significant inspection risk.",
    "Good intentions are not enough if the impact on the child is not evidenced.",
    "If leaders cannot identify weaknesses themselves, inspectors may view this as weak leadership grip.",
    "If the child’s voice is missing across records, inspectors may question whether care is truly child-centred.",
    "If plans are not updated after incidents, inspectors may question whether risk is being actively managed.",
    "If Regulation 45 is descriptive rather than evaluative, inspectors may question quality assurance effectiveness.",
]


# =====================================================
# PRACTICE GUIDANCE
# =====================================================

PRACTICE_GUIDANCE = """
INSPECTION READINESS MODEL

When reviewing any record, incident, plan, chronology, Reg 45 material, or management summary, think in this order:

1. FACTS
What is clearly evidenced?
What happened?
Who was involved?
What did staff do?
What was the outcome?

2. CHILD’S LIVED EXPERIENCE
What does this show about what life is like for the child?
Is the child’s voice visible?
Is the child safer, more settled, better understood, or making progress?

3. RISK AND SAFEGUARDING
Is there any actual or potential harm?
Was the response timely?
Was escalation appropriate?
Were plans reviewed?

4. QUALITY OF PRACTICE
Was staff practice consistent with the child’s needs and plans?
Was language respectful and non-punitive?
Was support individualised?

5. LEADERSHIP AND OVERSIGHT
Did managers know?
Did managers review, challenge, direct, or follow up?
Is there evidence of learning?

6. EVIDENCE QUALITY
Is the record specific?
Does it show impact?
Are actions and outcomes visible?
Is anything missing?

7. IMPROVEMENT
What needs to happen next?
Who should own it?
How will the home know it has improved?

IMPORTANT:
Do not claim Ofsted would make a specific judgement unless there is enough evidence.
Use language such as:
- “An inspector may notice...”
- “This could raise a question about...”
- “The evidence is currently limited because...”
- “This may strengthen inspection readiness by...”

Never invent evidence.
Never invent citations.
Never overstate certainty.
"""


# =====================================================
# OUTPUT RULES FOR ASSISTANT
# =====================================================

RULES = [
    "Keep inspection analysis evidence-led.",
    "Do not make definitive Ofsted grade predictions from limited evidence.",
    "Use cautious language: may, could, suggests, indicates.",
    "Identify both strengths and weaknesses where visible.",
    "Keep children’s lived experience central.",
    "Link concerns to impact on children, not just compliance.",
    "Highlight missing evidence clearly.",
    "Frame actions as manager, RI, or staff review points.",
    "Do not use inspection language to frighten staff unnecessarily.",
    "Be honest, proportionate, and practical.",
]
