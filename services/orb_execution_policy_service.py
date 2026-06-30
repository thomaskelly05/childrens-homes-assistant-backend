"""ORB internal-knowledge-first execution policy.

Every request still flows through brain convergence orchestration first.
This service decides the cheapest safe execution method after contract selection:
deterministic internal answers, internal templates, compact OpenAI, enhanced OpenAI,
or mandatory safeguarding generation.
"""

from __future__ import annotations

import re
import time
from dataclasses import asdict, dataclass, field
from typing import Any

from services.orb_universal_answer_contract_map_service import (
    detect_contract_family,
    get_contract_family,
    validate_contract_answer,
)

EXECUTION_POLICIES = frozenset(
    {
        "deterministic_only",
        "internal_template_plus_validator",
        "openai_compact",
        "openai_enhanced",
        "openai_mandatory_safeguarding",
    }
)

MANDATORY_SAFEGUARDING_FAMILIES = frozenset(
    {
        "missing_return_record",
        "allegation_lado",
        "abuse_disclosure",
        "suicidal_self_harm",
        "parent_removal_conflict",
    }
)

MANDATORY_SAFEGUARDING_SCENARIOS = frozenset(
    {
        "missing_return_substance_risk",
        "missing_from_home",
        "allegation_against_staff",
        "historic_sexual_abuse_disclosure",
        "suicide_self_harm",
        "parent_forced_removal",
        "exploitation_county_lines",
        "peer_on_peer_harm",
        "online_harm_image_sharing",
        "medication_error",
        "restraint_physical_intervention",
    }
)

SCENARIO_INTERNAL_MARKERS: dict[str, list[str]] = {
    "missing_from_home": ["missing", "welfare", "safeguarding", "escalation"],
    "missing_return_substance_risk": ["missing", "welfare", "return", "safeguarding"],
    "online_harm_image_sharing": ["online", "safeguarding", "evidence"],
    "restraint_physical_intervention": ["restraint", "safety", "safeguarding"],
    "medication_error": ["medication", "notification", "safeguarding"],
    "allegation_against_staff": ["lado", "do not investigate", "safeguarding"],
    "historic_sexual_abuse_disclosure": ["listen", "safeguarding", "do not investigate"],
    "suicide_self_harm": ["immediate", "safeguarding"],
    "exploitation_county_lines": ["exploitation", "safeguarding"],
}

PROMPT_DOMAIN_INTERNAL_MARKERS: list[tuple[re.Pattern[str], list[str]]] = [
    (re.compile(r"safeguarding\s+concern", re.I), ["safeguarding", "escalation"]),
    (re.compile(r"health\s+appointment", re.I), ["health", "record"]),
    (re.compile(r"refused\s+school|education\s+concern", re.I), ["education", "record"]),
    (re.compile(r"family\s+contact|contact\s+was", re.I), ["contact", "child voice"]),
    (re.compile(r"complaint", re.I), ["complaint", "child voice"]),
    (re.compile(r"\bgdd\b|widgets?|\baac\b", re.I), ["communication", "widgets", "plan"]),
    (re.compile(r"sensory|autism", re.I), ["sensory", "support", "record"]),
    (re.compile(r"child[- ]centred|support\s+plan", re.I), ["child-centred", "support", "plan"]),
    (re.compile(r"behaviour\s+support", re.I), ["behaviour", "therapeutic", "support"]),
    (re.compile(r"restorative\s+repair", re.I), ["repair", "restorative", "record"]),
    (re.compile(r"boundaries|consequences", re.I), ["boundaries", "fair", "record"]),
    (re.compile(r"staff\s+supervision", re.I), ["supervision", "reflection"]),
    (re.compile(r"team\s+learning|debrief", re.I), ["learning", "debrief", "team"]),
    (re.compile(r"reg\s*45", re.I), ["reg 45", "manager", "quality", "safeguarding"]),
    (re.compile(r"ofsted|inspection\s+prep", re.I), ["ofsted", "evidence"]),
    (re.compile(r"sccif", re.I), ["sccif", "evidence"]),
    (re.compile(r"leadership|management\s+oversight", re.I), ["leadership", "oversight", "management"]),
    (re.compile(r"quality\s+of\s+care", re.I), ["quality", "care", "child-centred"]),
    (re.compile(r"safer\s+recruitment|workforce", re.I), ["safer recruitment", "workforce", "recruitment"]),
    (re.compile(r"notify\s+ofsted|serious\s+event", re.I), ["notification", "ofsted", "notify"]),
    (re.compile(r"professional\s+curiosity", re.I), ["professional curiosity", "safeguarding", "record"]),
]

DETERMINISTIC_TEMPLATE_FAMILIES = frozenset(
    {
        "daily_record",
        "keywork_session",
        "handover",
        "manager_oversight_note",
        "reg44_visitor",
        "ofsted_preparation",
        "policy_practice_question",
        "template_generation",
        "incident_record",
    }
)

