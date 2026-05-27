from __future__ import annotations

from typing import Any


class OrbEvidenceLineageService:
    """Evidence lineage mapping for ORB and IndiCare cognition.

    Purpose:
    - show where reasoning/evidence originated
    - map records to chronology, oversight and review
    - improve explainability and inspection defensibility
    - prepare for future graph-based operational cognition
    """

    LINEAGE_PATTERNS = {
        "incident": ["chronology", "manager review", "risk assessment", "follow-up action"],
        "missing_episode": ["chronology", "return-home conversation", "risk update", "multi-agency review"],
        "safeguarding": ["chronology", "safeguarding escalation", "manager oversight", "safety planning"],
        "restraint": ["debrief", "behaviour support plan", "manager review", "reduction planning"],
        "complaint": ["child voice", "response", "outcome", "learning review"],
        "supervision": ["reflection", "wellbeing", "actions", "competence review"],
    }

    def build(self, text: str) -> dict[str, Any]:
        lower = str(text or "").lower()
        matched: dict[str, list[str]] = {}
        for area, lineage in self.LINEAGE_PATTERNS.items():
            if area.replace("_", " ") in lower or area in lower:
                matched[area] = lineage
        if not matched:
            matched["general_record"] = [
                "chronology",
                "child voice",
                "adult response",
                "oversight",
                "follow-up",
            ]
        return {
            "lineage_map": matched,
            "explainability_goal": "ORB should explain where reasoning and evidence came from.",
            "inspection_goal": "Answers should remain reviewable and defensible.",
        }

    def prompt_addendum(self, text: str) -> str:
        data = self.build(text)
        lines = ["Evidence lineage cognition:"]
        for area, lineage in data["lineage_map"].items():
            lines.append(f"- {area} lineage:")
            for item in lineage:
                lines.append(f"  - {item}")
        lines.append(f"- Explainability goal: {data['explainability_goal']}")
        lines.append(f"- Inspection goal: {data['inspection_goal']}")
        return "\n".join(lines)


orb_evidence_lineage_service = OrbEvidenceLineageService()
