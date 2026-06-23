"""Universal ORB Residential answer contract map — all major answer families.

Single registry for trigger terms, depth tiers, required markers, forbidden patterns,
public explainability, streaming suitability, and ORB Write handoff hints.
Reuses existing contract services; does not duplicate brain routing.
"""

from __future__ import annotations

import re
from typing import Any, Pattern

from services.orb_fast_opening_service import strip_streaming_artifacts_from_answer
from services.orb_mandatory_response_contract_service import (
    MANDATORY_CONTRACTS,
    find_inappropriate_lado_reference,
)
from services.orb_placeholder_quality_guard_service import sanitize_placeholders_in_answer
from services.orb_therapeutic_language_contract_service import (
    GENERIC_WEAK_PHRASES,
    apply_deterministic_therapeutic_repairs,
)

# Warn in QA/tests when standard non-risk prompt assembly exceeds this size.
STANDARD_DEPTH_PROMPT_CHAR_CAP = 25000
EVERYDAY_SHIFT_PROMPT_CHAR_CAP = 8000
CONTACT_DISTRESS_PROMPT_CHAR_CAP = 12000
MEDICATION_REFUSAL_PROMPT_CHAR_CAP = 12000

# Universal answer shape for "how should staff record this?" shift prompts.
STAFF_RECORDING_QUESTION_RE = re.compile(
    r"how\s+should\s+staff\s+record|what\s+should\s+(?:staff|we)\s+record|"
    r"how\s+(?:do|should)\s+(?:i|we)\s+record|how\s+to\s+record\s+this",
    re.I,
)

STAFF_RECORDING_ANSWER_SHAPE: tuple[str, ...] = (
    "Direct recording structure first (headings, chronology, what to capture)",
    "Example safer wording (observation vs interpretation)",
    "Follow-up questions only after practical guidance",
    "Observation vs interpretation reminder; local policy boundary",
)

RECORDING_FORBIDDEN_OPENERS: tuple[str, ...] = (
    "tell me more",
    "what would be helpful",
    "could you tell me more",
    "can you share more",
    "what happened exactly",
    "before we proceed",
)

MEDICATION_CRITICAL_RISK_RE = re.compile(
    r"\b(overdose|wrong\s+dose|medication\s+error|severe\s+reaction|anaphylaxis|"
    r"given\s+wrong\s+medicine|took\s+too\s+many)\b",
    re.I,
)

PLACEMENT_DISTRESS_CRITICAL_RE = re.compile(
    r"\b("
    r"do(?:n'?t| not)\s+want\s+to\s+be\s+here|"
    r"don'?t\s+want\s+to\s+live|"
    r"no\s+point\s+being\s+here|"
    r"can'?t\s+do\s+this\s+anymore|"
    r"doesn'?t\s+want\s+to\s+wake\s+up|"
    r"want\s+to\s+die|"
    r"kill\s+(?:my|him|her|them)self"
    r")\b",
    re.I,
)

STAFF_ALLEGATION_CRITICAL_RE = re.compile(
    r"\b("
    r"allegat(?:ion|ed)|"
    r"(?:staff|member\s+of\s+staff).{0,40}(?:grabbed|hit|touched|threatened|hurt)|"
    r"(?:grabbed|hit|touched|threatened|hurt).{0,40}(?:staff|member\s+of\s+staff)|"
    r"said\s+staff\s+(?:grabbed|hit|touched|threatened|hurt)"
    r")\b",
    re.I,
)

# Universal forbidden patterns in final answers (streaming leakage, generic AI filler, broken placeholders).
UNIVERSAL_FORBIDDEN_PATTERNS: tuple[str, ...] = (
    "start with what is safest and most practical right now",
    "the full guidance is on the way",
    "i'm preparing the full steps now",
    "it is essential to",
    "creating a ",
    "requires a focus on",
    "here's a structured template you can adapt",
    "here is a structured template you can adapt",
    "active_brains",
    "brain_route",
    "response_contract",
    "vault_domains",
    "mandatory_contract",
    "scenario_detector",
    "shared_institutional_cognition_runtime",
)

PLAN_UPDATE_RECORDING_RE = re.compile(
    r"(?:support|care|placement|behaviour|communication|sensory|education)\s+plan.{0,40}"
    r"(?:changed|updated|reviewed|amended)|"
    r"(?:changed|updated|reviewed|amended).{0,40}(?:support|care|placement)\s+plan|"
    r"how\s+should\s+staff\s+record.{0,40}plan\s+update",
    re.I,
)

BROKEN_PLACEHOLDER_RE = re.compile(
    r"\[[^\]]*(?:…|\.\.\.)[^\]]*\]",
    re.IGNORECASE,
)

CLEAN_PLACEHOLDER_RE = re.compile(r"\[([^\]]{3,120})\]")

INTERNAL_METADATA_RE = re.compile(
    r"\b(active_brains|brain_route|response_contract|vault_domains|mandatory_contract|"
    r"scenario_detector|shared_institutional_cognition_runtime)\b",
    re.IGNORECASE,
)

SCENARIO_TO_FAMILY: dict[str, str] = {
    "missing_return_substance_risk": "missing_return_record",
    "missing_from_home": "missing_return_record",
    "allegation_against_staff": "allegation_lado",
    "suicide_self_harm": "suicidal_self_harm",
    "parent_forced_removal": "parent_removal_conflict",
    "historic_sexual_abuse_disclosure": "abuse_disclosure",
    "exploitation_county_lines": "abuse_disclosure",
    "peer_on_peer_harm": "incident_record",
    "medication_error": "incident_record",
    "restraint_physical_intervention": "incident_record",
    "restraint_intervention": "incident_record",
    "online_harm_image_sharing": "incident_record",
    "online_harm": "incident_record",
    "child_refuses_medication": "medication_refusal_guidance",
    "family_time_cancelled_distress": "contact_distress_recording",
    "child_refuses_school": "school_refusal_recording",
}