STRUCTURE_ONLY_PATTERNS: dict[str, re.Pattern[str]] = {
    "daily_record": re.compile(
        r"^(help\s+me\s+)?(write|word|record|draft)\s+(a\s+)?daily\s+(note|record|log)|"
        r"^(give\s+me\s+)?(a\s+)?daily\s+(note|record)\s+structure|"
        r"^what\s+should\s+(i\s+)?include\s+in\s+a\s+daily\s+(note|record)|"
        r"^daily\s+(note|record)\s+(structure|template|headings?)\??$",
        re.I,
    ),
    "keywork_session": re.compile(
        r"^(help\s+me\s+)?(write|word|record|draft)\s+(a\s+)?key\s*[- ]?work|"
        r"^(give\s+me\s+)?headings?\s+for\s+a\s+key\s*[- ]?work|"
        r"^key\s*[- ]?work\s+(session\s+)?(structure|template|headings?)\??$",
        re.I,
    ),
    "handover": re.compile(
        r"^(help\s+me\s+)?(write|word|draft)\s+(a\s+)?handover|"
        r"^what\s+should\s+(i\s+)?include\s+in\s+a\s+handover|"
        r"^handover\s+(structure|template|headings?)\??$",
        re.I,
    ),
    "manager_oversight_note": re.compile(
        r"^(help\s+me\s+)?(write|word|draft)\s+(a\s+)?manager\s+oversight|"
        r"^what\s+should\s+a\s+manager\s+oversight\s+note\s+include|"
        r"^manager\s+oversight\s+(structure|template|headings?)\??$|"
        r"^what\s+should\s+a\s+reg\s*45\s+manager\s+review\s+cover\??$|"
        r"^reg\s*45\s+(structure|template|headings?|review)\??$",
        re.I,
    ),
    "reg44_visitor": re.compile(
        r"^(give\s+me\s+)?(a\s+)?reg\s*44\s+(evidence\s+)?checklist|"
        r"^reg\s*44\s+(structure|template|headings?|evidence)\??$|"
        r"what\s+should\s+(a\s+)?reg\s*44\s+visitor\s+(be\s+)?(looking\s+for|focus\s+on|look\s+(?:for|at))",
        re.I,
    ),
    "ofsted_preparation": re.compile(
        r"help\s+me\s+prepare\s+for\s+an\s+ofsted\s+inspection|"
        r"what\s+evidence\s+should\s+managers\s+review|"
        r"ofsted\s+(prep|preparation|evidence\s+readiness)",
        re.I,
    ),
    "incident_record": re.compile(
        r"^(help\s+me\s+)?(write|word|draft)\s+(an\s+)?incident\s+(report|record|template)|"
        r"^incident\s+(report|record)\s+(structure|template|headings?)\??$",
        re.I,
    ),
}

ROUGH_NOTES_INDICATORS = re.compile(
    r"\b(was|were|said|told|did|happened|because|after|before|when|calm|upset|"
    r"aggressive|missing|returned|injury|hurt|blade|cannabis|disclosed|"
    r"breakfast|tea|bedtime|school|contact|medication)\b",
    re.I,
)

GENERATION_REQUIRED_PATTERNS = re.compile(
    r"\b(convert|rewrite|reword|turn\s+this|from\s+these\s+notes|make\s+this|"
    r"bespoke|therapeutic\s+rewrite|rough\s+notes|paste|here\s+are|she\s+was|he\s+was|"
    r"they\s+were|young\s+person\s+(was|said|did))\b",
    re.I,
)

DAILY_NOTE_DETERMINISTIC_ANSWER = """Absolutely — paste your rough notes and I'll turn them into a clear, factual, child-centred daily record.

Use this structure:

Daily Record Draft

Context / routine:
Date/time and routine context.

What happened:
What was seen and heard.

Young person's presentation:
Mood, presentation and observable behaviour.

Young person's voice or communication:
Their words or how they communicated, if known.

Staff response:
What staff did to support.

Outcome:
What happened next.

To complete before saving:
* Add the time.
* Add who was present.
* Add anything the young person said or communicated.
* Add any relevant follow-up, if needed.

When you send rough notes, include what was seen/heard, what the young person said, what staff did and what happened next."""

KEYWORK_SESSION_DETERMINISTIC_ANSWER = """Absolutely — paste your rough notes and I'll help you turn them into a clear key-work session record.

Use this structure:

Key-work session
Date/time:
Young person:
Purpose of session:
Focus/theme explored:
Child voice (their words where possible):
Wishes, feelings, strengths and worries:
What mattered to them:
Staff support offered:
Progress/observations:
Agreed actions:
Emotional meaning:
Follow-up:

Keep it factual — record what was seen and heard, capture child voice in their words, and note agreed actions and follow-up."""

HANDOVER_DETERMINISTIC_ANSWER = """Absolutely — paste your shift notes and I'll help you shape a clear handover.

Use this structure:

Handover
Date/time:
Young person(s):
Overall presentation/mood:
Key events this shift:
Child voice / what mattered to them:
Safeguarding/welfare updates:
Medication/health:
Contact/education:
Outstanding tasks:
Risks to watch:
Follow-up for incoming staff:

Keep it factual, evidence-based and child-centred — record what happened, staff response and outcome for incoming staff."""

MANAGER_OVERSIGHT_DETERMINISTIC_ANSWER = """Absolutely — paste your rough notes and I'll help you shape a manager oversight note.

Use this structure:

Manager oversight note
Date/time:
Young person/home:
Reason for oversight:
What is known:
What is missing:
Threshold/rationale:
Patterns/themes noticed:
Child voice considered:
Decisions made and actions required (owner/date):
Escalation/safeguarding considerations:
Plan/risk/care plan updates:
Learning for staff/team:
Follow-up and review date:

Record factual evidence of what was reviewed, decisions made, and follow-up required."""

INCIDENT_TEMPLATE_DETERMINISTIC_ANSWER = """Absolutely — paste what happened and I'll help you draft a factual incident record.

Use this structure:

Incident record
Date/time:
Location:
Young person(s) involved:
Immediate safety actions:
What happened (antecedents):
Child's voice:
Staff response:
Injury/damage:
Outcome/de-escalation:
Notifications/escalation:
Follow-up/repair:

Do not invent facts — include only what was seen, heard and done."""

