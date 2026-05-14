from __future__ import annotations

from typing import Any

from services.evidence_quality_service import evidence_quality_service


class InspectionIntelligenceService:
    """Predictive inspection readiness support with cautious, explainable outputs."""

    def readiness(self, *, evidence: dict[str, Any], workspace: dict[str, Any] | None = None) -> dict[str, Any]:
        quality = evidence_quality_service.analyse(evidence=evidence, workspace=workspace or {})
        patterns = quality["patterns"]
        weak_sections = [
            {"section": key, **value}
            for key, value in quality["heatmap"].items()
            if value.get("quality") == "weak"
        ]
        return {
            "status": "review_recommended" if quality["review_required"] or weak_sections else "monitor",
            "confidence": quality["confidence"],
            "context": quality["context"],
            "questions_answered": [pattern["question"] for pattern in patterns],
            "quality_patterns": patterns,
            "weakly_evidenced_standards": weak_sections,
            "recommendations": self._recommendations(patterns, weak_sections),
            "guardrails": [
                "No definitive safeguarding conclusions are generated.",
                "All outputs require professional review against source records.",
                "Claims are limited to visible workspace evidence and gaps.",
            ],
        }

    def _recommendations(self, patterns: list[dict[str, Any]], weak_sections: list[dict[str, Any]]) -> list[dict[str, str]]:
        recommendations = [
            {
                "priority": "review" if pattern.get("severity") == "review" else "monitor",
                "action": pattern.get("recommendation") or "Review visible evidence.",
                "reason": pattern.get("reasoning") or "Pattern identified in evidence quality analysis.",
            }
            for pattern in patterns
        ]
        for section in weak_sections:
            recommendations.append({
                "priority": "review",
                "action": f"Strengthen evidence for {section.get('title')}.",
                "reason": "No visible evidence cards were found for this judgement area.",
            })
        return recommendations or [{
            "priority": "monitor",
            "action": "Continue sampling records for child-centred impact and manager oversight.",
            "reason": "Visible evidence does not currently show priority gaps.",
        }]


inspection_intelligence_service = InspectionIntelligenceService()
