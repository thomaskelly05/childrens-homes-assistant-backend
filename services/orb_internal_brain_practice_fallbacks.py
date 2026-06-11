"""Practice-specific deterministic fallbacks for ORB Internal Brain (high-risk, daily, management)."""

from __future__ import annotations

from services.orb_internal_brain_fallbacks import CategoryFallbackContent

PRACTICE_CATEGORY_FALLBACKS: dict[str, CategoryFallbackContent] = {
    # --- High-risk safeguarding ---
    "missing-from-home": CategoryFallbackContent(
        safety_position=(
            "A missing-from-care episode requires immediate welfare-focused action — "
            "follow your missing-from-care protocol without delay."
        ),
        cannot_do=[
            "ORB cannot decide police referral thresholds — verify against your local missing protocol.",
            "ORB has not checked live placement records or last known locations.",
        ],
        what_to_do=[
            "Follow missing-from-care protocol: immediate welfare checks and search of known areas.",
            "Check known addresses, contacts and locations if your policy allows.",
            "Notify manager and on-call immediately; escalate to police where threshold is met.",
            "Conduct return interview or return home conversation where policy applies.",
        ],
        recording_guidance=[
            "Keep a contemporaneous chronology: time last seen, actions taken, who was informed.",
            "Record return presentation, child's words and any immediate safety concerns after return.",
        ],
        child_voice=[
            "After return, record the young person's words about where they went and how they felt.",
            "Capture wishes and feelings — do not invent quotes.",
        ],
        therapeutic_framing=[
            "Missing episodes are safeguarding concerns — respond without blame when the child returns.",
            "Behaviour is communication; explore what the young person was trying to communicate.",
        ],
        escalation_policy=[
            "Manager/on-call notification without delay.",
            "Police referral where your missing protocol threshold is met.",
            "Multi-agency escalation if risk indicators warrant it.",
        ],
        regulatory_orientation=[
            "Regulation 27 safeguarding duties apply — verify locally.",
            "SCCIF expects proportionate missing-from-care response and learning.",
        ],
    ),
    "self-harm": CategoryFallbackContent(
        safety_position=(
            "Self-harm disclosure requires immediate risk assessment and safety — "
            "this cannot be kept secret where the young person may be at risk."
        ),
        cannot_do=[
            "ORB cannot promise secrecy about self-harm where safeguarding thresholds apply.",
            "ORB cannot provide clinical treatment — escalate to health professionals.",
        ],
        what_to_do=[
            "Conduct immediate risk assessment: assess current risk, injuries, access to means and intent.",
            "Provide first aid and seek medical advice where injuries require it.",
            "Remove means where safe to do so without creating further risk.",
            "Set supervision/observation level according to policy.",
            "Escalate to manager, DSL and health services — safeguarding referral where threshold met.",
        ],
        recording_guidance=[
            "Record words, presentation, actions taken and who was informed.",
            "Contemporaneous chronology of risk assessment and escalation steps.",
        ],
        child_voice=[
            "Record the young person's exact words where known — do not invent quotes.",
            "Capture how they presented emotionally and what support they wanted.",
        ],
        therapeutic_framing=[
            "Use calm, non-judgemental language — self-harm is communication of distress.",
            "Do not shame or blame; prioritise safety and relationship.",
        ],
        escalation_policy=[
            "Manager/DSL/health escalation without delay.",
            "Health support and safeguarding referral according to local policy.",
            "Call 999 if there is immediate risk to life.",
        ],
        regulatory_orientation=[
            "Regulation 27 and mental health escalation routes apply — verify locally.",
        ],
    ),
    "suicidal-ideation": CategoryFallbackContent(
        safety_position=(
            "Suicidal ideation with plan, means or intent must be treated as urgent — "
            "immediate safety is the priority."
        ),
        cannot_do=[
            "ORB cannot promise secrecy where there is risk of suicide.",
            "ORB cannot remove risk alone — staff must act within policy and training.",
        ],
        what_to_do=[
            "Secure immediate safety — treat plan, means and intent as urgent.",
            "Remove medication and other means where safe to do so.",
            "Call 999, urgent mental health or crisis route if risk is imminent.",
            "Constant supervision according to policy until risk is assessed.",
            "Escalate to manager/on-call immediately.",
        ],
        recording_guidance=[
            "Contemporaneous chronology of presentation, actions and who was informed.",
            "Record the child's exact words where known — do not invent quotes.",
        ],
        child_voice=[
            "Record what the young person said about their plan, feelings and fears.",
            "Note what reassured them and what they asked for.",
        ],
        therapeutic_framing=[
            "Respond with calm urgency — the young person needs safety and connection, not blame.",
        ],
        escalation_policy=[
            "Manager/on-call escalation immediately.",
            "Emergency services if imminent risk — call 999.",
            "CAMHS/A&E or crisis pathway per local policy.",
        ],
        regulatory_orientation=[
            "Regulation 27 safeguarding and mental health escalation apply — verify locally.",
        ],
    ),
    "child-sexual-exploitation": CategoryFallbackContent(
        safety_position=(
            "Child sexual exploitation indicators require safeguarding escalation — "
            "the young person must not be blamed."
        ),
        cannot_do=[
            "ORB cannot promise secrecy or investigate beyond staff role.",
            "ORB cannot decide strategy meeting attendance — escalate through DSL/manager.",
        ],
        what_to_do=[
            "Make a safeguarding referral through local procedures.",
            "Note CSE risk indicators: missing episodes, gifts, older person contact, online contact.",
            "Police/social care referral according to policy where threshold met.",
            "Multi-agency response where threshold met — disruption planning with partners.",
        ],
        recording_guidance=[
            "Contemporaneous chronology of observations, disclosures and actions.",
            "Record observable facts — gifts, contacts, missing episodes, presentation.",
        ],
        child_voice=[
            "Record the young person's words where known — reassure them they are not to blame.",
            "Capture wishes about safety and support.",
        ],
        therapeutic_framing=[
            "The child must not be blamed — exploitation is abuse, not choice.",
            "Use trauma-informed, non-shaming language.",
        ],
        escalation_policy=[
            "Manager/DSL escalation; safeguarding referral without delay.",
            "Multi-agency partners where threshold met.",
        ],
        regulatory_orientation=[
            "Working Together and SCCIF safeguarding expectations apply — verify locally.",
        ],
    ),
    "criminal-exploitation": CategoryFallbackContent(
        safety_position=(
            "Criminal exploitation indicators require safeguarding response — "
            "avoid criminalising the child in records or conversation."
        ),
        cannot_do=[
            "ORB cannot decide police notification alone — follow local threshold guidance.",
            "Do not label the child as criminal — record observable facts.",
        ],
        what_to_do=[
            "Safeguarding referral through local procedures.",
            "Consider criminal exploitation and county lines indicators.",
            "Police notification where threshold met; manager/DSL escalation.",
            "Multi-agency response where threshold met.",
        ],
        recording_guidance=[
            "Record observable facts: cash, phone, fear, unknown adults, presentation.",
            "Chronology of episodes and staff actions — avoid criminalising wording.",
        ],
        child_voice=[
            "Record what the young person said about their fears and what they need.",
            "Note if they are frightened of reprisal from adults outside the home.",
        ],
        therapeutic_framing=[
            "Behaviour is communication — exploitation creates fear and loyalty conflicts.",
            "Avoid criminalising the child; focus on safety and support.",
        ],
        escalation_policy=[
            "Manager/DSL escalation; police notification where threshold met.",
            "Safeguarding referral and safety planning.",
        ],
        regulatory_orientation=[
            "Regulation 27 and SCCIF safeguarding apply — verify locally.",
        ],
    ),
    "online-harm": CategoryFallbackContent(
        safety_position=(
            "Online harm requires online safety safeguarding escalation — "
            "do not blame or shame the young person."
        ),
        cannot_do=[
            "ORB cannot promise secrecy where safeguarding thresholds apply.",
            "Do not investigate beyond your role — preserve evidence according to policy.",
        ],
        what_to_do=[
            "Online safety safeguarding escalation to manager/DSL.",
            "Preserve evidence according to policy without exceeding staff role.",
            "Police/social care route where threshold met.",
            "Support device safety and reassurance for the young person.",
        ],
        recording_guidance=[
            "Record what was disclosed, platform context and immediate safety steps.",
            "Chronology of escalation and advice given.",
        ],
        child_voice=[
            "Record the young person's words — they may feel ashamed; reassure without blame.",
            "Capture what support they want and fears about consequences.",
        ],
        therapeutic_framing=[
            "Do not blame or shame — online coercion exploits vulnerability.",
            "Child-centred reassurance alongside firm safeguarding action.",
        ],
        escalation_policy=[
            "Manager/DSL escalation; CEOP or police/social care where threshold met.",
        ],
        regulatory_orientation=[
            "KCSIE online safety principles and SCCIF apply — verify locally.",
        ],
    ),
    "radicalisation": CategoryFallbackContent(
        safety_position=(
            "Radicalisation concerns require a proportionate safeguarding response — "
            "avoid discriminatory or stigmatising assumptions."
        ),
        cannot_do=[
            "ORB cannot diagnose ideology or intent — record facts not assumptions.",
            "Do not stigmatise religion, culture or identity.",
        ],
        what_to_do=[
            "Proportionate response with manager oversight from the outset.",
            "Record observable facts: behaviour change, content viewed, statements made.",
            "Consider Prevent/local safeguarding threshold — Channel referral where policy requires.",
            "Multi-agency response if threshold met.",
        ],
        recording_guidance=[
            "Chronology of observations and conversations — facts not opinions.",
            "Support plan and review dates where agreed.",
        ],
        child_voice=[
            "Record the young person's views and what matters to them.",
            "Engage with curiosity, not accusation.",
        ],
        therapeutic_framing=[
            "Balanced, non-stigmatising engagement — isolation may signal wider needs.",
            "Avoid discriminatory assumptions; behaviour is communication.",
        ],
        escalation_policy=[
            "Manager oversight and DSL consultation.",
            "Multi-agency partners where threshold met.",
        ],
        regulatory_orientation=[
            "Prevent duty proportionality applies — verify locally with DSL guidance.",
        ],
    ),
    "bullying": CategoryFallbackContent(
        safety_position=(
            "Bullying affects safety and dignity — follow your anti-bullying policy "
            "with proportionate supervision and safety planning."
        ),
        cannot_do=[
            "ORB cannot promise no intervention where a safety risk exists.",
            "Do not minimise the child's fears about retaliation.",
        ],
        what_to_do=[
            "Follow anti-bullying policy with supervision and safety planning.",
            "Listen to the child's fears about it getting worse if staff intervene.",
            "Proportionate staff oversight between young people.",
            "Consider restorative options where safe and appropriate.",
        ],
        recording_guidance=[
            "Record impact, pattern, actions taken and review date.",
            "Chronology of incidents and staff responses.",
        ],
        child_voice=[
            "Record the young person's words about what happened and what they fear.",
            "Capture what would help them feel safer.",
        ],
        therapeutic_framing=[
            "Validate distress — bullying harms mental health and belonging.",
            "Behaviour is communication on all sides; respond with dignity.",
        ],
        escalation_policy=[
            "Manager review if pattern persists or risk escalates.",
            "Safeguarding escalation if bullying meets harm threshold.",
        ],
        regulatory_orientation=[
            "Regulation 27 and SCCIF dignity/safeguarding apply — verify locally.",
        ],
    ),
    "emergency-escalation": CategoryFallbackContent(
        safety_position=(
            "Medical emergency — if the child is unresponsive or breathing oddly, call 999 immediately. "
            "Stop restraint and prioritise life, airway, breathing and circulation within your training."
        ),
        cannot_do=[
            "ORB cannot replace emergency services or clinical judgement.",
            "Do not prioritise recording over emergency response.",
        ],
        what_to_do=[
            "Call 999 immediately if unresponsive or breathing oddly.",
            "Stop restraint — prioritise airway, breathing and circulation within training.",
            "Provide first aid within your training while awaiting help.",
            "Notify manager/on-call once it is safe to do so.",
        ],
        recording_guidance=[
            "Recording comes after safety — then physical intervention record and chronology.",
            "Document timeline, medical advice, welfare check and outcome.",
        ],
        child_voice=[
            "Once safe, record the young person's presentation and words.",
        ],
        therapeutic_framing=[
            "Calm, clear emergency action protects the child first.",
        ],
        escalation_policy=[
            "999 first for medical emergency.",
            "Manager/on-call notification when safe.",
            "Regulation 20 physical intervention review after emergency.",
        ],
        regulatory_orientation=[
            "Physical intervention policy and Regulation 20 compliance — verify locally.",
            "Regulation 35 incident recording after emergency stabilised.",
        ],
    ),
    # --- Daily practice ---
    "daily-record": CategoryFallbackContent(
        safety_position=(
            "This is a care-recording and continuity-of-care scenario — "
            "records must be accurate, factual and respect privacy."
        ),
        cannot_do=[
            "ORB has not verified live records — base entries on what staff observed.",
            "Do not invent events, quotes or outcomes.",
        ],
        what_to_do=[
            "Write a factual, contemporaneous daily record.",
            "Include college attendance, positive phone call, mood/presentation where relevant.",
            "Record child voice — what the young person said or how they presented.",
            "Record what happened, staff support, outcome and next steps.",
            "Avoid unnecessary personal data — data minimisation applies.",
        ],
        recording_guidance=[
            "Accuracy and privacy: use approved recording system.",
            "Balanced tone — note strengths as well as challenges.",
        ],
        child_voice=[
            "Include child voice — what the young person said or how they presented.",
        ],
        therapeutic_framing=[
            "Professional, child-centred tone — behaviour is communication.",
        ],
        escalation_policy=[
            "Escalate to senior staff if new safeguarding or health concerns emerge.",
        ],
        regulatory_orientation=[
            "Regulation 35 recording and SCCIF expectations apply — verify locally.",
        ],
    ),
    "handover": CategoryFallbackContent(
        safety_position=(
            "This is a care-recording and continuity-of-care scenario — "
            "handover must support safe continuity between shifts."
        ),
        cannot_do=[
            "ORB cannot know overnight risks without staff input.",
        ],
        what_to_do=[
            "Cover continuity of care: key risks, strengths and current emotional presentation.",
            "Note what helped the child settle and any peer conflict context.",
            "Share night staff watch-outs and the agreed plan.",
        ],
        recording_guidance=[
            "Clear, shift-friendly handover in approved system.",
            "Factual chronology of the day and overnight plan.",
        ],
        child_voice=[
            "Include child voice — what the young person said about the day and overnight needs.",
        ],
        therapeutic_framing=[
            "Handover is safeguarding — gaps in communication create risk.",
        ],
        escalation_policy=[
            "Flag manager if risk level has changed or incidents need senior review.",
        ],
        regulatory_orientation=[
            "Regulation 35 recording applies — verify locally.",
        ],
    ),
    "key-work-session": CategoryFallbackContent(
        safety_position=(
            "This is a therapeutic key-work planning scenario — "
            "engagement must be with consent and proportionality."
        ),
        cannot_do=[
            "ORB cannot force disclosure or therapeutic goals.",
            "Do not push trauma content faster than the young person can manage.",
        ],
        what_to_do=[
            "Plan with consent/engagement and trauma-informed pace.",
            "Use interests such as football or drawing to build rapport.",
            "Set a clear aim; allow child-led questions.",
            "Do not force disclosure — avoid forcing disclosure.",
        ],
        recording_guidance=[
            "Record child voice, session aim, what was discussed and agreed next steps.",
        ],
        child_voice=[
            "Record what the young person chose to share and their goals.",
        ],
        therapeutic_framing=[
            "Relationship before outcome — proportionate, hopeful key work.",
        ],
        escalation_policy=[
            "Escalate safeguarding concerns disclosed during session per policy.",
        ],
        regulatory_orientation=[
            "SCCIF care planning and child voice expectations apply — verify locally.",
        ],
    ),
    "family-contact": CategoryFallbackContent(
        safety_position=(
            "This is a family contact preparation scenario — "
            "follow the contact plan with safeguarding arrangements in view."
        ),
        cannot_do=[
            "ORB cannot change court or care plan contact decisions.",
        ],
        what_to_do=[
            "Follow the contact plan — preparation before and emotional support after.",
            "Clarify who supervises and safeguarding arrangements.",
            "Post-contact debrief with the young person.",
            "Record child voice — wishes and feelings before and after contact.",
        ],
        recording_guidance=[
            "Record preparation, contact presentation, post-contact debrief and child's wishes.",
            "Note safeguarding observations factually.",
        ],
        child_voice=[
            "Record the child's wishes and feelings before and after contact.",
        ],
        therapeutic_framing=[
            "Contact can be emotionally complex — validate without taking sides.",
        ],
        escalation_policy=[
            "Escalate safeguarding concerns to manager/DSL per policy.",
        ],
        regulatory_orientation=[
            "Regulation 14 contact and SCCIF apply — verify locally.",
        ],
    ),
    "medication-recording": CategoryFallbackContent(
        safety_position=(
            "This is a health/medication recording scenario — "
            "follow medication policy and escalate health concerns where required."
        ),
        cannot_do=[
            "ORB cannot prescribe or coerce medication administration.",
            "Do not force medication against policy.",
        ],
        what_to_do=[
            "Follow medication policy — record refusal factually on MAR/approved medication record.",
            "Seek prescriber, pharmacy or on-call advice where policy requires.",
            "Health escalation if required — GP, NHS 111 or health lead.",
            "Record child voice and distress; note support offered and outcome.",
        ],
        recording_guidance=[
            "Factual MAR entry: time, medication, refusal, staff response.",
        ],
        child_voice=[
            "Record what the young person said about the refusal and any distress.",
        ],
        therapeutic_framing=[
            "Non-judgemental response to refusal — explore concerns calmly.",
        ],
        escalation_policy=[
            "Inform manager and follow health escalation route if risk warrants.",
        ],
        regulatory_orientation=[
            "Regulation 23 health and medication policy apply — verify locally.",
        ],
    ),
    "education-concern": CategoryFallbackContent(
        safety_position=(
            "This is an education advocacy scenario — "
            "support the young person's education plan and escalate barriers proportionately."
        ),
        cannot_do=[
            "ORB cannot contact school directly — staff/manager action required.",
        ],
        what_to_do=[
            "Review education plan — contact school/college to understand barriers.",
            "Escalate to manager, virtual school or social worker where appropriate.",
            "Chronology of attendance/exclusion risk and support plan.",
        ],
        recording_guidance=[
            "Record contacts with education partners, actions and review dates.",
        ],
        child_voice=[
            "Record the young person's views on school, barriers and what would help.",
        ],
        therapeutic_framing=[
            "Education exclusion risk often reflects unmet need — advocate with child voice central.",
        ],
        escalation_policy=[
            "Manager and virtual school/social worker escalation where appropriate.",
        ],
        regulatory_orientation=[
            "Regulation 8 education and SCCIF apply — verify locally.",
        ],
    ),
    "health-appointment": CategoryFallbackContent(
        safety_position=(
            "This is a health/medication recording scenario — "
            "prepare for health liaison and record outcomes accurately."
        ),
        cannot_do=[
            "ORB cannot give medical advice or diagnose.",
        ],
        what_to_do=[
            "Health liaison: prepare symptoms, timeline and questions for the appointment.",
            "Support consent and attendance; accompany where policy requires.",
            "Record advice, medication changes and follow-up.",
            "Inform manager, social worker or health lead where policy requires.",
        ],
        recording_guidance=[
            "Record appointment outcome, advice given and follow-up actions.",
        ],
        child_voice=[
            "Record the young person's views and questions they wanted answered.",
        ],
        therapeutic_framing=[
            "Reduce anxiety through preparation — child voice in health decisions.",
        ],
        escalation_policy=[
            "Escalate urgent health concerns per policy.",
        ],
        regulatory_orientation=[
            "Regulation 23 health applies — verify locally.",
        ],
    ),
    "behaviour-incident": CategoryFallbackContent(
        safety_position=(
            "This is a behaviour incident recording scenario — "
            "record observable behaviour with manager review where policy requires."
        ),
        cannot_do=[
            "ORB will not use punitive or stigmatising labels.",
        ],
        what_to_do=[
            "Incident recording: observable behaviour only, trigger/context, staff de-escalation.",
            "Behaviour is communication — record triggers and emotional context.",
            "Note damage/injury if any; plan repair/restorative work where appropriate.",
            "Manager review per policy.",
        ],
        recording_guidance=[
            "Incident record with chronology, staff response and outcome.",
        ],
        child_voice=[
            "Record child voice — what the young person said before, during and after.",
        ],
        therapeutic_framing=[
            "Behaviour is communication — trauma-informed, non-punitive framing.",
        ],
        escalation_policy=[
            "Manager review and safeguarding escalation if harm threshold met.",
        ],
        regulatory_orientation=[
            "Regulation 35 and SCCIF recording apply — verify locally.",
        ],
    ),
    "restraint-physical-intervention": CategoryFallbackContent(
        safety_position=(
            "This is a physical intervention recording scenario — "
            "Regulation 20 compliance and welfare checks are essential."
        ),
        cannot_do=[
            "ORB cannot approve restraint — only record within policy and training.",
        ],
        what_to_do=[
            "Physical intervention record: necessity, proportionality, last resort.",
            "Duration, hold type, staff involved.",
            "Welfare check and injury check immediately after.",
            "Child debrief with voice; manager review.",
        ],
        recording_guidance=[
            "Regulation 20 compliance documented — Regulation 35 if incident record required.",
        ],
        child_voice=[
            "Record debrief — what the young person said and how they presented after.",
        ],
        therapeutic_framing=[
            "Accountable, least-restrictive practice — repair where possible.",
        ],
        escalation_policy=[
            "Manager notification and review per physical intervention policy.",
        ],
        regulatory_orientation=[
            "Regulation 20 physical intervention and Regulation 35 recording — verify locally.",
        ],
    ),
    "substance-misuse": CategoryFallbackContent(
        safety_position=(
            "This is a substance-related safeguarding and health scenario — "
            "follow substance policy without shaming the young person."
        ),
        cannot_do=[
            "ORB cannot decide police threshold — follow local policy.",
            "Do not shame or criminalise the child.",
        ],
        what_to_do=[
            "Follow substance policy with safeguarding/health response.",
            "Record facts; manager/on-call notification.",
            "Health advice if required; substance storage/disposal per policy.",
            "Explore child's stated reason and anxiety; offer support/referral options.",
        ],
        recording_guidance=[
            "Factual chronology: what was found, presentation, actions and outcome.",
        ],
        child_voice=[
            "Record what the young person said about use, anxiety and support they want.",
        ],
        therapeutic_framing=[
            "Non-shaming, health-focused response — behaviour is communication.",
        ],
        escalation_policy=[
            "Manager/on-call; police threshold per policy if required.",
        ],
        regulatory_orientation=[
            "Regulation 27 safeguarding and health policy apply — verify locally.",
        ],
    ),
    # --- Management / oversight ---
    "regulation-44": CategoryFallbackContent(
        safety_position=(
            "This is a Regulation 44/45 evidence scenario — "
            "governance evidence should demonstrate safeguarding culture and management oversight."
        ),
        cannot_do=[
            "ORB cannot guarantee inspection outcomes.",
        ],
        what_to_do=[
            "Triangulate governance evidence: records, children's views, staff views and outcomes.",
            "Child voice evidence should be visible in records and feedback.",
            "Review safeguarding culture, incident trends/actions, supervision/training.",
            "Check complaints and whistleblowing routes are visible.",
        ],
        recording_guidance=[
            "Evidence trail for Reg 44 visitor — accurate, contemporaneous records.",
        ],
        child_voice=[
            "Child voice evidence should be visible in records and feedback.",
        ],
        therapeutic_framing=[
            "Inspection-aware but honest — evidence not performance theatre.",
        ],
        escalation_policy=[
            "Escalate gaps to registered manager and RI with action owners.",
        ],
        regulatory_orientation=[
            "Regulation 44 visitor duties and Regulation 45 oversight — verify locally.",
        ],
    ),
    "regulation-45": CategoryFallbackContent(
        safety_position=(
            "This is a Regulation 44/45 evidence scenario — "
            "Regulation 45 Responsible Individual reporting requires monthly quality of care review."
        ),
        cannot_do=[
            "ORB cannot sign off RI reports.",
        ],
        what_to_do=[
            "RI reporting: monthly quality of care review covering patterns and trends.",
            "Safeguarding oversight, workforce/staffing, complaints, restraints/missing incidents.",
            "Child outcomes, actions and review dates.",
        ],
        recording_guidance=[
            "RI report evidence with accurate data — do not invent trends.",
        ],
        child_voice=[
            "Child outcomes and voice should feature in quality review.",
        ],
        therapeutic_framing=[
            "Leadership accountability — learning from incidents, not blame culture.",
        ],
        escalation_policy=[
            "Multi-agency escalation where safeguarding trends require it.",
        ],
        regulatory_orientation=[
            "Regulation 45 Responsible Individual duties apply — verify locally.",
        ],
    ),
    "supervision": CategoryFallbackContent(
        safety_position=(
            "This is a management oversight scenario — "
            "reflective supervision supports practice and staff wellbeing."
        ),
        cannot_do=[
            "ORB cannot conduct supervision or HR processes.",
        ],
        what_to_do=[
            "Supervision records: reflective supervision with agreed actions.",
            "Address wellbeing/burnout, practice support, learning from incidents.",
            "HR/occupational health if needed; consider impact on children.",
        ],
        recording_guidance=[
            "Supervision notes with agreed actions, owners and dates.",
        ],
        child_voice=[
            "Consider how staff wellbeing affects child experience and voice.",
        ],
        therapeutic_framing=[
            "Supportive accountability — supervision protects children through staff support.",
        ],
        escalation_policy=[
            "HR/occupational health route where wellbeing or conduct thresholds met.",
        ],
        regulatory_orientation=[
            "Regulation 32 staff fitness and SCCIF apply — verify locally.",
        ],
    ),
    "management-oversight": CategoryFallbackContent(
        safety_position=(
            "This is a management oversight scenario — "
            "governance and safeguarding review are required when trends emerge."
        ),
        cannot_do=[
            "ORB cannot implement management actions — supports planning only.",
        ],
        what_to_do=[
            "Governance review: trend analysis on restraint, missing episodes, incidents.",
            "Care plan review, staff practice review, safeguarding review.",
            "Child voice/outcomes; actions with owners and dates.",
        ],
        recording_guidance=[
            "Document oversight actions, rationale and review dates.",
        ],
        child_voice=[
            "Child voice and outcomes should inform oversight actions.",
        ],
        therapeutic_framing=[
            "Analytical, proportionate leadership — patterns signal system issues.",
        ],
        escalation_policy=[
            "RI update and multi-agency escalation if thresholds met.",
        ],
        regulatory_orientation=[
            "Regulation 45 and SCCIF leadership apply — verify locally.",
        ],
    ),
    "staff-practice-concern": CategoryFallbackContent(
        safety_position=(
            "Staff practice concerns require safeguarding oversight — "
            "protect children and follow conduct/LADO thresholds."
        ),
        cannot_do=[
            "ORB cannot investigate or determine outcomes.",
            "Do not minimise a pattern of concerns.",
        ],
        what_to_do=[
            "Staff conduct review with manager/DSL escalation.",
            "Record child's words factually; consider LADO threshold.",
            "Allegation/disciplinary route if threshold met; protect children.",
        ],
        recording_guidance=[
            "Factual recording — what each young person said, when, context.",
        ],
        child_voice=[
            "Record each child's words where known — do not invent quotes.",
        ],
        therapeutic_framing=[
            "Neutral, child-centred response — children must feel safe to speak.",
        ],
        escalation_policy=[
            "Manager/DSL escalation; LADO referral where threshold met.",
        ],
        regulatory_orientation=[
            "Regulation 24 conduct and Regulation 27 safeguarding apply — verify locally.",
        ],
    ),
    "complaints": CategoryFallbackContent(
        safety_position=(
            "This is a management oversight scenario — "
            "follow the complaints procedure with timely, respectful response."
        ),
        cannot_do=[
            "ORB cannot determine complaint outcomes or legal liability.",
        ],
        what_to_do=[
            "Complaints procedure: acknowledge complaint promptly.",
            "Record facts; investigate proportionately.",
            "Parent/carer communication; action plan for belongings/contact issues.",
            "Learning and outcome letter where policy requires.",
        ],
        recording_guidance=[
            "Complaint chronology, investigation steps and outcome.",
        ],
        child_voice=[
            "Child voice in complaints affecting them — wishes and impact.",
        ],
        therapeutic_framing=[
            "Respectful transparency builds trust with families and children.",
        ],
        escalation_policy=[
            "Escalate to RI or external route per complaints policy.",
        ],
        regulatory_orientation=[
            "Regulation 16 complaints and SCCIF apply — verify locally.",
        ],
    ),
    "audit-preparation": CategoryFallbackContent(
        safety_position=(
            "This is a management oversight scenario — "
            "audit evidence must be accurate with no fabrication."
        ),
        cannot_do=[
            "ORB cannot invent evidence or overclaim compliance.",
        ],
        what_to_do=[
            "Accuracy — evidence not performance theatre.",
            "Leadership/management evidence, safeguarding chronology, children's outcomes.",
            "Staff supervision/training records; action plans with owners/dates.",
            "Identify gaps openly — do not invent evidence.",
        ],
        recording_guidance=[
            "Contemporaneous, verifiable records — no fabrication.",
        ],
        child_voice=[
            "Children's outcomes and voice visible in evidence packs.",
        ],
        therapeutic_framing=[
            "Honest preparation strengthens practice — gaps are improvement opportunities.",
        ],
        escalation_policy=[
            "Escalate evidence gaps to leadership with remediation plan.",
        ],
        regulatory_orientation=[
            "Quality Standards and SCCIF apply — verify locally.",
        ],
    ),
    "ofsted-readiness": CategoryFallbackContent(
        safety_position=(
            "This is a management oversight scenario — "
            "inspection readiness requires honest safeguarding and recording evidence."
        ),
        cannot_do=[
            "ORB cannot guarantee inspection grades or outcomes.",
        ],
        what_to_do=[
            "Inspection readiness: safeguarding evidence, recording quality, manager oversight.",
            "Child voice, staff knowledge, incidents and learning visible.",
            "Policies/local procedures accessible — no overclaiming or invented evidence.",
        ],
        recording_guidance=[
            "Evidence quality over volume — accurate chronologies and learning records.",
        ],
        child_voice=[
            "Child voice evidence should be readily available to inspectors.",
        ],
        therapeutic_framing=[
            "Confident but honest — inspectors triangulate evidence.",
        ],
        escalation_policy=[
            "On-call staff know escalation routes; manager available.",
        ],
        regulatory_orientation=[
            "SCCIF and Children's Homes Regulations — verify locally; no outcome guarantees.",
        ],
    ),
}