REG44_CHECKLIST_DETERMINISTIC_ANSWER = """What a Reg 44 visitor should look for in a children's home — evidence-focused:

Lived experience of children
* Do children feel safe, listened to and involved in decisions?
* Quality of relationships, warmth and nurture
* Child voice and influence in daily life

Safeguarding effectiveness
* Missing episodes, restraints, consequences/sanctions, incidents, complaints, medication where relevant
* Staff responses to behaviour and distress
* Whether records match practice

Consultation and triangulation
* Speak with children, staff, parents/carers, placing authorities and professionals
* Review records, chronologies and plans sampled

Manager oversight and learning
* Action from previous Regulation 44 visits — shortfalls, actions, owner and timescale
* Whether the home is learning and improving

Record factually what you saw, heard and reviewed — evidence not assertion. Do not predict Ofsted judgement grades."""

REG45_REVIEW_DETERMINISTIC_ANSWER = """Reg 45 manager review — use this structure:

Reg 45 manager review
Review period:
Registered manager:
Quality of care review:
Children's progress and experiences:
Safeguarding review:
Leadership and management review:
Feedback from children/families/staff/professionals:
Patterns/trends noticed:
Improvement plan actions (owner/date):
Evidence of learning:
Follow-up review date:

Record what is known, decisions made, and evidence of impact — do not predict Ofsted judgement grades."""

OFSTED_PREPARATION_DETERMINISTIC_ANSWER = """Ofsted inspection preparation — evidence managers should review:

Ofsted evidence readiness
Child experience and voice:
Safeguarding effectiveness:
Quality of care:
Leadership and management:
Workforce/safer recruitment:
Records and chronology sampled:
Impact evidence — how leaders know what difference is made:
Shortfalls/actions with owners and dates:
Professional curiosity questions still open:

Prepare evidence readiness — do not predict inspection judgement grades or ratings."""

CONTEXTUAL_PRACTICE_TEMPLATES: list[tuple[re.Pattern[str], str, str]] = [
    (
        re.compile(r"health\s+appointment", re.I),
        "daily_record",
        """Help me record a health appointment — use this structure:

Health appointment record
Date/time:
Young person:
Appointment/location:
Health concern discussed:
Child voice:
Outcome/plan from clinician:
Staff support/actions:
Follow-up:
Record factually in the health record and daily log.""",
    ),
    (
        re.compile(r"refused\s+school|education\s+concern", re.I),
        "daily_record",
        """Education concern record — use this structure:

Education record
Date/time:
Young person:
What happened (refusal/attendance/barriers):
Child voice:
School/college contact:
Staff support offered:
Outcome:
Follow-up/plan:
Record factually for education and daily records.""",
    ),
    (
        re.compile(r"family\s+contact|contact\s+was", re.I),
        "daily_record",
        """Family contact record — use this structure:

Family contact
Date/time:
Young person:
Who was involved:
Child voice before/during/after:
What happened:
Impact on the young person:
Staff support:
Outcome:
Follow-up:
Capture child voice and contact impact factually.""",
    ),
    (
        re.compile(r"sensory|autism", re.I),
        "daily_record",
        """Autism / sensory support record — use this structure:

Sensory support observation
Date/time:
Young person:
Sensory triggers/profile noticed:
Communication preferences:
Strategies used (routine, transition, co-regulation):
Child voice:
Staff support:
Outcome:
Follow-up/plan:
Record sensory support and child voice factually.""",
    ),
    (
        re.compile(r"behaviour\s+support", re.I),
        "daily_record",
        """Behaviour support reflection — use this structure:

Behaviour support reflection
Date/time:
Young person:
What happened (observable behaviour):
Antecedents/context:
Child voice:
Therapeutic/co-regulation support used:
Outcome:
Repair/follow-up:
Record without blame — focus on support and child voice.""",
    ),
    (
        re.compile(r"restorative\s+repair", re.I),
        "incident_record",
        """Restorative repair record — use this structure:

Restorative repair
Date/time:
Young person:
Linked incident reference:
What happened:
Child voice:
Repair/restorative conversation:
Agreed actions:
Outcome:
Follow-up:
Record repair factually after the incident.""",
    ),
    (
        re.compile(r"boundaries|consequences", re.I),
        "daily_record",
        """Consequences and boundaries record — use this structure:

Boundaries and consequences
Date/time:
Young person:
Boundary/context:
What happened:
Child voice:
Fair, proportionate staff response:
Outcome:
Repair/follow-up:
Record boundaries fairly without shame language.""",
    ),
    (
        re.compile(r"team\s+learning|debrief", re.I),
        "incident_record",
        """Team learning after debrief — use this structure:

Team learning / debrief
Date/time:
Incident reference:
What the team reviewed:
Child voice/welfare considered:
Safeguarding learning:
What worked / what to improve:
Agreed team actions:
Owner/date:
Record learning for staff and team improvement.""",
    ),
    (
        re.compile(r"sccif", re.I),
        "policy_practice_question",
        """SCCIF-style evidence checklist:

- Child experience and progress evidence
- Safeguarding effectiveness
- Quality of care records
- Leadership and management oversight
- Workforce/training evidence
- Impact — how leaders know outcomes
- Shortfalls and improvement actions

Hold SCCIF-style evidence that is factual and child-centred — not assertion.""",
    ),
    (
        re.compile(r"quality\s+of\s+care", re.I),
        "daily_record",
        """Quality of care in daily recording — include:

- Child voice and what mattered to them
- Factual description of care provided
- Choices offered and dignity/respect shown
- Outcome and follow-up
- How this evidences quality of care

Paste rough notes and I will help turn them into clear, child-centred recording.""",
    ),
    (
        re.compile(r"risk\s+assessment\s+review", re.I),
        "manager_oversight_note",
        """Risk assessment review — manager structure:

Risk assessment review
Review date:
Young person:
Current risks known:
What is missing:
Child voice considered:
Threshold/rationale:
Decisions and plan updates:
Owner/date:
Follow-up review:""",
    ),
    (
        re.compile(r"placement\s+plan\s+review", re.I),
        "manager_oversight_note",
        """Placement plan review — structure:

Placement plan review
Review date:
Young person:
Placement stability/progress:
Child voice:
Multi-agency feedback:
Risks and support needed:
Agreed actions:
Owner/date:""",
    ),
    (
        re.compile(r"safer\s+recruitment|workforce\s+compliance", re.I),
        "manager_oversight_note",
        """Safer recruitment / workforce compliance record:

Review date:
Workforce checks/training sampled:
Safer recruitment compliance:
Gaps/risks identified:
Actions required:
Owner/date:
Follow-up:""",
    ),
    (
        re.compile(r"leadership.*management|management\s+oversight", re.I),
        "manager_oversight_note",
        """Leadership and management oversight record:

Period:
What leadership reviewed:
Oversight of safeguarding and quality:
Patterns/trends:
Decisions and actions:
Staff learning:
Evidence trail:
Follow-up:""",
    ),
    (
        re.compile(r"complaint", re.I),
        "policy_practice_question",
        """Complaint record — capture:

- Child voice and exact words where possible
- What the young person is complaining about
- When and where
- Immediate welfare/safety
- Manager notification
- Factual record without judgement
- Follow local complaints policy

Record the complaint factually and escalate to management.""",
    ),
    (
        re.compile(r"notify\s+ofsted|serious\s+event", re.I),
        "ofsted_preparation",
        """Serious event / Ofsted notification — record:

- What happened (factual)
- Immediate safeguarding actions
- Who to notify (manager, placing authority, Ofsted if required under local policy)
- Times and rationale
- Follow-up actions

Follow local notification policy — this does not replace manager/DSL judgement.""",
    ),
]

