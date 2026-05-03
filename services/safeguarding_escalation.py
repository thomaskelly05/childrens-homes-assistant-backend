from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any, Literal

SafeguardingLevel = Literal["none", "standard", "concern", "urgent"]


@dataclass(frozen=True)
class SafeguardingSignal:
    label: str
    level: SafeguardingLevel
    terms: tuple[str, ...]


URGENT_SIGNALS: tuple[SafeguardingSignal, ...] = (
    SafeguardingSignal("Immediate risk of suicide or serious self-harm", "urgent", ("suicidal", "kill myself", "end my life", "wants to die", "attempted suicide", "ligature", "overdose", "serious self-harm")),
    SafeguardingSignal("Missing child or high-risk absence", "urgent", ("missing from home", "missing child", "absconded", "absconding", "whereabouts unknown", "not returned", "missing episode")),
    SafeguardingSignal("Disclosure or allegation of abuse", "urgent", ("disclosure", "allegation", "sexual abuse", "physical abuse", "emotional abuse", "neglect", "historic abuse")),
    SafeguardingSignal("Exploitation concern", "urgent", ("county lines", "criminal exploitation", "sexual exploitation", "cse", "cce", "exploitation", "trafficking")),
    SafeguardingSignal("Immediate safety or emergency services concern", "urgent", ("police", "ambulance", "a&e", "999", "emergency", "weapon", "knife", "strangulation", "choking")),
)

CONCERN_SIGNALS: tuple[SafeguardingSignal, ...] = (
    SafeguardingSignal("Self-harm or emotional crisis", "concern", ("self-harm", "self harm", "cutting", "scratching", "head banging", "dysregulated", "distressed", "panic attack")),
    SafeguardingSignal("Injury, marks or body map concern", "concern", ("bruise", "bruising", "injury", "mark", "body map", "unexplained injury", "black eye", "bite mark")),
    SafeguardingSignal("Physical intervention or restraint", "concern", ("restraint", "physical intervention", "held", "guide away", "restrictive intervention")),
    SafeguardingSignal("Bullying, coercion or unsafe relationship", "concern", ("bullying", "coercion", "threatened", "intimidated", "unsafe relationship", "peer pressure")),
    SafeguardingSignal("Substance, online or community risk", "concern", ("drugs", "alcohol", "vape", "online risk", "sexting", "inappropriate images", "unknown adult")),
)


def _normalise(text: Any) -> str:
    return str(text or "").lower()


def _contains_term(text: str, term: str) -> bool:
    clean = term.lower().strip()
    if not clean:
        return False
    if " " in clean or "-" in clean or "&" in clean:
        return clean in text
    return re.search(rf"\b{re.escape(clean)}\b", text) is not None


def analyse_safeguarding_escalation(message: str) -> dict[str, Any]:
    text = _normalise(message)
    matched: list[dict[str, str]] = []

    level: SafeguardingLevel = "standard"

    for signal in URGENT_SIGNALS:
        terms = [term for term in signal.terms if _contains_term(text, term)]
        if terms:
            level = "urgent"
            matched.append({"label": signal.label, "level": signal.level, "terms": ", ".join(terms[:4])})

    if level != "urgent":
        for signal in CONCERN_SIGNALS:
            terms = [term for term in signal.terms if _contains_term(text, term)]
            if terms:
                level = "concern"
                matched.append({"label": signal.label, "level": signal.level, "terms": ", ".join(terms[:4])})

    if not matched and not any(term in text for term in ["safeguard", "risk", "concern", "incident"]):
        level = "none"

    follow_up_required = level in {"concern", "urgent"}

    if level == "urgent":
        banner = (
            "Urgent safeguarding indicators are present. Prioritise immediate safety, follow your home’s safeguarding procedures, "
            "inform the relevant manager/DSL without delay, and consider whether emergency services, the local authority, police, LADO or placing authority need to be contacted according to the situation and local procedure."
        )
    elif level == "concern":
        banner = (
            "Safeguarding indicators may be present. Ensure the concern is recorded clearly, shared with the relevant manager/DSL, "
            "and reviewed against the child’s plan, risk assessment and local safeguarding procedures."
        )
    else:
        banner = "No specific safeguarding escalation indicator was detected from the wording provided. Continue to apply professional judgement."

    suggested_actions: list[dict[str, Any]] = []

    if level in {"concern", "urgent"}:
        suggested_actions.extend(
            [
                {
                    "label": "Record factual safeguarding concern",
                    "action_type": "recording_prompt",
                    "payload": {"record_type": "safeguarding", "priority": level},
                },
                {
                    "label": "Notify manager / DSL",
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

    if level == "urgent":
        suggested_actions.insert(
            0,
            {
                "label": "Check immediate safety and emergency response needs",
                "action_type": "urgent_safety_prompt",
                "payload": {"priority": "urgent"},
            },
        )

    prompt_block = ""
    if level in {"concern", "urgent"}:
        prompt_block = f"""
Safeguarding escalation detected: {level.upper()}.
Matched indicators: {', '.join(item['label'] for item in matched) or 'general safeguarding concern'}.

Mandatory response behaviour:
- Start with a short safeguarding priority note before any rewritten record or general guidance.
- Do not create alarmist or definitive conclusions. Use threshold-aware language.
- Include immediate safety, who to inform, what to record, and what management oversight is needed.
- If urgent, make clear that the adult should follow local safeguarding procedures immediately and consider emergency/local authority/police/LADO routes according to the facts and procedure.
- Keep the child’s voice, lived experience and safety central.
""".strip()

    return {
        "level": level,
        "follow_up_required": follow_up_required,
        "matched_signals": matched,
        "banner": banner,
        "suggested_actions": suggested_actions,
        "prompt_block": prompt_block,
    }
