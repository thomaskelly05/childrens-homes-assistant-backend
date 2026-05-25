"""Inspection pack registry — Reg 44 / Reg 45 section templates and safe wording."""

from __future__ import annotations

from typing import Any

from schemas.inspection_readiness import (
    InspectionEvidenceItem,
    InspectionOfficialSourceRef,
    InspectionPackType,
)
from services.sccif_alignment_registry_service import (
    OFFICIAL_SOURCES,
    sccif_alignment_registry_service,
)

SAFE_PACK_DISCLAIMER = (
    "This evidence support pack aligns operational metadata to inspection preparation areas. "
    "It may support manager and RI review — it is not a compliance decision, does not predict "
    "Ofsted outcomes, and does not generate inspection grades. Professional judgement and "
    "statutory responsibilities remain required. Draft-only items are not completed evidence."
)

REG44_SECTIONS: list[dict[str, str]] = [
    {
        "id": "reg44_children_experiences",
        "title": "Children's experiences and progress",
        "summary": "Evidence may support how children's experiences and progress are recorded and reviewed.",
    },
    {
        "id": "reg44_safeguarding",
        "title": "Safeguarding and protection",
        "summary": "Evidence may support safeguarding effectiveness, alerts and network follow-up.",
    },
    {
        "id": "reg44_quality_daily_life",
        "title": "Quality of care and daily life",
        "summary": "Evidence may support daily care, keywork and quality-of-life recording threads.",
    },
    {
        "id": "reg44_staff_practice",
        "title": "Staff practice and relationships",
        "summary": "Evidence may support workforce practice, handover and supervision routes.",
    },
    {
        "id": "reg44_records_quality",
        "title": "Records and recording quality",
        "summary": "Evidence may support recording governance, drafts and review queue oversight.",
    },
    {
        "id": "reg44_environment",
        "title": "Environment and safety",
        "summary": "Environmental and safety evidence may require source review in home records.",
    },
    {
        "id": "reg44_leadership",
        "title": "Leadership oversight and follow-up",
        "summary": "Evidence may support leadership oversight, manager brief and governance threads.",
    },
    {
        "id": "reg44_actions",
        "title": "Actions and recommendations",
        "summary": "Follow-up actions from visits and reviews — manager review needed.",
    },
    {
        "id": "reg44_independent_visitor",
        "title": "Independent visitor evidence",
        "summary": "Reg 44 independent visitor reports and monthly visit evidence — route to regulatory documents.",
    },
]

REG45_SECTIONS: list[dict[str, str]] = [
    {
        "id": "reg45_qocr_summary",
        "title": "Quality of care review summary",
        "summary": "Quality of care review evidence may support Reg 45 preparation — not a final judgement.",
    },
    {
        "id": "reg45_child_views",
        "title": "Children's views, wishes and feelings",
        "summary": "Child voice evidence may support views and wishes threads — requires source review.",
    },
    {
        "id": "reg45_outcomes",
        "title": "Outcomes, progress and experiences",
        "summary": "Progress and outcomes evidence aligned from operational metadata.",
    },
    {
        "id": "reg45_safeguarding",
        "title": "Safeguarding effectiveness",
        "summary": "Safeguarding network, alerts and helped/protected alignment — manager review needed.",
    },
    {
        "id": "reg45_health_education",
        "title": "Education, health and wellbeing",
        "summary": "Health and education recording routes may support this area.",
    },
    {
        "id": "reg45_relationships",
        "title": "Positive relationships and family time",
        "summary": "Relationship and family-time evidence may require chronology and keywork review.",
    },
    {
        "id": "reg45_workforce",
        "title": "Workforce and leadership",
        "summary": "Workforce context, staff profile and leadership oversight evidence.",
    },
    {
        "id": "reg45_patterns",
        "title": "Patterns, themes and trends",
        "summary": "Patterns from governance and handover intelligence — not predictive grades.",
    },
    {
        "id": "reg45_improvement",
        "title": "Improvement actions",
        "summary": "Actions from evidence gaps and intelligence actions — draft proposals only.",
    },
]

ORB_PACK_PROMPTS: list[dict[str, str]] = [
    {
        "label": "Ask ORB to review Reg 44 evidence gaps",
        "mode": "ofsted_evidence_review",
        "query": "What Reg 44 evidence gaps may need manager review from safe operational metadata?",
    },
    {
        "label": "Ask ORB to help prepare Reg 45 evidence questions",
        "mode": "ofsted_evidence_review",
        "query": "Help me prepare Reg 45 quality of care review evidence questions — not a compliance decision.",
    },
    {
        "label": "Ask ORB what evidence supports helped and protected",
        "mode": "safeguarding_themes",
        "query": "What operational evidence may support helped and protected threads?",
    },
    {
        "label": "Ask ORB what leadership oversight gaps are visible",
        "mode": "manager_daily_brief",
        "query": "What leadership oversight gaps are visible from recording and handover metadata?",
    },
    {
        "label": "Ask ORB what draft evidence needs manager review",
        "mode": "record_quality_review",
        "query": "What draft recording evidence may need manager review before inspection preparation?",
    },
]

