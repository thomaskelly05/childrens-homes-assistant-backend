from __future__ import annotations

"""Sector evidence pipelines for standalone ORB Residential.

These pipelines do not access IndiCare OS records. They organise public evidence
sources so ORB can become sharper through official reports, statutory guidance,
research, public statistics and inspection language benchmarks.
"""

from dataclasses import dataclass, field
from typing import Any

from services.orb_public_evidence_intelligence_service import (
    orb_public_evidence_intelligence_service,
)


@dataclass(frozen=True)
class OrbSectorEvidencePipeline:
    id: str
    label: str
    description: str
    strengthens_lenses: tuple[str, ...]
    source_kinds: tuple[str, ...]
    seed_urls: tuple[str, ...]
    query_hints: tuple[str, ...]
    priority: int = 50
    cadence: str = "monthly"
    standalone: bool = True
    os_records_accessed: bool = False
    safety_note: str = "Use as public learning themes only; do not claim a user's scenario matches a named case."
    metadata: dict[str, Any] = field(default_factory=dict)


PIPELINES: tuple[OrbSectorEvidencePipeline, ...] = (
    OrbSectorEvidencePipeline(
        id="ofsted_current_cycle",
        label="Ofsted Current Cycle",
        description="Keeps ORB's Ofsted Lens current using public inspection reports and inspection wording.",
        strengthens_lenses=("Ofsted Lens", "Manager Copilot", "Recording Support"),
        source_kinds=("ofsted_inspection_report",),
        seed_urls=("https://reports.ofsted.gov.uk/",),
        query_hints=("children's homes inspection report safeguarding leadership management recording evidence SCCIF",),
        priority=1,
        cadence="weekly",
    ),
    OrbSectorEvidencePipeline(
        id="safeguarding_review_learning",
        label="Safeguarding Review Learning",
        description="Extracts public learning themes such as professional curiosity, child voice and information sharing.",
        strengthens_lenses=("Safeguarding Thinking", "What am I missing", "Manager Copilot"),
        source_kinds=("safeguarding_practice_review", "national_panel_review"),
        seed_urls=(
            "https://www.gov.uk/government/organisations/child-safeguarding-practice-review-panel",
            "https://learning.nspcc.org.uk/case-reviews/recently-published-case-reviews",
        ),
        query_hints=("safeguarding practice review learning professional curiosity child voice information sharing",),
        priority=2,
        cadence="monthly",
    ),
    OrbSectorEvidencePipeline(
        id="pfd_system_learning",
        label="Prevention of Future Harm Learning",
        description="Uses public Regulation 28 reports as a source of systemic risk and escalation learning.",
        strengthens_lenses=("Safeguarding Thinking", "Manager Copilot", "Reflect with ORB"),
        source_kinds=("prevention_of_future_deaths",),
        seed_urls=("https://www.judiciary.uk/prevention-of-future-death-reports/",),
        query_hints=("children young people safeguarding mental health service gaps learning prevention future reports",),
        priority=3,
        cadence="monthly",
    ),
    OrbSectorEvidencePipeline(
        id="guidance_change_tracker",
        label="Regulation and Guidance Change Tracker",
        description="Tracks public updates to statutory guidance, SCCIF, Working Together and DfE material.",
        strengthens_lenses=("Policy Explainer", "Ofsted Lens", "Manager Copilot"),
        source_kinds=("research_or_learning",),
        seed_urls=(
            "https://www.gov.uk/government/collections/childrens-homes-regulations-including-quality-standards",
            "https://www.gov.uk/government/publications/working-together-to-safeguard-children--2",
            "https://www.gov.uk/government/organisations/ofsted",
        ),
        query_hints=("children's homes regulations quality standards working together SCCIF updates statutory guidance",),
        priority=4,
        cadence="monthly",
    ),
    OrbSectorEvidencePipeline(
        id="inspection_language_benchmark",
        label="Inspection Language Benchmark",
        description="Builds a benchmark of public inspection wording for strengths, weaknesses, oversight and impact.",
        strengthens_lenses=("Ofsted Lens", "Recording Support", "Manager Copilot"),
        source_kinds=("ofsted_inspection_report",),
        seed_urls=("https://reports.ofsted.gov.uk/",),
        query_hints=("good outstanding requires improvement inadequate leadership oversight impact evidence child experience",),
        priority=5,
        cadence="weekly",
        metadata={"benchmark": True},
    ),
    OrbSectorEvidencePipeline(
        id="research_practice_evidence",
        label="Research and Practice Evidence",
        description="Adds public practice evidence for looked-after children, trauma-informed practice and relational care.",
        strengthens_lenses=("Therapeutic Reframe", "Behaviour Support", "Staff Coach"),
        source_kinds=("research_or_learning",),
        seed_urls=(
            "https://www.nice.org.uk/guidance/ng205",
            "https://foundations.org.uk/",
        ),
        query_hints=("looked after children trauma informed practice relational care evidence guidance",),
        priority=6,
        cadence="quarterly",
    ),
    OrbSectorEvidencePipeline(
        id="social_care_statistics",
        label="Children's Social Care Statistics",
        description="Provides sector context using public statistics about looked-after children, homes and workforce trends.",
        strengthens_lenses=("Policy Explainer", "Manager Copilot", "Professional Development"),
        source_kinds=("research_or_learning",),
        seed_urls=(
            "https://www.gov.uk/government/collections/statistics-looked-after-children",
            "https://explore-education-statistics.service.gov.uk/",
        ),
        query_hints=("looked after children statistics residential children's homes workforce placement stability missing from care",),
        priority=7,
        cadence="quarterly",
    ),
    OrbSectorEvidencePipeline(
        id="policy_consultation_tracker",
        label="Policy and Consultation Tracker",
        description="Keeps ORB aware of public consultations, reform papers and emerging policy direction.",
        strengthens_lenses=("Policy Explainer", "Manager Copilot"),
        source_kinds=("research_or_learning",),
        seed_urls=(
            "https://www.gov.uk/search/policy-papers-and-consultations",
            "https://www.gov.uk/government/organisations/department-for-education",
        ),
        query_hints=("children's social care reform consultation residential children's homes policy",),
        priority=8,
        cadence="monthly",
    ),
    OrbSectorEvidencePipeline(
        id="legal_boundary_learning",
        label="Legal Boundary Learning",
        description="Collects public legal boundary themes while keeping ORB clear that it does not provide legal advice.",
        strengthens_lenses=("Manager Copilot", "Policy Explainer", "Safeguarding Thinking"),
        source_kinds=("research_or_learning",),
        seed_urls=("https://www.gov.uk/search/research-and-statistics",),
        query_hints=("children's homes legal duties human rights deprivation liberty children's rights public judgment",),
        priority=9,
        cadence="quarterly",
        safety_note="Use only to highlight legal boundary themes; never give legal advice.",
    ),
    OrbSectorEvidencePipeline(
        id="orb_answer_evaluation",
        label="ORB Answer Evaluation",
        description="Internal evaluation rubric for ORB answers: safety, child-centredness, practical usefulness and overclaim checks.",
        strengthens_lenses=("All ORB lenses",),
        source_kinds=("research_or_learning",),
        seed_urls=(),
        query_hints=("orb answer evaluation safety child centred recording quality safeguarding caution practical usefulness",),
        priority=10,
        cadence="continuous",
        metadata={"internal_evaluation": True},
    ),
)


