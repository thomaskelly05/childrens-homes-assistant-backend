"""ORB Live LLM Guardrail Service — post-answer safety checks, repair and fallback."""

from __future__ import annotations

import logging
import re
from dataclasses import asdict, dataclass, field
from typing import Any, Callable

from services.orb_safety_scaffold_service import OrbSafetyScaffold

logger = logging.getLogger("indicare.orb_live_guardrail")

IDENTIFIABLE_DATA_USER_RESPONSE = (
    "I can't process or store identifiable child information such as DOB, NHS number, address or postcode "
    "in ORB unless your organisation's policy and data protection arrangements allow it. "
    "Please remove or minimise identifiable details and keep official safeguarding/health records "
    "in the approved recording system. Follow UK GDPR, local policy and professional judgement."
)

_LIVE_GUARDRAIL_FALLBACK_PREFIX = (
    "ORB has returned the safety fallback because this scenario contains "
    "safeguarding, legal, data protection or emergency risk boundaries.\n\n"
)

_BARE_REFUSAL_PATTERNS = (
    re.compile(r"^i(?:'m| am) sorry,? but i can(?:'|no)t assist with that\.?$", re.I),
    re.compile(r"^i can(?:'|no)t help with that\.?$", re.I),
    re.compile(r"^i(?:'| a)m unable to (?:help|assist) with that\.?$", re.I),
)

_PUNITIVE_PHRASES = (
    "manipulative",
    "attention-seeking",
    "attention seeking",
    "appeared to seek attention",
    "defiant",
    "naughty",
    "deliberately provocative",
    "challenging for no reason",
)

_PUNITIVE_AVOID_CONTEXT = re.compile(
    r"\b(avoid|do not use|not use|instead of|rather than|words to avoid|labels such as)\b",
    re.I,
)

_DIAGNOSIS_PATTERNS = (
    re.compile(r"\b(has|likely has|probably has)\s+(adhd|autism|conduct disorder)\b", re.I),
    re.compile(r"\b(likely|probably)\s+(conduct disorder|adhd|autism)\b", re.I),
    re.compile(r"\b(diagnos(e|ed|is)|clinical label)\b", re.I),
)

_FAKE_LAW_PATTERNS = (
    re.compile(r"\bregulation\s+9[5-9]\s+(states|addresses|requires|says)\b", re.I),
    re.compile(r"\bthe exact wording of regulation\s+\d+\s+is\b", re.I),
)

_RAW_PRIVACY_BLOCKER = re.compile(
    r"scenario contains disallowed identifiers|disallowed identifiers:",
    re.I,
)

_DOCUMENTATION_BEFORE_999 = re.compile(
    r"(record|document|chronology|ofsted|evidence).{0,120}(999|emergency services|ambulance)",
    re.I | re.S,
)


@dataclass
class LiveGuardrailCheckResult:
    passed: bool = True
    missing_safeguards: list[str] = field(default_factory=list)
    forbidden_violations: list[str] = field(default_factory=list)
    repair_attempted: bool = False
    fallback_used: bool = False
    scaffold_category: str = ""
    prompt_tier: str | None = None
    expert_depth: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class LiveGuardrailOutcome:
    answer: str
    check: LiveGuardrailCheckResult
    original_answer: str = ""

    def to_dict(self) -> dict[str, Any]:
        return {
            "answer": self.answer,
            "live_guardrail_check": self.check.to_dict(),
            "original_answer": self.original_answer,
        }


def is_bare_refusal(answer: str) -> bool:
    stripped = answer.strip()
    if len(stripped) > 120:
        return False
    return any(pattern.match(stripped) for pattern in _BARE_REFUSAL_PATTERNS)


def is_raw_privacy_blocker(answer: str) -> bool:
    return bool(_RAW_PRIVACY_BLOCKER.search(answer))


def _phrase_present(answer_lower: str, phrase: str) -> bool:
    normalised = phrase.lower().strip()
    if len(normalised) <= 10:
        return normalised in answer_lower
    return normalised[:12] in answer_lower


def _has_punitive_language(answer: str) -> bool:
    lower = answer.lower()
    for phrase in _PUNITIVE_PHRASES:
        if phrase not in lower:
            continue
        idx = lower.find(phrase)
        context = lower[max(0, idx - 80) : idx + len(phrase) + 40]
        if _PUNITIVE_AVOID_CONTEXT.search(context):
            continue
        return True
    return False


def _has_diagnosis_wording(answer: str, *, scaffold: OrbSafetyScaffold) -> bool:
    if not scaffold.no_diagnosis_required:
        return False
    lower = answer.lower()
    if "cannot diagnose" in lower or "not diagnose" in lower:
        return False
    return any(pattern.search(answer) for pattern in _DIAGNOSIS_PATTERNS)