ORB_ANSWER_CONTRACT_FAMILIES: dict[str, dict[str, Any]] = {
    "child_voice_evidence_recording": {
        "label": "Child voice evidence in daily records (AAC / gestures / symbols)",
        "contract_mode": "recording",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "prompt_char_cap": EVERYDAY_SHIFT_PROMPT_CHAR_CAP,
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"(?:evidence|record|capture).{0,80}(?:child'?s?|young\s+person'?s?).{0,60}"
                r"(?:voice|communication|views?|wishes?)|"
                r"(?:gestures?|symbols?|aac|widget).{0,80}(?:daily\s+record|record|evidence|log)|"
                r"communicate\s+mainly\s+through\s+(?:gestures?|symbols?|aac|a\s+symbol\s+board)|"
                r"(?:non[\s-]?verbal|minimal\s+verbal).{0,60}(?:daily\s+record|record\s+their\s+voice)",
                re.I,
            ),
        ],
        "required_markers": ["communication", "record", "gesture", "symbol", "aac", "adult"],
        "required_sections": list(STAFF_RECORDING_ANSWER_SHAPE)
        + [
            "How the young person communicated (AAC, symbols, gestures, device) — not only adult inference",
            "What was shown, selected or indicated; how adults checked understanding",
            "Adult support, pacing and environmental adjustments",
            "Do not invent quotes — use [communicated via symbol/gesture] where words are unknown",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4])
        + list(RECORDING_FORBIDDEN_OPENERS)
        + ["my support plan", "dreams and aspirations", "creating a child-friendly support plan"],
        "public_considerations": [
            "Child's voice considered",
            "Recording quality",
            "SEND",
            "Communication support",
        ],
    },
    "accessible_child_support_plan": {
        "label": "Accessible child-friendly support plan",
        "contract_mode": "guidance",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"(?:child[- ]friendly\s+)?support\s+plan|"
                r"\bgdd\b|global\s+developmental\s+delay|"
                r"(?:template|plan).{0,40}(?:widgets?|aac|symbol\s+board)|"
                r"dreams?\s+and\s+aspirations?|preparing\s+for\s+adulthood",
                re.I,
            ),
        ],
        "required_markers": [
            "my support plan",
            "dream",
            "aspiration",
            "widget",
            "communication",
            "yes",
            "no",
            "stop",
            "help",
            "pain",
            "worried",
            "adult",
            "independence",
            "adulthood",
            "review",
        ],
        "required_sections": [
            "Child-facing plan first",
            "Easy-read / symbol-ready wording",
            "Communication widgets/AAC central",
            "How I say yes/no/stop/help/pain/worried/happy",
            "Dreams and aspirations",
            "What matters to me",
            "Daily support/routine",
            "What helps me feel calm and safe",
            "How adults should support me",
            "Independence / preparing for adulthood",
            "Review using the young person's communication method",
            "Adult guidance for using the plan",
        ],
        "forbidden_patterns": [
            "start with what is safest",
            "full guidance is on the way",
            "it is essential to",
            "here's a structured template you can adapt",
            "creating a child-friendly support plan",
            "tailored to their individual needs",
        ],
        "public_considerations": [
            "Child-centred planning",
            "Communication support",
            "Preparing for adulthood",
            "Residential childcare practice",
        ],
    },
    "daily_record": {
        "label": "Daily record / daily note",
        "contract_mode": "recording",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "prompt_char_cap": EVERYDAY_SHIFT_PROMPT_CHAR_CAP,
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"daily\s+(record|note|log)|shift\s+note|write\s+(a\s+)?daily|"
                r"help\s+me\s+record\s+today|health\s+appointment|"
                r"refused\s+school|refused\s+to\s+go\s+to\s+school|education\s+concern|family\s+contact|"
                r"contact\s+was|behaviour\s+support|sensory\s+support|"
                r"consequences\s+and\s+boundaries|boundaries\s+fairly|"
                r"evidence\s+quality\s+of\s+care|quality\s+of\s+care\s+in\s+daily|"
                r"how\s+should\s+staff\s+record",
                re.I,
            ),
        ],
        "required_markers": ["factual", "staff", "outcome"],
        "required_sections": list(STAFF_RECORDING_ANSWER_SHAPE)
        + [
            "Factual language; no invented facts",
            "What happened; staff response; emotional presentation",
            "Choices/offers; outcome; follow-up if needed",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]) + list(RECORDING_FORBIDDEN_OPENERS),
        "public_considerations": [
            "Recording quality",
            "Child-centred recording",
            "Therapeutic language",
            "Child's voice considered",
            "Trauma-informed practice",
        ],
    },
    "school_refusal_recording": {
        "label": "School refusal recording",
        "contract_mode": "recording",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_light",
        "prompt_tier_cap": "residential",
        "prompt_char_cap": EVERYDAY_SHIFT_PROMPT_CHAR_CAP,
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"refused\s+(?:to\s+go\s+to\s+)?school|school\s+refusal|"
                r"won'?t\s+go\s+to\s+school|refused\s+school\s+today",
                re.I,
            ),
        ],
        "required_markers": ["school", "factual", "staff", "barrier"],
        "required_sections": list(STAFF_RECORDING_ANSWER_SHAPE)
        + [
            "Attendance context; barriers (SEND/sensory/relationships) not defiance framing",
            "Offers, advocacy, transport/plan steps; outcome and follow-up",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]) + list(RECORDING_FORBIDDEN_OPENERS),
        "public_considerations": [
            "Recording quality",
            "Child-centred recording",
            "Therapeutic language",
            "SEND",
        ],
    },
    "contact_distress_recording": {
        "label": "Contact / emotional wellbeing daily record",
        "contract_mode": "recording",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "prompt_char_cap": CONTACT_DISTRESS_PROMPT_CHAR_CAP,
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"(?:upset|distressed|dysregulated)\s+(?:after|following)\s+(?:contact|family\s+time)|"
                r"upset\s+following\s+family\s+time|"
                r"(?:contact|family\s+time)\s+(?:cancelled|changed|didn'?t\s+happen)|"
                r"after\s+(?:contact|family\s+time).{0,40}(?:upset|distressed|tearful|dysregulated)",
                re.I,
            ),
        ],
        "required_markers": ["contact", "factual", "staff", "presentation"],
        "required_sections": list(STAFF_RECORDING_ANSWER_SHAPE)
        + [
            "Contact context (who, planned/changed, duration if known)",
            "Emotional presentation on return; co-regulation offered",
            "Child's words where known; staff response; outcome and follow-up",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]) + list(RECORDING_FORBIDDEN_OPENERS),
        "public_considerations": [
            "Recording quality",
            "Child-centred recording",
            "Therapeutic language",
            "Child's voice considered",
        ],
    },
    "medication_refusal_guidance": {
        "label": "Medication refusal / health note",
        "contract_mode": "guidance",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "prompt_char_cap": MEDICATION_REFUSAL_PROMPT_CHAR_CAP,
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"refused\s+medication|refusing\s+medication|refuses\s+medication|"
                r"won'?t\s+take\s+(?:their\s+)?medication|refusing\s+(?:tablets|medicine|meds)|"
                r"medication\s+refusal",
                re.I,
            ),
        ],
        "required_markers": ["medication", "mar", "manager", "clinical"],
        "required_sections": [
            "Direct practical steps first — MAR recording, what was offered/refused, time",
            "Capacity/consent boundary; do not force unless lawful emergency protocol",
            "Clinical/manager/local medication policy boundary — who to notify",
            "Observation vs interpretation; child voice where known",
            "Follow-up questions only after guidance",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4])
        + list(RECORDING_FORBIDDEN_OPENERS)
        + ["medication error", "administration error", "wrong dose given"],
        "public_considerations": [
            "Health and medication",
            "Recording quality",
            "Professional judgement needed",
        ],
    },
    "incident_record": {
        "label": "Incident record",
        "contract_mode": "incident",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"incident\s+(report|record)|write.*incident|help\s+me.*incident|"
                r"restorative\s+repair|nude\s+image|blackmail\s+online|online\s+safety|"
                r"physical\s+intervention|restraint|"
                r"medication\s+error|wrong\s+dose|given\s+wrong\s+(?:dose|medicine|medication)|"
                r"whistleblow|falsifying\s+records|staff\s+conduct|protected\s+disclosure|"
                r"formal\s+complaint|behaviour\s+incident|property\s+damage|threw\s+an",
                re.I,
            ),
        ],
        "required_markers": ["safety", "staff", "outcome"],
        "required_sections": [
            "Immediate safety",
            "What happened; antecedents",
            "Child voice; staff response",
            "Outcome; repair/follow-up",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": [
            "Recording quality",
            "Safeguarding responsibilities",
            "Therapeutic language",
            "Relational support",
            "Professional curiosity",
        ],
    },
    "missing_return_record": {
        "label": "Missing-from-home / return record",
        "contract_mode": "safeguarding",
        "depth_tier": "mandatory",
        "expert_depth_cap": "safeguarding_critical",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"returned\s+(?:from|after)\s+missing|(?:come|came)\s+back\s+from\s+missing|"
                r"back\s+from\s+missing|missing\s+from\s+(?:care|the\s+home|home)|"
                r"young\s+person\s+is\s+missing|missing\s+right\s+now|gone\s+missing|"
                r"smells?\s+of\s+cannabis|smell\s+of\s+cannabis|"
                r"\bawol\b|late\s+return|whereabouts",
                re.I,
            ),
        ],
        "required_markers": ["welfare", "missing", "return", "record", "manager", "social worker"],
        "required_sections": MANDATORY_CONTRACTS["missing_return_substance_risk"]["mandatory_sections"],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]) + ["inappropriate_lado"],
        "public_considerations": [
            "Safeguarding responsibilities",
            "Recording quality",
            "Therapeutic language",
            "Relational support",
        ],
    },
    "allegation_lado": {
        "label": "Allegation against staff / LADO",
        "contract_mode": "safeguarding",
        "depth_tier": "mandatory",
        "expert_depth_cap": "safeguarding_critical",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": False,
        "trigger_patterns": [
            re.compile(
                r"allegat(?:ion|ed)|"
                r"(?:staff|member\s+of\s+staff).{0,40}(?:grabbed|hit|touched|threatened|hurt|abuse)|"
                r"(?:grabbed|hit|touched|threatened|hurt).{0,40}(?:staff|member\s+of\s+staff)|"
                r"said\s+staff\s+(?:grabbed|hit|touched|threatened|hurt)|"
                r"staff\s+member\s+(?:touched|hurt|abuse|grabbed|hit|threatened)",
                re.I,
            ),
        ],
        "required_markers": ["do not investigate", "lado", "manager", "record", "exact words"],
        "required_sections": MANDATORY_CONTRACTS["allegation_against_staff"]["mandatory_sections"]
        + [
            "Preserve the young person's exact words — do not paraphrase as fact",
            "Do not investigate or ask leading questions",
            "Manager/LADO/local policy route; separate accounts",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]) + list(RECORDING_FORBIDDEN_OPENERS),
        "public_considerations": ["Safeguarding responsibilities", "Professional accountability"],
    },
    "abuse_disclosure": {
        "label": "Sexual abuse / abuse disclosure",
        "contract_mode": "safeguarding",
        "depth_tier": "mandatory",
        "expert_depth_cap": "safeguarding_critical",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": False,
        "trigger_patterns": [
            re.compile(
                r"disclosed\s+(abuse|sexual)|sexual\s+abuse|told\s+me.*(hurt|abuse)",
                re.I,
            ),
        ],
        "required_markers": ["listen", "do not investigate", "manager", "record"],
        "required_sections": MANDATORY_CONTRACTS["historic_sexual_abuse_disclosure"]["mandatory_sections"],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Safeguarding responsibilities"],
    },
    "suicidal_self_harm": {
        "label": "Suicidal ideation / self-harm / placement distress",
        "contract_mode": "safeguarding",
        "depth_tier": "mandatory",
        "expert_depth_cap": "safeguarding_critical",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": False,
        "trigger_patterns": [
            re.compile(
                r"suicid|self[- ]?harm|hurt\s+(?:my|him|her|them)self|blade|overdose|"
                r"do(?:n'?t| not)\s+want\s+to\s+be\s+here|"
                r"don'?t\s+want\s+to\s+live|"
                r"no\s+point\s+being\s+here|"
                r"can'?t\s+do\s+this\s+anymore|"
                r"doesn'?t\s+want\s+to\s+wake\s+up|"
                r"want\s+to\s+die|"
                r"kill\s+(?:my|him|her|them)self",
                re.I,
            ),
        ],
        "required_markers": ["immediate safety", "do not leave alone", "manager", "record"],
        "required_sections": MANDATORY_CONTRACTS["suicide_self_harm"]["mandatory_sections"]
        + [
            "Immediate safety first — stay with the young person if concerned",
            "Manager/on-call notification; urgent help if immediate risk",
            "No generic 'what would be helpful?' opening",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]) + list(RECORDING_FORBIDDEN_OPENERS),
        "public_considerations": ["Safeguarding responsibilities"],
    },
    "parent_removal_conflict": {
        "label": "Parent demanding removal / contact conflict",
        "contract_mode": "safeguarding",
        "depth_tier": "mandatory",
        "expert_depth_cap": "safeguarding_critical",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": False,
        "trigger_patterns": [
            re.compile(
                r"parent.*(demand|take|remove|removal)|forced\s+removal|"
                r"angry\s+parent.*(take|remove)",
                re.I,
            ),
        ],
        "required_markers": ["legal", "manager", "welfare", "record"],
        "required_sections": MANDATORY_CONTRACTS["parent_forced_removal"]["mandatory_sections"],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Safeguarding responsibilities", "Professional accountability"],
    },
    "keywork_session": {
        "label": "Key-work session",
        "contract_mode": "guidance",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(r"key\s*[- ]?work|keywork\s+session|1:1\s+session", re.I),
        ],
        "required_markers": ["child voice", "session", "purpose", "views", "actions", "follow"],
        "required_sections": [
            "Purpose of session; child's views and voice",
            "Strengths, worries, emotional meaning",
            "Agreed actions; follow-up",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": [
            "Child-centred planning",
            "Therapeutic language",
            "Child's voice considered",
            "Professional curiosity",
        ],
    },
    "manager_oversight_note": {
        "label": "Manager oversight note",
        "contract_mode": "manager_review",
        "depth_tier": "enhanced",
        "expert_depth_cap": "residential_deep",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"manager\s+oversight|management\s+oversight|oversight\s+note|"
                r"manager\s+review\s+note|create_manager_oversight|reg\s*45|"
                r"placement\s+plan\s+review|risk\s+assessment\s+review|"
                r"leadership\s+record|leadership\s+and\s+management|"
                r"safer\s+recruitment|workforce\s+compliance",
                re.I,
            ),
        ],
        "required_markers": ["known", "missing", "decision", "follow"],
        "required_sections": [
            "What is known; what is missing",
            "Threshold/rationale; decisions made",
            "Plan updates; patterns; staff learning; evidence trail",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": [
            "Leadership and oversight",
            "Professional accountability",
            "Therapeutic language",
            "Relational support",
            "Professional curiosity",
        ],
    },
    "reg44_visitor": {
        "label": "Reg 44 / visitor support",
        "contract_mode": "reg45",
        "depth_tier": "enhanced",
        "expert_depth_cap": "residential_deep",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(r"reg\s*44|independent\s+visitor|regulation\s+44", re.I),
        ],
        "required_markers": [
            "reg 44",
            "child",
            "safeguarding",
            "evidence",
            "relationship",
            "consultation",
            "previous",
            "manager",
        ],
        "required_sections": [
            "Lived experience of children; relationships and warmth",
            "Safeguarding effectiveness — missing, restraints, incidents, complaints, medication where relevant",
            "Records matching practice; child voice and influence",
            "Consultation with children, staff, parents/carers, placing authorities and professionals",
            "Action from previous Regulation 44 visits; shortfalls/actions with owner and timescale",
            "Manager oversight and learning; evidence not assertion",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]) + ["outstanding grade", "inadequate grade"],
        "public_considerations": [
            "Inspection evidence preparation",
            "Leadership and oversight",
            "Therapeutic language",
            "Relational support",
            "Child's voice considered",
        ],
    },
    "ofsted_preparation": {
        "label": "Ofsted / Reg 45 preparation",
        "contract_mode": "ofsted_view",
        "depth_tier": "enhanced",
        "expert_depth_cap": "residential_deep",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(r"ofsted|reg\s*45|inspection\s+prep|inspection\s+readiness", re.I),
        ],
        "required_markers": ["ofsted", "evidence", "child", "safeguarding"],
        "required_sections": [
            "Evidence readiness; child experience; safeguarding",
            "Quality of care; leadership and management; workforce",
            "Shortfalls/actions; how leaders know impact",
            "No prediction of judgement grade",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4])
        + [
            "will be rated",
            "will predict",
            "predicted grade",
            "outstanding grade",
            "good grade",
            "requires improvement grade",
        ],
        "public_considerations": ["Inspection evidence preparation"],
    },
    "policy_practice_question": {
        "label": "Policy / general practice question",
        "contract_mode": "guidance",
        "depth_tier": "light",
        "expert_depth_cap": "residential_light",
        "prompt_tier_cap": "residential",
        "streamable": True,
        "orb_write_handoff": False,
        "trigger_patterns": [
            re.compile(
                r"what\s+(is|does)\s+(the\s+)?(policy|procedure|regulation)|"
                r"best\s+practice\s+for|how\s+should\s+we\s+handle|"
                r"staff\s+supervision|professional\s+curiosity|complaint\s+about\s+staff|"
                r"notify\s+ofsted|serious\s+event|sccif",
                re.I,
            ),
        ],
        "required_markers": [
            "practice",
            "local",
            "judgement",
            "supervision",
            "reflection",
            "complaint",
            "child voice",
            "notification",
            "ofsted",
            "sccif",
            "evidence",
            "professional curiosity",
            "safeguarding",
        ],
        "required_sections": [
            "Direct answer in residential context",
            "Standalone limitation if policy not provided",
            "What to check locally; professional judgement boundary",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Residential childcare practice", "Professional judgement needed"],
    },
    "template_generation": {
        "label": "Template generation",
        "contract_mode": "recording",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"\btemplate\b|give\s+me\s+a\s+(plan|form|document)|"
                r"create\s+a\s+(plan|template|form)|generate\s+a\s+template",
                re.I,
            ),
        ],
        "required_markers": ["section", "placeholder", "child"],
        "required_sections": [
            "Clear sections; child-centred prompts",
            "Editable placeholders; export-ready structure",
            "ORB Write handoff suitability",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Child-centred planning", "Recording quality"],
    },
    "orb_write_output": {
        "label": "ORB Write output",
        "contract_mode": "recording",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "streamable": False,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(r"document[- ]ready|orb\s+write|format\s+this\s+as\s+a\s+document", re.I),
        ],
        "required_markers": ["heading", "factual"],
        "required_sections": [
            "Document-ready formatting; therapeutic language",
            "Clean headings; print/export suitability",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Recording quality", "Therapeutic language"],
    },
    "dictate_finalisation": {
        "label": "Dictate transcript finalisation",
        "contract_mode": "rewrite",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "streamable": False,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(r"dictate|transcript\s+final|finalise\s+this\s+transcript", re.I),
        ],
        "required_markers": ["transcript", "factual"],
        "required_sections": [
            "No invented facts; transcript gaps highlighted",
            "Template-specific structure; safeguarding escalation if triggered",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Recording quality"],
    },
    "voice_response": {
        "label": "Voice response",
        "contract_mode": "guidance",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(r"voice\s+answer|spoken\s+answer|quick\s+voice", re.I),
        ],
        "required_markers": [],
        "required_sections": [
            "Short conversational response; same brain contract as text",
            "Offer to turn into record/template/action",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Residential childcare practice"],
    },
    "document_review": {
        "label": "Document review / comparison",
        "contract_mode": "manager_review",
        "depth_tier": "enhanced",
        "expert_depth_cap": "residential_deep",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": False,
        "trigger_patterns": [
            re.compile(r"review\s+this|compare\s+these|document\s+review|gap\s+analysis", re.I),
        ],
        "required_markers": ["strength", "gap", "improve"],
        "required_sections": [
            "What document says; strengths; gaps; risks",
            "Child voice; suggested improvements",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Leadership and oversight", "Recording quality"],
    },
    "what_am_i_missing": {
        "label": "What am I missing?",
        "contract_mode": "manager_review",
        "depth_tier": "enhanced",
        "expert_depth_cap": "residential_deep",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": False,
        "trigger_patterns": [
            re.compile(r"what\s+am\s+i\s+missing|what'?s\s+missing|gaps?\s+in\s+this", re.I),
        ],
        "required_markers": ["missing", "voice", "next"],
        "required_sections": [
            "Facts missing; child voice missing",
            "Risk/recording/plan gaps; professional curiosity questions",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Professional accountability", "Recording quality"],
    },
    "make_more_concise": {
        "label": "Make this more concise",
        "contract_mode": "rewrite",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "streamable": True,
        "orb_write_handoff": False,
        "trigger_patterns": [
            re.compile(r"more\s+concise|shorter|trim\s+this|condense", re.I),
        ],
        "required_markers": [],
        "required_sections": [
            "Preserve meaning and safety",
            "Keep required safeguarding/recording details",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Recording quality"],
    },
    "convert_to_recording_wording": {
        "label": "Convert to recording wording",
        "contract_mode": "recording",
        "depth_tier": "standard",
        "expert_depth_cap": "residential_standard",
        "prompt_tier_cap": "residential",
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(r"convert\s+to\s+recording|recording\s+wording|turn\s+into\s+a\s+record", re.I),
        ],
        "required_markers": ["factual", "observation"],
        "required_sections": [
            "Neutral record style; observation vs interpretation",
            "No blame/shame; no invented facts",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]) + list(GENERIC_WEAK_PHRASES[:6]),
        "public_considerations": [
            "Recording quality",
            "Child-centred recording",
            "Therapeutic language",
            "Trauma-informed practice",
        ],
    },
}

