"""SCCIF and Quality Standards alignment registry — mapping and safe wording only."""

from __future__ import annotations

from typing import Any

from schemas.sccif_alignment import (
    QualityStandardArea,
    SccifJudgementArea,
    SccifOfficialSourceRef,
)

SAFE_ALIGNMENT_DISCLAIMER = (
    "Evidence aligned to SCCIF judgement areas and Children's Homes Quality Standards "
    "is decision-support only. This is not a compliance decision. Professional judgement "
    "and statutory responsibilities remain required. IndiCare does not predict inspection "
    "outcomes or generate Ofsted grades."
)

OFFICIAL_SOURCES: list[SccifOfficialSourceRef] = [
    SccifOfficialSourceRef(
        id="sccif_childrens_homes",
        title="Social care common inspection framework (SCCIF): children's homes",
        url="https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes/social-care-common-inspection-framework-sccif-childrens-homes",
        family="sccif_childrens_homes",
        publisher="Ofsted",
        note="Summary alignment only — import in Knowledge Library for exact citations.",
    ),
    SccifOfficialSourceRef(
        id="quality_standards_guide",
        title="Guide to the Children's Homes Regulations, including the Quality Standards",
        url="https://assets.publishing.service.gov.uk/media/5a7f1b54ed915d74e33f45f0/Guide_to_Children_s_Home_Standards_inc_quality_standards_Version__1.17_FINAL.pdf",
        family="quality_standards_guide",
        publisher="Department for Education",
        note="Summary alignment only — import in Knowledge Library for exact citations.",
    ),
]

JUDGEMENT_AREAS: dict[SccifJudgementArea, dict[str, str]] = {
    "overall_experiences_progress": {
        "title": "Overall experiences and progress of children",
        "description": "Evidence may support how children's experiences and progress are recorded and reviewed.",
        "route": "/intelligence/sccif?judgement=overall_experiences_progress",
    },
    "helped_and_protected": {
        "title": "How well children are helped and protected",
        "description": "Evidence may support safeguarding, protection and follow-up oversight.",
        "route": "/intelligence/sccif?judgement=helped_and_protected",
    },
    "leadership_management": {
        "title": "Effectiveness of leaders and managers",
        "description": "Evidence may support leadership oversight, workforce and governance threads.",
        "route": "/intelligence/sccif?judgement=leadership_management",
    },
}

QUALITY_STANDARDS: dict[QualityStandardArea, dict[str, str]] = {
    "quality_purpose": {
        "title": "Quality and purpose of care",
        "regulation": "Regulation 6",
        "route": "/intelligence/sccif?standard=quality_purpose",
    },
    "views_wishes_feelings": {
        "title": "Children's views, wishes and feelings",
        "regulation": "Regulation 7",
        "route": "/intelligence/sccif?standard=views_wishes_feelings",
    },
    "education": {
        "title": "Education",
        "regulation": "Regulation 8",
        "route": "/intelligence/sccif?standard=education",
    },
    "enjoyment_achievement": {
        "title": "Enjoyment and achievement",
        "regulation": "Regulation 9",
        "route": "/intelligence/sccif?standard=enjoyment_achievement",
    },
    "health_wellbeing": {
        "title": "Health and well-being",
        "regulation": "Regulation 10",
        "route": "/intelligence/sccif?standard=health_wellbeing",
    },
    "positive_relationships": {
        "title": "Positive relationships",
        "regulation": "Regulation 11",
        "route": "/intelligence/sccif?standard=positive_relationships",
    },
    "protection_children": {
        "title": "Protection of children",
        "regulation": "Regulation 12",
        "route": "/intelligence/sccif?standard=protection_children",
    },
    "leadership_management": {
        "title": "Leadership and management",
        "regulation": "Regulation 13",
        "route": "/intelligence/sccif?standard=leadership_management",
    },
    "care_planning": {
        "title": "Care planning",
        "regulation": "Regulation 14",
        "route": "/intelligence/sccif?standard=care_planning",
    },
}

