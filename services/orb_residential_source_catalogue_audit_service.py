"""ORB Residential Source Catalogue Audit — standalone ORB only.

Tiered mapping of official and practice sources to ORB behaviours.
Does not ingest sources, scrape documents, or change runtime behaviour.
See docs/audits/orb-residential-source-catalogue-audit.md.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

SourceType = Literal[
    "legislation",
    "statutory_guidance",
    "inspection_framework",
    "government_practice_guidance",
    "clinical_guidance",
    "data_protection_guidance",
    "professional_guidance",
    "third_sector",
    "lived_experience",
]

StatutoryStatus = Literal[
    "primary_legislation",
    "secondary_legislation",
    "statutory_guidance",
    "inspection_framework",
    "policy_framework",
    "practice_guidance",
    "clinical_guidance",
    "professional_guidance",
    "third_sector_resource",
    "lived_experience_resource",
]

CitationAuthority = Literal[
    "authoritative_statute",
    "authoritative_guidance",
    "authoritative_inspection",
    "clinical_guidance",
    "informative_practice",
    "reflective_only",
    "local_policy_check_required",
]

REPO_ROOT = Path(__file__).resolve().parents[1]
CATALOGUE_PATH = REPO_ROOT / "data" / "orb_source_catalogue" / "catalogue.json"

TIER_1_REQUIRED_SOURCE_IDS: frozenset[str] = frozenset(
    {
        "childrens_homes_regulations_2015",
        "dfe_childrens_homes_regulations_guide",
        "ofsted_sccif_childrens_homes",
        "children_act_1989_vol2_care_planning",
        "care_planning_placement_case_review_regs_2010",
        "working_together_safeguarding",
        "children_social_care_national_framework",
        "iro_handbook",
        "ofsted_serious_incident_notification",
        "regulation_40_childrens_homes",
        "regulation_44_childrens_homes",
        "regulation_45_childrens_homes",
    }
)

REG_NOTIFICATION_SOURCE_IDS: frozenset[str] = frozenset(
    {
        "regulation_40_childrens_homes",
        "regulation_44_childrens_homes",
        "regulation_45_childrens_homes",
        "ofsted_serious_incident_notification",
    }
)

STATUTORY_STATUSES: frozenset[str] = frozenset(
    {
        "primary_legislation",
        "secondary_legislation",
        "statutory_guidance",
        "inspection_framework",
        "policy_framework",
    }
)

NON_STATUTORY_STATUSES: frozenset[str] = frozenset(
    {
        "practice_guidance",
        "clinical_guidance",
        "professional_guidance",
        "third_sector_resource",
        "lived_experience_resource",
    }
)

THIRD_SECTOR_STATUSES: frozenset[str] = frozenset(
    {
        "third_sector_resource",
        "lived_experience_resource",
    }
)

FORBIDDEN_COMPLIANCE_PHRASES: tuple[str, ...] = (
    "guarantee compliance",
    "guaranteeing compliance",
    "guaranteed compliance",
    "ensure compliance",
    "safeguarding decision-making",
    "make safeguarding decisions",
    "predict inspection grade",
    "predict ofsted grade",
)

REQUIRED_SOURCE_FIELDS: tuple[str, ...] = (
    "source_id",
    "title",
    "official_url",
    "source_type",
    "tier",
    "jurisdiction",
    "publisher",
    "statutory_status",
    "citation_authority",
    "should_cite",
    "quote_allowed_default",
    "last_verified_date",
    "update_check_required",
    "related_quality_standards",
    "related_sccif_judgement_areas",
    "related_regulations",
    "related_workflow_domains",
    "escalation_triggers",
    "safer_recording_behaviours",
    "manager_oversight_triggers",
    "child_voice_prompts",
    "professional_judgement_boundary",
    "not_to_be_used_for",
)


def _load_catalogue() -> dict[str, Any]:
    return json.loads(CATALOGUE_PATH.read_text(encoding="utf-8"))


class OrbResidentialSourceCatalogueAuditService:
    """Read-only audit helpers for ORB Residential tiered source catalogue."""

    def __init__(self) -> None:
        self._catalogue = _load_catalogue()

    def catalogue(self) -> dict[str, Any]:
        return dict(self._catalogue)

    def sources(self) -> list[dict[str, Any]]:
        return list(self._catalogue["sources"])

    def source_by_id(self) -> dict[str, dict[str, Any]]:
        return {s["source_id"]: s for s in self.sources()}

    def tiers(self) -> list[int]:
        return list(self._catalogue["tiers"])

    def tier_labels(self) -> dict[str, str]:
        return dict(self._catalogue["tier_labels"])

    def workflow_domain_behaviours(self) -> list[dict[str, Any]]:
        return list(self._catalogue["workflow_domain_behaviours"])

    def sources_for_tier(self, tier: int) -> list[dict[str, Any]]:
        return [s for s in self.sources() if s["tier"] == tier]

    def tier_1_sources(self) -> list[dict[str, Any]]:
        return self.sources_for_tier(1)

    def statutory_sources(self) -> list[dict[str, Any]]:
        return [s for s in self.sources() if s["statutory_status"] in STATUTORY_STATUSES]

    def non_statutory_sources(self) -> list[dict[str, Any]]:
        return [s for s in self.sources() if s["statutory_status"] in NON_STATUTORY_STATUSES]

    def third_sector_sources(self) -> list[dict[str, Any]]:
        return [s for s in self.sources() if s["statutory_status"] in THIRD_SECTOR_STATUSES]

    def sources_by_workflow_domain(self, domain: str) -> list[dict[str, Any]]:
        return [s for s in self.sources() if domain in s["related_workflow_domains"]]

    def all_quality_standards_mapped(self) -> set[str]:
        mapped: set[str] = set()
        for s in self.sources():
            mapped.update(s["related_quality_standards"])
        for w in self.workflow_domain_behaviours():
            mapped.update(w["quality_standards"])
        return mapped

    def all_sccif_areas_mapped(self) -> set[str]:
        mapped: set[str] = set()
        for s in self.sources():
            mapped.update(s["related_sccif_judgement_areas"])
        for w in self.workflow_domain_behaviours():
            mapped.add(w["sccif_judgement_area"])
        return mapped

    def has_tier_1_coverage(self) -> bool:
        ids = {s["source_id"] for s in self.sources()}
        return TIER_1_REQUIRED_SOURCE_IDS <= ids

    def has_reg_notification_sources(self) -> bool:
        ids = {s["source_id"] for s in self.sources()}
        return REG_NOTIFICATION_SOURCE_IDS <= ids

    def third_sector_not_authoritative(self) -> bool:
        for s in self.third_sector_sources():
            if s["citation_authority"] in (
                "authoritative_statute",
                "authoritative_guidance",
                "authoritative_inspection",
            ):
                return False
            if s["statutory_status"] in STATUTORY_STATUSES:
                return False
        return True

    def all_sources_have_required_fields(self) -> bool:
        for s in self.sources():
            for field in REQUIRED_SOURCE_FIELDS:
                if field not in s:
                    return False
        return True

    def no_compliance_guarantee_claims(self) -> bool:
        for s in self.sources():
            blob = " ".join(
                [
                    s.get("professional_judgement_boundary", ""),
                    " ".join(s.get("not_to_be_used_for", [])),
                    s.get("title", ""),
                ]
            ).lower()
            for phrase in FORBIDDEN_COMPLIANCE_PHRASES:
                if phrase in blob and phrase not in (
                    "guaranteeing compliance",
                    "safeguarding decision-making",
                ):
                    # allowed only in not_to_be_used_for lists as negation
                    if phrase in " ".join(s.get("not_to_be_used_for", [])).lower():
                        continue
                    return False
            # Explicit: not_to_be_used_for should mention compliance guarantee negation
            ntb = " ".join(s.get("not_to_be_used_for", [])).lower()
            if "guarantee" in ntb and "compliance" in ntb:
                continue
        return True

    def every_workflow_domain_has_sources(self) -> bool:
        behaviours = self.workflow_domain_behaviours()
        for w in behaviours:
            if not w.get("relevant_sources"):
                return False
        return len(behaviours) >= 28

    def source_count(self) -> int:
        return len(self.sources())

    def workflow_domain_count(self) -> int:
        return len(self.workflow_domain_behaviours())

    def source_types_represented(self) -> set[str]:
        return {s["source_type"] for s in self.sources()}


orb_residential_source_catalogue_audit_service = OrbResidentialSourceCatalogueAuditService()