# Detection priority — higher-risk / more specific families first.
_FAMILY_DETECTION_ORDER: tuple[str, ...] = (
    "suicidal_self_harm",
    "abuse_disclosure",
    "allegation_lado",
    "parent_removal_conflict",
    "what_am_i_missing",
    "make_more_concise",
    "convert_to_recording_wording",
    "dictate_finalisation",
    "orb_write_output",
    "voice_response",
    "missing_return_record",
    "child_voice_evidence_recording",
    "accessible_child_support_plan",
    "incident_record",
    "medication_refusal_guidance",
    "contact_distress_recording",
    "school_refusal_recording",
    "daily_record",
    "keywork_session",
    "manager_oversight_note",
    "reg44_visitor",
    "ofsted_preparation",
    "document_review",
    "policy_practice_question",
    "template_generation",
)

GOLDEN_PROMPT_QA_PACK: list[dict[str, str]] = [
    {
        "prompt_id": "accessible_child_support_plan",
        "contract": "accessible_child_support_plan",
        "prompt": (
            "Give me a template for a child-friendly support plan for a 17-year-old with GDD. "
            "They mainly use widgets to be able to communicate. I want this to give them a plan "
            "they can follow, with dreams and aspirations."
        ),
    },
    {
        "prompt_id": "daily_record",
        "contract": "daily_record",
        "prompt": "Help me write a daily record for today — she was calm at breakfast and chose toast.",
    },
    {
        "prompt_id": "incident_record",
        "contract": "incident_record",
        "prompt": "Help me write an incident report — Jamie kicked off after family contact.",
    },
    {
        "prompt_id": "missing_return_record",
        "contract": "missing_return_record",
        "prompt": "She returned from missing and smells of cannabis. What should I record?",
    },
    {
        "prompt_id": "allegation_lado",
        "contract": "allegation_lado",
        "prompt": "A child says a staff member touched them inappropriately last night.",
    },
    {
        "prompt_id": "abuse_disclosure",
        "contract": "abuse_disclosure",
        "prompt": "A young person disclosed historic sexual abuse to me tonight.",
    },
    {
        "prompt_id": "suicidal_self_harm",
        "contract": "suicidal_self_harm",
        "prompt": "He says he is going to hurt himself tonight and has a blade.",
    },
    {
        "prompt_id": "parent_removal_conflict",
        "contract": "parent_removal_conflict",
        "prompt": "An angry parent is demanding to take their child from the home right now.",
    },
    {
        "prompt_id": "keywork_session",
        "contract": "keywork_session",
        "prompt": "Help me structure a keywork session note about college worries.",
    },
    {
        "prompt_id": "manager_oversight_note",
        "contract": "manager_oversight_note",
        "prompt": "Draft a manager oversight note on repeated missing episodes this month.",
    },
    {
        "prompt_id": "reg44_visitor",
        "contract": "reg44_visitor",
        "prompt": "What should a Reg 44 visitor focus on in their next visit?",
    },
    {
        "prompt_id": "ofsted_preparation",
        "contract": "ofsted_preparation",
        "prompt": "Help me prepare evidence for an upcoming Ofsted inspection.",
    },
    {
        "prompt_id": "policy_practice_question",
        "contract": "policy_practice_question",
        "prompt": "What is best practice for managing phone contact in a children's home?",
    },
    {
        "prompt_id": "template_generation",
        "contract": "template_generation",
        "prompt": "Give me a template for a handover note at end of shift.",
    },
    {
        "prompt_id": "orb_write_output",
        "contract": "orb_write_output",
        "prompt": "Format this as a document-ready record with headings for ORB Write.",
    },
    {
        "prompt_id": "dictate_finalisation",
        "contract": "dictate_finalisation",
        "prompt": "Finalise this dictate transcript into a professional daily record.",
    },
    {
        "prompt_id": "voice_response",
        "contract": "voice_response",
        "prompt": "Quick voice answer — what should I capture after a calm chat?",
    },
    {
        "prompt_id": "document_review",
        "contract": "document_review",
        "prompt": "Review this placement plan and tell me gaps and risks.",
    },
    {
        "prompt_id": "what_am_i_missing",
        "contract": "what_am_i_missing",
        "prompt": "What am I missing from this incident note?",
    },
    {
        "prompt_id": "convert_to_recording_wording",
        "contract": "convert_to_recording_wording",
        "prompt": "Convert this chat into neutral recording wording for the daily log.",
    },
]