RECORDING_TYPE_ALIGNMENT: dict[str, dict[str, Any]] = {
    "safeguarding-concern": {
        "judgement_areas": ["helped_and_protected"],
        "quality_standards": ["protection_children"],
        "strength": "partial_evidence",
    },
    "disclosure": {
        "judgement_areas": ["helped_and_protected"],
        "quality_standards": ["protection_children"],
        "strength": "partial_evidence",
    },
    "allegation": {
        "judgement_areas": ["helped_and_protected"],
        "quality_standards": ["protection_children"],
        "strength": "partial_evidence",
    },
    "daily-note": {
        "judgement_areas": ["overall_experiences_progress"],
        "quality_standards": ["quality_purpose", "views_wishes_feelings"],
        "strength": "partial_evidence",
    },
    "keywork": {
        "judgement_areas": ["overall_experiences_progress"],
        "quality_standards": ["views_wishes_feelings", "care_planning", "positive_relationships"],
        "strength": "partial_evidence",
    },
    "education-note": {
        "judgement_areas": ["overall_experiences_progress"],
        "quality_standards": ["education"],
        "strength": "partial_evidence",
    },
    "health-appointment": {
        "judgement_areas": ["overall_experiences_progress"],
        "quality_standards": ["health_wellbeing"],
        "strength": "partial_evidence",
    },
    "family-time": {
        "judgement_areas": ["overall_experiences_progress"],
        "quality_standards": ["positive_relationships", "care_planning"],
        "strength": "partial_evidence",
    },
    "missing": {
        "judgement_areas": ["helped_and_protected"],
        "quality_standards": ["protection_children"],
        "strength": "partial_evidence",
    },
    "rhi": {
        "judgement_areas": ["helped_and_protected"],
        "quality_standards": ["protection_children"],
        "strength": "partial_evidence",
    },
    "physical-intervention": {
        "judgement_areas": ["helped_and_protected"],
        "quality_standards": ["positive_relationships", "protection_children"],
        "strength": "partial_evidence",
    },
    "manager-review": {
        "judgement_areas": ["leadership_management"],
        "quality_standards": ["leadership_management"],
        "strength": "partial_evidence",
    },
    "incident": {
        "judgement_areas": ["helped_and_protected", "overall_experiences_progress"],
        "quality_standards": ["protection_children", "quality_purpose"],
        "strength": "partial_evidence",
    },
    "medication-note-error": {
        "judgement_areas": ["helped_and_protected"],
        "quality_standards": ["health_wellbeing", "protection_children"],
        "strength": "partial_evidence",
    },
}

SOURCE_MODULE_ALIGNMENT: dict[str, dict[str, Any]] = {
    "recording_governance": {
        "judgement_areas": ["leadership_management"],
        "quality_standards": ["leadership_management"],
        "strength": "partial_evidence",
        "route": "/record/governance",
    },
    "recording_review": {
        "judgement_areas": ["leadership_management", "helped_and_protected"],
        "quality_standards": ["leadership_management", "protection_children"],
        "strength": "partial_evidence",
        "route": "/record/reviews",
    },
    "recording_alerts": {
        "judgement_areas": ["helped_and_protected", "leadership_management"],
        "quality_standards": ["protection_children", "leadership_management"],
        "strength": "partial_evidence",
        "route": "/record/alerts",
    },
    "handover_intelligence": {
        "judgement_areas": ["leadership_management"],
        "quality_standards": ["quality_purpose", "leadership_management"],
        "strength": "partial_evidence",
        "route": "/handover",
    },
    "isn_digest": {
        "judgement_areas": ["helped_and_protected"],
        "quality_standards": ["protection_children"],
        "strength": "partial_evidence",
        "route": "/safeguarding",
    },
    "workforce_context": {
        "judgement_areas": ["leadership_management"],
        "quality_standards": ["leadership_management", "positive_relationships"],
        "strength": "partial_evidence",
        "route": "/staff",
    },
    "staff_profile_os": {
        "judgement_areas": ["leadership_management"],
        "quality_standards": ["leadership_management", "positive_relationships"],
        "strength": "partial_evidence",
        "route": "/staff",
    },
    "manager_daily_brief": {
        "judgement_areas": ["leadership_management"],
        "quality_standards": ["leadership_management"],
        "strength": "partial_evidence",
        "route": "/command-centre/briefing",
    },
    "child_journey": {
        "judgement_areas": ["overall_experiences_progress"],
        "quality_standards": ["quality_purpose", "care_planning"],
        "strength": "route_hint_only",
        "route": "/young-people",
    },
    "os_notifications": {
        "judgement_areas": ["leadership_management", "helped_and_protected"],
        "quality_standards": ["leadership_management", "protection_children"],
        "strength": "partial_evidence",
        "route": "/notifications/settings",
    },
}

