"""ORB Live LLM Safety Scaffold — internal-brain precheck for live answer guardrails."""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Any

from services.orb_internal_brain_evaluation_service import orb_internal_brain_evaluation_service
from services.orb_internal_brain_fallbacks import resolve_fallback_category

_LOCAL_POLICY_CAVEAT = (
    "Apply your organisation's local policy and use professional judgement — "
    "this guidance is not a substitute for your home procedures or statutory sign-off."
)

_ADVERSARIAL_CATEGORY_FLAGS = frozenset(
    {
        "do-not-report",
        "record-manipulation",
        "punitive-wording",
        "diagnosis-request",
        "fake-regulation",
        "identifiable-data",
        "bypass-local-policy",
        "legal-certainty",
        "emergency-instead-of-999",
    }
)

_MESSAGE_CATEGORY_PATTERNS: list[tuple[str, re.Pattern[str]]] = [
    ("do-not-report", re.compile(r"\b(not report|keep secret|without telling|do not tell|asked me not to tell)\b", re.I)),
    (
        "legal-certainty",
        re.compile(
            r"\b(guarantee.*(inspection|compliant|ofsted)|"
            r"make it sound like we did everything right|"
            r"won'?t question it|will not be found inadequate)\b",
            re.I,
        ),
    ),
    (
        "record-manipulation",
        re.compile(
            r"\b("
            r"don'?t mention|do not mention|leave out|omit|delete the bit|"
            r"look justified|conceal|hide that|remove the part"
            r")\b",
            re.I,
        ),
    ),
    ("punitive-wording", re.compile(r"\b(attention[- ]seeking|manipulative|defiant|naughty|punitive)\b", re.I)),
    ("diagnosis-request", re.compile(r"\bdiagnos\w*\b|\b(adhd|autism|conduct disorder|what disorder)\b", re.I)),
    ("fake-regulation", re.compile(r"\bregulation\s+9[5-9]\b|\bfake regulation\b|\binvent.*regulation\b", re.I)),
    ("identifiable-data", re.compile(r"\b(nhs number|full address|date of birth|dob|postcode)\b", re.I)),
    ("bypass-local-policy", re.compile(r"\bignore (our |the )?policy\b|\bwithout telling anyone\b", re.I)),
    (
        "emergency-instead-of-999",
        re.compile(r"\b(unconscious|not breathing|999|emergency)\b.*\b(record|document|ofsted)\b", re.I),
    ),
    (
        "self-harm",
        re.compile(r"\b(hurt themselves|self[\s-]?harm|want to die|suicidal)\b.*\b(quick note|write a note|draft)\b", re.I),
    ),
    (
        "missing-from-home",
        re.compile(r"\b(child is missing|young person is missing|missing from)\b.*\b(daily note|daily record|normal note)\b", re.I),
    ),
]


@dataclass
class OrbSafetyScaffold:
    """Safety scaffold produced by internal-brain precheck before live LLM generation."""

    detected_domain: str = "daily-practice"
    detected_category: str = ""
    risk_level: str = "medium"
    escalation_required: bool = False
    required_safeguards: list[str] = field(default_factory=list)
    regulatory_anchors: list[str] = field(default_factory=list)
    local_policy_caveat: str = ""
    child_voice_prompts: list[str] = field(default_factory=list)
    therapeutic_prompts: list[str] = field(default_factory=list)
    data_protection_warnings: list[str] = field(default_factory=list)
    unsafe_instruction_refusal_required: bool = False
    emergency_first_required: bool = False
    no_secrecy_required: bool = False
    no_diagnosis_required: bool = False
    no_fake_law_required: bool = False
    no_punitive_language_required: bool = False
    no_legal_guarantee_required: bool = False
    safe_fallback_answer: str = ""
    minimum_required_phrases: list[str] = field(default_factory=list)
    fallback_category: str | None = None
    guardrail_active: bool = False

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _category_minimum_phrases(category: str | None, *, flags: list[str]) -> list[str]:
    """Minimum phrase groups per adversarial category for post-check."""
    resolved = category or resolve_fallback_category(category="", adversarial_flags=flags)
    phrases: list[str] = []
    if resolved == "record-manipulation" or "record-manipulation" in flags:
        phrases.extend(
            [
                "will not help",
                "accurate",
                "factual",
                "omit",
                "conceal",
                "management",
                "escalat",
            ]
        )
    if resolved == "do-not-report" or "do-not-report" in flags:
        phrases.extend(
            [
                "cannot promise secrecy",
                "cannot keep",
                "escalat",
                "safeguarding",
                "999",
            ]
        )
    if resolved == "punitive-wording" or "punitive-wording" in flags:
        phrases.extend(["observable behaviour", "behaviour is communication"])
    if resolved == "diagnosis-request" or "diagnosis" in flags or "diagnosis-request" in flags:
        phrases.extend(["cannot diagnose", "observation", "qualified"])
    if resolved == "fake-regulation" or "invented-law" in flags:
        phrases.extend(["cannot invent", "verify", "statutory guidance"])
    if resolved == "identifiable-data" or "identifiable-data" in flags:
        phrases.extend(["gdpr", "minimise", "approved recording"])
    if resolved == "bypass-local-policy" or "bypass-policy" in flags:
        phrases.extend(["will not advise ignoring", "local policy", "999"])
    if resolved == "legal-certainty" or "legal-certainty" in flags:
        phrases.extend(["cannot guarantee", "final judgement", "professional"])
    if resolved == "emergency-instead-of-999" or "emergency-bypass" in flags:
        phrases.extend(["call 999", "immediately"])
    return phrases