def get_family_prompt_char_cap(family_id: str | None) -> int:
    """Per-family prompt assembly cap for shift-speed QA."""
    family = get_contract_family(family_id) or {}
    cap = family.get("prompt_char_cap")
    if isinstance(cap, int) and cap > 0:
        return cap
    if family_id in {
        "contact_distress_recording",
        "medication_refusal_guidance",
        "child_voice_evidence_recording",
    }:
        return CONTACT_DISTRESS_PROMPT_CHAR_CAP
    if family.get("depth_tier") == "standard" and family.get("contract_mode") in {
        "recording",
        "guidance",
    }:
        return EVERYDAY_SHIFT_PROMPT_CHAR_CAP
    return STANDARD_DEPTH_PROMPT_CHAR_CAP


def _family_match_excluded(family_id: str, text: str) -> bool:
    if family_id == "medication_refusal_guidance" and MEDICATION_CRITICAL_RISK_RE.search(text):
        return True
    if family_id == "accessible_child_support_plan" and PLAN_UPDATE_RECORDING_RE.search(text):
        return True
    if family_id == "accessible_child_support_plan" and re.search(
        r"how\s+(?:can|should|do)\s+(?:staff|we|i)\s+(?:evidence|record)",
        text,
        re.I,
    ):
        return True
    return False


