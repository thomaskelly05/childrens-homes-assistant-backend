from __future__ import annotations

from typing import Any


class OrbExplainabilityRuntimeService:
    """Institutional explainability layer for ORB.

    Generates transparent reasoning metadata that can be surfaced in the UI,
    logs, governance tooling or inspection-review workflows.
    """

    def build(
        self,
        *,
        surface: str,
        mode: str,
        active_brains: list[str],
        citations: list[dict[str, Any]] | None = None,
        operational_context_used: bool = False,
        confidence: str = "medium",
    ) -> dict[str, Any]:
        citations = citations or []

        frameworks = []
        for citation in citations:
            label = citation.get("label")
            if label and label not in frameworks:
                frameworks.append(label)

        evidence_focus = self._evidence_focus(active_brains)
        human_boundaries = self._boundaries(active_brains, operational_context_used)

        return {
            "surface": surface,
            "mode": mode,
            "active_brains": active_brains,
            "frameworks_used": frameworks,
            "evidence_focus": evidence_focus,
            "confidence": confidence,
            "operational_context_used": operational_context_used,
            "human_review_boundaries": human_boundaries,
            "reasoning_summary": self._reasoning_summary(
                active_brains=active_brains,
                frameworks=frameworks,
                confidence=confidence,
            ),
        }

    def _evidence_focus(self, active_brains: list[str]) -> list[str]:
        focus = ["clear factual reasoning"]
        if "regulatory_cognition" in active_brains:
            focus.extend([
                "framework alignment",
                "inspection evidence",
                "management rationale",
            ])
        if "safeguarding_cognition" in active_brains:
            focus.extend([
                "risk separation",
                "timely escalation",
                "protective action",
            ])
        if "therapeutic_reflective_cognition" in active_brains:
            focus.extend([
                "child experience",
                "emotional containment",
                "relational response",
            ])
        if "recording_quality_cognition" in active_brains:
            focus.extend([
                "child-centred wording",
                "chronology clarity",
                "fact versus interpretation",
            ])
        return list(dict.fromkeys(focus))

    def _boundaries(self, active_brains: list[str], operational_context_used: bool) -> list[str]:
        boundaries = [
            "ORB supports professional reflection and guidance.",
            "ORB does not replace professional judgement.",
        ]
        if "safeguarding_cognition" in active_brains:
            boundaries.append(
                "Safeguarding thresholds and statutory decisions must remain human-led and procedure-led."
            )
        if not operational_context_used:
            boundaries.append(
                "No live operational records were used for this response."
            )
        return boundaries

    def _reasoning_summary(
        self,
        *,
        active_brains: list[str],
        frameworks: list[str],
        confidence: str,
    ) -> str:
        brain_summary = ", ".join(active_brains[:5]) if active_brains else "general reasoning"
        framework_summary = ", ".join(frameworks[:5]) if frameworks else "general guidance anchors"
        return (
            f"This response used {brain_summary} with {framework_summary}. "
            f"Confidence level: {confidence}."
        )


orb_explainability_runtime_service = OrbExplainabilityRuntimeService()