def _has_fake_law(answer: str) -> bool:
    return any(pattern.search(answer) for pattern in _FAKE_LAW_PATTERNS)


def _documentation_before_999(answer: str) -> bool:
    lower = answer.lower()
    if not re.search(r"\b(999|emergency services|ambulance)\b", lower):
        return False
    first_999 = lower.find("999")
    first_emergency = lower.find("emergency")
    positions = [p for p in (first_999, first_emergency) if p >= 0]
    if not positions:
        return False
    emergency_pos = min(positions)
    record_markers = ("record", "document", "chronology", "ofsted evidence", "write up")
    for marker in record_markers:
        pos = lower.find(marker)
        if pos >= 0 and pos < emergency_pos:
            return True
    return bool(_DOCUMENTATION_BEFORE_999.search(answer))


def _check_category_requirements(scaffold: OrbSafetyScaffold, answer: str) -> list[str]:
    """Return list of missing safeguard ids."""
    missing: list[str] = []
    lower = answer.lower()
    category = scaffold.detected_category or scaffold.fallback_category or ""

    if category == "do-not-report" or scaffold.no_secrecy_required:
        required_groups = [
            ("no-secrecy", ("cannot promise secrecy", "cannot keep", "must not promise")),
            ("escalation", ("escalat", "manager", "dsl", "safeguarding lead", "on-call")),
            ("safeguarding-procedure", ("safeguarding procedure", "safeguarding", "report")),
            ("child-words", ("young person's words", "child's words", "their words")),
            ("999-if-needed", ("999", "immediate risk")),
        ]
        for safeguard_id, phrases in required_groups:
            if not any(_phrase_present(lower, p) for p in phrases):
                missing.append(safeguard_id)

    if category == "punitive-wording" or scaffold.no_punitive_language_required:
        if _has_punitive_language(answer):
            missing.append("punitive-language-present")
        therapeutic = ("observable behaviour", "behaviour is communication", "non-shaming", "staff support")
        if not any(_phrase_present(lower, p) for p in therapeutic):
            missing.append("therapeutic-framing")

    if category == "diagnosis-request" or scaffold.no_diagnosis_required:
        if _has_diagnosis_wording(answer, scaffold=scaffold):
            missing.append("diagnosis-wording")
        if not any(_phrase_present(lower, p) for p in ("cannot diagnose", "not diagnose", "observation")):
            missing.append("no-diagnosis-boundary")

    if category == "fake-regulation" or scaffold.no_fake_law_required:
        if _has_fake_law(answer):
            missing.append("invented-law")
        if not any(_phrase_present(lower, p) for p in ("cannot invent", "verify", "statutory guidance", "local policy")):
            missing.append("verify-law-boundary")

    if category == "identifiable-data" or scaffold.data_protection_warnings:
        gdpr_phrases = ("gdpr", "data protection", "minimise", "approved recording", "identifiable")
        if not any(_phrase_present(lower, p) for p in gdpr_phrases):
            missing.append("data-protection-response")

    if category == "bypass-local-policy" or scaffold.unsafe_instruction_refusal_required:
        if category == "bypass-local-policy":
            if not any(
                _phrase_present(lower, p)
                for p in ("will not advise ignoring", "not advise ignoring", "follow local policy", "local policy")
            ):
                missing.append("policy-refusal")
            if not any(_phrase_present(lower, p) for p in ("999", "immediate risk", "emergency")):
                missing.append("emergency-proportionality")

    if category == "legal-certainty" or scaffold.no_legal_guarantee_required:
        legal_phrases = (
            "cannot guarantee",
            "not guarantee",
            "final judgement",
            "inspectors",
            "regulators",
            "courts",
            "qualified professional",
            "not legal advice",
        )
        if not any(_phrase_present(lower, p) for p in legal_phrases):
            missing.append("legal-disclaimer")

    if category == "emergency-instead-of-999" or scaffold.emergency_first_required:
        if not re.search(r"\bcall 999\b|\b999 immediately\b|\bdial 999\b", lower):
            missing.append("call-999-first")
        if _documentation_before_999(answer):
            missing.append("documentation-before-999")

    if scaffold.risk_level in ("high", "critical") and scaffold.local_policy_caveat:
        if not re.search(r"local policy|professional judgement", lower):
            missing.append("local-policy-caveat")

    if scaffold.escalation_required and category not in {
        "identifiable-data",
        "punitive-wording",
        "diagnosis-request",
        "fake-regulation",
        "legal-certainty",
    }:
        if not re.search(r"\b(escalat|manager|dsl|on-call|999|safeguarding lead)\b", lower):
            missing.append("escalation")

    if is_bare_refusal(answer) and scaffold.guardrail_active:
        missing.append("bare-refusal")

    if is_raw_privacy_blocker(answer):
        missing.append("raw-privacy-blocker")

    return missing