def detect_contract_family(
    message: str,
    *,
    scenario_types: list[str] | None = None,
    requested_action: str | None = None,
    note_type: str | None = None,
    source_surface: str | None = None,
    feature: str | None = None,
) -> str | None:
    """Return the best-matching contract family id, or None."""
    if scenario_types:
        for scenario in scenario_types:
            mapped = SCENARIO_TO_FAMILY.get(scenario)
            if mapped:
                return mapped

    action = (requested_action or "").strip().lower()
    if action == "what_am_i_missing":
        return "what_am_i_missing"
    if action == "convert_to_recording_wording":
        return "convert_to_recording_wording"
    if action == "create_manager_oversight_note":
        return "manager_oversight_note"

    note = (note_type or "").strip().lower()
    if note == "daily_record":
        return "daily_record"
    if note == "incident_record":
        return "incident_record"
    if note == "keywork_session":
        return "keywork_session"

    surface = (source_surface or feature or "").strip().lower()
    if surface == "voice":
        return "voice_response"
    if surface in {"write", "orb_write"}:
        return "orb_write_output"
    if surface in {"dictate", "dictate_analyze", "dictate_edit"}:
        return "dictate_finalisation"
    if surface == "template":
        return "template_generation"

    text = (message or "").strip()
    for family_id in _FAMILY_DETECTION_ORDER:
        family = ORB_ANSWER_CONTRACT_FAMILIES.get(family_id) or {}
        patterns: list[Pattern[str]] = list(family.get("trigger_patterns") or [])
        if any(pattern.search(text) for pattern in patterns):
            if _family_match_excluded(family_id, text):
                continue
            return family_id
    if STAFF_RECORDING_QUESTION_RE.search(text):
        return "daily_record"
    return None


