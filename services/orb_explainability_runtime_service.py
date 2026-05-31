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
        cognition_display_labels: list[str] | None = None,
        depth_topic: str | None = None,
        reasoning_lenses: list[str] | None = None,
        vault_domains: list[str] | None = None,
        shared_explainability: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        citations = citations or []

        frameworks = []
        for citation in citations:
            label = citation.get("label")
            if label and label not in frameworks:
                frameworks.append(label)

        evidence_focus = self._evidence_focus(active_brains)
        human_boundaries = self._boundaries(active_brains, operational_context_used)

        explain = shared_explainability or {}
        intelligence_layers = explain.get("active_intelligence_layers") or {}
        return {
            "surface": surface,
            "mode": mode,
            "active_brains": active_brains,
            "active_engines": explain.get("active_engines") or list(intelligence_layers.keys()),
            "active_lenses": list(reasoning_lenses or []),
            "cognition_display_labels": list(cognition_display_labels or []),
            "depth_topic": depth_topic,
            "reasoning_lenses": list(reasoning_lenses or []),
            "vault_domains": list(vault_domains or []),
            "frameworks_used": frameworks,
            "evidence_focus": evidence_focus,
            "confidence": confidence,
            "operational_context_used": operational_context_used,
            "os_data_used": bool(explain.get("os_data_used")),
            "standalone_only_reasoning": bool(explain.get("standalone_only_reasoning")),
            "isn_reasoning_only": explain.get("isn_data_backed") is False and explain.get("isn_cognition_active"),
            "isn_data_backed": bool(explain.get("isn_data_backed")),
            "template_generation_used": bool(explain.get("template_generation_used")),
            "outstanding_practice_lens_applied": bool(explain.get("outstanding_practice_lens_applied")),
            "review_this_active": bool(explain.get("review_this_active")),
            "learning_micro_active": bool(explain.get("learning_micro_active")),
            "intelligence_layers": intelligence_layers,
            "activation_rules_matched": explain.get("activation_rules_matched") or [],
            "human_review_boundaries": human_boundaries,
            "how_orb_thought": self._how_orb_thought(explain),
            "reasoning_summary": self._reasoning_summary(
                active_brains=active_brains,
                frameworks=frameworks,
                confidence=confidence,
                cognition_display_labels=cognition_display_labels,
            ),
        }

    def _how_orb_thought(self, explain: dict[str, Any]) -> str:
        parts: list[str] = []
        layers = explain.get("active_intelligence_layers") or {}
        if layers:
            parts.append("Intelligence layers: " + ", ".join(list(layers.values())[:6]))
        if explain.get("outstanding_practice_lens_applied"):
            parts.append("Outstanding practice lens applied.")
        if explain.get("template_generation_used"):
            parts.append("Template guidance active.")
        if explain.get("review_this_active"):
            parts.append("Review This pathway active.")
        if explain.get("isn_cognition_active"):
            if explain.get("isn_data_backed"):
                parts.append("ISN used with permissioned data.")
            else:
                parts.append("ISN used as reasoning-only lens (no live ISN records).")
        if explain.get("standalone_only_reasoning"):
            parts.append("Standalone-only reasoning — no live OS care records.")
        elif explain.get("os_data_used"):
            parts.append("Permissioned OS context may have been used.")
        return " ".join(parts) if parts else "General residential practice reasoning."

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
        cognition_display_labels: list[str] | None = None,
    ) -> str:
        if cognition_display_labels:
            brain_summary = ", ".join(cognition_display_labels[:5])
        else:
            brain_summary = ", ".join(active_brains[:5]) if active_brains else "general reasoning"
        framework_summary = ", ".join(frameworks[:5]) if frameworks else "topic-specific guidance anchors"
        return (
            f"This response used {brain_summary} with {framework_summary}. "
            f"Confidence level: {confidence}."
        )


orb_explainability_runtime_service = OrbExplainabilityRuntimeService()
