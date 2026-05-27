from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class ExplainabilityFinding:
    reason: str
    evidence_basis: tuple[str, ...] = field(default_factory=tuple)
    missing_evidence: tuple[str, ...] = field(default_factory=tuple)
    confidence: str = "medium"
    human_review: str = "professional_review_recommended"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbExplainabilityEngineService:
    """Explainability layer for ORB and IndiCare cognition.

    Purpose:
    - explain why ORB has raised a concern, prompt, suggestion or answer lens
    - identify what evidence supports it
    - identify what is missing
    - state confidence clearly
    - protect human decision-making boundaries
    """

    VERSION = "orb-explainability-engine-v1"

    KEY_EVIDENCE_MARKERS = {
        "child_voice": ("child said", "young person said", "wishes", "feelings", "voice", "told staff"),
        "adult_response": ("staff", "adult", "supported", "reassured", "de-escalated", "responded"),
        "manager_oversight": ("manager", "reviewed", "signed off", "oversight", "rm", "deputy"),
        "safeguarding_escalation": ("safeguarding", "social worker", "lado", "police", "ofsted", "dsl"),
        "plan_link": ("care plan", "risk assessment", "placement plan", "behaviour support", "safety plan"),
        "impact": ("impact", "changed", "reduced", "improved", "safer", "outcome", "as a result"),
        "time_sequence": ("before", "during", "after", "at ", "am", "pm", "date", "time"),
    }

    def explain(self, text: str, *, purpose: str | None = None) -> dict[str, Any]:
        lower = str(text or "").lower()
        markers = self._markers(lower)
        findings = self._findings(lower, markers, purpose=purpose)
        confidence = self._overall_confidence(findings, markers)
        return {
            "version": self.VERSION,
            "purpose": purpose or "general_orb_explanation",
            "confidence": confidence,
            "evidence_markers": markers,
            "findings": [finding.to_dict() for finding in findings],
            "human_review_boundary": {
                "requires_professional_judgement": True,
                "not_an_automated_safeguarding_threshold": True,
                "not_an_ofsted_grade_prediction": True,
            },
        }

    def prompt_addendum(self, text: str, *, purpose: str | None = None) -> str:
        data = self.explain(text, purpose=purpose)
        lines = [
            "Explainability engine:",
            f"- Purpose: {data['purpose']}",
            f"- Overall confidence: {data['confidence']}",
            "- Explain recommendations by saying why, what evidence supports them, what is missing, and what human review is needed.",
        ]
        for finding in data["findings"]:
            lines.append(f"- Reason: {finding['reason']}")
            if finding["evidence_basis"]:
                lines.append("  Evidence basis: " + "; ".join(finding["evidence_basis"]))
            if finding["missing_evidence"]:
                lines.append("  Missing evidence: " + "; ".join(finding["missing_evidence"]))
            lines.append(f"  Confidence: {finding['confidence']}; Human review: {finding['human_review']}")
        return "\n".join(lines)

    def _markers(self, lower: str) -> dict[str, list[str]]:
        return {
            key: [marker for marker in markers if marker in lower]
            for key, markers in self.KEY_EVIDENCE_MARKERS.items()
        }

    def _findings(self, lower: str, markers: dict[str, list[str]], *, purpose: str | None = None) -> list[ExplainabilityFinding]:
        findings: list[ExplainabilityFinding] = []
        high_risk_terms = [term for term in ("allegation", "missing", "restraint", "safeguarding", "harm", "police", "exploitation") if term in lower]
        if high_risk_terms:
            findings.append(
                ExplainabilityFinding(
                    reason="Potential safeguarding or high-attention practice issue identified from user wording.",
                    evidence_basis=tuple(high_risk_terms),
                    missing_evidence=tuple(
                        item for item, hits in markers.items() if not hits and item in {"manager_oversight", "safeguarding_escalation", "impact", "plan_link"}
                    ),
                    confidence="high" if len(high_risk_terms) >= 2 else "medium",
                    human_review="manager_or_safeguarding_review_needed_if_this_reflects_a_real_event",
                )
            )
        missing_core = [key for key in ("child_voice", "adult_response", "manager_oversight", "impact") if not markers.get(key)]
        if missing_core:
            findings.append(
                ExplainabilityFinding(
                    reason="Core evidence areas are not clearly visible in the provided wording.",
                    evidence_basis=tuple(key for key, hits in markers.items() if hits),
                    missing_evidence=tuple(missing_core),
                    confidence="medium",
                    human_review="record_quality_or_manager_review_recommended",
                )
            )
        if not findings:
            findings.append(
                ExplainabilityFinding(
                    reason="No immediate high-attention issue was clearly detected from the wording, but ORB should still support professional curiosity.",
                    evidence_basis=tuple(key for key, hits in markers.items() if hits),
                    confidence="low",
                    human_review="use_professional_judgement",
                )
            )
        return findings

    def _overall_confidence(self, findings: list[ExplainabilityFinding], markers: dict[str, list[str]]) -> str:
        if any(finding.confidence == "high" for finding in findings):
            return "high"
        marker_count = sum(len(hits) for hits in markers.values())
        if marker_count >= 4:
            return "medium"
        return "low"


orb_explainability_engine_service = OrbExplainabilityEngineService()
