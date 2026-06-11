"""ORB Adversarial Safety Firewall V4 — deterministic pre-LLM safety for known adversarial categories."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any, Literal

from services.orb_internal_brain_fallbacks import build_structured_fallback_answer, resolve_fallback_category
from services.orb_live_guardrail_service import IDENTIFIABLE_DATA_USER_RESPONSE
from services.orb_safety_scaffold_service import OrbSafetyScaffold

ADVERSARIAL_FIREWALL_CATEGORIES = frozenset(
    {
        "do-not-report",
        "punitive-wording",
        "diagnosis-request",
        "fake-regulation",
        "identifiable-data",
        "bypass-local-policy",
        "legal-certainty",
        "emergency-instead-of-999",
    }
)

_FIREWALL_ANSWER_PREFIX = (
    "ORB returned a deterministic safety response because this prompt contained an unsafe "
    "adversarial instruction. No external LLM was called.\n\n"
)

FirewallAnswerSource = Literal["safety_firewall", "privacy_block"]


@dataclass
class FirewallDecision:
    """Result of pre-LLM adversarial safety firewall evaluation."""

    should_firewall: bool
    category: str = ""
    reason: str = ""
    final_answer: str = ""
    answer_source: FirewallAnswerSource | None = None
    openai_called: bool = False
    scoring_answer: str = ""
    display_answer: str = ""
    required_safeguards: list[str] = field(default_factory=list)
    safety_firewall_used: bool = False

    def __post_init__(self) -> None:
        if self.should_firewall and not self.scoring_answer:
            self.scoring_answer = self.final_answer
        if self.should_firewall and not self.display_answer:
            self.display_answer = self.final_answer

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["safety_firewall_used"] = self.safety_firewall_used
        data["live_llm_bypassed"] = self.should_firewall
        data["answer_used_for_scoring"] = self.scoring_answer
        data["answer_used_for_display"] = self.display_answer
        return data


def _resolved_category(
    *,
    safety_scaffold: OrbSafetyScaffold | dict[str, Any] | None,
    scenario_category: str | None,
) -> str:
    if isinstance(safety_scaffold, dict):
        return str(
            safety_scaffold.get("detected_category")
            or safety_scaffold.get("fallback_category")
            or scenario_category
            or ""
        )
    if safety_scaffold is not None:
        return (
            safety_scaffold.detected_category
            or safety_scaffold.fallback_category
            or scenario_category
            or ""
        )
    return scenario_category or ""


def _scaffold_flags(safety_scaffold: OrbSafetyScaffold | dict[str, Any] | None) -> list[str]:
    if isinstance(safety_scaffold, dict):
        return [str(f) for f in (safety_scaffold.get("adversarial_flags") or [])]
    return []


def build_firewall_fallback_answer(
    *,
    category: str,
    adversarial_flags: list[str] | None = None,
    safe_fallback_answer: str = "",
) -> str:
    """Build the canonical deterministic answer for an adversarial category."""
    if category == "identifiable-data":
        return IDENTIFIABLE_DATA_USER_RESPONSE

    if safe_fallback_answer.strip():
        body = safe_fallback_answer.strip()
        if body.startswith("[ORB Internal Brain"):
            return f"{_FIREWALL_ANSWER_PREFIX}{body}"
        return f"{_FIREWALL_ANSWER_PREFIX}{body}"

    flags = list(adversarial_flags or [])
    if category and category not in flags:
        flags.append(category)
    structured = build_structured_fallback_answer(
        category=category,
        adversarial_flags=flags,
        orb_mode="Safeguarding Thinking",
        deterministic_answer=None,
        local_policy_caveats=[],
        regulatory_anchors=[],
        data_protection_warnings=[],
    )
    return f"{_FIREWALL_ANSWER_PREFIX}{structured}".strip()


def _required_safeguards_for_category(category: str) -> list[str]:
    mapping: dict[str, list[str]] = {
        "do-not-report": ["no secrecy promise", "escalation required", "safeguarding referral"],
        "punitive-wording": ["anti-stigmatising language"],
        "diagnosis-request": ["no clinical diagnosis"],
        "fake-regulation": ["accurate legal framing"],
        "identifiable-data": ["GDPR", "data minimisation", "privacy"],
        "bypass-local-policy": ["policy alignment", "emergency proportionality"],
        "legal-certainty": ["disclaimer"],
        "emergency-instead-of-999": ["emergency services"],
    }
    return mapping.get(category, [])


def should_firewall_before_llm(
    message: str,
    safety_scaffold: OrbSafetyScaffold | dict[str, Any] | None,
    scenario_category: str | None = None,
) -> FirewallDecision:
    """
    Return a firewall decision before calling OpenAI for the primary answer.

    Known adversarial categories bypass the LLM and return deterministic internal-brain fallbacks.
    """
    _ = message  # reserved for future message-level overrides
    category = _resolved_category(safety_scaffold=safety_scaffold, scenario_category=scenario_category)
    flags = _scaffold_flags(safety_scaffold)

    if not category:
        resolved = resolve_fallback_category(category="", adversarial_flags=flags)
        category = resolved or ""

    if category not in ADVERSARIAL_FIREWALL_CATEGORIES:
        return FirewallDecision(should_firewall=False, category=category)

    safe_fallback = ""
    if isinstance(safety_scaffold, dict):
        safe_fallback = str(safety_scaffold.get("safe_fallback_answer") or "")
    elif safety_scaffold is not None:
        safe_fallback = str(safety_scaffold.safe_fallback_answer or "")

    final_answer = build_firewall_fallback_answer(
        category=category,
        adversarial_flags=flags or [category],
        safe_fallback_answer=safe_fallback,
    )
    answer_source: FirewallAnswerSource = (
        "privacy_block" if category == "identifiable-data" else "safety_firewall"
    )
    reason = (
        f"Adversarial category '{category}' detected — deterministic safety firewall bypasses live LLM."
    )

    return FirewallDecision(
        should_firewall=True,
        category=category,
        reason=reason,
        final_answer=final_answer,
        answer_source=answer_source,
        openai_called=False,
        scoring_answer=final_answer,
        display_answer=final_answer,
        required_safeguards=_required_safeguards_for_category(category),
        safety_firewall_used=True,
    )


def firewall_decision_to_live_guardrail(
    decision: FirewallDecision,
    *,
    raw_answer: str = "",
) -> dict[str, Any]:
    """Map a firewall decision to live_guardrail metadata compatible with evaluation scoring."""
    if not decision.should_firewall:
        return {}
    return {
        "raw_answer": raw_answer,
        "final_answer": decision.final_answer,
        "answer_source": decision.answer_source,
        "guardrail_passed": True,
        "repair_attempted": False,
        "fallback_used": decision.answer_source == "safety_firewall",
        "fail_reasons": [],
        "safety_scaffold_category": decision.category,
        "minimum_required_phrases": decision.required_safeguards,
        "forbidden_phrases_detected": [],
        "scoring_answer": decision.scoring_answer,
        "answer_used_for_scoring": decision.scoring_answer,
        "answer_used_for_display": decision.display_answer,
        "openai_called": False,
        "safety_firewall_used": True,
        "live_llm_bypassed": True,
        "safety_firewall_reason": decision.reason,
        "live_guardrail_check": {
            "passed": True,
            "missing_safeguards": [],
            "forbidden_violations": [],
            "repair_attempted": False,
            "fallback_used": decision.answer_source == "safety_firewall",
            "scaffold_category": decision.category,
        },
    }


orb_adversarial_safety_firewall_service = type(
    "OrbAdversarialSafetyFirewallService",
    (),
    {
        "should_firewall_before_llm": staticmethod(should_firewall_before_llm),
        "build_firewall_fallback_answer": staticmethod(build_firewall_fallback_answer),
        "firewall_decision_to_live_guardrail": staticmethod(firewall_decision_to_live_guardrail),
        "ADVERSARIAL_FIREWALL_CATEGORIES": ADVERSARIAL_FIREWALL_CATEGORIES,
    },
)()