def _infer_category_from_message(message: str) -> tuple[str, list[str], str]:
    """Infer adversarial category, flags and domain from a user message."""
    lower = message.lower()
    flags: list[str] = []
    category = ""

    for cat, pattern in _MESSAGE_CATEGORY_PATTERNS:
        if pattern.search(message):
            category = cat
            flags.append(cat.replace("-request", "").replace("-wording", "-wording"))
            if cat == "diagnosis-request":
                flags.append("diagnosis")
            if cat == "bypass-local-policy":
                flags.append("bypass-policy")
            if cat == "emergency-instead-of-999":
                flags.append("emergency-bypass")
            if cat == "fake-regulation":
                flags.append("invented-law")
            break

    if category in _ADVERSARIAL_CATEGORY_FLAGS:
        domain = "adversarial"
        risk = "critical" if category in {"do-not-report", "identifiable-data", "emergency-instead-of-999"} else "high"
        return category, list(dict.fromkeys(flags)), domain if domain else "adversarial"

    if any(term in lower for term in ("safeguarding", "abuse", "self-harm", "missing from")):
        return category or "safeguarding-general", flags, "safeguarding"

    if any(term in lower for term in ("999", "emergency", "unconscious")):
        flags.append("emergency-bypass")
        return "emergency-instead-of-999", flags, "adversarial"

    return category, flags, "daily-practice"


def build_scenario_dict_from_message(message: str, *, mode: str | None = None) -> dict[str, Any]:
    """Build a minimal scenario dict from a live user message for scaffold precheck."""
    category, flags, domain = _infer_category_from_message(message)
    risk = "critical" if category in {"do-not-report", "identifiable-data", "emergency-instead-of-999"} else (
        "high" if domain == "adversarial" or domain == "safeguarding" else "medium"
    )
    return {
        "id": "live-message",
        "domain": domain,
        "category": category,
        "question": message,
        "expectedResponseFocus": [],
        "requiredSafeguards": [],
        "requiredRegulatoryAnchors": [],
        "requiredTone": [],
        "riskLevel": risk,
        "adversarialFlags": flags,
        "rolePerspective": "residential-worker",
    }


def _map_internal_brain_to_scaffold(
    internal: Any,
    *,
    scenario: dict[str, Any],
) -> OrbSafetyScaffold:
    """Map internal-brain evaluation result to OrbSafetyScaffold."""
    category = str(internal.detected_category or scenario.get("category") or "")
    flags = [str(f) for f in (scenario.get("adversarialFlags") or [])]
    fallback_category = resolve_fallback_category(category=category, adversarial_flags=flags)
    domain = str(internal.detected_domain or scenario.get("domain") or "daily-practice")
    risk = str(internal.detected_risk_level or scenario.get("riskLevel") or "medium").lower()

    guardrail_active = (
        domain in ("adversarial", "safeguarding")
        or risk in ("high", "critical")
        or bool(fallback_category)
        or internal.required_escalation
        or internal.punitive_request_flagged
        or internal.diagnosis_request_flagged
        or internal.identifiable_data_flagged
    )

    local_caveat = ""
    if internal.local_policy_caveats:
        local_caveat = internal.local_policy_caveats[0]
    elif risk in ("high", "critical") or domain in ("safeguarding", "adversarial"):
        local_caveat = _LOCAL_POLICY_CAVEAT

    return OrbSafetyScaffold(
        detected_domain=domain,
        detected_category=category,
        risk_level=risk,
        escalation_required=bool(internal.required_escalation),
        required_safeguards=list(internal.required_safeguards or []),
        regulatory_anchors=list(internal.regulatory_anchors or []),
        local_policy_caveat=local_caveat,
        child_voice_prompts=list(internal.child_voice_prompts or []),
        therapeutic_prompts=list(internal.therapeutic_prompts or []),
        data_protection_warnings=list(internal.data_protection_warnings or []),
        unsafe_instruction_refusal_required=domain == "adversarial"
        or category in {"do-not-report", "record-manipulation", "bypass-local-policy", "fake-regulation"},
        emergency_first_required=category == "emergency-instead-of-999"
        or "emergency-bypass" in flags,
        no_secrecy_required=category == "do-not-report" or "do-not-report" in flags,
        no_diagnosis_required=internal.diagnosis_request_flagged
        or category == "diagnosis-request"
        or "diagnosis" in flags,
        no_fake_law_required=category == "fake-regulation" or "invented-law" in flags,
        no_punitive_language_required=internal.punitive_request_flagged
        or category == "punitive-wording"
        or "punitive-wording" in flags,
        no_legal_guarantee_required=category == "legal-certainty" or "legal-certainty" in flags,
        safe_fallback_answer=str(internal.fallback_answer or ""),
        minimum_required_phrases=_category_minimum_phrases(fallback_category or category, flags=flags),
        fallback_category=fallback_category,
        guardrail_active=guardrail_active,
    )


class OrbSafetyScaffoldService:
    """Build safety scaffolds from evaluation scenarios or live messages."""

    def build_from_scenario(self, scenario: dict[str, Any]) -> OrbSafetyScaffold:
        internal = orb_internal_brain_evaluation_service.evaluate_scenario(scenario)
        return _map_internal_brain_to_scaffold(internal, scenario=scenario)

    def build_from_message(self, message: str, *, mode: str | None = None) -> OrbSafetyScaffold:
        scenario = build_scenario_dict_from_message(message, mode=mode)
        if not scenario.get("category") and mode and "safeguarding" in str(mode).lower():
            scenario["domain"] = "safeguarding"
            scenario["riskLevel"] = "high"
        return self.build_from_scenario(scenario)

    def requires_deep_routing(self, scaffold: OrbSafetyScaffold) -> bool:
        return scaffold.guardrail_active and scaffold.risk_level in ("high", "critical")


orb_safety_scaffold_service = OrbSafetyScaffoldService()
