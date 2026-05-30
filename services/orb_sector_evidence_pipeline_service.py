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
        id="recording_quality_learning",
        label="Recording Quality Learning",
        description="Learns from public findings about poor records, missing evidence, unsafe language and weak chronology.",
        strengthens_lenses=("Record This Properly", "Incident Review", "Manager Copilot", "Chronology Suggestion"),
        source_kinds=("ofsted_inspection_report", "safeguarding_practice_review"),
        seed_urls=(
            "https://reports.ofsted.gov.uk/",
            "https://learning.nspcc.org.uk/case-reviews/recently-published-case-reviews",
        ),
        query_hints=("recording records chronology evidence child voice manager oversight inspection safeguarding review",),
        priority=6,
        cadence="monthly",
        metadata={"brain": "recording_quality"},
    ),
    OrbSectorEvidencePipeline(
        id="child_voice_lived_experience",
        label="Child Voice and Lived Experience",
        description="Improves ORB prompts around wishes, feelings, advocacy, identity and the child's lived experience.",
        strengthens_lenses=("Child Voice Prompt", "Care Planning", "Recording Support", "Therapeutic Reframe"),
        source_kinds=("research_or_learning", "ofsted_inspection_report"),
        seed_urls=(
            "https://www.childrenscommissioner.gov.uk/",
            "https://reports.ofsted.gov.uk/",
        ),
        query_hints=("child voice lived experience wishes feelings advocacy participation children's homes",),
        priority=7,
        cadence="monthly",
        metadata={"brain": "child_voice"},
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
        priority=8,
        cadence="quarterly",
    ),
    OrbSectorEvidencePipeline(
        id="missing_exploitation_contextual_safeguarding",
        label="Missing, Exploitation and Contextual Safeguarding",
        description="Strengthens ORB around missing episodes, exploitation indicators, peer/location risk and contextual safeguarding.",
        strengthens_lenses=("Safeguarding Thinking", "Risk Assessment Support", "Incident Review", "Manager Copilot"),
        source_kinds=("research_or_learning", "safeguarding_practice_review"),
        seed_urls=(
            "https://www.gov.uk/government/publications/working-together-to-safeguard-children--2",
            "https://learning.nspcc.org.uk/child-abuse-and-neglect/contextual-safeguarding",
        ),
        query_hints=("missing from care exploitation contextual safeguarding peer risk location risk return interview",),
        priority=9,
        cadence="monthly",
        metadata={"brain": "contextual_safeguarding"},
    ),
    OrbSectorEvidencePipeline(
        id="leadership_governance_ri",
        label="Leadership, Governance and RI Oversight",
        description="Builds public learning around strong governance, Reg 44/45, RI oversight, drift and impact.",
        strengthens_lenses=("Manager Copilot", "Reg 44 / Reg 45 Prep", "Ofsted Lens", "RI Lens"),
        source_kinds=("ofsted_inspection_report", "research_or_learning"),
        seed_urls=(
            "https://reports.ofsted.gov.uk/",
            "https://www.gov.uk/government/collections/childrens-homes-regulations-including-quality-standards",
        ),
        query_hints=("responsible individual registered manager regulation 44 regulation 45 leadership governance oversight impact",),
        priority=10,
        cadence="monthly",
        metadata={"brain": "leadership_governance"},
    ),
    OrbSectorEvidencePipeline(
        id="workforce_safer_recruitment",
        label="Workforce, Supervision and Safer Recruitment",
        description="Adds evidence around staff consistency, supervision, induction, training, allegations and safer recruitment.",
        strengthens_lenses=("Manager Copilot", "Staff Coach", "Supervision Prompts", "Ofsted Lens"),
        source_kinds=("research_or_learning", "ofsted_inspection_report"),
        seed_urls=(
            "https://www.gov.uk/government/publications/keeping-children-safe-in-education--2",
            "https://reports.ofsted.gov.uk/",
        ),
        query_hints=("safer recruitment supervision induction training staff consistency LADO workforce children's homes",),
        priority=11,
        cadence="quarterly",
        metadata={"brain": "workforce"},
    ),
    OrbSectorEvidencePipeline(
        id="education_attendance_send",
        label="Education, Attendance and SEND",
        description="Improves ORB around attendance, PEPs, virtual school, exclusions, SEND and education impact.",
        strengthens_lenses=("Care Planning", "Daily Recording", "Risk Assessment Support", "Ofsted Lens"),
        source_kinds=("research_or_learning",),
        seed_urls=(
            "https://www.gov.uk/government/publications/school-attendance",
            "https://www.gov.uk/government/publications/promoting-the-education-of-looked-after-children",
            "https://www.gov.uk/government/publications/send-code-of-practice-0-to-25",
        ),
        query_hints=("looked after children education attendance virtual school PEP SEND exclusion suspension children's homes",),
        priority=12,
        cadence="quarterly",
        metadata={"brain": "education"},
    ),
    OrbSectorEvidencePipeline(
        id="health_medication_wellbeing",
        label="Health, Medication and Emotional Wellbeing",
        description="Supports non-clinical thinking around health assessments, medication recording, wellbeing and escalation boundaries.",
        strengthens_lenses=("Daily Recording", "Risk Assessment Support", "Staff Coach", "Manager Oversight"),
        source_kinds=("research_or_learning",),
        seed_urls=(
            "https://www.nice.org.uk/guidance/ng205",
            "https://www.nhs.uk/mental-health/",
        ),
        query_hints=("looked after children health assessment medication recording emotional wellbeing mental health escalation",),
        priority=13,
        cadence="quarterly",
        safety_note="Use only for non-clinical practice support; never give medical diagnosis or treatment advice.",
        metadata={"brain": "health_wellbeing"},
    ),
    OrbSectorEvidencePipeline(
        id="rights_advocacy_complaints",
        label="Rights, Advocacy and Complaints",
        description="Strengthens child rights, advocacy, complaints, independent visitors and participation prompts.",
        strengthens_lenses=("Child Voice Prompt", "Manager Copilot", "Policy Explainer", "Recording Support"),
        source_kinds=("research_or_learning",),
        seed_urls=(
            "https://www.childrenscommissioner.gov.uk/",
            "https://www.gov.uk/government/publications/advocacy-services-for-children-and-young-people",
        ),
        query_hints=("children rights advocacy complaints independent visitor participation residential care",),
        priority=14,
        cadence="quarterly",
        metadata={"brain": "rights_advocacy"},
    ),
    OrbSectorEvidencePipeline(
        id="equality_identity_neurodiversity",
        label="Equality, Identity and Neurodiversity",
        description="Improves identity-sensitive care planning, recording and support for disability, autism, culture and belonging.",
        strengthens_lenses=("Care Planning", "Therapeutic Reframe", "Staff Coach", "Recording Support"),
        source_kinds=("research_or_learning",),
        seed_urls=(
            "https://www.equalityhumanrights.com/",
            "https://www.gov.uk/government/publications/send-code-of-practice-0-to-25",
            "https://www.autism.org.uk/advice-and-guidance",
        ),
        query_hints=("equality diversity identity autism neurodiversity disability culture language belonging children's homes",),
        priority=15,
        cadence="quarterly",
        metadata={"brain": "equality_identity"},
    ),
    OrbSectorEvidencePipeline(
        id="restrictive_practice_behaviour",
        label="Restrictive Practice, De-escalation and Behaviour",
        description="Supports safer thinking around behaviour as communication, restraint records, repair and management review.",
        strengthens_lenses=("Behaviour Support", "Incident Review", "Record This Properly", "Manager Oversight"),
        source_kinds=("research_or_learning", "ofsted_inspection_report"),
        seed_urls=(
            "https://www.gov.uk/government/publications/reducing-the-need-for-restraint-and-restrictive-intervention",
            "https://reports.ofsted.gov.uk/",
        ),
        query_hints=("restraint restrictive intervention de-escalation behaviour as communication repair manager review recording",),
        priority=16,
        cadence="quarterly",
        metadata={"brain": "restrictive_practice"},
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
        priority=17,
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
        priority=18,
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
        priority=19,
        cadence="quarterly",
        safety_note="Use only to highlight legal boundary themes; never give legal advice.",
    ),
    OrbSectorEvidencePipeline(
        id="ombudsman_complaints_learning",
        label="Ombudsman and Complaints Learning",
        description="Adds public learning from complaints findings about drift, communication, records and remedy.",
        strengthens_lenses=("Manager Copilot", "Policy Explainer", "Rights and Advocacy", "Recording Support"),
        source_kinds=("research_or_learning",),
        seed_urls=("https://www.lgo.org.uk/decisions/children-s-care-services",),
        query_hints=("children social care complaints ombudsman records communication delay remedy children's homes",),
        priority=20,
        cadence="quarterly",
        metadata={"brain": "complaints_learning"},
    ),
    OrbSectorEvidencePipeline(
        id="orb_answer_evaluation",
        label="ORB Answer Evaluation",
        description="Internal evaluation rubric for ORB answers: safety, child-centredness, practical usefulness and overclaim checks.",
        strengthens_lenses=("All ORB lenses",),
        source_kinds=("research_or_learning",),
        seed_urls=(),
        query_hints=("orb answer evaluation safety child centred recording quality safeguarding caution practical usefulness",),
        priority=21,
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

    def brains_map(self) -> dict[str, Any]:
        brains: dict[str, dict[str, Any]] = {}
        for pipeline in PIPELINES:
            brain = str(pipeline.metadata.get("brain") or pipeline.id).strip()
            entry = brains.setdefault(
                brain,
                {
                    "brain": brain,
                    "pipelines": [],
                    "strengthens_lenses": [],
                    "query_hints": [],
                },
            )
            entry["pipelines"].append(pipeline.id)
            entry["strengthens_lenses"].extend(pipeline.strengthens_lenses)
            entry["query_hints"].extend(pipeline.query_hints)
        for entry in brains.values():
            entry["strengthens_lenses"] = sorted(set(entry["strengthens_lenses"]))
            entry["query_hints"] = sorted(set(entry["query_hints"]))
        return {"brains": brains, "standalone": True, "os_records_accessed": False}

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
