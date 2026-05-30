from __future__ import annotations

"""Source refresh service for ORB Residential standalone knowledge.

This service maintains a curated public source canon without requiring manual
file uploads. It does not access IndiCare OS records. It checks trusted source
registries, imports canonical URLs through the public evidence pipeline, and
returns refresh plans/status for automation or admin-triggered runs.
"""

import hashlib
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from services.orb_public_evidence_intelligence_service import (
    orb_public_evidence_intelligence_service,
)
from services.orb_sector_evidence_pipeline_service import (
    orb_sector_evidence_pipeline_service,
)
from services.orb_knowledge_library_service import orb_knowledge_library_service

logger = logging.getLogger("indicare.orb_source_refresh")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8", errors="ignore")).hexdigest()[:16]


@dataclass(frozen=True)
class OrbCanonicalSource:
    id: str
    title: str
    url: str
    pipeline_id: str
    description: str
    priority: int = 50
    cadence: str = "monthly"
    source_kind: str | None = None
    review_note: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


CANONICAL_SOURCES: tuple[OrbCanonicalSource, ...] = (
    OrbCanonicalSource(
        id="canon-children-homes-regs-quality-standards",
        title="Children's homes regulations including the quality standards",
        url="https://www.gov.uk/government/collections/childrens-homes-regulations-including-quality-standards",
        pipeline_id="guidance_change_tracker",
        description="DfE collection for children's homes regulations and quality standards guidance.",
        priority=1,
        cadence="monthly",
        source_kind="research_or_learning",
    ),
    OrbCanonicalSource(
        id="canon-working-together",
        title="Working together to safeguard children",
        url="https://www.gov.uk/government/publications/working-together-to-safeguard-children--2",
        pipeline_id="guidance_change_tracker",
        description="Statutory safeguarding guidance used as an official source anchor for ORB safeguarding reasoning.",
        priority=2,
        cadence="monthly",
        source_kind="research_or_learning",
    ),
    OrbCanonicalSource(
        id="canon-ofsted-reports",
        title="Ofsted reports search",
        url="https://reports.ofsted.gov.uk/",
        pipeline_id="ofsted_current_cycle",
        description="Registry for public Ofsted inspection reports. Specific reports should be imported as separate URLs.",
        priority=3,
        cadence="weekly",
        source_kind="ofsted_inspection_report",
        metadata={"registry_only": True},
    ),
    OrbCanonicalSource(
        id="canon-cspr-panel",
        title="Child Safeguarding Practice Review Panel",
        url="https://www.gov.uk/government/organisations/child-safeguarding-practice-review-panel",
        pipeline_id="safeguarding_review_learning",
        description="National panel publications and review learning.",
        priority=4,
        cadence="monthly",
        source_kind="national_panel_review",
    ),
    OrbCanonicalSource(
        id="canon-nspcc-case-reviews",
        title="NSPCC case review learning summaries",
        url="https://learning.nspcc.org.uk/case-reviews/recently-published-case-reviews",
        pipeline_id="safeguarding_review_learning",
        description="Curated public learning summaries for safeguarding practice review themes.",
        priority=5,
        cadence="monthly",
        source_kind="safeguarding_practice_review",
    ),
    OrbCanonicalSource(
        id="canon-pfd-reports",
        title="Prevention of Future Deaths reports",
        url="https://www.judiciary.uk/prevention-of-future-death-reports/",
        pipeline_id="pfd_system_learning",
        description="Public Regulation 28 report registry for systemic learning themes.",
        priority=6,
        cadence="monthly",
        source_kind="prevention_of_future_deaths",
        metadata={"registry_only": True},
    ),
    OrbCanonicalSource(
        id="canon-nice-looked-after-children",
        title="NICE looked-after children and young people guidance",
        url="https://www.nice.org.uk/guidance/ng205",
        pipeline_id="research_practice_evidence",
        description="Practice evidence for looked-after children and young people.",
        priority=7,
        cadence="quarterly",
        source_kind="research_or_learning",
    ),
    OrbCanonicalSource(
        id="canon-school-attendance",
        title="Working together to improve school attendance",
        url="https://www.gov.uk/government/publications/working-together-to-improve-school-attendance",
        pipeline_id="education_attendance_send",
        description="DfE attendance guidance relevant to care planning and education oversight.",
        priority=8,
        cadence="quarterly",
        source_kind="research_or_learning",
    ),
    OrbCanonicalSource(
        id="canon-promoting-education-lac",
        title="Promoting the education of looked-after children",
        url="https://www.gov.uk/government/publications/promoting-the-education-of-looked-after-children",
        pipeline_id="education_attendance_send",
        description="Guidance on education of looked-after children and previously looked-after children.",
        priority=9,
        cadence="quarterly",
        source_kind="research_or_learning",
    ),
    OrbCanonicalSource(
        id="canon-send-code",
        title="SEND code of practice",
        url="https://www.gov.uk/government/publications/send-code-of-practice-0-to-25",
        pipeline_id="education_attendance_send",
        description="SEND guidance for education and care planning support.",
        priority=10,
        cadence="quarterly",
        source_kind="research_or_learning",
    ),
    OrbCanonicalSource(
        id="canon-advocacy-services",
        title="Advocacy services for children and young people",
        url="https://www.gov.uk/government/publications/advocacy-services-for-children-and-young-people",
        pipeline_id="rights_advocacy_complaints",
        description="Guidance relevant to advocacy, rights and participation.",
        priority=11,
        cadence="quarterly",
        source_kind="research_or_learning",
    ),
    OrbCanonicalSource(
        id="canon-restraint-restrictive-intervention",
        title="Reducing the need for restraint and restrictive intervention",
        url="https://www.gov.uk/government/publications/reducing-the-need-for-restraint-and-restrictive-intervention",
        pipeline_id="restrictive_practice_behaviour",
        description="Public guidance relevant to restrictive practice, de-escalation and recording.",
        priority=12,
        cadence="quarterly",
        source_kind="research_or_learning",
    ),
    OrbCanonicalSource(
        id="canon-lac-statistics",
        title="Statistics: looked-after children",
        url="https://www.gov.uk/government/collections/statistics-looked-after-children",
        pipeline_id="social_care_statistics",
        description="Public statistics collection for looked-after children.",
        priority=13,
        cadence="quarterly",
        source_kind="research_or_learning",
        metadata={"registry_only": True},
    ),
    OrbCanonicalSource(
        id="canon-policy-consultations",
        title="Policy papers and consultations",
        url="https://www.gov.uk/search/policy-papers-and-consultations",
        pipeline_id="policy_consultation_tracker",
        description="Public search surface for policy and consultation monitoring.",
        priority=14,
        cadence="monthly",
        source_kind="research_or_learning",
        metadata={"registry_only": True},
    ),
    OrbCanonicalSource(
        id="canon-ombudsman-childrens-care",
        title="Ombudsman children's care services decisions",
        url="https://www.lgo.org.uk/decisions/children-s-care-services",
        pipeline_id="ombudsman_complaints_learning",
        description="Public complaints decisions for learning about delay, communication, records and remedy.",
        priority=15,
        cadence="quarterly",
        source_kind="research_or_learning",
        metadata={"registry_only": True},
    ),
)


