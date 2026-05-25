"""Reg 45 Quality of Care Review registry — section structure and safe evidence mapping."""

from __future__ import annotations

from typing import Any

from schemas.reg45_quality_review import (
    Reg45OfficialSourceRef,
    Reg45ReviewEvidenceItem,
    Reg45ReviewSectionType,
)
from services.sccif_alignment_registry_service import OFFICIAL_SOURCES

SAFE_REVIEW_DISCLAIMER = (
    "Draft quality of care review — requires manager/provider review. "
    "Evidence reviewed may support professional judgement; this is not a compliance decision, "
    "does not predict Ofsted outcomes, and does not generate inspection grades. "
    "Professional judgement remains required."
)

REG45_REVIEW_SECTIONS: list[dict[str, str]] = [
    {
        "id": "summary",
        "section_type": "summary",
        "title": "Review summary",
        "summary": "Overview of evidence themes for the quality of care review — draft only.",
    },
    {
        "id": "child_voice",
        "section_type": "child_voice",
        "title": "Children's views, wishes and feelings",
        "summary": "Child voice evidence may support views and wishes — requires source review.",
    },
    {
        "id": "progress_outcomes",
        "section_type": "progress_outcomes",
        "title": "Children's progress and outcomes",
        "summary": "Progress and outcomes evidence aligned from operational metadata.",
    },
    {
        "id": "quality_purpose",
        "section_type": "quality_purpose",
        "title": "Quality and purpose of care",
        "summary": "Daily care, keywork and quality-of-life recording may support this area.",
    },
    {
        "id": "safeguarding_protection",
        "section_type": "safeguarding_protection",
        "title": "Safeguarding and protection",
        "summary": "Safeguarding network and alerts — manager review needed; no raw narratives here.",
    },
    {
        "id": "education",
        "section_type": "education",
        "title": "Education",
        "summary": "Education recording routes may support this area — requires source review.",
    },
    {
        "id": "health_wellbeing",
        "section_type": "health_wellbeing",
        "title": "Health and wellbeing",
        "summary": "Health appointments and wellbeing threads — metadata only.",
    },
    {
        "id": "positive_relationships",
        "section_type": "positive_relationships",
        "title": "Positive relationships and family time",
        "summary": "Relationship and family-time evidence may require chronology review.",
    },
    {
        "id": "care_planning",
        "section_type": "care_planning",
        "title": "Care planning",
        "summary": "Plans, reviews and care planning routes — manager review needed.",
    },
    {
        "id": "workforce_leadership",
        "section_type": "workforce_leadership",
        "title": "Workforce and leadership",
        "summary": "Workforce context, staff profile, governance and leadership oversight.",
    },
    {
        "id": "patterns_themes",
        "section_type": "patterns_themes",
        "title": "Patterns, themes and trends",
        "summary": "Patterns from governance and handover — not predictive grades.",
    },
    {
        "id": "improvement_actions",
        "section_type": "improvement_actions",
        "title": "Improvement actions",
        "summary": "Draft improvement suggestions from gaps — not auto-accepted actions.",
    },
    {
        "id": "provider_ri_review",
        "section_type": "provider_ri_review",
        "title": "Provider / RI review",
        "summary": "Responsible Individual and provider review prompts — RI/provider review needed.",
    },
    {
        "id": "final_reflections",
        "section_type": "final_reflections",
        "title": "Final manager reflections",
        "summary": "Manager-authored reflections — not generated as statutory conclusions.",
    },
]

PACK_SECTION_TO_REVIEW: dict[str, Reg45ReviewSectionType] = {
    "reg45_qocr_summary": "summary",
    "reg45_child_views": "child_voice",
    "reg45_outcomes": "progress_outcomes",
    "reg44_quality_daily_life": "quality_purpose",
    "reg45_safeguarding": "safeguarding_protection",
    "reg45_health_education": "education",
    "reg45_relationships": "positive_relationships",
    "reg45_workforce": "workforce_leadership",
    "reg45_patterns": "patterns_themes",
    "reg45_improvement": "improvement_actions",
}

