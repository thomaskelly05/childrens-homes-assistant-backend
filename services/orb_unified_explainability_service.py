from __future__ import annotations

"""Unified ORB explainability contract for UI and governance."""

from typing import Any

from services.orb_explainability_runtime_service import orb_explainability_runtime_service


class OrbUnifiedExplainabilityService:
    def build(
        self,
        *,
        surface: str,
        mode: str,
        active_brains: list[str] | None = None,
        citations: list[dict[str, Any]] | None = None,
        shared_explainability: dict[str, Any] | None = None,
        source_anchors: list[str] | None = None,
        operational_context_used: bool = False,
        confidence: str = "medium",
        cognition_display_labels: list[str] | None = None,
        reasoning_lenses: list[str] | None = None,
        vault_domains: list[str] | None = None,
    ) -> dict[str, Any]:
        explain = shared_explainability or {}
        runtime = orb_explainability_runtime_service.build(
            surface=surface,
            mode=mode,
            active_brains=list(active_brains or []),
            citations=citations,
            operational_context_used=operational_context_used,
            confidence=confidence,
            cognition_display_labels=cognition_display_labels,
            reasoning_lenses=reasoning_lenses,
            vault_domains=vault_domains,
            shared_explainability=explain,
        )
        layers = explain.get("active_intelligence_layers") or runtime.get("intelligence_layers") or {}
        locality_used = bool(
            explain.get("locality_intelligence_used")
            or "locality" in str(layers).lower()
            or any("locality" in str(x).lower() for x in (reasoning_lenses or []))
        )
        return {
            **runtime,
            "active_intelligence_layers": list(layers.values()) if isinstance(layers, dict) else layers,
            "active_reasoning_lenses": runtime.get("reasoning_lenses") or [],
            "evidence_basis": runtime.get("evidence_focus") or [],
            "source_anchors": list(source_anchors or explain.get("source_anchors") or []),
            "standalone_boundary": {
                "standalone_only": bool(runtime.get("standalone_only_reasoning")),
                "os_data_used": bool(runtime.get("os_data_used")),
                "operational_context_used": bool(runtime.get("operational_context_used")),
            },
            "locality_intelligence_used": locality_used,
            "isn_lens_used": bool(explain.get("isn_cognition_active") or runtime.get("isn_data_backed")),
            "template_intelligence_used": bool(runtime.get("template_generation_used")),
            "outstanding_practice_applied": bool(runtime.get("outstanding_practice_lens_applied")),
            "review_this_active": bool(runtime.get("review_this_active")),
            "learning_micro_active": bool(runtime.get("learning_micro_active")),
        }


orb_unified_explainability_service = OrbUnifiedExplainabilityService()