CHILD_VOICE_GUIDANCE_ANSWER = """To capture the child's voice in daily recording:

- Write what the young person actually said, in their words where possible — use quote marks for exact phrases.
- Note how they communicated (speech, widgets, behaviour, body language).
- Record what mattered to them, not just what staff wanted to happen.
- Separate facts (what you saw/heard) from your interpretation.
- Include their choices, refusals, and preferences — these are part of their voice.

Paste your rough notes and I can help turn them into clear, factual, child-centred recording wording."""

_MISSING_RETURN_INDICATORS_RE = re.compile(
    r"returned\s+(?:from|after)\s+missing|"
    r"(?:come|came)\s+back\s+from\s+missing|"
    r"back\s+from\s+missing|"
    r"returned\s+missing|"
    r"found\s+and\s+returned|"
    r"smells?\s+of\s+cannabis|"
    r"smell\s+of\s+cannabis|"
    r"return\s+home\s+conversation\s+record|"
    r"\bon\s+return\b",
    re.I,
)

_ACTIVE_MISSING_INDICATORS_RE = re.compile(
    r"missing\s+right\s+now|"
    r"missing\s+from\s+(?:care|the\s+home|home)|"
    r"young\s+person\s+is\s+missing|"
    r"currently\s+missing|"
    r"active\s+missing(?:\s*[- ]from\s*[- ]care)?\s+search|"
    r"cannot\s+find\s+them|"
    r"where\s+are\s+they|"
    r"(?:has\s+)?gone\s+missing|"
    r"\bis\s+missing\b",
    re.I,
)

_HISTORICAL_MISSING_PATTERN_RE = re.compile(
    r"\b(?:twice|three\s+times|several\s+times|\d+\s+times)\b",
    re.I,
)


def is_active_missing_from_care_prompt(message: str) -> bool:
    """True when the prompt describes a young person currently missing, not yet returned."""
    text = str(message or "")
    if not text.strip():
        return False
    if _MISSING_RETURN_INDICATORS_RE.search(text):
        return False
    if _HISTORICAL_MISSING_PATTERN_RE.search(text):
        return False
    return bool(_ACTIVE_MISSING_INDICATORS_RE.search(text))


MISSING_FROM_CARE_ACTIVE_DETERMINISTIC_ANSWER = """Missing from care — immediate actions on shift:

This is a missing-from-care concern. Follow your home's missing-from-care procedure immediately — ORB does not know your local steps.

While the young person is still missing
* Inform the manager/on-call without delay
* Contact police, social worker and/or placing authority according to your local policy and risk assessment — let adult judgement and local thresholds guide this, not universal rules
* Follow the home's missing procedure and any agreed missing plan
* Record times, actions, decisions and who was informed as they happen
* Keep a contemporaneous chronology of search actions and observations
* Remain curious about exploitation/contextual safeguarding indicators where relevant

ORB is not for emergencies — call 999 if there is immediate danger.

When the young person returns
* Offer a calm welcome back and immediate welfare check — injuries, distress, intoxication, hunger, fatigue and immediate medical need
* Do not accuse or shame
* Notify manager/on-call; update police if the episode was still active
* Notify social worker/placing authority; EDT if out of hours
* Return home interview / local missing procedure as required
* Record exact words and observations; update missing, risk and placement plans with manager oversight

Use professional judgement and your organisation's local policy throughout — ORB cannot guarantee compliance or replace manager, on-call, police or social worker decisions."""