SECTION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "reg44_children_experiences": ("experience", "progress", "journey", "keywork", "daily"),
    "reg44_safeguarding": ("safeguard", "protect", "isn", "alert", "missing", "incident"),
    "reg44_quality_daily_life": ("daily", "care", "wellbeing", "note"),
    "reg44_staff_practice": ("staff", "handover", "workforce", "supervision"),
    "reg44_records_quality": ("governance", "draft", "review", "recording", "record"),
    "reg44_environment": ("environment", "safety", "premises"),
    "reg44_leadership": ("leadership", "manager", "governance", "brief", "oversight"),
    "reg44_actions": ("action", "follow", "recommend"),
    "reg44_independent_visitor": ("reg44", "visitor", "independent", "monthly"),
    "reg45_qocr_summary": ("reg45", "quality of care", "review"),
    "reg45_child_views": ("voice", "wish", "feeling", "view"),
    "reg45_outcomes": ("outcome", "progress", "experience"),
    "reg45_safeguarding": ("safeguard", "protect", "helped"),
    "reg45_health_education": ("health", "education", "wellbeing"),
    "reg45_relationships": ("relationship", "family", "contact"),
    "reg45_workforce": ("workforce", "staff", "leadership", "supervision"),
    "reg45_patterns": ("pattern", "trend", "theme", "handover"),
    "reg45_improvement": ("improve", "gap", "action"),
}


class InspectionPackRegistryService:
    def list_pack_types(self) -> list[dict[str, str]]:
        return [
            {"id": "reg44", "title": "Regulation 44 — monthly visit evidence support"},
            {"id": "reg45", "title": "Regulation 45 — quality of care review evidence support"},
            {"id": "sccif", "title": "SCCIF judgement evidence support"},
            {"id": "quality_standards", "title": "Quality Standards evidence support"},
            {"id": "custom", "title": "Custom evidence support pack"},
        ]

    def get_pack_template(self, pack_type: InspectionPackType) -> dict[str, Any]:
        sections = {
            "reg44": self.reg44_sections(),
            "reg45": self.reg45_sections(),
            "sccif": self.sccif_sections(),
            "quality_standards": self.quality_standards_sections(),
            "custom": self.reg44_sections() + self.reg45_sections()[:3],
        }.get(pack_type, self.reg44_sections())
        return {
            "pack_type": pack_type,
            "title": self.default_pack_title(pack_type),
            "sections": sections,
            "disclaimer": self.safe_pack_disclaimer(),
            "official_sources": [s.model_dump() for s in self.official_source_refs()],
            "orb_prompts": ORB_PACK_PROMPTS,
        }

    def reg44_sections(self) -> list[dict[str, str]]:
        return [dict(s, pack_type="reg44") for s in REG44_SECTIONS]

    def reg45_sections(self) -> list[dict[str, str]]:
        return [dict(s, pack_type="reg45") for s in REG45_SECTIONS]

    def sccif_sections(self) -> list[dict[str, str]]:
        return [
            {
                "id": f"sccif_{area}",
                "title": sccif_alignment_registry_service.judgement_title(area),  # type: ignore[arg-type]
                "summary": meta.get("description", "SCCIF judgement area evidence support."),
                "pack_type": "sccif",
            }
            for area, meta in [
                ("overall_experiences_progress", {}),
                ("helped_and_protected", {}),
                ("leadership_management", {}),
            ]
        ]

    def quality_standards_sections(self) -> list[dict[str, str]]:
        return [
            {
                "id": f"qs_{area['area']}",
                "title": area["title"],
                "summary": f"Quality Standard {area.get('regulation', '')} — evidence may support review.",
                "pack_type": "quality_standards",
            }
            for area in sccif_alignment_registry_service.list_quality_standards()
        ]

    def map_alignment_to_pack(self, evidence_item: InspectionEvidenceItem) -> list[str]:
        """Return section ids this evidence item may belong to."""
        text = " ".join(
            [
                evidence_item.title.lower(),
                evidence_item.safe_summary.lower(),
                evidence_item.source_module.lower(),
                (evidence_item.metadata or {}).get("recording_type", ""),
            ]
        ).lower()
        matched: list[str] = []
        for section_id, keywords in SECTION_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                matched.append(section_id)
        if not matched:
            if evidence_item.safeguarding_review_required:
                matched.extend(["reg44_safeguarding", "reg45_safeguarding"])
            if evidence_item.manager_review_required:
                matched.append("reg44_leadership")
        return matched[:3] or ["reg44_records_quality"]

    def safe_pack_disclaimer(self) -> str:
        return SAFE_PACK_DISCLAIMER

    def official_source_refs(self) -> list[InspectionOfficialSourceRef]:
        return [
            InspectionOfficialSourceRef(
                id=s.id,
                title=s.title,
                url=s.url,
                note=s.note,
            )
            for s in OFFICIAL_SOURCES
        ]

    def default_pack_title(
        self,
        pack_type: InspectionPackType,
        period_start: str | None = None,
        period_end: str | None = None,
    ) -> str:
        labels = {
            "reg44": "Reg 44 evidence support pack",
            "reg45": "Reg 45 evidence support pack",
            "sccif": "SCCIF evidence support pack",
            "quality_standards": "Quality Standards evidence support pack",
            "custom": "Inspection evidence support pack",
        }
        title = labels.get(pack_type, "Evidence support pack")
        if period_start and period_end:
            return f"{title} ({period_start} to {period_end})"
        if period_start:
            return f"{title} (from {period_start})"
        return title


inspection_pack_registry_service = InspectionPackRegistryService()
