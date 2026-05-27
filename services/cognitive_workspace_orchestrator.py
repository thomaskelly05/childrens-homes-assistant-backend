from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class WorkspaceSurfaceDecision:
    surface: str
    priority: str
    visible: bool
    reason: str
    suggested_copy: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class CognitiveWorkspaceOrchestrator:
    """Attention-aware workspace orchestration for ORB.

    The goal is not to show every cognition layer. The goal is to keep /orb calm,
    premium and non-overwhelming while surfacing the right insight at the right time.
    """

    SURFACES = {
        "safeguarding_attention": "Safeguarding attention",
        "evidence_confidence": "Evidence confidence",
        "reflective_prompt": "Reflective prompt",
        "ofsted_lens": "Ofsted lens",
        "emotional_climate": "Emotional climate",
        "recording_quality": "Recording quality",
        "manager_oversight": "Manager oversight",
        "general_suggestions": "Suggested next prompts",
    }

    def decide(self, *, message: str, cognition_context: dict[str, Any] | None = None) -> dict[str, Any]:
        lower = str(message or "").lower()
        context = cognition_context or {}
        decisions: list[WorkspaceSurfaceDecision] = []

        if any(term in lower for term in ("safeguarding", "allegation", "missing", "harm", "police", "exploitation", "lado")):
            decisions.append(
                WorkspaceSurfaceDecision(
                    surface="safeguarding_attention",
                    priority="critical",
                    visible=True,
                    reason="Safeguarding or high-attention language is present.",
                    suggested_copy="Check what is known, what is missing, who needs to know, and what cannot wait.",
                )
            )
        if any(term in lower for term in ("record", "daily note", "incident report", "wording", "child voice")):
            decisions.append(
                WorkspaceSurfaceDecision(
                    surface="recording_quality",
                    priority="high",
                    visible=True,
                    reason="The user appears to need recording or wording support.",
                    suggested_copy="Would you like ORB to turn this into factual, child-centred wording?",
                )
            )
        if any(term in lower for term in ("ofsted", "sccif", "reg 44", "reg 45", "inspection", "evidence")):
            decisions.append(
                WorkspaceSurfaceDecision(
                    surface="ofsted_lens",
                    priority="high",
                    visible=True,
                    reason="Inspection or evidence language is present.",
                    suggested_copy="Consider what evidence shows impact, not just activity.",
                )
            )
        if any(term in lower for term in ("upset", "dysregulated", "burnout", "overwhelmed", "tired", "distressed")):
            decisions.append(
                WorkspaceSurfaceDecision(
                    surface="emotional_climate",
                    priority="medium",
                    visible=True,
                    reason="Emotional climate or staff pressure language is present.",
                    suggested_copy="Pause and consider regulation, repair and adult emotional capacity.",
                )
            )
        confidence = str((context.get("confidence_calibration") or {}).get("confidence") or "").lower()
        if confidence in {"low", "medium"}:
            decisions.append(
                WorkspaceSurfaceDecision(
                    surface="evidence_confidence",
                    priority="medium" if confidence == "medium" else "high",
                    visible=True,
                    reason=f"Cognition confidence is {confidence or 'unclear'}.",
                    suggested_copy="Some evidence may be missing. Check child voice, adult response, outcome and oversight.",
                )
            )
        if not decisions:
            decisions.append(
                WorkspaceSurfaceDecision(
                    surface="general_suggestions",
                    priority="low",
                    visible=True,
                    reason="No high-attention context detected; keep UI simple.",
                    suggested_copy="Ask ORB anything, or choose a specialist mode when needed.",
                )
            )

        ordered = sorted(decisions, key=lambda item: self._rank(item.priority))
        return {
            "workspace_mode": self._mode(ordered),
            "decisions": [item.to_dict() for item in ordered],
            "hidden_by_default": [surface for surface in self.SURFACES if surface not in {item.surface for item in ordered}],
            "calm_ui_rule": "Show at most two intelligence surfaces by default; collapse the rest into folders or drawers.",
        }

    def prompt_addendum(self, *, message: str, cognition_context: dict[str, Any] | None = None) -> str:
        data = self.decide(message=message, cognition_context=cognition_context)
        lines = [
            "Cognitive workspace orchestration:",
            f"- Workspace mode: {data['workspace_mode']}",
            f"- UI rule: {data['calm_ui_rule']}",
        ]
        for item in data["decisions"][:3]:
            lines.append(f"- {item['surface']}: {item['priority']} — {item['reason']}")
        return "\n".join(lines)

    def _rank(self, priority: str) -> int:
        return {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(priority, 4)

    def _mode(self, decisions: list[WorkspaceSurfaceDecision]) -> str:
        top = decisions[0].priority if decisions else "low"
        if top == "critical":
            return "safeguarding_focus"
        if top == "high":
            return "guided_focus"
        if top == "medium":
            return "reflective_support"
        return "minimal_chat"


cognitive_workspace_orchestrator = CognitiveWorkspaceOrchestrator()
