from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal

SafeguardingLevel = Literal["none", "standard", "concern", "urgent"]
ThresholdView = Literal["not_indicated", "monitor", "possible_referral", "likely_referral", "immediate_action"]


@dataclass(frozen=True)
class SafeguardingSignal:
    label: str
    level: SafeguardingLevel
    terms: tuple[str, ...]
    threshold_weight: int = 1


URGENT_SIGNALS: tuple[SafeguardingSignal, ...] = (
    SafeguardingSignal("Immediate risk of suicide or serious self-harm", "urgent", ("suicidal", "kill myself", "end my life", "wants to die", "attempted suicide", "ligature", "overdose", "serious self-harm"), 5),
    SafeguardingSignal("Missing child or high-risk absence", "urgent", ("missing from home", "missing child", "absconded", "absconding", "whereabouts unknown", "not returned", "missing episode"), 4),
    SafeguardingSignal("Disclosure or allegation of abuse", "urgent", ("disclosure", "allegation", "sexual abuse", "physical abuse", "emotional abuse", "neglect", "historic abuse"), 5),
    SafeguardingSignal("Exploitation concern", "urgent", ("county lines", "criminal exploitation", "sexual exploitation", "cse", "cce", "exploitation", "trafficking"), 5),
    SafeguardingSignal("Immediate safety or emergency services concern", "urgent", ("police", "ambulance", "a&e", "999", "emergency", "weapon", "knife", "strangulation", "choking"), 5),
)

CONCERN_SIGNALS: tuple[SafeguardingSignal, ...] = (
    SafeguardingSignal("Self-harm or emotional crisis", "concern", ("self-harm", "self harm", "cutting", "scratching", "head banging", "dysregulated", "distressed", "panic attack"), 3),
    SafeguardingSignal("Injury, marks or body map concern", "concern", ("bruise", "bruising", "injury", "mark", "body map", "unexplained injury", "black eye", "bite mark"), 3),
    SafeguardingSignal("Physical intervention or restraint", "concern", ("restraint", "physical intervention", "held", "guide away", "restrictive intervention"), 2),
    SafeguardingSignal("Bullying, coercion or unsafe relationship", "concern", ("bullying", "coercion", "threatened", "intimidated", "unsafe relationship", "peer pressure"), 3),
    SafeguardingSignal("Substance, online or community risk", "concern", ("drugs", "alcohol", "vape", "online risk", "sexting", "inappropriate images", "unknown adult"), 2),
    SafeguardingSignal("Unauthorised absence or attempt to leave", "concern", ("attempted to leave", "leave the home", "without permission", "left without permission", "abscond", "absconding"), 2),
)

CONFIDENTIALITY_TERMS = (
    "don't tell", "do not tell", "not to tell", "did not want staff to tell", "confidential", "keep it secret", "don't say anything", "dont tell",
)

ESCALATION_TERMS = (
    "threshold", "referral", "safeguarding", "dsl", "manager", "lado", "local authority", "placing authority", "police", "social worker",
)

REFERENCE_POINTS = [
    {
        "title": "Children's Homes Regulations 2015 - Regulation 12, the protection of children standard",
        "principle": "The home must protect children from harm and respond effectively to risks, including risks arising outside the home.",
    },
    {
        "title": "Guide to the Children's Homes Regulations, including the quality standards",
        "principle": "Records should evidence how staff identify risk, support children, escalate concerns and review plans.",
    },
    {
        "title": "Working Together to Safeguard Children",
        "principle": "Concerns about significant harm or risk of harm should be shared with the relevant safeguarding partners in line with local procedures.",
    },
    {
        "title": "Ofsted SCCIF for children's homes",
        "principle": "Inspectors consider whether children are helped and protected, whether leaders understand risk, and whether action is timely and effective.",
    },
]


def _normalise(text: Any) -> str:
    return str(text or "").lower()


def _contains_term(text: str, term: str) -> bool:
    clean = term.lower().strip()
    if not clean:
        return False
    if " " in clean or "-" in clean or "&" in clean or "'" in clean:
        return clean in text
    return re.search(rf"\b{re.escape(clean)}\b", text) is not None


def _matched_signals(text: str, signals: tuple[SafeguardingSignal, ...]) -> list[dict[str, Any]]:
    matched: list[dict[str, Any]] = []
    for signal in signals:
        terms = [term for term in signal.terms if _contains_term(text, term)]
        if terms:
            matched.append(
                {
                    "label": signal.label,
                    "level": signal.level,
                    "terms": ", ".join(terms[:4]),
                    "weight": signal.threshold_weight,
                }
            )
    return matched