SECTION_KEYWORDS: dict[Reg45ReviewSectionType, tuple[str, ...]] = {
    "summary": ("reg45", "quality of care", "review", "overview"),
    "child_voice": ("voice", "wish", "feeling", "view", "child"),
    "progress_outcomes": ("outcome", "progress", "experience", "journey"),
    "quality_purpose": ("daily", "care", "keywork", "quality", "purpose"),
    "safeguarding_protection": ("safeguard", "protect", "isn", "alert", "helped"),
    "education": ("education", "school", "ehcp", "learning"),
    "health_wellbeing": ("health", "wellbeing", "medical", "appointment"),
    "positive_relationships": ("relationship", "family", "contact", "family time"),
    "care_planning": ("plan", "lac", "review", "care plan", "placement"),
    "workforce_leadership": ("workforce", "staff", "leadership", "supervision", "governance", "brief"),
    "patterns_themes": ("pattern", "trend", "theme", "handover"),
    "improvement_actions": ("improve", "gap", "action"),
    "provider_ri_review": ("provider", "responsible", " ri ", "ri oversight"),
    "final_reflections": ("reflection", "conclusion", "manager note"),
}

ORB_REVIEW_PROMPTS: list[dict[str, str]] = [
    {
        "label": "Ask ORB to help structure the Reg 45 review",
        "mode": "ofsted_evidence_review",
        "query": "Help structure a Reg 45 quality of care review using safe evidence themes — not a compliance decision.",
    },
    {
        "label": "Ask ORB what evidence gaps need manager review",
        "mode": "ofsted_evidence_review",
        "query": "What Reg 45 evidence gaps may need manager review from safe operational metadata?",
    },
    {
        "label": "Ask ORB what improvement actions may be needed",
        "mode": "action_priority",
        "query": "What improvement actions may be needed from Reg 45 review gaps — draft proposals only?",
    },
    {
        "label": "Ask ORB to help prepare RI review questions",
        "mode": "ofsted_evidence_review",
        "query": "Help prepare Responsible Individual review questions for a quality of care review — not statutory conclusions.",
    },
    {
        "label": "Ask ORB what safeguarding themes should be considered",
        "mode": "safeguarding_themes",
        "query": "What safeguarding and protection themes should be considered in a Reg 45 review — metadata only?",
    },
]

STATUS_LABELS: dict[str, str] = {
    "draft": "Draft review",
    "evidence_gathering": "Evidence gathering",
    "ready_for_manager_review": "Ready for manager review",
    "manager_reviewed": "Manager reviewed",
    "ri_review_required": "RI review required",
    "ri_reviewed": "RI reviewed",
    "finalised": "Finalised draft",
    "archived": "Archived",
}


class Reg45QualityReviewRegistryService:
    def list_sections(self) -> list[dict[str, str]]:
        return [dict(s) for s in REG45_REVIEW_SECTIONS]

    def get_section_template(self, section_type: Reg45ReviewSectionType) -> dict[str, str]:
        for section in REG45_REVIEW_SECTIONS:
            if section["section_type"] == section_type:
                return dict(section)
        return REG45_REVIEW_SECTIONS[0]

    def map_evidence_to_sections(self, evidence_item: Reg45ReviewEvidenceItem) -> list[Reg45ReviewSectionType]:
        if evidence_item.section_types:
            return list(evidence_item.section_types)[:3]
        text = " ".join(
            [
                evidence_item.title.lower(),
                evidence_item.safe_summary.lower(),
                evidence_item.source_module.lower(),
                str((evidence_item.metadata or {}).get("recording_type", "")),
            ]
        ).lower()
        matched: list[Reg45ReviewSectionType] = []
        for section_type, keywords in SECTION_KEYWORDS.items():
            if any(kw in text for kw in keywords):
                matched.append(section_type)
        if not matched:
            if evidence_item.safeguarding_review_required:
                matched.append("safeguarding_protection")
            if evidence_item.manager_review_required:
                matched.append("workforce_leadership")
        return matched[:3] or ["summary"]

    def map_pack_section_id(self, pack_section_id: str) -> Reg45ReviewSectionType:
        return PACK_SECTION_TO_REVIEW.get(pack_section_id, "summary")

    def default_title(
        self,
        period_start: str | None = None,
        period_end: str | None = None,
    ) -> str:
        title = "Reg 45 Quality of Care Review (draft)"
        if period_start and period_end:
            return f"{title} — {period_start} to {period_end}"
        if period_start:
            return f"{title} — from {period_start}"
        return title

    def safe_review_disclaimer(self) -> str:
        return SAFE_REVIEW_DISCLAIMER

    def official_source_refs(self) -> list[Reg45OfficialSourceRef]:
        return [
            Reg45OfficialSourceRef(id=s.id, title=s.title, url=s.url, note=s.note)
            for s in OFFICIAL_SOURCES
        ]

    def orb_prompts(self) -> list[dict[str, str]]:
        return list(ORB_REVIEW_PROMPTS)

    def status_labels(self) -> dict[str, str]:
        return dict(STATUS_LABELS)


reg45_quality_review_registry_service = Reg45QualityReviewRegistryService()