class OrbSourceRefreshService:
    def canonical_sources(self) -> dict[str, Any]:
        return {
            "sources": [self._source_payload(source) for source in sorted(CANONICAL_SOURCES, key=lambda item: item.priority)],
            "count": len(CANONICAL_SOURCES),
            "standalone": True,
            "os_records_accessed": False,
        }

    def status(self) -> dict[str, Any]:
        library_sources = orb_knowledge_library_service.list_sources()
        indexed_urls = {str(source.get("source_url") or source.get("canonical_url") or "") for source in library_sources}
        canonical = []
        indexed = 0
        missing = 0
        for source in sorted(CANONICAL_SOURCES, key=lambda item: item.priority):
            is_indexed = source.url in indexed_urls
            indexed += 1 if is_indexed else 0
            missing += 0 if is_indexed else 1
            canonical.append({**self._source_payload(source), "indexed": is_indexed})
        return {
            "status": "ready",
            "canonical_count": len(CANONICAL_SOURCES),
            "indexed": indexed,
            "missing": missing,
            "sources": canonical,
            "standalone": True,
            "os_records_accessed": False,
        }

    def plan_refresh(self, *, limit: int = 50, include_indexed: bool = False) -> dict[str, Any]:
        status = self.status()
        candidates = []
        for source in status["sources"]:
            if source.get("indexed") and not include_indexed:
                continue
            candidates.append(source)
        candidates = candidates[: max(1, min(limit, 100))]
        return {
            "planned": len(candidates),
            "candidates": candidates,
            "include_indexed": include_indexed,
            "standalone": True,
            "os_records_accessed": False,
        }

    async def refresh_source(self, source_id: str, *, force: bool = False) -> dict[str, Any]:
        source = self._find(source_id)
        if not source:
            return {"success": False, "error": "canonical_source_not_found", "source_id": source_id}
        if source.metadata.get("registry_only") and not force:
            seeded = await orb_sector_evidence_pipeline_service.seed_pipeline(source.pipeline_id)
            return {
                "success": True,
                "mode": "registry_seeded",
                "source": self._source_payload(source),
                "result": seeded,
                "note": "Registry-only source seeded. Import specific report or guidance URLs for full quotes and exact citations.",
                "standalone": True,
                "os_records_accessed": False,
            }
        result = await orb_sector_evidence_pipeline_service.import_url(
            source.pipeline_id,
            source.url,
            title=source.title,
            approve_now=True,
        )
        return {
            "success": bool(result.get("success")),
            "mode": "imported_url",
            "source": self._source_payload(source),
            "result": result,
            "standalone": True,
            "os_records_accessed": False,
        }

    async def refresh_all(self, *, limit: int = 20, force: bool = False, include_indexed: bool = False) -> dict[str, Any]:
        plan = self.plan_refresh(limit=limit, include_indexed=include_indexed)
        results: list[dict[str, Any]] = []
        for candidate in plan.get("candidates") or []:
            result = await self.refresh_source(candidate["id"], force=force)
            results.append(result)
        return {
            "success": True,
            "attempted": len(results),
            "results": results,
            "standalone": True,
            "os_records_accessed": False,
        }

    def _find(self, source_id: str) -> OrbCanonicalSource | None:
        key = str(source_id or "").strip().lower()
        for source in CANONICAL_SOURCES:
            if source.id == key:
                return source
        return None

    def _source_payload(self, source: OrbCanonicalSource) -> dict[str, Any]:
        return {
            "id": source.id,
            "title": source.title,
            "url": source.url,
            "pipeline_id": source.pipeline_id,
            "description": source.description,
            "priority": source.priority,
            "cadence": source.cadence,
            "source_kind": source.source_kind,
            "review_note": source.review_note,
            "metadata": {
                **source.metadata,
                "canonical_fingerprint": _fingerprint(source.url),
                "standalone_only": True,
                "os_records_accessed": False,
            },
        }


orb_source_refresh_service = OrbSourceRefreshService()
