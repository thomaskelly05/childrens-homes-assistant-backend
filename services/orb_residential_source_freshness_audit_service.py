"""ORB Residential source freshness and local policy gap audit.

Metadata-only helpers. This module does not ingest, scrape, or alter runtime routes.
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any

from services.orb_residential_source_catalogue_audit_service import (
    CATALOGUE_PATH,
    FRESHNESS_CATEGORIES,
    STATUTORY_STATUSES,
    THIRD_SECTOR_STATUSES,
)

REQUIRED_FRESHNESS_FIELDS: tuple[str, ...] = (
    "last_verified_date",
    "review_frequency",
    "source_owner",
    "freshness_status",
    "update_check_required",
    "official_url",
    "publisher",
    "jurisdiction",
    "source_type",
    "statutory_status",
    "citation_authority",
    "should_cite",
    "quote_allowed_default",
    "requires_local_policy",
    "local_policy_gap_reason",
    "professional_judgement_boundary",
    "not_to_be_used_for",
)

REQUIRED_LOCAL_POLICY_AREAS: frozenset[str] = frozenset(
    {
        "safeguarding_procedures",
        "lado_allegations",
        "missing_from_care_protocols",
        "behaviour_management_policy",
        "restraint_restrictive_practice_policy",
        "search_confiscation_cctv_surveillance",
        "medication_policy",
        "complaints",
        "whistleblowing",
        "fire_emergency_evacuation",
        "health_and_safety",
        "transport_community_activities",
        "internet_device_use",
        "pocket_money_possessions",
        "family_time_contact",
        "risk_assessment",
        "business_continuity",
        "staff_supervision",
        "lone_working",
        "visitors_contractors",
        "data_protection_sars",
    }
)

LOCAL_POLICY_BOUNDARY_FIELDS: tuple[str, ...] = (
    "local_policy_document_needed",
    "safe_without_local_policy",
    "must_not_decide_without_local_policy",
    "escalation_prompt",
    "manager_oversight_prompt",
)


def _load_catalogue(path: Path = CATALOGUE_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


class OrbResidentialSourceFreshnessAuditService:
    """Read-only checks for source freshness and local-policy gap metadata."""

    def __init__(self) -> None:
        self._catalogue = _load_catalogue()

    def catalogue(self) -> dict[str, Any]:
        return dict(self._catalogue)

    def sources(self) -> list[dict[str, Any]]:
        return list(self._catalogue["sources"])

    def source_by_id(self) -> dict[str, dict[str, Any]]:
        return {source["source_id"]: source for source in self.sources()}

    def workflow_domain_behaviours(self) -> list[dict[str, Any]]:
        return list(self._catalogue["workflow_domain_behaviours"])

    def workflow_by_domain(self) -> dict[str, dict[str, Any]]:
        return {workflow["domain"]: workflow for workflow in self.workflow_domain_behaviours()}

    def local_policy_gap_audit(self) -> list[dict[str, Any]]:
        return list(self._catalogue["local_policy_gap_audit"])

    def source_count(self) -> int:
        return len(self.sources())

    def sources_missing_freshness_metadata(self) -> list[str]:
        missing: list[str] = []
        for source in self.sources():
            if any(field not in source or source[field] in (None, "") for field in REQUIRED_FRESHNESS_FIELDS):
                if source.get("official_url") == "" and source.get("requires_local_policy") is True:
                    source_without_url = dict(source)
                    source_without_url["official_url"] = "local_policy_marker"
                    if all(
                        field in source_without_url and source_without_url[field] not in (None, "")
                        for field in REQUIRED_FRESHNESS_FIELDS
                    ):
                        continue
                missing.append(source["source_id"])
        return missing

    def sources_with_freshness_metadata_count(self) -> int:
        return self.source_count() - len(self.sources_missing_freshness_metadata())

    def sources_missing_review_category(self) -> list[str]:
        return [
            source["source_id"]
            for source in self.sources()
            if source.get("freshness_status") not in FRESHNESS_CATEGORIES
        ]

    def sources_missing_owner_or_publisher(self) -> list[str]:
        return [
            source["source_id"]
            for source in self.sources()
            if not source.get("source_owner") or not source.get("publisher")
        ]

    def sources_missing_local_policy_flag(self) -> list[str]:
        return [
            source["source_id"]
            for source in self.sources()
            if not isinstance(source.get("requires_local_policy"), bool)
        ]

    def local_policy_required_sources(self) -> list[dict[str, Any]]:
        return [source for source in self.sources() if source["requires_local_policy"] is True]

    def local_policy_required_workflows(self) -> list[dict[str, Any]]:
        return [
            workflow
            for workflow in self.workflow_domain_behaviours()
            if workflow.get("requires_local_policy") is True
        ]

    def local_policy_source_citation_violations(self) -> list[str]:
        violations: list[str] = []
        for source in self.local_policy_required_sources():
            if (
                source.get("should_cite") is not False
                or source.get("quote_allowed_default") is not False
                or source.get("citation_authority") != "local_policy_required"
            ):
                violations.append(source["source_id"])
        return violations

    def local_policy_sources_missing_gap_reason(self) -> list[str]:
        return [
            source["source_id"]
            for source in self.local_policy_required_sources()
            if not source.get("local_policy_gap_reason")
        ]

    def missing_required_local_policy_areas(self) -> set[str]:
        present = {item["area"] for item in self.local_policy_gap_audit()}
        return set(REQUIRED_LOCAL_POLICY_AREAS - present)

    def local_policy_gap_records_missing_boundaries(self) -> list[str]:
        missing: list[str] = []
        for item in self.local_policy_gap_audit():
            if any(not item.get(field) for field in LOCAL_POLICY_BOUNDARY_FIELDS):
                missing.append(item["area"])
        return missing

    def local_policy_workflows_missing_prompts(self) -> list[str]:
        missing: list[str] = []
        for workflow in self.local_policy_required_workflows():
            if not workflow.get("escalation_prompt") or not workflow.get("manager_oversight_prompt"):
                missing.append(workflow["domain"])
        return missing

    def freshness_summary(self) -> Counter[str]:
        return Counter(source["freshness_status"] for source in self.sources())

    def third_sector_or_lived_experience_sources(self) -> list[dict[str, Any]]:
        return [
            source
            for source in self.sources()
            if source["statutory_status"] in THIRD_SECTOR_STATUSES
            or source["source_type"] == "lived_experience"
        ]

    def third_sector_or_lived_experience_marked_statutory(self) -> list[str]:
        return [
            source["source_id"]
            for source in self.third_sector_or_lived_experience_sources()
            if source["statutory_status"] in STATUTORY_STATUSES
            or source["citation_authority"]
            in {
                "authoritative_statute",
                "authoritative_guidance",
                "authoritative_inspection",
            }
        ]


orb_residential_source_freshness_audit_service = OrbResidentialSourceFreshnessAuditService()