class OrbSectorEvidencePipelineService:
    def list_pipelines(self) -> dict[str, Any]:
        return {
            "pipelines": [self._pipeline_payload(p) for p in sorted(PIPELINES, key=lambda item: item.priority)],
            "standalone": True,
            "os_records_accessed": False,
        }

    def get_pipeline(self, pipeline_id: str) -> dict[str, Any] | None:
        pipeline = self._find(pipeline_id)
        return self._pipeline_payload(pipeline) if pipeline else None

    def status(self) -> dict[str, Any]:
        public_status = orb_public_evidence_intelligence_service.status()
        return {
            "status": "ready",
            "pipeline_count": len(PIPELINES),
            "public_evidence": public_status,
            "standalone": True,
            "os_records_accessed": False,
        }

    async def seed_pipeline(self, pipeline_id: str) -> dict[str, Any]:
        pipeline = self._find(pipeline_id)
        if not pipeline:
            return {"success": False, "error": "pipeline_not_found", "pipeline_id": pipeline_id}
        seeded_registry = orb_public_evidence_intelligence_service.seed_registry()
        return {
            "success": True,
            "pipeline": self._pipeline_payload(pipeline),
            "registry_seeded": seeded_registry.get("seeded"),
            "seed_urls": list(pipeline.seed_urls),
            "next_step": "Import specific report/review URLs with /import-url. Registry pages are seeded as source finders only.",
            "standalone": True,
            "os_records_accessed": False,
        }

    async def import_url(self, pipeline_id: str, url: str, *, title: str | None = None, approve_now: bool = True) -> dict[str, Any]:
        pipeline = self._find(pipeline_id)
        if not pipeline:
            return {"success": False, "error": "pipeline_not_found", "pipeline_id": pipeline_id}
        kind = pipeline.source_kinds[0] if pipeline.source_kinds else None
        result = await orb_public_evidence_intelligence_service.import_url(
            url,
            kind=kind,
            title=title,
            approve_now=approve_now,
        )
        result["pipeline"] = self._pipeline_payload(pipeline)
        return result

    def search_pipeline(self, pipeline_id: str, query: str, *, limit: int = 8) -> dict[str, Any]:
        pipeline = self._find(pipeline_id)
        if not pipeline:
            return {"success": False, "error": "pipeline_not_found", "pipeline_id": pipeline_id}
        combined: list[dict[str, Any]] = []
        seen: set[str] = set()
        for kind in pipeline.source_kinds or (None,):
            search = orb_public_evidence_intelligence_service.search(query, limit=limit, kind=kind)
            for item in search.get("results") or []:
                key = str(item.get("source_id") or item.get("citation_anchor") or item.get("text")[:80])
                if key in seen:
                    continue
                seen.add(key)
                combined.append(item)
        return {
            "success": True,
            "pipeline": self._pipeline_payload(pipeline),
            "query": query,
            "results": combined[:limit],
            "total": len(combined[:limit]),
            "standalone": True,
            "os_records_accessed": False,
        }

    def build_prompt_addendum(self, message: str, *, mode: str | None = None, limit: int = 4) -> str:
        return orb_public_evidence_intelligence_service.build_prompt_addendum(
            message,
            mode=mode,
            limit=limit,
        )

    def _find(self, pipeline_id: str) -> OrbSectorEvidencePipeline | None:
        key = str(pipeline_id or "").strip().lower()
        for pipeline in PIPELINES:
            if pipeline.id == key:
                return pipeline
        return None

    def _pipeline_payload(self, pipeline: OrbSectorEvidencePipeline) -> dict[str, Any]:
        return {
            "id": pipeline.id,
            "label": pipeline.label,
            "description": pipeline.description,
            "strengthens_lenses": list(pipeline.strengthens_lenses),
            "source_kinds": list(pipeline.source_kinds),
            "seed_urls": list(pipeline.seed_urls),
            "query_hints": list(pipeline.query_hints),
            "priority": pipeline.priority,
            "cadence": pipeline.cadence,
            "standalone": pipeline.standalone,
            "os_records_accessed": pipeline.os_records_accessed,
            "safety_note": pipeline.safety_note,
            "metadata": pipeline.metadata,
        }


orb_sector_evidence_pipeline_service = OrbSectorEvidencePipelineService()