ORB_ALIGNMENT_PROMPTS: list[dict[str, str]] = [
    {
        "label": "Ask ORB what evidence supports children's experiences and progress.",
        "mode": "ofsted_evidence_review",
        "query": "What operational evidence may support children's experiences and progress? Not a compliance decision.",
    },
    {
        "label": "Ask ORB what helped/protected evidence may need review.",
        "mode": "safeguarding_themes",
        "query": "What helped and protected evidence themes may need manager review?",
    },
    {
        "label": "Ask ORB what leadership oversight gaps are visible.",
        "mode": "manager_daily_brief",
        "query": "What leadership oversight gaps are visible from safe operational summaries?",
    },
    {
        "label": "Ask ORB how a record may align to the Quality Standards.",
        "mode": "record_quality_review",
        "query": "How might this recording type align to Children's Homes Quality Standards? Evidence support only.",
    },
    {
        "label": "Ask ORB what evidence may be missing before inspection.",
        "mode": "ofsted_evidence_review",
        "query": "What evidence gaps should a manager consider before inspection preparation? No grade prediction.",
    },
]


class SccifAlignmentRegistryService:
    def list_judgement_areas(self) -> list[dict[str, Any]]:
        return [
            {"area": area, **meta}
            for area, meta in JUDGEMENT_AREAS.items()
        ]

    def list_quality_standards(self) -> list[dict[str, Any]]:
        return [
            {"area": area, **meta}
            for area, meta in QUALITY_STANDARDS.items()
        ]

    def map_source_to_alignment(
        self, source_module: str, item_type: str | None = None
    ) -> dict[str, Any]:
        if item_type:
            rec = RECORDING_TYPE_ALIGNMENT.get(item_type.replace("_", "-"))
            if rec:
                return rec
        return SOURCE_MODULE_ALIGNMENT.get(source_module, {
            "judgement_areas": [],
            "quality_standards": [],
            "strength": "route_hint_only",
            "route": "/intelligence/sccif",
        })

    def quality_standard_for_recording_type(self, recording_type: str) -> list[QualityStandardArea]:
        mapping = RECORDING_TYPE_ALIGNMENT.get(recording_type.replace("_", "-"), {})
        return list(mapping.get("quality_standards") or [])

    def judgement_area_for_recording_type(self, recording_type: str) -> list[SccifJudgementArea]:
        mapping = RECORDING_TYPE_ALIGNMENT.get(recording_type.replace("_", "-"), {})
        return list(mapping.get("judgement_areas") or [])

    def official_source_refs(self) -> list[SccifOfficialSourceRef]:
        return list(OFFICIAL_SOURCES)

    def safe_alignment_disclaimer(self) -> str:
        return SAFE_ALIGNMENT_DISCLAIMER

    def route_for_standard(self, standard: QualityStandardArea) -> str:
        return QUALITY_STANDARDS.get(standard, {}).get("route", "/intelligence/sccif")

    def route_for_judgement(self, judgement: SccifJudgementArea) -> str:
        return JUDGEMENT_AREAS.get(judgement, {}).get("route", "/intelligence/sccif")

    def orb_prompts(self) -> list[dict[str, str]]:
        return list(ORB_ALIGNMENT_PROMPTS)

    def judgement_title(self, area: SccifJudgementArea) -> str:
        return JUDGEMENT_AREAS.get(area, {}).get("title", area.replace("_", " ").title())

    def quality_standard_title(self, area: QualityStandardArea) -> str:
        return QUALITY_STANDARDS.get(area, {}).get("title", area.replace("_", " ").title())

    def quality_standard_regulation(self, area: QualityStandardArea) -> str | None:
        return QUALITY_STANDARDS.get(area, {}).get("regulation")


sccif_alignment_registry_service = SccifAlignmentRegistryService()
