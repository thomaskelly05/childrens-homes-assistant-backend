from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from typing import Any


@dataclass
class ExplainabilitySnapshot:
    timestamp: str
    cognition_type: str
    confidence: str
    reasoning_summary: str
    evidence_used: list[str]
    evidence_missing: list[str]
    governance_notes: list[str]
    human_review_required: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class ExplainabilityPersistenceEngine:
    """Persistence-ready explainability layer for ORB cognition.

    Tracks why ORB responded a certain way, what evidence informed the response,
    what remained uncertain and where human review was required.
    """

    def build_snapshot(
        self,
        *,
        cognition_type: str,
        confidence: str,
        reasoning_summary: str,
        evidence_used: list[str] | None = None,
        evidence_missing: list[str] | None = None,
        governance_notes: list[str] | None = None,
        human_review_required: bool = False,
    ) -> dict[str, Any]:
        snapshot = ExplainabilitySnapshot(
            timestamp=datetime.now(UTC).isoformat(),
            cognition_type=cognition_type,
            confidence=confidence,
            reasoning_summary=reasoning_summary,
            evidence_used=evidence_used or [],
            evidence_missing=evidence_missing or [],
            governance_notes=governance_notes or [],
            human_review_required=human_review_required,
        )

        return {
            "snapshot": snapshot.to_dict(),
            "explainability_principles": [
                "ORB should explain why guidance was generated.",
                "ORB should disclose missing evidence and uncertainty.",
                "ORB should reinforce human-led safeguarding accountability.",
                "ORB should preserve chronology-aware reasoning.",
            ],
            "future_persistence_ready": True,
        }

    def prompt_addendum(
        self,
        *,
        cognition_type: str,
        confidence: str,
        reasoning_summary: str,
    ) -> str:
        result = self.build_snapshot(
            cognition_type=cognition_type,
            confidence=confidence,
            reasoning_summary=reasoning_summary,
        )
        snapshot = result["snapshot"]

        return "\n".join(
            [
                "Explainability persistence:",
                f"- Cognition type: {snapshot['cognition_type']}",
                f"- Confidence: {snapshot['confidence']}",
                f"- Human review required: {snapshot['human_review_required']}",
            ]
        )


explainability_persistence_engine = ExplainabilityPersistenceEngine()
