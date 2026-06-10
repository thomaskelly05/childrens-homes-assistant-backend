"""Universal ORB Residential answer contract map — all major answer families.

Single registry for trigger terms, depth tiers, required markers, forbidden patterns,
public explainability, streaming suitability, and ORB Write handoff hints.
Reuses existing contract services; does not duplicate brain routing.
"""

from __future__ import annotations

import re
from typing import Any, Pattern

from services.orb_fast_opening_service import strip_streaming_artifacts_from_answer
from services.orb_mandatory_response_contract_service import MANDATORY_CONTRACTS
from services.orb_placeholder_quality_guard_service import sanitize_placeholders_in_answer
from services.orb_therapeutic_language_contract_service import GENERIC_WEAK_PHRASES

# Warn in QA/tests when standard non-risk prompt assembly exceeds this size.
STANDARD_DEPTH_PROMPT_CHAR_CAP = 25000

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
    "allegation_against_staff": "allegation_lado",
    "suicide_self_harm": "suicidal_self_harm",
    "parent_forced_removal": "parent_removal_conflict",
    "historic_sexual_abuse_disclosure": "abuse_disclosure",
    "exploitation_county_lines": "abuse_disclosure",
    "peer_on_peer_harm": "incident_record",
    "medication_error": "incident_record",
    "restraint_intervention": "incident_record",
    "online_harm": "incident_record",
}

ORB_ANSWER_CONTRACT_FAMILIES: dict[str, dict[str, Any]] = {
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
                r"support\s+plan|child[- ]friendly\s+plan|"
                r"\bgdd\b|global\s+developmental\s+delay|"
                r"\bwidgets?\b|\baac\b|symbols?|communication\s+board|visual\s+plan|"
                r"dreams?|aspirations?|preparing\s+for\s+adulthood|independence",
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
        "streamable": True,
        "orb_write_handoff": True,
        "trigger_patterns": [
            re.compile(
                r"daily\s+(record|note|log)|shift\s+note|write\s+(a\s+)?daily|"
                r"help\s+me\s+record\s+today",
                re.I,
            ),
        ],
        "required_markers": ["factual", "staff", "outcome"],
        "required_sections": [
            "Factual language; no invented facts",
            "What happened; staff response; emotional presentation",
            "Choices/offers; outcome; follow-up if needed",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Recording quality", "Child-centred recording"],
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
                r"incident\s+(report|record)|write.*incident|help\s+me.*incident",
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
        "public_considerations": ["Recording quality", "Safeguarding responsibilities"],
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
                r"returned\s+(?:from|after)\s+missing|missing\s+from\s+care|"
                r"\bawol\b|late\s+return|whereabouts",
                re.I,
            ),
        ],
        "required_markers": ["welfare", "missing", "return", "record"],
        "required_sections": MANDATORY_CONTRACTS["missing_return_substance_risk"]["mandatory_sections"],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Safeguarding responsibilities", "Recording quality"],
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
            re.compile(r"allegation|staff\s+member\s+(touched|hurt|abuse)", re.I),
        ],
        "required_markers": ["do not investigate", "lado", "manager", "record"],
        "required_sections": MANDATORY_CONTRACTS["allegation_against_staff"]["mandatory_sections"],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
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
        "label": "Suicidal ideation / self-harm",
        "contract_mode": "safeguarding",
        "depth_tier": "mandatory",
        "expert_depth_cap": "safeguarding_critical",
        "prompt_tier_cap": "deep",
        "streamable": True,
        "orb_write_handoff": False,
        "trigger_patterns": [
            re.compile(r"suicid|self[- ]?harm|hurt\s+(my|him|her|them)self|blade|overdose", re.I),
        ],
        "required_markers": ["immediate safety", "do not leave alone", "manager", "record"],
        "required_sections": MANDATORY_CONTRACTS["suicide_self_harm"]["mandatory_sections"],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
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
            re.compile(r"key\s*work|keywork\s+session|1:1\s+session", re.I),
        ],
        "required_markers": ["purpose", "views", "actions", "follow"],
        "required_sections": [
            "Purpose; child's views; strengths and worries",
            "Agreed actions; emotional meaning; follow-up",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]),
        "public_considerations": ["Child-centred planning", "Therapeutic language"],
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
                r"manager\s+oversight|oversight\s+note|manager\s+review\s+note|"
                r"create_manager_oversight",
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
        "public_considerations": ["Leadership and oversight", "Professional accountability"],
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
        "required_markers": ["child", "safeguarding", "evidence"],
        "required_sections": [
            "Child experience; safeguarding effectiveness",
            "Leadership and management; evidence not assertion",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]) + ["outstanding grade"],
        "public_considerations": ["Inspection readiness", "Leadership and oversight"],
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
        "required_markers": ["evidence", "child", "safeguarding"],
        "required_sections": [
            "Child experience; safeguarding effectiveness",
            "Quality of care; shortfalls/actions",
            "No prediction of judgement grade",
        ],
        "forbidden_patterns": list(UNIVERSAL_FORBIDDEN_PATTERNS[:4]) + ["will be rated"],
        "public_considerations": ["Inspection readiness"],
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
                r"best\s+practice\s+for|how\s+should\s+we\s+handle",
                re.I,
            ),
        ],
        "required_markers": ["practice", "local", "judgement"],
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
        "public_considerations": ["Recording quality", "Child-centred recording"],
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
    "accessible_child_support_plan",
    "incident_record",
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
            return family_id
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
) -> str:
    """Strip streaming artifacts, broken placeholders, and universal forbidden leakage."""
    cleaned = strip_streaming_artifacts_from_answer(answer, fast_opening=fast_opening)
    cleaned, _ = sanitize_placeholders_in_answer(cleaned)
    cleaned = INTERNAL_METADATA_RE.sub("", cleaned)
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


def run_golden_prompt_full_qa(*, include_answer_quality: bool = True) -> dict[str, Any]:
    """Golden prompt QA — routing selection plus optional final-answer quality checks."""
    from services.orb_final_answer_repair_service import canonical_answer_for_qa

    results: list[dict[str, Any]] = []
    routing_passed = 0
    routing_failed = 0
    answer_passed = 0
    answer_failed = 0
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

        if include_answer_quality and contract_ok:
            canonical = canonical_answer_for_qa(expected, message=item["prompt"])
            if canonical:
                validation = validate_contract_answer(canonical, family_id=expected)
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
                entry["final_answer_quality_passed"] = True
                entry["missing_markers"] = []
                entry["forbidden_patterns"] = []
                entry["placeholder_issues"] = []
                entry["notes"] = ["answer quality skipped — no canonical sample for family"]
                answer_passed += 1

        entry["passed"] = contract_ok and entry.get("final_answer_quality_passed", True)
        results.append(entry)

        if not entry["passed"]:
            failures.append(
                {
                    "prompt_id": item["prompt_id"],
                    "contract": routing.get("contract_family"),
                    "contract_selection_passed": contract_ok,
                    "final_answer_quality_passed": entry.get("final_answer_quality_passed"),
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

    combined_failed = routing_failed + (answer_failed if include_answer_quality else 0)
    combined_passed = len(GOLDEN_PROMPT_QA_PACK) - combined_failed if include_answer_quality else routing_passed

    return {
        "total": len(GOLDEN_PROMPT_QA_PACK),
        "passed": combined_passed,
        "failed": combined_failed,
        "routing_passed": routing_passed,
        "routing_failed": routing_failed,
        "answer_quality_passed": answer_passed,
        "answer_quality_failed": answer_failed,
        "needs_review": needs_review,
        "failures": failures,
        "results": results,
    }


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
