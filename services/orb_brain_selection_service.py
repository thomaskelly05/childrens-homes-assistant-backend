"""ORB brain selection engine — Quick / Standard / Deep routing (design phase).

Automatically chooses intelligence depth from prompt, mode, attachments, agent type
and optional user tier override. Maps to existing ``prompt_tier``, ``expert_depth``
and agent ``depth`` values without changing production routes yet.

Wire behind a feature flag (e.g. ``ORB_BRAIN_SELECTION_ENABLED``) in a future sprint.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Literal

BrainTier = Literal["quick", "standard", "deep"]
RecommendedRoute = Literal[
    "conversation",
    "agent",
    "deep_research",
    "document_analysis",
]

# Mirrors high-risk terms in orb_knowledge_retrieval_service — safeguarding must not downgrade.
HIGH_RISK_TERMS = (
    "immediate danger",
    "suicide",
    "self-harm",
    "self harm",
    "abuse",
    "allegation",
    "exploitation",
    "missing from care",
    "restraint",
    "medication error",
    "peer-on-peer",
    "peer on peer",
    "sexual harm",
    "weapon",
    "emergency",
    "lado",
)

DEEP_SAFETY_MODES = {"Safeguarding Thinking", "Safeguarding"}

RESIDENTIAL_MODES = {
    "Record This Properly",
    "Ofsted Lens",
    "Therapeutic Reframe",
    "Manager Copilot",
    "Staff Coach",
    "Reg 44 / Reg 45 Prep",
    "Behaviour Support",
    "Policy Explainer",
    "Scenario Simulator",
    "Reflect with ORB",
}

DEEP_AGENT_TYPES = frozenset(
    {
        "deep_research",
        "ofsted_research",
        "policy_comparison",
        "document_analysis",
    }
)

STANDARD_AGENT_TYPES = frozenset(
    {
        "recording_quality",
        "safeguarding_reflection",
        "manager_briefing",
        "therapeutic_practice",
        "general_research",
    }
)

# Factual regulation / policy definition patterns → Quick when no active scenario.
QUICK_DEFINITION_PATTERNS = (
    "what does regulation",
    "what is regulation",
    "what does reg ",
    "what is reg ",
    "what does the regulation mean",
    "what does sccif",
    "what is sccif",
    "what does quality standard",
    "what is quality standard",
    "what does working together",
    "define regulation",
    "explain regulation",
    "meaning of regulation",
)

DEEP_WORKFLOW_PATTERNS = (
    "evidence map",
    "sccif review",
    "provider review",
    "audit",
    "investigation",
    "deep research",
    "gap analysis",
    "reg 44",
    "reg 45",
    "reg44",
    "reg45",
    "ofsted evidence",
    "inspection prep",
    "compare policy",
    "policy comparison",
)


class UserTierOverride(str, Enum):
    """Explicit user selection when UI offers tier control."""

    AUTO = "auto"
    QUICK = "quick"
    STANDARD = "standard"
    DEEP = "deep"


@dataclass(frozen=True)
class BrainSelectionResult:
    """Output of brain selection — safe to log (no PII)."""

    tier: BrainTier
    confidence: float
    reason: str
    recommended_route: RecommendedRoute
    # Legacy mapping for gradual rollout alongside existing systems.
    prompt_tier: str
    expert_depth: str
    agent_depth: str
    signals: dict[str, Any] = field(default_factory=dict)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: str) -> str:
    return _text(value).lower()


def _has_attachments(attachments: list[Any] | None) -> bool:
    return bool(attachments)


def _word_count(message: str) -> int:
    return len(_lower(message).split())


def _is_recording_support_query(lower: str) -> bool:
    """Recording/wording help without active injury or allegation markers."""
    if not any(
        phrase in lower
        for phrase in (
            "record",
            "recording",
            "write",
            "wording",
            "note",
            "log",
            "draft",
            "chronology",
        )
    ):
        return False
    if any(
        marker in lower
        for marker in (
            "injury",
            "hurt",
            "hospital",
            "abuse",
            "allegation",
            "serious harm",
            "escalat",
            "immediate danger",
            "disclosed",
        )
    ):
        # Allow negated injury phrases common in recording prompts.
        if "no injury" in lower or "without injury" in lower:
            return True
        return False
    return True


def _is_restraint_recording_only(lower: str) -> bool:
    return "restraint" in lower and _is_recording_support_query(lower)


def _map_tier_to_legacy(tier: BrainTier) -> tuple[str, str, str]:
    """Map unified tier to existing prompt_tier, expert_depth, agent_depth."""
    if tier == "quick":
        return "fast", "general_light", "quick"
    if tier == "deep":
        return "deep", "residential_deep", "deep"
    return "residential", "residential_standard", "standard"


def _map_expert_depth_to_tier(expert_depth: str) -> BrainTier:
    depth = _lower(expert_depth)
    if depth in ("general_light",):
        return "quick"
    if depth in ("residential_deep", "safeguarding_critical"):
        return "deep"
    return "standard"


def _recommended_route(
    tier: BrainTier,
    *,
    agent_type: str | None,
    has_attachments: bool,
    lower_message: str,
) -> RecommendedRoute:
    if agent_type == "document_analysis" or (
        has_attachments and any(p in lower_message for p in ("analyse", "analyze", "review this document", "read this"))
    ):
        return "document_analysis"
    if tier == "deep" and (
        agent_type == "deep_research"
        or "deep research" in lower_message
        or any(p in lower_message for p in DEEP_WORKFLOW_PATTERNS)
    ):
        return "deep_research"
    if agent_type and agent_type in DEEP_AGENT_TYPES | STANDARD_AGENT_TYPES:
        return "agent"
    return "conversation"


class OrbBrainSelectionService:
    """Select Quick / Standard / Deep intelligence depth for an ORB request."""

    def select_brain(
        self,
        prompt: str,
        *,
        mode: str | None = None,
        attachments: list[Any] | None = None,
        agent_type: str | None = None,
        user_selection: str | UserTierOverride | None = None,
    ) -> BrainSelectionResult:
        """Return recommended brain tier with confidence and legacy mappings.

        Uses existing classification services as signals. Does not mutate production
        routing until explicitly wired.
        """
        message = _text(prompt)
        mode_name = _text(mode) or "Ask ORB"
        lower = _lower(message)
        has_att = _has_attachments(attachments)
        override = UserTierOverride(_lower(_text(user_selection) or "auto"))

        from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
        from services.indicare_intelligence_core_service import indicare_intelligence_core_service

        classification = orb_knowledge_retrieval_service.classify_query(
            message,
            mode=mode_name,
            profile_context=False,
            attachments=attachments,
        )
        intents = classification.get("intents") or {}
        prompt_tier = orb_knowledge_retrieval_service.resolve_prompt_tier(
            message,
            mode=mode_name,
            classification=classification,
            profile_context=False,
            attachments=attachments,
        )
        expert_depth = indicare_intelligence_core_service.estimate_expert_depth(
            message,
            mode=mode_name,
            profile_context=has_att,
        )

        tier, confidence, reason = self._resolve_tier(
            message,
            mode_name=mode_name,
            lower=lower,
            intents=intents,
            prompt_tier=prompt_tier,
            expert_depth=expert_depth,
            agent_type=agent_type,
            has_attachments=has_att,
            user_override=override,
        )

        legacy_prompt, legacy_expert, legacy_agent = _map_tier_to_legacy(tier)
        # Preserve safeguarding-critical expert depth on deep tier.
        if tier == "deep" and expert_depth == "safeguarding_critical":
            legacy_expert = "safeguarding_critical"

        route = _recommended_route(
            tier,
            agent_type=agent_type,
            has_attachments=has_att,
            lower_message=lower,
        )

        return BrainSelectionResult(
            tier=tier,
            confidence=round(confidence, 3),
            reason=reason,
            recommended_route=route,
            prompt_tier=legacy_prompt,
            expert_depth=legacy_expert,
            agent_depth=legacy_agent,
            signals={
                "mode": mode_name,
                "word_count": _word_count(message),
                "classification_intents": {k: v for k, v in intents.items() if v},
                "legacy_prompt_tier": prompt_tier,
                "legacy_expert_depth": expert_depth,
                "agent_type": agent_type,
                "user_selection": override.value,
            },
        )

    def _resolve_tier(
        self,
        message: str,
        *,
        mode_name: str,
        lower: str,
        intents: dict[str, Any],
        prompt_tier: str,
        expert_depth: str,
        agent_type: str | None,
        has_attachments: bool,
        user_override: UserTierOverride,
    ) -> tuple[BrainTier, float, str]:
        # User override — never downgrade safeguarding-critical below standard.
        if user_override != UserTierOverride.AUTO:
            forced = user_override.value
            if forced == "quick" and self._must_be_deep(
                lower, mode_name, intents, expert_depth, agent_type, has_attachments
            ):
                return (
                    "deep",
                    0.95,
                    "User requested Quick but safeguarding or deep workflow signals require Deep.",
                )
            if forced in ("quick", "standard", "deep"):
                return (
                    forced,  # type: ignore[return-value]
                    0.99,
                    f"User explicitly selected {forced.upper()} mode.",
                )

        # Hard deep triggers — safeguarding non-negotiable.
        if mode_name in DEEP_SAFETY_MODES:
            return "deep", 0.98, f"Mode '{mode_name}' requires full safeguarding brain."
        if expert_depth == "safeguarding_critical":
            return "deep", 0.98, "Safeguarding-critical terms detected."
        if any(term in lower for term in HIGH_RISK_TERMS):
            if _is_restraint_recording_only(lower):
                return (
                    "standard",
                    0.88,
                    "Restraint recording support without injury markers — Standard tier.",
                )
            return "deep", 0.95, "High-risk safeguarding terms require Deep tier."

        # Agent-driven depth.
        if agent_type in DEEP_AGENT_TYPES:
            return "deep", 0.92, f"Agent type '{agent_type}' requires Deep tier."
        if agent_type in STANDARD_AGENT_TYPES:
            return "standard", 0.9, f"Agent type '{agent_type}' uses Standard tier."

        # Deep workflow patterns.
        if any(pattern in lower for pattern in DEEP_WORKFLOW_PATTERNS):
            return "deep", 0.9, "Deep workflow pattern (evidence map, audit, Reg 44/45, etc.)."

        # Document with analysis intent.
        if has_attachments and any(
            p in lower for p in ("analyse", "analyze", "review", "compare", "extract")
        ):
            return "deep", 0.85, "Document attached with analysis intent."

        # Recording support — Standard even when message is short.
        if _is_recording_support_query(lower):
            return (
                "standard",
                0.88,
                "Recording or wording support — Standard tier with retrieval and grounding.",
            )

        # Quick: factual regulation / policy definitions.
        if any(pattern in lower for pattern in QUICK_DEFINITION_PATTERNS):
            if not intents.get("safeguarding_principles") and _word_count(message) <= 20:
                return (
                    "quick",
                    0.9,
                    "Factual regulation or framework definition — Quick tier with cached grounding.",
                )

        # Quick: short general knowledge.
        if (
            intents.get("general_knowledge")
            and _word_count(message) <= 10
            and not intents.get("recording_quality")
        ):
            return "quick", 0.85, "Short general knowledge question."

        if (
            _word_count(message) <= 6
            and not any(
                intents.get(flag)
                for flag in (
                    "regulatory_framework",
                    "recording_quality",
                    "safeguarding_principles",
                    "therapeutic_practice",
                    "residential_childrens_homes",
                )
            )
        ):
            return "quick", 0.8, "Very short message with no specialist intents."

        # Residential modes → Standard default.
        if mode_name in RESIDENTIAL_MODES:
            return "standard", 0.88, f"Residential mode '{mode_name}' uses Standard tier."

        # Recording / regulatory / residential intents without deep markers.
        if intents.get("recording_quality") or intents.get("regulatory_framework"):
            if any(p in lower for p in ("write", "record", "draft", "wording", "log", "note")):
                return "standard", 0.87, "Recording or regulatory practice support."
            # Pure definition already handled; remaining regulatory → standard.
            return "standard", 0.8, "Regulatory framework intent."

        if intents.get("therapeutic_practice") or intents.get("residential_childrens_homes"):
            return "standard", 0.82, "Residential or therapeutic practice question."

        if has_attachments:
            return "standard", 0.75, "Attachments present — Standard tier for grounding."

        # Align with legacy prompt_tier as fallback signal.
        if prompt_tier == "fast":
            return "quick", 0.7, "Legacy prompt_tier=fast."
        if prompt_tier == "deep":
            return "deep", 0.75, "Legacy prompt_tier=deep."

        legacy_tier = _map_expert_depth_to_tier(expert_depth)
        if legacy_tier == "deep":
            return "deep", 0.72, f"Legacy expert_depth={expert_depth}."

        return "standard", 0.65, "Default Standard tier for residential guidance."

    def _must_be_deep(
        self,
        lower: str,
        mode_name: str,
        intents: dict[str, Any],
        expert_depth: str,
        agent_type: str | None,
        has_attachments: bool,
    ) -> bool:
        if mode_name in DEEP_SAFETY_MODES:
            return True
        if expert_depth in ("safeguarding_critical", "residential_deep"):
            return True
        if intents.get("safeguarding_principles"):
            return True
        if agent_type in DEEP_AGENT_TYPES:
            return True
        if any(term in lower for term in HIGH_RISK_TERMS) and not _is_restraint_recording_only(lower):
            return True
        if any(p in lower for p in DEEP_WORKFLOW_PATTERNS):
            return True
        if has_attachments and any(p in lower for p in ("analyse", "analyze", "audit")):
            return True
        return False


orb_brain_selection_service = OrbBrainSelectionService()