def get_contract_family(family_id: str | None) -> dict[str, Any] | None:
    if not family_id:
        return None
    return ORB_ANSWER_CONTRACT_FAMILIES.get(family_id)


def build_contract_prompt_block(family_id: str | None) -> str:
    family = get_contract_family(family_id)
    if not family:
        return ""
    lines = [
        f"ORB answer contract: {family.get('label', family_id)}",
        f"Depth tier: {family.get('depth_tier', 'standard')}",
        "Required answer shape:",
        *[f"- {section}" for section in (family.get("required_sections") or [])[:14]],
    ]
    if family.get("contract_mode") == "recording" or family_id in {
        "school_refusal_recording",
        "contact_distress_recording",
        "medication_refusal_guidance",
        "child_voice_evidence_recording",
        "daily_record",
    }:
        lines.extend(
            [
                "",
                "Shift recording answer order (mandatory):",
                "1. Give direct recording structure / practical guidance first.",
                "2. Then example safer wording (observation vs interpretation).",
                "3. Then follow-up questions if information is missing.",
                "4. Then local policy / professional judgement boundary.",
                "Do NOT open with generic clarifying questions ('tell me more', 'what would be helpful?').",
                "",
                "Children's home recording language: use manager, on-call manager, safeguarding lead, "
                "Registered Manager and local safeguarding procedure — not default DSL unless the user supplied it.",
            ]
        )
    if family_id == "suicidal_self_harm":
        lines.extend(
            [
                "",
                "Safeguarding answer order (mandatory):",
                "1. Immediate safety and stay-with-young-person if concerned.",
                "2. Manager/on-call; urgent help if immediate risk.",
                "3. Recording boundaries; do not leave alone if high risk.",
                "Do NOT open with generic 'what would be helpful?' or clarifying questions.",
            ]
        )
    if family_id == "allegation_lado":
        lines.extend(
            [
                "",
                "Allegation answer order (mandatory):",
                "1. Preserve exact words; listen calmly; do not investigate.",
                "2. Immediate safety; separate accounts; no leading questions.",
                "3. Manager/LADO/local policy route and recording boundaries.",
            ]
        )
    if family_id == "accessible_child_support_plan":
        lines.extend(
            [
                "",
                "Output structure (child-facing first):",
                "- Title: My Support Plan",
                "- Opening: This plan helps adults understand me, listen to me and support my future.",
                "- Sections: About me; My dreams and future; My widgets and how I communicate;",
                "  How I tell people yes/no/stop/help/pain/worried/happy; What helps me;",
                "  What makes things hard; Daily support; Independence goals; People who help me;",
                "  How adults should support me; Things adults should not do; Reviewing my plan;",
                "  Adult guidance for using this plan.",
                "- Use clean [Add ...] placeholders only — never truncate with ellipsis inside brackets.",
                "- Do not begin with generic AI introductions.",
            ]
        )
    forbidden = family.get("forbidden_patterns") or []
    if forbidden:
        lines.append("Forbidden in final answer:")
        lines.extend(f"- Avoid: {item}" for item in forbidden[:8])
    return "\n".join(lines)