def deterministic_answer_for_missing_contract(message: str) -> str:
    """Pick the missing-from-care or missing-return deterministic scaffold from the prompt."""
    if is_active_missing_from_care_prompt(message):
        return MISSING_FROM_CARE_ACTIVE_DETERMINISTIC_ANSWER
    return MISSING_RETURN_SUBSTANCE_DETERMINISTIC_ANSWER


MISSING_RETURN_SUBSTANCE_DETERMINISTIC_ANSWER = """Missing return — immediate actions on shift:

Immediate welfare check
* Calm welcome back — check injuries, distress, intoxication, hunger, fatigue and immediate medical need
* Do not accuse or shame

Missing procedure
* Follow local missing procedure
* Update police if the missing episode was still active
* Notify manager/on-call
* Notify social worker/placing authority; EDT if out of hours

Health and safety
* Consider health advice — 111 or 999 if unwell or intoxicated

Contextual safeguarding
* Remain curious about exploitation/contextual safeguarding
* Return home interview / local missing procedure as required
* Record exact words and observations
* Update missing, risk and placement plans with manager oversight

LADO is only relevant if there is an allegation or concern about an adult in a position of trust — not for a young person's risky behaviour on return."""

DETERMINISTIC_ANSWERS: dict[str, str] = {
    "daily_record": DAILY_NOTE_DETERMINISTIC_ANSWER,
    "keywork_session": KEYWORK_SESSION_DETERMINISTIC_ANSWER,
    "handover": HANDOVER_DETERMINISTIC_ANSWER,
    "manager_oversight_note": MANAGER_OVERSIGHT_DETERMINISTIC_ANSWER,
    "incident_record": INCIDENT_TEMPLATE_DETERMINISTIC_ANSWER,
    "reg44_visitor": REG44_CHECKLIST_DETERMINISTIC_ANSWER,
    "ofsted_preparation": OFSTED_PREPARATION_DETERMINISTIC_ANSWER,
    "missing_return_record": MISSING_RETURN_SUBSTANCE_DETERMINISTIC_ANSWER,
}


