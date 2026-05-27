from __future__ import annotations

from typing import Any


class EvidenceConfidenceEngine:
    """Evaluates confidence, completeness and evidence quality for ORB cognition."""

    REQUIRED_SIGNALS = {
        "child_voice": "Child voice or lived experience",
        "adult_response": "Adult response or intervention",
        "outcome": "Outcome or what changed afterwards",
        "oversight": "Management oversight or review",
        "context": "Context before the event",
    }

    def evaluate(self, *, evidence: dict[str, Any] | None = None) -> dict[str, Any]:
        evidence = evidence or {}
        present = []
        missing = []

        for key, label in self.REQUIRED_SIGNALS.items():
            if evidence.get(key):
                present.append(label)
            else:
                missing.append(label)

        ratio = len(present) / max(len(self.REQUIRED_SIGNALS), 1)

        if ratio >= 0.85:
            confidence = "high"
        elif ratio >= 0.5:
            confidence = "medium"
        else:
            confidence = "low"

        return {
            "confidence": confidence,
            "present_evidence": present,
            "missing_evidence": missing,
            "completeness_score": round(ratio, 2),
            "guidance": self._guidance(confidence=confidence, missing=missing),
            "explainability": {
                "reason": "Confidence is based on available evidence signals and chronology completeness.",
                "human_review_recommended": confidence != "high",
            },
        }

    def prompt_addendum(self, *, evidence: dict[str, Any] | None = None) -> str:
        result = self.evaluate(evidence=evidence)
        lines = [
            "Evidence confidence engine:",
            f"- Confidence: {result['confidence']}",
            f"- Completeness score: {result['completeness_score']}",
        ]
        if result["missing_evidence"]:
            lines.append("- Missing evidence: " + "; ".join(result["missing_evidence"]))
        return "\n".join(lines)

    def _guidance(self, *, confidence: str, missing: list[str]) -> list[str]:
        guidance = []
        if confidence == "low":
            guidance.append("Avoid definitive conclusions until more evidence is gathered.")
        if "Child voice or lived experience" in missing:
            guidance.append("Consider whether the child's voice or emotional experience is visible enough.")
        if "Management oversight or review" in missing:
            guidance.append("Consider whether management oversight or review should be evidenced.")
        if "Outcome or what changed afterwards" in missing:
            guidance.append("Describe what changed after adult intervention or support.")
        return guidance


evidence_confidence_engine = EvidenceConfidenceEngine()
