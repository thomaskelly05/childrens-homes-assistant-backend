from __future__ import annotations

from typing import Any


class OrbConfidenceCalibrationService:
    """Dynamic confidence calibration for regulated cognition.

    Confidence should reduce when:
    - evidence weak
    - chronology incomplete
    - oversight absent
    - safeguarding context unclear
    - contradictions visible
    """

    def calibrate(
        self,
        *,
        evidence_markers: int = 0,
        missing_core_areas: int = 0,
        safeguarding_uncertainty: bool = False,
        oversight_missing: bool = False,
        contradictions_present: bool = False,
    ) -> dict[str, Any]:
        score = evidence_markers
        score -= missing_core_areas * 2
        if safeguarding_uncertainty:
            score -= 2
        if oversight_missing:
            score -= 2
        if contradictions_present:
            score -= 3
        confidence = self._confidence(score)
        return {
            "confidence": confidence,
            "score": score,
            "explanation": self._explanation(confidence),
            "response_rules": self._rules(confidence),
        }

    def prompt_addendum(
        self,
        *,
        evidence_markers: int = 0,
        missing_core_areas: int = 0,
        safeguarding_uncertainty: bool = False,
        oversight_missing: bool = False,
        contradictions_present: bool = False,
    ) -> str:
        data = self.calibrate(
            evidence_markers=evidence_markers,
            missing_core_areas=missing_core_areas,
            safeguarding_uncertainty=safeguarding_uncertainty,
            oversight_missing=oversight_missing,
            contradictions_present=contradictions_present,
        )
        return (
            "Confidence calibration:\n"
            f"- Confidence: {data['confidence']}\n"
            f"- Explanation: {data['explanation']}\n"
            f"- Rules: {'; '.join(data['response_rules'])}"
        )

    def _confidence(self, score: int) -> str:
        if score >= 6:
            return "high"
        if score >= 2:
            return "medium"
        return "low"

    def _explanation(self, confidence: str) -> str:
        return {
            "high": "Evidence appears relatively strong and internally consistent.",
            "medium": "Some evidence is visible but important uncertainty remains.",
            "low": "Evidence or context may be incomplete, weak or contradictory.",
        }.get(confidence, "Confidence unclear.")

    def _rules(self, confidence: str) -> list[str]:
        if confidence == "low":
            return [
                "Avoid definitive language.",
                "Increase reflective questions.",
                "Encourage human review.",
                "State uncertainty clearly.",
            ]
        if confidence == "medium":
            return [
                "Explain what evidence is present and missing.",
                "Use balanced language.",
                "Encourage oversight where relevant.",
            ]
        return [
            "Remain evidence-led and bounded.",
            "Avoid overstating certainty.",
        ]


orb_confidence_calibration_service = OrbConfidenceCalibrationService()
