"""ORB Live High-Risk Required Safeguard Scaffold V6 — category-specific mandatory markers."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from services.orb_internal_brain_fallbacks import build_structured_fallback_answer
from services.orb_safety_scaffold_service import OrbSafetyScaffold

HIGH_RISK_SCAFFOLD_VERSION = "v6"

HIGH_RISK_SAFEGUARD_CATEGORIES = frozenset(
    {
        "missing-from-home",
        "self-harm",
        "suicidal-ideation",
        "child-sexual-exploitation",
        "criminal-exploitation",
        "online-harm",
        "radicalisation",
        "allegation-against-staff",
        "whistleblowing",
        "emergency-escalation",
        "behaviour-incident",
        "restraint-physical-intervention",
    }
)

CRITICAL_DETERMINISTIC_FALLBACK_CATEGORIES = frozenset(
    {
        "missing-from-home",
        "self-harm",
        "suicidal-ideation",
        "emergency-escalation",
        "allegation-against-staff",
    }
)

_ALIASES: dict[str, str] = {
    "cse": "child-sexual-exploitation",
    "child_sexual_exploitation": "child-sexual-exploitation",
    "suicidal_ideation": "suicidal-ideation",
    "missing_from_home": "missing-from-home",
    "online_harm": "online-harm",
    "criminal_exploitation": "criminal-exploitation",
    "allegation_against_staff": "allegation-against-staff",
    "emergency_escalation": "emergency-escalation",
    "behaviour_incident": "behaviour-incident",
    "restraint_physical_intervention": "restraint-physical-intervention",
    "physical-intervention": "restraint-physical-intervention",
    "restraint": "restraint-physical-intervention",
    "medication-concern": "whistleblowing",
}


@dataclass(frozen=True)
class RequiredMarker:
    marker_id: str
    label: str
    phrases: tuple[str, ...]


@dataclass
class HighRiskCategoryConfig:
    category: str
    required_markers: tuple[RequiredMarker, ...]
    recommended_markers: tuple[str, ...]
    prohibited_patterns: tuple[re.Pattern[str], ...]
    repair_instruction: str
    deterministic_fallback_if_critical: bool


@dataclass
class HighRiskMarkerCheckResult:
    passed: bool = True
    missing_markers: list[str] = field(default_factory=list)
    missing_labels: list[str] = field(default_factory=list)
    present_markers: list[str] = field(default_factory=list)
    required_markers_checked: list[str] = field(default_factory=list)
    prohibited_violations: list[str] = field(default_factory=list)


def _m(marker_id: str, label: str, *phrases: str) -> RequiredMarker:
    return RequiredMarker(marker_id=marker_id, label=label, phrases=phrases)


_CATEGORY_CONFIGS: dict[str, HighRiskCategoryConfig] = {
    "missing-from-home": HighRiskCategoryConfig(
        category="missing-from-home",
        required_markers=(
            _m("missing-protocol", "follow missing-from-care / missing protocol immediately", "missing protocol", "missing-from-care", "missing from care"),
            _m("notify-manager", "notify manager/on-call without delay", "manager", "on-call", "dsl"),
            _m("police-referral-threshold", "police referral where threshold is met", "police", "threshold"),
            _m("exploitation-indicators", "consider exploitation indicators / unknown adult / vehicle / locations", "exploitation", "unknown adult", "vehicle", "location"),
            _m("chronology", "keep contemporaneous chronology", "chronology", "contemporaneous"),
            _m("return-conversation", "return conversation / return home conversation once safe", "return", "return home", "return interview"),
            _m("child-words-return", "child's words after return where known", "child's words", "young person's words", "their words"),
        ),
        recommended_markers=("welfare check", "search known areas", "multi-agency"),
        prohibited_patterns=(),
        repair_instruction="Include missing-from-care protocol, manager/on-call notification, police threshold, chronology and return conversation.",
        deterministic_fallback_if_critical=True,
    ),
    "self-harm": HighRiskCategoryConfig(
        category="self-harm",
        required_markers=(
            _m("immediate-safety-assessment", "immediate safety assessment", "safety assessment", "immediate risk", "risk assessment"),
            _m("injury-check", "fresh marks / injury check", "injury", "fresh mark", "forearm", "wound"),
            _m("health-support", "health support / medical advice where needed", "health support", "medical advice", "medical", "first aid", "health professional"),
            _m("cannot-keep-secret", "safeguarding concerns cannot be kept secret", "cannot be kept secret", "cannot keep secret", "must not be kept secret"),
            _m("no-promise-secrecy", "do not promise secrecy", "do not promise", "cannot promise secrecy", "must not promise"),
            _m("inform-manager-dsl", "inform DSL/manager/on-call promptly", "manager", "dsl", "on-call", "safeguarding lead"),
            _m("record-words-injuries", "record child's words and observed injuries factually", "record", "words", "injuries", "factual"),
            _m("self-harm-policy", "follow local self-harm/safeguarding policy", "local policy", "self-harm policy", "safeguarding policy"),
        ),
        recommended_markers=("remove means", "supervision", "call 999 if immediate risk"),
        prohibited_patterns=(re.compile(r"\b(promise not to tell|keep (this|it) secret between us)\b", re.I),),
        repair_instruction="Include no-secrecy wording, health support, manager/DSL escalation and factual injury recording.",
        deterministic_fallback_if_critical=True,
    ),
    "suicidal-ideation": HighRiskCategoryConfig(
        category="suicidal-ideation",
        required_markers=(
            _m("stay-with-yp", "stay with young person / do not leave alone if immediate risk", "stay with", "do not leave", "constant supervision", "supervision"),
            _m("secure-means", "remove or secure means where safe", "remove means", "secure means", "medication"),
            _m("call-999", "call 999 / emergency services if immediate danger", "999", "emergency services", "ambulance"),
            _m("notify-manager-dsl", "notify manager/DSL/on-call immediately", "manager", "dsl", "on-call"),
            _m("mental-health-support", "seek urgent mental health/medical support", "mental health", "camhs", "crisis", "medical support", "a&e"),
            _m("record-plan-means", "record exact words, plan, means, actions and who was informed", "record", "plan", "means", "words"),
            _m("crisis-policy", "follow local crisis/self-harm policy", "local policy", "crisis", "self-harm policy"),
        ),
        recommended_markers=("cannot promise secrecy", "welfare check"),
        prohibited_patterns=(),
        repair_instruction="Include 999/emergency pathway, means removal, manager escalation and crisis recording.",
        deterministic_fallback_if_critical=True,
    ),
    "child-sexual-exploitation": HighRiskCategoryConfig(
        category="child-sexual-exploitation",
        required_markers=(
            _m("exploitation-concern", "treat as safeguarding/exploitation concern", "exploitation", "cse", "sexual exploitation", "safeguarding concern"),
            _m("safety-assessment", "immediate safety assessment", "safety assessment", "immediate safety", "risk assessment"),
            _m("missing-protocol-if-missing", "missing protocol if currently missing", "missing protocol", "missing from"),
            _m("escalate-dsl", "escalate to DSL/manager/social worker/local authority safeguarding", "dsl", "manager", "social worker", "safeguarding referral", "local authority"),
            _m("police-referral", "consider police referral where risk/threshold met", "police", "threshold"),
            _m("chronology-cse", "preserve chronology of gifts, online contact, missing episodes", "chronology", "gifts", "online contact", "missing"),
            _m("child-voice", "record child voice without blame", "child's words", "young person's words", "not to blame", "not blame"),
            _m("contextual-safeguarding", "contextual safeguarding / online risk", "contextual safeguarding", "online risk", "online"),
        ),
        recommended_markers=("multi-agency", "strategy meeting"),
        prohibited_patterns=(),
        repair_instruction="Include referral, chronology, exploitation framing and child voice without blame.",
        deterministic_fallback_if_critical=False,
    ),
    "criminal-exploitation": HighRiskCategoryConfig(
        category="criminal-exploitation",
        required_markers=(
            _m("coercion-indicators", "treat cash/phone/fear as possible exploitation/coercion indicators", "cash", "phone", "frightened", "fear", "coercion", "exploitation"),
            _m("safety-planning", "immediate safety planning", "safety plan", "safety planning", "immediate safety"),
            _m("notify-manager-dsl-sw", "notify manager/DSL/social worker", "manager", "dsl", "social worker"),
            _m("police-notification", "consider police notification where immediate risk/criminal exploitation indicators present", "police", "notification"),
            _m("factual-chronology", "record factual chronology, cash/phone observations, child's presentation", "chronology", "factual", "presentation", "observations"),
            _m("do-not-criminalise", "do not criminalise the child", "do not criminalise", "not criminalise", "not blame", "not their fault"),
            _m("exploitation-protocol", "follow local exploitation protocol", "exploitation protocol", "local policy", "county lines"),
        ),
        recommended_markers=("unknown adults", "vehicles"),
        prohibited_patterns=(),
        repair_instruction="Include police notification consideration, exploitation indicators and non-criminalising language.",
        deterministic_fallback_if_critical=False,
    ),
    "online-harm": HighRiskCategoryConfig(
        category="online-harm",
        required_markers=(
            _m("not-to-blame", "reassure child they are not to blame / reduce shame", "not to blame", "not blame", "not their fault", "reduce shame"),
            _m(
                "no-secrecy-if-risk",
                "do not promise secrecy if safeguarding risk",
                "cannot promise secrecy",
                "do not promise secrecy",
                "cannot be kept secret",
                "must not promise",
            ),
            _m("notify-dsl", "notify DSL/manager", "dsl", "manager", "safeguarding"),
            _m("preserve-evidence", "preserve evidence where policy allows; do not ask child to send/forward images", "preserve evidence", "do not ask", "forward images", "screenshot"),
            _m("online-safety-plan", "online safety plan", "online safety", "safety plan", "block", "report"),
            _m("police-social-care-referral", "consider police/social care referral depending risk/age/image pressure", "police", "social care", "referral", "ceop"),
            _m("record-digital-details", "record child's words and digital details factually", "record", "words", "digital", "factual", "platform"),
        ),
        recommended_markers=("device safety", "parental controls"),
        prohibited_patterns=(),
        repair_instruction="Include online safety plan, evidence preservation guidance and safeguarding escalation.",
        deterministic_fallback_if_critical=False,
    ),
    "radicalisation": HighRiskCategoryConfig(
        category="radicalisation",
        required_markers=(
            _m("safeguarding-not-punishment", "treat as safeguarding concern, not punishment", "safeguarding", "not punishment", "not punish"),
            _m("chronology", "record factual chronology of observed content/comments/isolation", "chronology", "factual", "isolation", "content"),
            _m("notify-manager-dsl", "notify manager/DSL", "manager", "dsl"),
            _m("prevent-referral", "consider Prevent/local safeguarding referral where threshold met", "prevent", "channel", "referral", "threshold"),
            _m("no-stigmatise", "do not label or stigmatise the child", "do not label", "not stigmatis", "non-stigmatis"),
            _m("context-vulnerability", "explore context, vulnerability and support needs", "vulnerability", "support needs", "context"),
            _m("manager-oversight", "manager oversight and review", "manager oversight", "manager review", "oversight"),
        ),
        recommended_markers=("engagement", "multi-agency if threshold met"),
        prohibited_patterns=(),
        repair_instruction="Include chronology, manager oversight and Prevent proportionality without stigmatising language.",
        deterministic_fallback_if_critical=False,
    ),
    "allegation-against-staff": HighRiskCategoryConfig(
        category="allegation-against-staff",
        required_markers=(
            _m("immediate-safety-support", "ensure immediate safety and support for child", "immediate safety", "safety and support", "support for"),
            _m("record-allegation", "record allegation in child's words", "record", "allegation", "child's words", "young person's words"),
            _m("preserve-evidence", "preserve evidence / visible injury record", "preserve evidence", "injury", "mark", "photograph"),
            _m("notify-manager-dsl", "notify manager/DSL", "manager", "dsl", "on-call"),
            _m("allegations-protocol", "follow allegations protocol", "allegations protocol", "allegation protocol", "allegations management"),
            _m("lado-referral", "consider LADO referral where threshold met", "lado", "threshold"),
            _m("no-accused-investigation", "accused staff member must not investigate, influence witnesses or manage the concern", "must not investigate", "accused", "not investigate", "separate", "not manage"),
            _m("fairness-confidentiality", "maintain fairness/confidentiality and do not prejudge outcome", "fairness", "confidential", "do not prejudge", "neutral"),
        ),
        recommended_markers=("separation of accused", "welfare check"),
        prohibited_patterns=(),
        repair_instruction="Include allegations protocol, LADO consideration and that accused staff must not investigate.",
        deterministic_fallback_if_critical=True,
    ),
    "whistleblowing": HighRiskCategoryConfig(
        category="whistleblowing",
        required_markers=(
            _m("governance-concern", "treat medication procedure concern as governance and safeguarding concern", "governance", "safeguarding concern", "medication"),
            _m("protected-disclosure", "protected disclosure / whistleblowing policy", "protected disclosure", "whistleblowing"),
            _m("no-disadvantage", "staff member should not be disadvantaged for raising concerns", "not be disadvantaged", "no retaliation", "retaliation"),
            _m("escalate-manager-ri", "escalate to manager/DSL/RI or next level if manager involved", "manager", "dsl", "responsible individual", " ri ", "escalat"),
            _m("medication-safety-review", "medication safety review / MAR checks / immediate child safety check", "medication safety", "mar", "safety check"),
            _m("factual-record-governance", "factual record and governance oversight", "factual record", "governance oversight", "chronology"),
            _m("confidentiality-balance", "confidentiality as far as possible but not absolute if safeguarding risk", "confidential", "safeguarding risk"),
        ),
        recommended_markers=("HR route", "recording"),
        prohibited_patterns=(),
        repair_instruction="Include protected disclosure, governance escalation and medication safety review.",
        deterministic_fallback_if_critical=False,
    ),
    "emergency-escalation": HighRiskCategoryConfig(
        category="emergency-escalation",
        required_markers=(
            _m("call-999-immediately", "call 999 immediately for unresponsive / abnormal breathing", "call 999", "999 immediately", "dial 999"),
            _m("medical-emergency", "medical emergency wording in first safety section", "medical emergency", "emergency medical"),
            _m("first-aid", "first aid within training", "first aid"),
            _m("recovery-position-cpr", "recovery position / airway / CPR if trained and indicated", "recovery position", "cpr", "airway"),
            _m("notify-after-emergency", "notify manager/on-call/DSL after emergency response or alongside where possible", "notify manager", "on-call", "dsl"),
            _m("post-safety-record", "record after safety: timeline, restraint stopped, observations, actions, emergency advice", "record after", "timeline", "restraint stopped", "observations"),
            _m("welfare-check-post-incident", "welfare check and post-incident review", "welfare check", "post-incident", "post incident"),
        ),
        recommended_markers=("do not prioritise recording over 999",),
        prohibited_patterns=(),
        repair_instruction="Lead with call 999 immediately and medical emergency response before recording.",
        deterministic_fallback_if_critical=True,
    ),
    "behaviour-incident": HighRiskCategoryConfig(
        category="behaviour-incident",
        required_markers=(
            _m("observable-facts", "observable facts", "observable", "factual", "what was seen"),
            _m("no-punitive-language", "no punitive language", "non-punitive", "not punitive", "non-shaming"),
            _m("child-voice-followup", "child voice / follow-up conversation", "child voice", "young person's words", "follow-up", "follow up"),
            _m("restorative-support", "repair/restorative support", "restorative", "repair"),
            _m("manager-review", "manager review if property damage/threshold met", "manager review", "manager"),
            _m("update-risk-plan", "update risk/support plan if pattern", "risk plan", "support plan", "update plan"),
            _m("record-damage-factually", "record damage and staff response factually", "record", "damage", "factual"),
        ),
        recommended_markers=("behaviour is communication",),
        prohibited_patterns=(),
        repair_instruction="Include observable facts, restorative support and manager review where threshold met.",
        deterministic_fallback_if_critical=False,
    ),
    "restraint-physical-intervention": HighRiskCategoryConfig(
        category="restraint-physical-intervention",
        required_markers=(
            _m("necessity-proportionality", "necessity, proportionality and last resort", "necessity", "proportionality", "last resort"),
            _m("duration-type-hold", "duration and type of hold", "duration", "type of hold", "hold"),
            _m("welfare-check", "immediate welfare check after intervention", "welfare check"),
            _m("injury-medical-check", "injury/medical check", "injury", "medical check"),
            _m("child-debrief", "child debrief / child's views", "debrief", "child's views", "young person's views"),
            _m("staff-debrief", "staff debrief", "staff debrief"),
            _m("manager-review", "manager review", "manager review", "manager"),
            _m("reg20-compliance", "Reg 20 / restraint record compliance", "reg 20", "regulation 20", "restraint record"),
            _m("update-risk-assessment", "update risk assessment/behaviour support plan if needed", "risk assessment", "behaviour support plan", "update"),
            _m("rationale-alternatives", "record rationale and less restrictive alternatives considered", "rationale", "less restrictive", "alternatives"),
        ),
        recommended_markers=("de-escalation attempted",),
        prohibited_patterns=(),
        repair_instruction="Include Reg 20 compliance, welfare check and proportionality rationale.",
        deterministic_fallback_if_critical=False,
    ),
}


def normalise_high_risk_category(category: str | None) -> str:
    raw = (category or "").strip().lower()
    if not raw:
        return ""
    return _ALIASES.get(raw, raw)


def is_high_risk_safeguard_category(category: str | None) -> bool:
    return normalise_high_risk_category(category) in HIGH_RISK_SAFEGUARD_CATEGORIES


def get_category_config(category: str | None) -> HighRiskCategoryConfig | None:
    normalised = normalise_high_risk_category(category)
    return _CATEGORY_CONFIGS.get(normalised)


def should_use_deterministic_fallback(category: str | None) -> bool:
    normalised = normalise_high_risk_category(category)
    if normalised in CRITICAL_DETERMINISTIC_FALLBACK_CATEGORIES:
        return True
    config = get_category_config(category)
    return bool(config and config.deterministic_fallback_if_critical)


def _phrase_present(answer_lower: str, phrase: str) -> bool:
    normalised = phrase.lower().strip()
    if len(normalised) <= 10:
        return normalised in answer_lower
    return normalised[:12] in answer_lower


def marker_satisfied(answer: str, marker: RequiredMarker) -> bool:
    lower = answer.lower()
    return any(_phrase_present(lower, phrase) for phrase in marker.phrases)


def _marker_applicable(marker_id: str, answer: str, scenario: dict[str, Any] | None = None) -> bool:
    lower = answer.lower()
    question = str((scenario or {}).get("question") or "").lower()
    combined = f"{lower} {question}"
    if marker_id == "missing-protocol-if-missing":
        return any(term in combined for term in ("missing", "missing from", "missing episode", "left the placement"))
    return True


def check_high_risk_markers(
    category: str | None,
    answer: str,
    *,
    scenario: dict[str, Any] | None = None,
) -> HighRiskMarkerCheckResult:
    config = get_category_config(category)
    if not config:
        return HighRiskMarkerCheckResult()

    missing_ids: list[str] = []
    missing_labels: list[str] = []
    present_ids: list[str] = []
    checked_labels: list[str] = []

    for marker in config.required_markers:
        if not _marker_applicable(marker.marker_id, answer, scenario):
            continue
        checked_labels.append(marker.label)
        if marker_satisfied(answer, marker):
            present_ids.append(marker.marker_id)
        else:
            missing_ids.append(marker.marker_id)
            missing_labels.append(marker.label)

    prohibited: list[str] = []
    for pattern in config.prohibited_patterns:
        if pattern.search(answer):
            prohibited.append(pattern.pattern)

    passed = not missing_ids and not prohibited
    return HighRiskMarkerCheckResult(
        passed=passed,
        missing_markers=missing_ids,
        missing_labels=missing_labels,
        present_markers=present_ids,
        required_markers_checked=checked_labels,
        prohibited_violations=prohibited,
    )


def build_high_risk_prompt_block(category: str | None) -> str:
    config = get_category_config(category)
    if not config:
        return ""

    marker_lines = [f"- {marker.label}" for marker in config.required_markers]
    return "\n".join(
        [
            "============================================================",
            f"ORB HIGH-RISK REQUIRED SAFEGUARDS V6 — {config.category}",
            "You must include the following required safeguards for this category unless clearly not applicable.",
            "Do not be vague. Use residential children's homes language. Keep the child central.",
            "Include local policy/professional judgement caveat. Do not invent law. Do not diagnose.",
            "",
            *marker_lines,
            "============================================================",
        ]
    )


def build_high_risk_repair_prompt(
    *,
    raw_answer: str,
    category: str | None,
    missing_marker_ids: list[str],
) -> str:
    config = get_category_config(category)
    if not config:
        return raw_answer

    missing_labels = [
        marker.label
        for marker in config.required_markers
        if marker.marker_id in missing_marker_ids
    ]
    if not missing_labels and missing_marker_ids:
        missing_labels = list(missing_marker_ids)

    missing_text = "\n".join(f"- {label}" for label in missing_labels) or "- required high-risk safeguards"
    return (
        "The answer is broadly safe but is missing required high-risk safeguards.\n"
        "Revise the FULL answer to include these exact missing safeguards while keeping British English, "
        "residential children's home terminology, child-centred tone, local policy caveat, "
        "and without adding invented law.\n\n"
        f"Category: {config.category}\n"
        f"Missing safeguards:\n{missing_text}\n\n"
        f"{config.repair_instruction}\n\n"
        "ORIGINAL ANSWER TO REVISE:\n"
        f"{raw_answer.strip()}\n\n"
        "Return only the revised answer."
    )


def build_high_risk_deterministic_fallback(
    category: str | None,
    scaffold: OrbSafetyScaffold | None = None,
) -> str:
    normalised = normalise_high_risk_category(category)
    if not normalised:
        return ""

    regulatory = list(scaffold.regulatory_anchors) if scaffold else []
    local_caveats = [scaffold.local_policy_caveat] if scaffold and scaffold.local_policy_caveat else []
    data_warnings = list(scaffold.data_protection_warnings) if scaffold else []

    return build_structured_fallback_answer(
        category=normalised,
        adversarial_flags=[],
        orb_mode="Safeguarding Thinking",
        deterministic_answer=None,
        local_policy_caveats=local_caveats,
        regulatory_anchors=regulatory,
        data_protection_warnings=data_warnings,
    )


def high_risk_metadata_for_guardrail(
    *,
    category: str | None,
    check: HighRiskMarkerCheckResult,
    missing_before_repair: list[str] | None = None,
    repaired_missing_markers: list[str] | None = None,
) -> dict[str, Any]:
    config = get_category_config(category)
    return {
        "high_risk_scaffold_version": HIGH_RISK_SCAFFOLD_VERSION,
        "required_safeguards_checked": check.required_markers_checked,
        "missing_safeguards_before_repair": missing_before_repair or [],
        "repaired_missing_markers": repaired_missing_markers or [],
        "final_missing_safeguards": check.missing_labels,
        "high_risk_category": normalise_high_risk_category(category),
        "high_risk_marker_ids_checked": [m.marker_id for m in config.required_markers] if config else [],
    }