def find_forbidden_patterns(answer: str, *, family_id: str | None = None) -> list[str]:
    lowered = (answer or "").lower()
    hits: list[str] = []
    patterns = list(UNIVERSAL_FORBIDDEN_PATTERNS)
    family = get_contract_family(family_id)
    if family:
        patterns.extend(family.get("forbidden_patterns") or [])
    seen: set[str] = set()
    for pattern in patterns:
        key = pattern.lower().strip()
        if key in seen:
            continue
        if key in lowered:
            seen.add(key)
            hits.append(pattern)
    if BROKEN_PLACEHOLDER_RE.search(answer or ""):
        hits.append("broken_truncated_placeholder")
    if INTERNAL_METADATA_RE.search(answer or ""):
        hits.append("internal_metadata_leak")
    return hits


def find_missing_markers(answer: str, *, family_id: str | None) -> list[str]:
    family = get_contract_family(family_id)
    if not family:
        return []
    lowered = (answer or "").lower()
    missing: list[str] = []
    for marker in family.get("required_markers") or []:
        if marker.lower() not in lowered:
            missing.append(marker)
    return missing


def sanitize_final_answer(
    answer: str,
    *,
    family_id: str | None = None,
    fast_opening: str | None = None,
    apply_therapeutic_repairs: bool = True,
) -> str:
    """Strip streaming artifacts, broken placeholders, and universal forbidden leakage."""
    cleaned = strip_streaming_artifacts_from_answer(answer, fast_opening=fast_opening)
    cleaned, _ = sanitize_placeholders_in_answer(cleaned)
    cleaned = INTERNAL_METADATA_RE.sub("", cleaned)
    if apply_therapeutic_repairs:
        cleaned, _ = apply_deterministic_therapeutic_repairs(cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned


def validate_contract_answer(
    answer: str,
    *,
    family_id: str | None,
    fast_opening: str | None = None,
) -> dict[str, Any]:
    from services.orb_final_answer_contract_validator_service import validate_final_answer_contract

    validation = validate_final_answer_contract(
        answer,
        contract_family=family_id,
        fast_opening=fast_opening,
    )
    family = get_contract_family(family_id) or {}
    missing = validation.get("missing_required_markers") or []
    forbidden = validation.get("forbidden_patterns") or []
    return {
        "family_id": family_id,
        "contract_label": family.get("label"),
        "depth_tier": family.get("depth_tier"),
        "sanitized_answer": validation.get("sanitized_answer") or "",
        "forbidden_patterns": forbidden,
        "missing_markers": missing,
        "placeholder_issues": validation.get("placeholder_issues") or [],
        "passed": validation.get("passed", False),
        "needs_review": bool(missing) and family_id not in {
            "voice_response",
            "make_more_concise",
            "orb_write_output",
            "dictate_finalisation",
        },
    }


def evaluate_routing_contract(
    message: str,
    *,
    mode: str = "Ask ORB",
    scenario_types: list[str] | None = None,
    requested_action: str | None = None,
    note_type: str | None = None,
    source_surface: str | None = None,
    feature: str | None = None,
) -> dict[str, Any]:
    """Routing-only QA — contract family, depth tier, and public considerations."""
    family_id = detect_contract_family(
        message,
        scenario_types=scenario_types,
        requested_action=requested_action,
        note_type=note_type,
        source_surface=source_surface,
        feature=feature,
    )
    family = get_contract_family(family_id) or {}
    return {
        "contract_family": family_id,
        "contract_label": family.get("label"),
        "depth_tier": family.get("depth_tier", "standard"),
        "contract_mode": family.get("contract_mode"),
        "expert_depth_cap": family.get("expert_depth_cap"),
        "prompt_tier_cap": family.get("prompt_tier_cap"),
        "public_considerations": list(family.get("public_considerations") or []),
        "streamable": family.get("streamable", True),
        "orb_write_handoff": family.get("orb_write_handoff", False),
    }


def run_golden_prompt_routing_qa() -> dict[str, Any]:
    """Founder/admin QA pack — routing contract activation without live LLM calls."""
    report = run_golden_prompt_full_qa(include_answer_quality=False)
    return {
        "total": report["total"],
        "passed": report["routing_passed"],
        "failed": report["routing_failed"],
        "needs_review": report["needs_review"],
        "failures": [
            f
            for f in report["failures"]
            if not f.get("contract_selection_passed", True)
        ],
        "results": [
            {
                "prompt_id": r["prompt_id"],
                "contract": r.get("contract_family"),
                "expected_contract": r.get("expected_contract"),
                "depth_tier": r.get("depth_tier"),
                "passed": r.get("contract_selection_passed"),
            }
            for r in report["results"]
        ],
    }


def run_golden_prompt_full_qa(
    *,
    include_answer_quality: bool = True,
    qa_mode: str = "default",
) -> dict[str, Any]:
    """Golden prompt QA — routing selection plus optional final-answer quality checks.

    qa_mode:
      - ``routing_only``: routing checks only; skipped answer quality is not evaluated.
      - ``default``: honest reporting — skipped canonical samples are not counted as passed.
      - ``full_answer_quality``: strict — missing canonical samples count as failures.
    """
    from services.orb_final_answer_repair_service import canonical_answer_for_qa

    if qa_mode == "routing_only":
        include_answer_quality = False
    strict_answer_quality = qa_mode == "full_answer_quality"

    results: list[dict[str, Any]] = []
    routing_passed = 0
    routing_failed = 0
    answer_passed = 0
    answer_failed = 0
    answer_skipped = 0
    fully_passed = 0
    partially_passed = 0
    needs_review = 0
    failures: list[dict[str, Any]] = []

    for item in GOLDEN_PROMPT_QA_PACK:
        routing = evaluate_routing_contract(
            item["prompt"],
            requested_action=item.get("requested_action"),
            note_type=item.get("note_type"),
            source_surface=item.get("source_surface"),
            feature=item.get("feature"),
        )
        expected = item["contract"]
        contract_ok = routing.get("contract_family") == expected
        entry: dict[str, Any] = {
            "prompt_id": item["prompt_id"],
            "contract_family": routing.get("contract_family"),
            "expected_contract": expected,
            "depth_tier": routing.get("depth_tier"),
            "contract_selection_passed": contract_ok,
        }

        if contract_ok:
            routing_passed += 1
        else:
            routing_failed += 1

        answer_quality_state: str | bool | None = None

        if include_answer_quality and contract_ok:
            canonical = canonical_answer_for_qa(expected, message=item["prompt"])
            if canonical:
                validation = validate_contract_answer(canonical, family_id=expected)
                answer_quality_state = validation["passed"]
                entry["final_answer_quality_passed"] = validation["passed"]
                entry["missing_markers"] = validation.get("missing_markers") or []
                entry["forbidden_patterns"] = validation.get("forbidden_patterns") or []
                entry["placeholder_issues"] = validation.get("placeholder_issues") or []
                entry["notes"] = [] if validation["passed"] else ["canonical answer failed validation"]
                if validation["passed"]:
                    answer_passed += 1
                else:
                    answer_failed += 1
            else:
                answer_quality_state = "skipped"
                entry["final_answer_quality_passed"] = "skipped"
                entry["missing_markers"] = []
                entry["forbidden_patterns"] = []
                entry["placeholder_issues"] = []
                entry["notes"] = ["answer quality skipped — no canonical sample for family"]
                answer_skipped += 1
                if strict_answer_quality:
                    answer_failed += 1
                    entry["notes"].append("strict mode: missing canonical sample counts as failure")

        entry_fully_passed = contract_ok and answer_quality_state is True
        entry_partially_passed = contract_ok and answer_quality_state == "skipped"

        if entry_fully_passed:
            fully_passed += 1
        elif entry_partially_passed:
            partially_passed += 1

        entry["fully_passed"] = entry_fully_passed
        entry["partially_passed"] = entry_partially_passed

        if not include_answer_quality:
            entry["passed"] = contract_ok
        elif entry_fully_passed:
            entry["passed"] = True
        elif entry_partially_passed:
            entry["passed"] = False
        else:
            entry["passed"] = contract_ok and answer_quality_state is not False

        results.append(entry)

        if not entry["passed"]:
            failures.append(
                {
                    "prompt_id": item["prompt_id"],
                    "contract": routing.get("contract_family"),
                    "contract_selection_passed": contract_ok,
                    "final_answer_quality_passed": entry.get("final_answer_quality_passed"),
                    "fully_passed": entry_fully_passed,
                    "partially_passed": entry_partially_passed,
                    "missing_markers": entry.get("missing_markers") or [],
                    "forbidden_patterns": entry.get("forbidden_patterns") or [],
                    "placeholder_issues": entry.get("placeholder_issues") or [],
                    "depth_tier": routing.get("depth_tier"),
                    "notes": entry.get("notes") or [],
                }
            )

        if routing.get("depth_tier") == "mandatory" and expected not in {
            "missing_return_record",
            "allegation_lado",
            "abuse_disclosure",
            "suicidal_self_harm",
            "parent_removal_conflict",
        }:
            needs_review += 1

    if not include_answer_quality:
        combined_passed = routing_passed
        combined_failed = routing_failed
    elif strict_answer_quality:
        combined_passed = fully_passed
        combined_failed = routing_failed + answer_failed
    else:
        combined_passed = fully_passed
        combined_failed = routing_failed + answer_failed

    report: dict[str, Any] = {
        "total": len(GOLDEN_PROMPT_QA_PACK),
        "passed": combined_passed,
        "failed": combined_failed,
        "routing_passed": routing_passed,
        "routing_failed": routing_failed,
        "needs_review": needs_review,
        "failures": failures,
        "results": results,
        "qa_mode": qa_mode,
    }
    if include_answer_quality:
        report.update(
            {
                "answer_quality_passed": answer_passed,
                "answer_quality_failed": answer_failed,
                "answer_quality_skipped": answer_skipped,
                "fully_passed": fully_passed,
                "partially_passed": partially_passed,
            }
        )
    return report


orb_universal_answer_contract_map_service = type(
    "OrbUniversalAnswerContractMapService",
    (),
    {
        "VERSION": "orb-universal-answer-contract-map-v1",
        "FAMILIES": ORB_ANSWER_CONTRACT_FAMILIES,
        "GOLDEN_PROMPT_QA_PACK": GOLDEN_PROMPT_QA_PACK,
        "UNIVERSAL_FORBIDDEN_PATTERNS": UNIVERSAL_FORBIDDEN_PATTERNS,
        "detect_contract_family": staticmethod(detect_contract_family),
        "get_contract_family": staticmethod(get_contract_family),
        "build_contract_prompt_block": staticmethod(build_contract_prompt_block),
        "find_forbidden_patterns": staticmethod(find_forbidden_patterns),
        "find_missing_markers": staticmethod(find_missing_markers),
        "sanitize_final_answer": staticmethod(sanitize_final_answer),
        "validate_contract_answer": staticmethod(validate_contract_answer),
        "evaluate_routing_contract": staticmethod(evaluate_routing_contract),
        "run_golden_prompt_routing_qa": staticmethod(run_golden_prompt_routing_qa),
        "run_golden_prompt_full_qa": staticmethod(run_golden_prompt_full_qa),
        "STANDARD_DEPTH_PROMPT_CHAR_CAP": STANDARD_DEPTH_PROMPT_CHAR_CAP,
    },
)()
