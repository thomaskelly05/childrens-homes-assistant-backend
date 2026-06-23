"""Regulation and SCCIF practice anchor map for ORB templates and answers.

Anchors are practice/evidence prompts — not compliance guarantees.
"""

from __future__ import annotations

from typing import Any

from services.sccif_alignment_registry_service import (
    SAFE_ALIGNMENT_DISCLAIMER,
    sccif_alignment_registry_service,
)

PRACTICE_ANCHOR_DISCLAIMER = (
    "Regulation and SCCIF anchors support evidence thinking and documentation. "
    "They do not guarantee compliance, predict inspection outcomes, or replace "
    "statutory responsibilities, local policy or professional judgement."
)

# Extended practice anchors beyond Quality Standards and SCCIF judgement areas
PRACTICE_ANCHOR_CATALOGUE: dict[str, dict[str, str]] = {
    # Quality Standards (from SCCIF alignment registry)
    "quality_purpose": {"label": "Quality and purpose of care", "regulation": "Regulation 6"},
    "views_wishes_feelings": {"label": "Children's views, wishes and feelings", "regulation": "Regulation 7"},
    "education": {"label": "Education", "regulation": "Regulation 8"},
    "enjoyment_achievement": {"label": "Enjoyment and achievement", "regulation": "Regulation 9"},
    "health_wellbeing": {"label": "Health and well-being", "regulation": "Regulation 10"},
    "positive_relationships": {"label": "Positive relationships", "regulation": "Regulation 11"},
    "protection_children": {"label": "Protection of children", "regulation": "Regulation 12"},
    "leadership_management": {"label": "Leadership and management", "regulation": "Regulation 13"},
    "care_planning": {"label": "Care planning", "regulation": "Regulation 14"},
    # SCCIF judgement areas
    "sccif_experiences_progress": {
        "label": "SCCIF — experiences and progress",
        "regulation": "SCCIF judgement area",
    },
    "sccif_help_protection": {
        "label": "SCCIF — help and protection",
        "regulation": "SCCIF judgement area",
    },
    "sccif_leadership": {
        "label": "SCCIF — effectiveness of leaders and managers",
        "regulation": "SCCIF judgement area",
    },
    # Additional practice themes
    "safeguarding": {"label": "Safeguarding", "regulation": "Children's Homes Regulations"},
    "behaviour_restraint": {"label": "Behaviour and restraint / physical intervention", "regulation": "Regulation 20"},
    "privacy_dignity": {"label": "Privacy and dignity", "regulation": "Regulation 22"},
    "complaints": {"label": "Complaints", "regulation": "Regulation 24"},
    "notifications": {"label": "Notifications", "regulation": "Regulation 27"},
    "records": {"label": "Records", "regulation": "Regulation 32"},
    "staff_fitness": {"label": "Staff fitness / staffing / supervision", "regulation": "Regulations 28–31"},
    "independent_visits": {"label": "Independent person visits", "regulation": "Regulation 44"},
    "quality_of_care_review": {"label": "Quality of care review", "regulation": "Regulation 45"},
    "reg44": {"label": "Regulation 44 — independent person visits", "regulation": "Regulation 44"},
    "reg45": {"label": "Regulation 45 — quality of care review", "regulation": "Regulation 45"},
    "quality_standards": {"label": "Children's Homes Quality Standards", "regulation": "Schedule 1"},
}


class OrbRegulationPracticeAnchorService:
    def disclaimer(self) -> str:
        return PRACTICE_ANCHOR_DISCLAIMER

    def sccif_disclaimer(self) -> str:
        return SAFE_ALIGNMENT_DISCLAIMER

    def list_anchors(self) -> list[dict[str, str]]:
        return [{"id": aid, **meta} for aid, meta in PRACTICE_ANCHOR_CATALOGUE.items()]

    def get_anchor(self, anchor_id: str) -> dict[str, str] | None:
        meta = PRACTICE_ANCHOR_CATALOGUE.get(anchor_id)
        if not meta:
            return None
        return {"id": anchor_id, **meta}

    def anchors_for_template(self, regulation_anchors: list[str]) -> list[dict[str, str]]:
        results: list[dict[str, str]] = []
        for anchor_id in regulation_anchors:
            anchor = self.get_anchor(anchor_id)
            if anchor:
                results.append(anchor)
        return results

    def template_anchor_map(self, template_id: str, regulation_anchors: list[str]) -> dict[str, Any]:
        return {
            "template_id": template_id,
            "anchors": self.anchors_for_template(regulation_anchors),
            "disclaimer": self.disclaimer(),
            "claims_compliance_guaranteed": False,
        }

    def quality_standards(self) -> list[dict[str, Any]]:
        return sccif_alignment_registry_service.list_quality_standards()

    def sccif_judgement_areas(self) -> list[dict[str, Any]]:
        return sccif_alignment_registry_service.list_judgement_areas()

    def official_sources(self) -> list[dict[str, Any]]:
        return [
            ref.model_dump() if hasattr(ref, "model_dump") else dict(ref)
            for ref in sccif_alignment_registry_service.official_source_refs()
        ]


orb_regulation_practice_anchor_service = OrbRegulationPracticeAnchorService()