@dataclass
class OrbExecutionPolicyDecision:
    selected_contract: str | None = None
    depth_tier: str = "standard"
    execution_policy: str = "openai_compact"
    retrieval_policy: str = "minimal"
    openai_policy: str = "after_internal_selection"
    deterministic_answer_available: bool = False
    scenario_bank_policy: str = "skip_unless_required"
    embedding_policy: str = "skip_unless_required"
    repair_policy: str = "local_validator_first"
    validation_policy: str = "contract_validator"
    openai_allowed: bool = True
    embeddings_allowed: bool = False
    scenario_bank_allowed: bool = False
    prompt_chars_cap: int | None = None
    openai_reason: str | None = None
    optimisation_gap: str | None = None
    internal_knowledge_markers: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbExecutionPolicyService:
    """Decide internal-first execution after brain convergence and contract selection."""

    VERSION = "orb-execution-policy-v1"

    def resolve(
        self,
        message: str,
        *,
        brain_convergence: dict[str, Any] | None = None,
        retrieval_bundle: dict[str, Any] | None = None,
        mode: str | None = None,
        note_type: str | None = None,
        requested_action: str | None = None,
    ) -> OrbExecutionPolicyDecision:
        convergence = dict(brain_convergence or {})
        bundle = dict(retrieval_bundle or {})
        scenario_types = list(convergence.get("scenario_types") or [])
        risk_level = str(convergence.get("risk_level") or "low").lower()
        contract_family = (
            convergence.get("contract_family")
            or bundle.get("selected_contract")
            or detect_contract_family(
                message,
                scenario_types=scenario_types,
                note_type=note_type,
                requested_action=requested_action,
            )
            or self._detect_custom_family(message)
        )
        family = get_contract_family(contract_family) or {}
        depth_tier = str(
            convergence.get("depth_tier") or family.get("depth_tier") or "standard"
        )

        if self._requires_mandatory_safeguarding(
            message,
            scenario_types=scenario_types,
            risk_level=risk_level,
            contract_family=contract_family,
        ):
            resolved_contract = contract_family or detect_contract_family(
                message,
                scenario_types=scenario_types,
            )
            return self._mandatory_safeguarding_decision(
                contract_family=resolved_contract,
                depth_tier=depth_tier,
                scenario_types=scenario_types,
                message=message,
            )
        if contract_family in MANDATORY_SAFEGUARDING_FAMILIES or depth_tier == "mandatory":
            return self._mandatory_safeguarding_decision(
                contract_family=contract_family,
                depth_tier=depth_tier,
                scenario_types=scenario_types,
                message=message,
            )

        if self._is_child_voice_guidance(message):
            markers = self._internal_markers_for_family("daily_record", message=message)
            return OrbExecutionPolicyDecision(
                selected_contract="daily_record",
                depth_tier=depth_tier,
                execution_policy="internal_template_plus_validator",
                retrieval_policy="contract_only",
                openai_policy="never",
                deterministic_answer_available=True,
                scenario_bank_policy="skip",
                embedding_policy="skip",
                repair_policy="local_validator_first",
                validation_policy="contract_validator",
                openai_allowed=False,
                embeddings_allowed=False,
                scenario_bank_allowed=False,
                prompt_chars_cap=1000,
                internal_knowledge_markers=markers,
            )

        if self._is_structure_only_request(message, contract_family):
            markers = self._internal_markers_for_family(contract_family, message=message)
            return OrbExecutionPolicyDecision(
                selected_contract=contract_family,
                depth_tier=depth_tier,
                execution_policy="deterministic_only",
                retrieval_policy="none",
                openai_policy="never",
                deterministic_answer_available=True,
                scenario_bank_policy="skip",
                embedding_policy="skip",
                repair_policy="none",
                validation_policy="local_template_validator",
                openai_allowed=False,
                embeddings_allowed=False,
                scenario_bank_allowed=False,
                prompt_chars_cap=800,
                openai_reason=None,
                internal_knowledge_markers=markers,
            )

        if contract_family in DETERMINISTIC_TEMPLATE_FAMILIES and not self._has_generation_content(message):
            markers = self._internal_markers_for_family(contract_family, message=message)
            contextual = self._contextual_practice_template(message)
            return OrbExecutionPolicyDecision(
                selected_contract=contextual[1] if contextual else contract_family,
                depth_tier=depth_tier,
                execution_policy="internal_template_plus_validator",
                retrieval_policy="contract_only",
                openai_policy="never",
                deterministic_answer_available=(
                    contract_family in DETERMINISTIC_ANSWERS or contextual is not None
                ),
                scenario_bank_policy="skip",
                embedding_policy="skip",
                repair_policy="local_validator_first",
                validation_policy="contract_validator",
                openai_allowed=False,
                embeddings_allowed=False,
                scenario_bank_allowed=False,
                prompt_chars_cap=1200,
                internal_knowledge_markers=markers,
            )

        if self._needs_enhanced_reasoning(message, contract_family, depth_tier, mode=mode):
            return OrbExecutionPolicyDecision(
                selected_contract=contract_family,
                depth_tier=depth_tier,
                execution_policy="openai_enhanced",
                retrieval_policy="full_internal_first",
                openai_policy="enhanced_after_contract",
                deterministic_answer_available=False,
                scenario_bank_policy="load_if_complex",
                embedding_policy="allow_if_rag_needed",
                repair_policy="contract_repair_then_validator",
                validation_policy="contract_validator",
                openai_allowed=True,
                embeddings_allowed=True,
                scenario_bank_allowed=True,
                openai_reason="complex_professional_reasoning",
                internal_knowledge_markers=self._internal_markers_for_family(
                    contract_family,
                    message=message,
                ),
            )

        return OrbExecutionPolicyDecision(
            selected_contract=contract_family,
            depth_tier=depth_tier,
            execution_policy="openai_compact",
            retrieval_policy="contract_first_minimal",
            openai_policy="compact_after_contract",
            deterministic_answer_available=False,
            scenario_bank_policy="skip_unless_risk",
            embedding_policy="skip_unless_rag",
            repair_policy="local_validator_first",
            validation_policy="contract_validator",
            openai_allowed=True,
            embeddings_allowed=False,
            scenario_bank_allowed=False,
            openai_reason="generation_required",
            internal_knowledge_markers=self._internal_markers_for_family(
                contract_family,
                message=message,
            ),
        )

    def try_deterministic_answer(
        self,
        message: str,
        *,
        policy: OrbExecutionPolicyDecision | dict[str, Any] | None = None,
        brain_convergence: dict[str, Any] | None = None,
    ) -> dict[str, Any] | None:
        decision = policy if isinstance(policy, OrbExecutionPolicyDecision) else None
        if decision is None and isinstance(policy, dict):
            decision = OrbExecutionPolicyDecision(**{
                k: v for k, v in policy.items() if k in OrbExecutionPolicyDecision.__dataclass_fields__
            })
        if decision is None:
            decision = self.resolve(message, brain_convergence=brain_convergence)

        from services.orb_recording_contract_service import extract_known_incident_facts
        from services.orb_therapeutic_language_contract_service import (
            build_convert_to_recording_scaffold,
            detect_adult_shorthand,
            is_convert_to_recording_request,
        )

        if is_convert_to_recording_request(message):
            facts = extract_known_incident_facts(message)
            if detect_adult_shorthand(message) or facts.get("shorthand_behaviour"):
                answer = build_convert_to_recording_scaffold(message)
                family_id = "convert_to_recording_wording"
                validation = validate_contract_answer(answer, family_id=family_id)
                return {
                    "answer": validation.get("sanitized_answer") or answer,
                    "sources": [],
                    "citations": [],
                    "no_llm": True,
                    "execution_policy": "internal_template_plus_validator",
                    "validation": validation,
                }

        from services.orb_recording_output_contract_service import (
            recording_contract_blocked_by_safeguarding,
            try_build_recording_contract_answer,
        )

        if not recording_contract_blocked_by_safeguarding(
            message,
            execution_policy=decision.execution_policy,
            contract_family=decision.selected_contract,
        ):
            recording_answer = try_build_recording_contract_answer(
                message,
                execution_policy=decision.execution_policy,
                contract_family=decision.selected_contract,
            )
            if recording_answer:
                family_id = detect_contract_family(message) or "daily_record"
                validation = validate_contract_answer(recording_answer, family_id=family_id)
                return {
                    "answer": validation.get("sanitized_answer") or recording_answer,
                    "sources": [],
                    "citations": [],
                    "no_llm": True,
                    "execution_policy": "internal_template_plus_validator",
                    "validation": validation,
                }

        if decision.execution_policy not in {
            "deterministic_only",
            "internal_template_plus_validator",
        }:
            return None
        if not decision.deterministic_answer_available:
            return None

        family_id = decision.selected_contract
        answer = ""
        if (
            re.search(r"\breg\s*45\b", str(message or ""), re.I)
            and re.search(r"\b(review|cover|structure|headings?)\b", str(message or ""), re.I)
        ):
            answer = REG45_REVIEW_DETERMINISTIC_ANSWER
            family_id = family_id or "manager_oversight_note"
        if not answer:
            contextual = self._contextual_practice_template(message)
            if contextual:
                answer, family_id = contextual
        if not answer:
            if family_id == "missing_return_record":
                answer = deterministic_answer_for_missing_contract(message)
            else:
                answer = DETERMINISTIC_ANSWERS.get(family_id or "")
        if not answer and self._is_child_voice_guidance(message):
            answer = CHILD_VOICE_GUIDANCE_ANSWER
            family_id = family_id or "daily_record"

        if not answer:
            return None

        validation = validate_contract_answer(answer, family_id=family_id)
        return {
            "answer": validation.get("sanitized_answer") or answer,
            "sources": [],
            "citations": [],
            "no_llm": True,
            "execution_policy": decision.execution_policy,
            "validation": validation,
        }

    def build_execution_telemetry(
        self,
        *,
        policy: OrbExecutionPolicyDecision | dict[str, Any],
        openai_called: bool,
        embeddings_called: bool = False,
        embeddings_count: int = 0,
        scenario_bank_loaded: bool = False,
        prompt_chars: int = 0,
        first_token_ms: int | None = None,
        total_ms: int | None = None,
        final_answer_validation_passed: bool | None = None,
        answer_repaired: bool = False,
        public_explainability_labels: list[str] | None = None,
    ) -> dict[str, Any]:
        policy_dict = policy.to_dict() if isinstance(policy, OrbExecutionPolicyDecision) else dict(policy)
        telemetry: dict[str, Any] = {
            "execution_policy_version": self.VERSION,
            "selected_contract": policy_dict.get("selected_contract"),
            "execution_policy": policy_dict.get("execution_policy"),
            "depth_tier": policy_dict.get("depth_tier"),
            "retrieval_policy": policy_dict.get("retrieval_policy"),
            "openai_called": openai_called,
            "openai_reason": policy_dict.get("openai_reason"),
            "embeddings_called": embeddings_called,
            "embeddings_count": embeddings_count,
            "scenario_bank_loaded": scenario_bank_loaded,
            "prompt_chars": prompt_chars,
            "final_answer_validation_passed": final_answer_validation_passed,
            "answer_repaired": answer_repaired,
            "internal_first": not openai_called,
            "cost_control_pass": not openai_called or policy_dict.get("openai_allowed", True),
        }
        if first_token_ms is not None:
            telemetry["first_token_ms"] = first_token_ms
        if total_ms is not None:
            telemetry["total_ms"] = total_ms
        if public_explainability_labels:
            telemetry["public_explainability_labels"] = list(public_explainability_labels)
        if (
            openai_called
            and policy_dict.get("deterministic_answer_available")
            and policy_dict.get("execution_policy") in {"deterministic_only", "internal_template_plus_validator"}
        ):
            telemetry["optimisation_gap"] = "deterministic template available"
        elif policy_dict.get("optimisation_gap"):
            telemetry["optimisation_gap"] = policy_dict.get("optimisation_gap")
        return telemetry

    def _contextual_practice_template(self, message: str) -> tuple[str, str] | None:
        text = str(message or "").strip()
        if not text or self._has_generation_content(text):
            return None
        for pattern, family_id, template in CONTEXTUAL_PRACTICE_TEMPLATES:
            if pattern.search(text):
                return template, family_id
        return None

    def _requires_mandatory_safeguarding(
        self,
        message: str,
        *,
        scenario_types: list[str],
        risk_level: str,
        contract_family: str | None,
    ) -> bool:
        if scenario_types and any(s in MANDATORY_SAFEGUARDING_SCENARIOS for s in scenario_types):
            return True
        if contract_family in MANDATORY_SAFEGUARDING_FAMILIES:
            return True
        lower = str(message or "").lower()
        if re.search(r"\bsafeguarding\s+concern\b", lower):
            return True
        if risk_level in {"high", "critical", "safeguarding"} and re.search(
            r"\b(safeguard|missing from|disclosed|allegation|self[- ]?harm|suicid|"
            r"exploitation|blackmail|nude|restraint|medication error)\b",
            lower,
        ):
            if self._is_structure_only_request(message, contract_family):
                return False
            return True
        return False

    def _mandatory_safeguarding_decision(
        self,
        *,
        contract_family: str | None,
        depth_tier: str,
        scenario_types: list[str],
        message: str = "",
    ) -> OrbExecutionPolicyDecision:
        markers = self._internal_markers_for_family(contract_family, message=message)
        for scenario in scenario_types:
            markers.extend(SCENARIO_INTERNAL_MARKERS.get(scenario) or [])
        markers.extend(["safeguarding", "escalation"])
        deduped_markers: list[str] = []
        seen: set[str] = set()
        for marker in markers:
            key = marker.lower()
            if key in seen:
                continue
            seen.add(key)
            deduped_markers.append(marker)
        return OrbExecutionPolicyDecision(
            selected_contract=contract_family,
            depth_tier="mandatory",
            execution_policy="openai_mandatory_safeguarding",
            retrieval_policy="safeguarding_contract_first",
            openai_policy="mandatory_with_validator",
            deterministic_answer_available=False,
            scenario_bank_policy="load_for_risk",
            embedding_policy="skip_unless_required",
            repair_policy="mandatory_contract_repair",
            validation_policy="mandatory_contract_validator",
            openai_allowed=True,
            embeddings_allowed=False,
            scenario_bank_allowed=True,
            openai_reason="mandatory_safeguarding_generation",
            internal_knowledge_markers=deduped_markers[:16],
        )

    def _is_structure_only_request(self, message: str, family_id: str | None) -> bool:
        if not family_id:
            return False
        text = str(message or "").strip()
        if not text:
            return False
        pattern = STRUCTURE_ONLY_PATTERNS.get(family_id)
        if pattern and pattern.search(text):
            return not self._has_generation_content(text)
        if family_id == "template_generation" and re.search(
            r"\b(structure|template|headings?|checklist)\b", text, re.I
        ):
            return not self._has_generation_content(text)
        return False

    def _has_generation_content(self, message: str) -> bool:
        text = str(message or "").strip()
        if re.search(
            r"^(when\s+must|what\s+should|how\s+should|what\s+sccif|"
            r"what\s+evidence|help\s+me\s+prepare\s+for|what\s+should\s+leadership)",
            text,
            re.I,
        ) and not GENERATION_REQUIRED_PATTERNS.search(text):
            return False
        if len(text.split()) > 18:
            return True
        if GENERATION_REQUIRED_PATTERNS.search(text):
            return True
        if ROUGH_NOTES_INDICATORS.search(text) and not STRUCTURE_ONLY_PATTERNS.get("daily_record", re.compile("$^")).fullmatch(
            text
        ):
            # Rough factual content present alongside a template ask
            lower = text.lower()
            if any(
                p in lower
                for p in (
                    "help me write",
                    "help me word",
                    "convert",
                    "rewrite",
                )
            ):
                return True
            if len(text.split()) > 10:
                return True
        return False

    def _needs_enhanced_reasoning(
        self,
        message: str,
        family_id: str | None,
        depth_tier: str,
        *,
        mode: str | None = None,
    ) -> bool:
        lower = str(message or "").lower()
        mode_name = str(mode or "").strip()
        if depth_tier in {"enhanced", "mandatory", "deep"}:
            return True
        if mode_name in {
            "Manager Copilot",
            "Reg 44 / Reg 45 Prep",
            "Ofsted Lens",
            "Scenario Simulator",
        }:
            return True
        enhanced_terms = (
            "ofsted preparation",
            "ofsted prep",
            "document review",
            "support plan",
            "multi-factor",
            "repeated pattern",
            "manager oversight review",
            "placement plan review",
            "risk assessment review",
            "quality of care",
            "leadership and management",
            "sccif",
            "complaint about staff",
            "make a complaint",
        )
        return any(term in lower for term in enhanced_terms)

    def _is_child_voice_guidance(self, message: str) -> bool:
        text = str(message or "").strip().lower()
        return bool(
            re.search(r"child'?s?\s+voice", text)
            and re.search(r"\b(how|capture|record|recording|include)\b", text)
            and not self._has_generation_content(message)
        )

    def _detect_custom_family(self, message: str) -> str | None:
        text = str(message or "").strip()
        if not text:
            return None
        if STRUCTURE_ONLY_PATTERNS["handover"].search(text) or re.search(
            r"\bhandover\b", text, re.I
        ):
            return "handover"
        if re.search(r"key\s*[- ]?work", text, re.I):
            return "keywork_session"
        if STRUCTURE_ONLY_PATTERNS["reg44_visitor"].search(text):
            return "reg44_visitor"
        if re.search(r"\breg\s*44\b", text, re.I) and re.search(
            r"\b(checklist|structure|template|headings?|evidence)\b", text, re.I
        ):
            return "reg44_visitor"
        if re.search(r"child'?s?\s+voice", text, re.I) and re.search(
            r"\b(record|recording|capture|daily)\b", text, re.I
        ):
            return "daily_record"
        if re.search(r"\breg\s*45\b", text, re.I):
            return "manager_oversight_note"
        if re.search(r"\bsccif\b", text, re.I):
            return "policy_practice_question"
        if re.search(r"leadership.*management|management\s+oversight", text, re.I):
            return "manager_oversight_note"
        if re.search(r"ofsted\s+inspection|ofsted\s+prep", text, re.I) and re.search(
            r"\b(evidence|prepare|readiness)\b", text, re.I
        ):
            return "ofsted_preparation"
        return None

    def _internal_markers_for_family(
        self,
        family_id: str | None,
        *,
        message: str = "",
    ) -> list[str]:
        family = get_contract_family(family_id) or {}
        markers = list(family.get("required_markers") or [])
        if family_id == "daily_record":
            markers.extend(["child voice", "factual", "structure"])
        elif family_id == "keywork_session":
            markers.extend(["child voice", "session", "purpose", "follow-up"])
        elif family_id == "handover":
            markers.extend(["handover", "shift", "follow-up"])
        elif family_id == "manager_oversight_note":
            markers.extend(["oversight", "pattern", "manager", "known", "missing"])
        elif family_id == "reg44_visitor":
            markers.extend(["reg 44", "evidence", "child voice"])
        elif family_id == "ofsted_preparation":
            markers.extend(["ofsted", "evidence", "safeguarding"])
        elif family_id == "incident_record":
            markers.extend(["safety", "online", "restraint", "repair"])
        elif family_id == "accessible_child_support_plan":
            markers.extend(["communication", "widgets", "plan", "child-centred"])
        elif family_id in MANDATORY_SAFEGUARDING_FAMILIES:
            markers.extend(["safeguarding", "escalation"])
        lower = str(message or "").lower()
        for pattern, extra in PROMPT_DOMAIN_INTERNAL_MARKERS:
            if pattern.search(lower):
                markers.extend(extra)
        deduped: list[str] = []
        seen: set[str] = set()
        for marker in markers:
            key = marker.lower()
            if key in seen:
                continue
            seen.add(key)
            deduped.append(marker)
        return deduped[:16]


orb_execution_policy_service = OrbExecutionPolicyService()
