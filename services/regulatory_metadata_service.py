from __future__ import annotations

from typing import Any

from schemas.data_intelligence import CareMetadata, RegulatoryMetadata


QUALITY_STANDARD_BY_SIGNAL: dict[str, str] = {
    "child_voice_present": "views_wishes_and_feelings",
    "emotional_wellbeing_present": "quality_and_purpose_of_care",
    "health_present": "health_and_wellbeing",
    "education_present": "education",
    "family_contact_present": "positive_relationships",
    "relationship_present": "positive_relationships",
    "positive_progress_present": "enjoyment_and_achievement",
    "safeguarding_marker": "protection_of_children",
    "risk_marker": "protection_of_children",
    "missing_marker": "protection_of_children",
    "incident_marker": "protection_of_children",
    "manager_review_required": "leadership_and_management",
}

REGULATION_BY_STANDARD: dict[str, list[str]] = {
    "quality_and_purpose_of_care": ["regulation_5_quality_and_purpose_of_care"],
    "views_wishes_and_feelings": ["regulation_7_childrens_views_wishes_and_feelings"],
    "education": ["regulation_8_education_learning_and_enjoyment"],
    "enjoyment_and_achievement": ["regulation_8_education_learning_and_enjoyment"],
    "health_and_wellbeing": ["regulation_10_health_and_wellbeing"],
    "positive_relationships": ["regulation_11_positive_relationships"],
    "protection_of_children": ["regulation_12_protection_of_children"],
    "leadership_and_management": ["regulation_13_leadership_and_management"],
}

SCCIF_BY_STANDARD: dict[str, str] = {
    "quality_and_purpose_of_care": "sccif_experiences_and_progress",
    "views_wishes_and_feelings": "sccif_experiences_and_progress",
    "education": "sccif_education_and_progress",
    "enjoyment_and_achievement": "sccif_experiences_and_progress",
    "health_and_wellbeing": "sccif_experiences_and_progress",
    "positive_relationships": "sccif_experiences_and_progress",
    "protection_of_children": "sccif_help_and_protection",
    "leadership_and_management": "sccif_effectiveness_of_leaders",
}

REPORT_RELEVANCE_BY_STANDARD: dict[str, list[str]] = {
    "education": ["lac_review", "reg45", "inspection_readiness"],
    "health_and_wellbeing": ["lac_review", "reg45", "inspection_readiness"],
    "positive_relationships": ["lac_review", "reg45", "inspection_readiness"],
    "protection_of_children": ["reg44", "reg45", "safeguarding_chronology", "ofsted_evidence_pack"],
    "leadership_and_management": ["reg44", "reg45", "manager_oversight_report"],
}


def _unique(values: list[str]) -> list[str]:
    return sorted({value for value in values if value})


class RegulatoryMetadataService:
    """Maps deterministic care signals to SCCIF, regulations and report evidence use."""

    def map_metadata(
        self,
        *,
        record_type: str,
        care: CareMetadata,
        workflow_status: str | None = None,
        existing_quality_standard_ids: list[str] | None = None,
    ) -> RegulatoryMetadata:
        standards = list(existing_quality_standard_ids or [])
        for signal, standard_id in QUALITY_STANDARD_BY_SIGNAL.items():
            if bool(getattr(care, signal, False)):
                standards.append(standard_id)

        if record_type in {"daily_note", "chronology_event"} and not standards:
            standards.append("quality_and_purpose_of_care")
        if record_type == "risk_assessment":
            standards.append("protection_of_children")
        if record_type == "action":
            standards.append("leadership_and_management")

        standards = _unique(standards)
        regulations = _unique([reg for standard in standards for reg in REGULATION_BY_STANDARD.get(standard, [])])
        sccif = _unique([SCCIF_BY_STANDARD.get(standard, "") for standard in standards])

        report_relevance = _unique(
            [report for standard in standards for report in REPORT_RELEVANCE_BY_STANDARD.get(standard, [])]
        )
        if record_type in {"report", "evidence", "document"}:
            report_relevance.append("inspection_readiness")
        if workflow_status in {"submitted", "approved", "reviewed"}:
            report_relevance.append("manager_oversight_report")

        gaps: list[str] = []
        if care.child_voice_missing:
            gaps.append("child_voice_missing")
        if care.follow_up_required and not care.manager_review_required:
            gaps.append("follow_up_not_manager_reviewed")
        if (care.safeguarding_marker or care.risk_marker or care.missing_marker) and not care.follow_up_required:
            gaps.append("safeguarding_follow_up_not_recorded")

        evidence_strength = self._evidence_strength(care=care, workflow_status=workflow_status)
        return RegulatoryMetadata(
            quality_standard_ids=standards,
            children_home_regulation_ids=regulations,
            sccif_area_ids=sccif,
            evidence_strength=evidence_strength,
            evidence_gap_ids=_unique(gaps),
            inspection_relevance="high" if sccif or regulations else "none",
            report_relevance=_unique(report_relevance),
            reg44_relevance="reg44" in report_relevance or "manager_oversight_report" in report_relevance,
            reg45_relevance="reg45" in report_relevance or bool(standards),
            lac_review_relevance="lac_review" in report_relevance,
        )

    def deterministic_mapping_for_terms(self, terms: list[str]) -> dict[str, Any]:
        care = CareMetadata(detected_signals=[])
        lowered = " ".join(terms).lower()
        for signal in QUALITY_STANDARD_BY_SIGNAL:
            if signal.replace("_present", "").replace("_marker", "") in lowered:
                setattr(care, signal, True)
        mapped = self.map_metadata(record_type="daily_note", care=care)
        return mapped.model_dump()

    def _evidence_strength(self, *, care: CareMetadata, workflow_status: str | None) -> str:
        score = 0
        score += 2 if care.child_voice_present else 0
        score += 2 if care.positive_progress_present else 0
        score += 1 if care.education_present or care.health_present or care.family_contact_present else 0
        score += 1 if care.manager_review_required or workflow_status in {"submitted", "approved", "reviewed"} else 0
        score -= 2 if care.child_voice_missing else 0
        if score >= 4:
            return "strong"
        if score >= 1:
            return "medium"
        return "limited"


regulatory_metadata_service = RegulatoryMetadataService()
