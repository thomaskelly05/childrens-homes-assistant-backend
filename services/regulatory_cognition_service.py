from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class RegulatoryNode:
    id: str
    title: str
    domain: str
    summary: str
    linked_quality_standards: list[str] = field(default_factory=list)
    evidence_expectations: list[str] = field(default_factory=list)
    concern_indicators: list[str] = field(default_factory=list)
    protective_indicators: list[str] = field(default_factory=list)
    reflective_questions: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RegulatoryCognitionService:
    """Machine-readable regulatory meaning layer for IndiCare.

    This is not a grading or threshold-decision service. It maps operational
    signals to relevant regulatory and inspection meaning so managers and ORB
    can reason from evidence, guidance and human review.
    """

    def __init__(self) -> None:
        self.nodes = self._build_nodes()

    def all_nodes(self) -> list[dict[str, Any]]:
        return [node.to_dict() for node in self.nodes.values()]

    def get_node(self, node_id: str) -> dict[str, Any] | None:
        node = self.nodes.get(node_id)
        return node.to_dict() if node else None

    def evaluate_state(self, state: dict[str, Any]) -> dict[str, Any]:
        matched: list[dict[str, Any]] = []
        signals = self._extract_signals(state)

        for node in self.nodes.values():
            concern_matches = [signal for signal in signals if signal in node.concern_indicators]
            protective_matches = [signal for signal in signals if signal in node.protective_indicators]
            if concern_matches or protective_matches:
                matched.append({
                    "node": node.to_dict(),
                    "concern_matches": concern_matches,
                    "protective_matches": protective_matches,
                    "interpretation": self._interpret(node, concern_matches, protective_matches),
                })

        return {
            "context_type": "regulatory_cognition",
            "matched_nodes": matched,
            "regulatory_summary": self._summary(matched),
            "human_review_required": True,
            "boundaries": {
                "does_not_predict_ofsted_grade": True,
                "does_not_make_safeguarding_threshold_decisions": True,
                "supports_reflective_manager_review": True,
            },
        }

    def _extract_signals(self, state: dict[str, Any]) -> set[str]:
        signals: set[str] = set()
        child = state.get("child_state", {}) or {}
        home = state.get("home_state", {}) or {}
        workforce = state.get("workforce_state", {}) or {}
        climate = state.get("emotional_climate", {}) or {}
        evidence = state.get("evidence_state", {}) or {}

        if child.get("safeguarding_pressure") in {"watch", "high", "critical"}:
            signals.add("safeguarding_pressure")
        if child.get("placement_stability") in {"watch", "fragile"}:
            signals.add("placement_stability_pressure")
        if child.get("child_voice_visibility") == "limited":
            signals.add("child_voice_limited")
        if home.get("management_oversight") in {"review", "urgent_review"}:
            signals.add("management_oversight_gap")
        if home.get("recording_quality") in {"developing", "manager_review"}:
            signals.add("recording_quality_concern")
        if home.get("inspection_readiness") == "review":
            signals.add("inspection_evidence_review")
        if workforce.get("practice_support_needed"):
            signals.add("practice_support_needed")
        if workforce.get("debrief_culture") == "review":
            signals.add("debrief_gap")
        if climate.get("level") in {"watch", "high", "critical"}:
            signals.add("emotional_climate_pressure")
        if evidence.get("evidence_gaps"):
            signals.add("evidence_gap")
        if evidence.get("missing_expected_links"):
            signals.add("missing_evidence_links")
        if evidence.get("graph_links", 0) > 0:
            signals.add("linked_evidence_present")
        return signals

    def _interpret(self, node: RegulatoryNode, concerns: list[str], protective: list[str]) -> str:
        if concerns and protective:
            return f"{node.title}: review concerns alongside protective evidence and chronology context."
        if concerns:
            return f"{node.title}: operational signals indicate this area should receive reflective manager review."
        return f"{node.title}: protective evidence is present; continue to strengthen evidence quality."

    def _summary(self, matched: list[dict[str, Any]]) -> str:
        if not matched:
            return "No specific regulatory cognition matches were identified from the current state sample."
        domains = sorted({item["node"]["domain"] for item in matched})
        return "Current state has regulatory relevance across: " + ", ".join(domains) + "."

    def _build_nodes(self) -> dict[str, RegulatoryNode]:
        nodes = [
            RegulatoryNode(
                id="reg_12_protection_of_children",
                title="Regulation 12 - Protection of children",
                domain="safeguarding",
                summary="Children must be protected from harm, with risks understood, reviewed and responded to.",
                linked_quality_standards=["qs_protection_of_children", "sccif_help_and_protection"],
                evidence_expectations=[
                    "clear safeguarding chronology",
                    "timely manager review",
                    "updated risk assessment",
                    "evidence of escalation and external consultation where needed",
                    "child voice and impact considered",
                ],
                concern_indicators=[
                    "safeguarding_pressure",
                    "management_oversight_gap",
                    "evidence_gap",
                    "missing_evidence_links",
                    "placement_stability_pressure",
                ],
                protective_indicators=["linked_evidence_present"],
                reflective_questions=[
                    "What evidence shows the risk was understood and reviewed?",
                    "Has the child's voice and impact been considered?",
                    "Are external safeguarding partners involved where appropriate?",
                ],
            ),
            RegulatoryNode(
                id="reg_13_leadership_and_management",
                title="Regulation 13 - Leadership and management",
                domain="leadership",
                summary="Leaders must ensure effective systems, oversight, learning and safe practice.",
                linked_quality_standards=["qs_leadership_and_management", "sccif_leadership"],
                evidence_expectations=[
                    "manager oversight recorded",
                    "actions tracked to completion",
                    "patterns recognised and addressed",
                    "quality assurance informs improvement",
                ],
                concern_indicators=[
                    "management_oversight_gap",
                    "recording_quality_concern",
                    "inspection_evidence_review",
                    "evidence_gap",
                ],
                protective_indicators=["linked_evidence_present"],
                reflective_questions=[
                    "What did leadership know, when, and what changed because of it?",
                    "Are actions completed and reviewed for impact?",
                    "Does the evidence show learning over time?",
                ],
            ),
            RegulatoryNode(
                id="reg_14_staffing",
                title="Regulation 14 - Staffing",
                domain="workforce",
                summary="The home must have sufficient, skilled and supported staff to meet children's needs.",
                linked_quality_standards=["qs_workforce", "sccif_leadership"],
                evidence_expectations=[
                    "supervision and reflection",
                    "training and competence evidence",
                    "debrief and learning after incidents",
                    "staffing impact on children considered",
                ],
                concern_indicators=[
                    "practice_support_needed",
                    "debrief_gap",
                    "recording_quality_concern",
                    "emotional_climate_pressure",
                ],
                protective_indicators=["linked_evidence_present"],
                reflective_questions=[
                    "Do staff have the right support and knowledge for current needs?",
                    "Is debriefing leading to learning and safer practice?",
                    "Is staff pressure affecting the emotional climate?",
                ],
            ),
            RegulatoryNode(
                id="qs_positive_relationships",
                title="Quality Standard - Positive relationships",
                domain="relationships",
                summary="Practice should promote warm, trusting and reparative relationships.",
                linked_quality_standards=["qs_positive_relationships", "sccif_experiences_and_progress"],
                evidence_expectations=[
                    "child voice visible",
                    "records show warmth and curiosity",
                    "repair after conflict",
                    "relationships considered in planning",
                ],
                concern_indicators=[
                    "child_voice_limited",
                    "emotional_climate_pressure",
                    "recording_quality_concern",
                ],
                protective_indicators=["linked_evidence_present"],
                reflective_questions=[
                    "Does the record evidence warmth, curiosity and repair?",
                    "What does the child experience emotionally from the adults around them?",
                    "Are strengths and protective relationships visible?",
                ],
            ),
        ]
        return {node.id: node for node in nodes}


regulatory_cognition_service = RegulatoryCognitionService()