def _build_decision(level: SafeguardingLevel, matched: list[dict[str, Any]], text: str) -> dict[str, Any]:
    score = sum(int(item.get("weight") or 0) for item in matched)
    confidentiality = any(term in text for term in CONFIDENTIALITY_TERMS)
    explicit_threshold_question = any(term in text for term in ESCALATION_TERMS)

    rationale: list[str] = []
    if matched:
        rationale.extend([item["label"] for item in matched[:4]])
    if confidentiality:
        score += 1
        rationale.append("The young person has requested confidentiality; this must be balanced with safeguarding duties.")
    if explicit_threshold_question:
        rationale.append("The user is asking for threshold-aware safeguarding analysis.")

    if level == "urgent" and score >= 5:
        threshold: ThresholdView = "immediate_action"
        headline = "Immediate safeguarding action may be required."
        decision = "Do not treat this as a routine recording matter. Prioritise immediate safety, manager/on-call oversight and local safeguarding procedures."
    elif level == "urgent":
        threshold = "likely_referral"
        headline = "This is likely to require safeguarding escalation."
        decision = "The information includes urgent safeguarding indicators. A manager or on-call manager should review immediately and decide the correct referral route."
    elif level == "concern" and score >= 4:
        threshold = "possible_referral"
        headline = "This may meet the threshold for safeguarding referral or consultation."
        decision = "The concern should be shared with the manager or safeguarding lead and considered against local safeguarding thresholds, the child's plan and known context."
    elif level == "concern":
        threshold = "monitor"
        headline = "This requires internal safeguarding oversight and monitoring."
        decision = "The information should be recorded clearly, shared with the manager or on-call manager, and reviewed for patterns or escalation needs."
    elif explicit_threshold_question:
        threshold = "not_indicated"
        headline = "A referral threshold is not clearly indicated from the information provided alone."
        decision = "Continue to apply professional judgement and escalate if further information indicates harm, risk of harm or unmet safeguarding needs."
    else:
        threshold = "not_indicated"
        headline = "No specific safeguarding threshold is indicated from the wording provided."
        decision = "Continue normal professional recording and oversight according to the home’s procedures."

    return {
        "threshold_view": threshold,
        "headline": headline,
        "decision": decision,
        "confidence": "moderate" if matched else "limited",
        "rationale": rationale[:6],
        "requires_manager_or_dsl_review": threshold in {"monitor", "possible_referral", "likely_referral", "immediate_action"},
        "requires_immediate_safety_check": threshold in {"likely_referral", "immediate_action"},
        "confidentiality_issue_detected": confidentiality,
        "reference_points": REFERENCE_POINTS,
        "recording_evidence_to_check": [
            "Exact words used by the child, including any request for confidentiality.",
            "Time, location, staff present and sequence of events.",
            "Immediate safety actions taken and current outcome.",
            "Who was informed, when, and what decision was made.",
            "Updates needed to risk assessment, care plan, education plan or chronology.",
        ],
    }


def analyse_safeguarding_escalation(message: str) -> dict[str, Any]:
    text = _normalise(message)
    urgent_matches = _matched_signals(text, URGENT_SIGNALS)
    concern_matches = _matched_signals(text, CONCERN_SIGNALS)

    matched = urgent_matches or concern_matches
    if urgent_matches:
        level: SafeguardingLevel = "urgent"
    elif concern_matches:
        level = "concern"
    elif not any(term in text for term in ["safeguard", "risk", "concern", "incident", "threshold"]):
        level = "none"
    else:
        level = "standard"

    follow_up_required = level in {"concern", "urgent"}
    decision = _build_decision(level, matched, text)

    if level == "urgent":
        banner = (
            "Urgent safeguarding indicators are present. Prioritise immediate safety, follow your home’s safeguarding procedures, "
            "inform the relevant manager or on-call manager without delay, and consider whether emergency services, the local authority, police, LADO or placing authority need to be contacted according to the situation and local procedure."
        )
    elif level == "concern":
        banner = (
            "Safeguarding indicators may be present. Ensure the concern is recorded clearly, shared with the relevant manager or safeguarding lead, "
            "and reviewed against the child’s plan, risk assessment and local safeguarding procedures."
        )
    else:
        banner = "No specific safeguarding escalation indicator was detected from the wording provided. Continue to apply professional judgement."

    suggested_actions: list[dict[str, Any]] = []

    if decision["requires_immediate_safety_check"]:
        suggested_actions.append(
            {
                "label": "Check immediate safety and emergency response needs",
                "action_type": "urgent_safety_prompt",
                "payload": {"priority": "urgent"},
            }
        )

    if decision["requires_manager_or_dsl_review"]:
        suggested_actions.extend(
            [
                {
                    "label": "Record factual safeguarding concern",
                    "action_type": "recording_prompt",
                    "payload": {"record_type": "safeguarding", "priority": level},
                },
                {
                    "label": "Notify manager / on-call manager",
                    "action_type": "escalation_prompt",
                    "payload": {"recipient_role": "manager_or_dsl", "priority": level},
                },
                {
                    "label": "Review risk assessment and care plan",
                    "action_type": "review_prompt",
                    "payload": {"review_type": "risk_and_care_plan", "priority": level},
                },
            ]
        )

    prompt_block = ""
    if level in {"concern", "urgent"} or "threshold" in text:
        prompt_block = f"""
Safeguarding decision support:
- Threshold view: {decision['threshold_view']}.
- Decision headline: {decision['headline']}
- Decision wording: {decision['decision']}
- Rationale points: {'; '.join(decision['rationale']) or 'limited information supplied'}.

Mandatory response behaviour:
- Include a clearly labelled "Safeguarding threshold" section when answering safeguarding/threshold questions.
- Use threshold-aware language: "may meet", "appears to require", "requires manager or safeguarding lead review", rather than making an unsafe definitive statutory decision.
- Include why, what to record, who should review, and what evidence should be checked.
- If confidentiality is requested by the child, explain that confidentiality cannot be promised where safeguarding duties require information sharing.
- Reference the protection of children standard, Working Together principles and Ofsted help-and-protection expectations where relevant.
""".strip()

    return {
        "level": level,
        "follow_up_required": follow_up_required,
        "matched_signals": matched,
        "banner": banner,
        "suggested_actions": suggested_actions,
        "decision": decision,
        "prompt_block": prompt_block,
    }