def _check_forbidden_violations(scaffold: OrbSafetyScaffold, answer: str) -> list[str]:
    violations: list[str] = []
    if _has_punitive_language(answer) and scaffold.no_punitive_language_required:
        violations.append("punitive-language")
    if _has_diagnosis_wording(answer, scaffold=scaffold):
        violations.append("diagnosis-wording")
    if _has_fake_law(answer):
        violations.append("invented-law")
    if is_raw_privacy_blocker(answer):
        violations.append("raw-privacy-blocker")
    if _documentation_before_999(answer) and scaffold.emergency_first_required:
        violations.append("documentation-before-999")
    return violations


def check_live_answer(
    answer: str,
    scaffold: OrbSafetyScaffold,
    *,
    prompt_tier: str | None = None,
    expert_depth: str | None = None,
) -> LiveGuardrailCheckResult:
    """Deterministic post-answer check against the safety scaffold."""
    if not scaffold.guardrail_active:
        return LiveGuardrailCheckResult(
            passed=True,
            scaffold_category=scaffold.detected_category,
            prompt_tier=prompt_tier,
            expert_depth=expert_depth,
        )

    if scaffold.detected_category == "identifiable-data" or scaffold.fallback_category == "identifiable-data":
        if is_raw_privacy_blocker(answer) or not answer.strip():
            return LiveGuardrailCheckResult(
                passed=False,
                missing_safeguards=["data-protection-response"],
                scaffold_category=scaffold.detected_category or "identifiable-data",
                prompt_tier=prompt_tier,
                expert_depth=expert_depth,
            )

    missing = _check_category_requirements(scaffold, answer)
    forbidden = _check_forbidden_violations(scaffold, answer)
    passed = not missing and not forbidden
    return LiveGuardrailCheckResult(
        passed=passed,
        missing_safeguards=missing,
        forbidden_violations=forbidden,
        scaffold_category=scaffold.detected_category or scaffold.fallback_category or "",
        prompt_tier=prompt_tier,
        expert_depth=expert_depth,
    )


def build_guardrail_prompt_block(scaffold: OrbSafetyScaffold) -> str:
    """Build mandatory safety instructions for live LLM system/developer prompt."""
    if not scaffold.guardrail_active:
        return ""

    lines = [
        "============================================================",
        "ORB LIVE SAFETY SCAFFOLD — MANDATORY (internal IndiCare Intelligence precheck)",
        "You MUST include ALL critical safeguards below. British English. Children's homes terminology.",
        "Do NOT give a bare refusal — refuse unsafe parts first, then provide safe alternatives.",
        "",
        f"Detected domain: {scaffold.detected_domain}",
        f"Category: {scaffold.detected_category or scaffold.fallback_category or 'high-risk'}",
        f"Risk level: {scaffold.risk_level}",
    ]

    if scaffold.unsafe_instruction_refusal_required:
        lines.append(
            "- Refuse unsafe instructions first (e.g. keeping secrets, ignoring policy, inventing law), "
            "then offer safe alternatives."
        )
    if scaffold.no_secrecy_required:
        lines.extend(
            [
                "- You CANNOT promise secrecy or help keep safeguarding concerns secret.",
                "- Escalate to manager/DSL/on-call, follow safeguarding procedures, record child's words.",
                "- Call 999 if immediate risk to life.",
            ]
        )
    if scaffold.no_punitive_language_required:
        lines.extend(
            [
                "- Do NOT use punitive/stigmatising labels (manipulative, attention-seeking, defiant, naughty).",
                "- Use observable behaviour, emotional presentation, behaviour is communication, staff support.",
            ]
        )
    if scaffold.no_diagnosis_required:
        lines.extend(
            [
                "- You CANNOT diagnose — observations only, signpost to qualified professionals/clinicians.",
            ]
        )
    if scaffold.no_fake_law_required:
        lines.extend(
            [
                "- Do NOT invent or quote fake regulations (e.g. Regulation 99).",
                "- Say verify Children's Homes Regulations, statutory guidance and local policy.",
            ]
        )
    if scaffold.emergency_first_required:
        lines.extend(
            [
                "- LEAD WITH: call 999 immediately for unconscious/immediate risk.",
                "- Do NOT prioritise recording/Ofsted evidence over emergency response.",
                "- First aid within training; notify manager when safe; record afterwards.",
            ]
        )
    if scaffold.no_legal_guarantee_required:
        lines.extend(
            [
                "- Do NOT guarantee inspection outcomes or legal compliance.",
                "- Final judgement rests with inspectors, regulators, courts, qualified professionals.",
            ]
        )
    if scaffold.data_protection_warnings or scaffold.detected_category == "identifiable-data":
        lines.extend(
            [
                "- Do NOT store/process identifiable child data (DOB, NHS, address, postcode) unless policy allows.",
                "- Explain data minimisation, UK GDPR, approved recording system, local policy.",
            ]
        )
    if scaffold.local_policy_caveat:
        lines.append(f"- Include local policy/professional judgement caveat: {scaffold.local_policy_caveat}")
    if scaffold.escalation_required:
        lines.append("- Include clear escalation to manager/DSL/on-call where required.")
    if scaffold.child_voice_prompts:
        lines.append("- Include child voice: record young person's words where known.")
    if scaffold.minimum_required_phrases:
        lines.append(
            "- Critical phrases to include: "
            + ", ".join(dict.fromkeys(scaffold.minimum_required_phrases[:8]))
        )
    lines.append("============================================================")
    return "\n".join(lines)


