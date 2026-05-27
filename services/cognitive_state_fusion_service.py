from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class FusedCognitiveState:
    headline: str
    state_level: str
    active_pressures: tuple[str, ...] = field(default_factory=tuple)
    protective_factors: tuple[str, ...] = field(default_factory=tuple)
    oversight_needs: tuple[str, ...] = field(default_factory=tuple)
    evidence_gaps: tuple[str, ...] = field(default_factory=tuple)
    next_best_questions: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class CognitiveStateFusionService:
    """Fuses cognition signals into one operational state model.

    This is designed to become the heartbeat of IndiCare cognition.
    It can work with live operational context later, but currently supports
    text-derived / supplied-state fusion for ORB runtime use.
    """

    def fuse(
        self,
        *,
        safeguarding_pressure: str | None = None,
        emotional_climate: str | None = None,
        workforce_pressure: str | None = None,
        evidence_confidence: str | None = None,
        oversight_visibility: str | None = None,
        provider_state: str | None = None,
        child_lived_experience: str | None = None,
    ) -> FusedCognitiveState:
        active: list[str] = []
        protective: list[str] = []
        oversight: list[str] = []
        gaps: list[str] = []
        questions: list[str] = []

        values = {
            "safeguarding_pressure": safeguarding_pressure,
            "emotional_climate": emotional_climate,
            "workforce_pressure": workforce_pressure,
            "evidence_confidence": evidence_confidence,
            "oversight_visibility": oversight_visibility,
            "provider_state": provider_state,
            "child_lived_experience": child_lived_experience,
        }

        for key, value in values.items():
            normalised = str(value or "unclear").lower()
            if any(term in normalised for term in ("high", "critical", "pressure", "risk", "weak", "missing", "under_pressure")):
                active.append(key)
            if any(term in normalised for term in ("protective", "stable", "strong", "visible", "contained")):
                protective.append(key)

        if "safeguarding_pressure" in active:
            oversight.extend(["manager/DSL review", "protective action check", "escalation consideration"])
            questions.extend(["What cannot wait?", "Who needs to know now?", "What safety action is already in place?"])
        if "evidence_confidence" in active:
            gaps.extend(["child voice", "adult response", "impact", "manager oversight"])
            questions.append("What evidence is missing or unclear?")
        if "oversight_visibility" in active or "provider_state" in active:
            oversight.extend(["action ownership", "review date", "governance visibility"])
            questions.append("What has leadership reviewed and changed?")
        if "workforce_pressure" in active:
            oversight.append("staff debrief/support")
            questions.append("Could staff pressure be affecting practice quality?")
        if "child_lived_experience" in active:
            questions.append("What is life feeling like for the child right now?")

        level = self._level(active)
        headline = self._headline(level, active, protective)
        return FusedCognitiveState(
            headline=headline,
            state_level=level,
            active_pressures=tuple(active),
            protective_factors=tuple(protective),
            oversight_needs=tuple(dict.fromkeys(oversight)),
            evidence_gaps=tuple(dict.fromkeys(gaps)),
            next_best_questions=tuple(dict.fromkeys(questions)),
        )

    def fuse_from_context(self, context: dict[str, Any] | None) -> dict[str, Any]:
        context = context or {}
        priority = context.get("priority") or {}
        cognitive_state = context.get("cognitive_state") or {}
        emotional = context.get("emotional_climate") or {}
        confidence = context.get("confidence_calibration") or {}
        provider = context.get("provider_wide_cognition") or {}
        child = context.get("child_lived_experience") or {}

        fused = self.fuse(
            safeguarding_pressure=priority.get("top_level") or priority.get("top_priority"),
            emotional_climate=str(emotional.get("active_climates") or ""),
            workforce_pressure=str(cognitive_state.get("signals") or ""),
            evidence_confidence=confidence.get("confidence"),
            oversight_visibility=str(cognitive_state.get("signals") or ""),
            provider_state=provider.get("provider_state"),
            child_lived_experience=str(child.get("signals") or ""),
        )
        return fused.to_dict()

    def prompt_addendum(self, context: dict[str, Any] | None) -> str:
        fused = self.fuse_from_context(context)
        lines = [
            "Cognitive state fusion:",
            f"- Headline: {fused['headline']}",
            f"- State level: {fused['state_level']}",
        ]
        if fused["active_pressures"]:
            lines.append("- Active pressures: " + "; ".join(fused["active_pressures"]))
        if fused["protective_factors"]:
            lines.append("- Protective factors: " + "; ".join(fused["protective_factors"]))
        if fused["oversight_needs"]:
            lines.append("- Oversight needs: " + "; ".join(fused["oversight_needs"]))
        if fused["evidence_gaps"]:
            lines.append("- Evidence gaps: " + "; ".join(fused["evidence_gaps"]))
        if fused["next_best_questions"]:
            lines.append("- Next best questions: " + "; ".join(fused["next_best_questions"][:5]))
        return "\n".join(lines)

    def _level(self, active: list[str]) -> str:
        if len(active) >= 4:
            return "high_attention"
        if len(active) >= 2:
            return "watch_closely"
        if active:
            return "watch"
        return "stable_or_unclear"

    def _headline(self, level: str, active: list[str], protective: list[str]) -> str:
        if level == "high_attention":
            return "Multiple cognition pressures are active; ORB should foreground safety, oversight and evidence."
        if level == "watch_closely":
            return "Several practice signals require reflective attention."
        if level == "watch":
            return "One primary cognition pressure is visible."
        if protective:
            return "Protective signals are visible, but ORB should remain curious."
        return "State is stable or unclear from available context."


cognitive_state_fusion_service = CognitiveStateFusionService()
