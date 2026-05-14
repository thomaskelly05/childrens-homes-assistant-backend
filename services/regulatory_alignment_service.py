from __future__ import annotations

from typing import Any

from services.risk_intelligence_language import safe_payload


REGULATORY_MAP: dict[str, dict[str, list[str] | str]] = {
    "protection of children": {
        "regulation_ids": ["Reg 12", "Reg 13"],
        "quality_standard_ids": ["protection_of_children"],
        "sccif_area_ids": ["help_and_protection"],
        "inspection_relevance": "protection and safeguarding evidence",
    },
    "leadership and management": {
        "regulation_ids": ["Reg 44", "Reg 45"],
        "quality_standard_ids": ["leadership_and_management"],
        "sccif_area_ids": ["leadership_management"],
        "inspection_relevance": "oversight, QA and improvement evidence",
    },
    "care planning": {
        "regulation_ids": ["Reg 14", "Reg 15"],
        "quality_standard_ids": ["care_planning"],
        "sccif_area_ids": ["overall_experiences"],
        "inspection_relevance": "plans and review evidence",
    },
    "health/wellbeing": {
        "regulation_ids": ["Reg 10"],
        "quality_standard_ids": ["health_and_wellbeing"],
        "sccif_area_ids": ["health"],
        "inspection_relevance": "health access and emotional wellbeing",
    },
    "education": {
        "regulation_ids": ["Reg 8"],
        "quality_standard_ids": ["education"],
        "sccif_area_ids": ["education"],
        "inspection_relevance": "learning, attendance and progress",
    },
    "positive relationships": {
        "regulation_ids": ["Reg 11"],
        "quality_standard_ids": ["positive_relationships"],
        "sccif_area_ids": ["relationships"],
        "inspection_relevance": "relationships and behaviour support",
    },
    "children's views/wishes/feelings": {
        "regulation_ids": ["Reg 7"],
        "quality_standard_ids": ["child_voice"],
        "sccif_area_ids": ["voice_and_experience"],
        "inspection_relevance": "child voice and participation",
    },
}


class RegulatoryAlignmentService:
    """Adds mostly-back-office regulatory metadata to intelligence outputs."""

    def align(self, *, themes: list[str], evidence_strength: str = "limited") -> list[dict[str, Any]]:
        links = []
        for theme in themes:
            mapped = REGULATORY_MAP.get(theme)
            if mapped:
                links.append({**mapped, "theme": theme, "evidence_strength": evidence_strength})
        return safe_payload(links)


regulatory_alignment_service = RegulatoryAlignmentService()