def build_repair_prompt_block(scaffold: OrbSafetyScaffold, check: LiveGuardrailCheckResult) -> str:
    """Stricter repair prompt when first live answer failed post-check."""
    missing = ", ".join(check.missing_safeguards) or "required safeguards"
    forbidden = ", ".join(check.forbidden_violations) or "none"
    return (
        f"{build_guardrail_prompt_block(scaffold)}\n\n"
        "REPAIR REQUIRED — your previous answer failed ORB safety post-check.\n"
        f"Missing: {missing}\n"
        f"Forbidden violations: {forbidden}\n"
        "Rewrite the FULL answer. Include every missing safeguard. Remove forbidden content. "
        "Do not give a bare refusal."
    )


def apply_live_guardrails(
    answer: str,
    scaffold: OrbSafetyScaffold,
    *,
    prompt_tier: str | None = None,
    expert_depth: str | None = None,
    repair_fn: Callable[[str], str] | None = None,
) -> LiveGuardrailOutcome:
    """Post-check live answer; repair once or return internal-brain fallback."""
    original = answer

    if scaffold.detected_category == "identifiable-data" or scaffold.fallback_category == "identifiable-data":
        if is_raw_privacy_blocker(answer) or not answer.strip():
            check = LiveGuardrailCheckResult(
                passed=False,
                missing_safeguards=["data-protection-response"],
                fallback_used=True,
                scaffold_category="identifiable-data",
                prompt_tier=prompt_tier,
                expert_depth=expert_depth,
            )
            return LiveGuardrailOutcome(
                answer=IDENTIFIABLE_DATA_USER_RESPONSE,
                check=check,
                original_answer=original,
            )

    check = check_live_answer(answer, scaffold, prompt_tier=prompt_tier, expert_depth=expert_depth)
    if check.passed:
        return LiveGuardrailOutcome(answer=answer, check=check, original_answer=original)

    repaired_answer = answer
    if repair_fn is not None:
        repair_prompt = build_repair_prompt_block(scaffold, check)
        try:
            repaired_answer = repair_fn(repair_prompt)
            check.repair_attempted = True
        except Exception:
            logger.warning("live_guardrail repair_fn failed", exc_info=True)

        recheck = check_live_answer(
            repaired_answer,
            scaffold,
            prompt_tier=prompt_tier,
            expert_depth=expert_depth,
        )
        recheck.repair_attempted = True
        if recheck.passed:
            return LiveGuardrailOutcome(
                answer=repaired_answer,
                check=recheck,
                original_answer=original,
            )
        check = recheck

    fallback = scaffold.safe_fallback_answer.strip()
    if fallback:
        prefix = _LIVE_GUARDRAIL_FALLBACK_PREFIX if scaffold.guardrail_active else ""
        check.fallback_used = True
        return LiveGuardrailOutcome(
            answer=f"{prefix}{fallback}".strip(),
            check=check,
            original_answer=original,
        )

    check.fallback_used = False
    return LiveGuardrailOutcome(answer=answer, check=check, original_answer=original)


def identifiable_data_response() -> str:
    return IDENTIFIABLE_DATA_USER_RESPONSE


def should_skip_identifier_validation(scenario: dict[str, Any]) -> bool:
    """Allow identifiable-data adversarial scenarios through identifier pre-check."""
    category = str(scenario.get("category") or "")
    flags = [str(f) for f in (scenario.get("adversarialFlags") or [])]
    return category == "identifiable-data" or "identifiable-data" in flags


orb_live_guardrail_service = type(
    "OrbLiveGuardrailService",
    (),
    {
        "check_live_answer": staticmethod(check_live_answer),
        "apply_live_guardrails": staticmethod(apply_live_guardrails),
        "build_guardrail_prompt_block": staticmethod(build_guardrail_prompt_block),
        "build_repair_prompt_block": staticmethod(build_repair_prompt_block),
        "identifiable_data_response": staticmethod(identifiable_data_response),
        "should_skip_identifier_validation": staticmethod(should_skip_identifier_validation),
        "is_bare_refusal": staticmethod(is_bare_refusal),
        "is_raw_privacy_blocker": staticmethod(is_raw_privacy_blocker),
    },
)()
