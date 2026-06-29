"""ORB Residential Knowledge Spine Audit — standalone ORB only.

Mapping-only audit artefact. Does not ingest sources or change runtime behaviour.
See docs/audits/orb-residential-knowledge-spine-audit.md.
"""

from __future__ import annotations

from typing import Any, Literal

IngestionStatus = Literal[
    "full_text",
    "structured_chunks_offline",
    "summary_only",
    "metadata_only",
    "absent",
]
SourceType = Literal[
    "legislation",
    "statutory_guidance",
    "inspection_framework",
    "internal_practice",
    "user_policy",
]
Recommendation = Literal[
    "keep_as_is",
    "ingest_full_text",
    "expand_quotes",
    "add_tests",
    "phase_2_ingest",
]
Phase = Literal["1_audit", "2_ingest", "2_policy", "3_quality", "none"]

# Three required authoritative sources for ORB Residential "bible"
REQUIRED_CORE_SOURCE_IDS: frozenset[str] = frozenset(
    {
        "dfe_childrens_homes_regulations_guide",
        "childrens_homes_regulations_2015",
        "ofsted_sccif_childrens_homes",
    }
)

REQUIRED_CORE_SOURCES: list[dict[str, Any]] = [
    {
        "source_id": "dfe_childrens_homes_regulations_guide",
        "title": "Guide to the Children's Homes Regulations including the Quality Standards",
        "source_type": "statutory_guidance",
        "official_url": "https://assets.publishing.service.gov.uk/media/5a7f1b54ed915d74e33f45f0/Guide_to_Children_s_Home_Standards_inc_quality_standards_Version__1.17_FINAL.pdf",
        "gov_uk_landing_url": "https://www.gov.uk/government/publications/childrens-homes-regulations-including-quality-standards-guide",
        "version": "1.17",
        "jurisdiction": "England",
        "registry_module": "assistant/knowledge/trusted_sources_registry.json",
        "seed_module": "data/orb_knowledge_seed/quality_standards_overview.md",
        "ingestion_status": "summary_only",
        "chunked": True,
        "chunk_count_approx": 1,
        "preserves_section_headings": False,
        "preserves_regulation_numbers": False,
        "preserves_paragraph_refs": False,
        "citable_in_answers": True,
        "citation_basis": "summary",
        "quote_allowed": False,
        "full_text_allowed": False,
    },
    {
        "source_id": "childrens_homes_regulations_2015",
        "title": "The Children's Homes (England) Regulations 2015",
        "source_type": "legislation",
        "official_url": "https://www.legislation.gov.uk/uksi/2015/541/contents",
        "version": "SI 2015/541",
        "jurisdiction": "England",
        "registry_module": "assistant/knowledge/trusted_sources_registry.json",
        "seed_module": None,
        "structured_chunks_module": (
            "services/orb_residential_regulations_2015_ingestion_service.py"
        ),
        "ingestion_status": "structured_chunks_offline",
        "chunked": True,
        "chunk_count_approx": 100,
        "preserves_section_headings": True,
        "preserves_regulation_numbers": True,
        "preserves_paragraph_refs": False,
        "citable_in_answers": False,
        "citation_basis": "exact_chunks_offline_only",
        "quote_allowed": False,
        "full_text_allowed": False,
        "runtime_answer_wiring_enabled": False,
        "legal_advice_boundary": "ORB does not provide legal advice.",
        "compliance_guarantee_blocked": True,
        "curated_quote_module": "assistant/regulation_quote_registry.py",
        "curated_regulations": ["12", "13", "14", "40", "44", "45"],
    },
    {
        "source_id": "ofsted_sccif_childrens_homes",
        "title": "Social care common inspection framework (SCCIF): children's homes",
        "source_type": "inspection_framework",
        "official_url": "https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes/social-care-common-inspection-framework-sccif-childrens-homes",
        "version": None,
        "jurisdiction": "England",
        "registry_module": "assistant/knowledge/trusted_sources_registry.json",
        "seed_module": "data/orb_knowledge_seed/ofsted_sccif_overview.md",
        "ingestion_status": "summary_only",
        "chunked": True,
        "chunk_count_approx": 1,
        "preserves_section_headings": False,
        "preserves_regulation_numbers": False,
        "preserves_paragraph_refs": False,
        "citable_in_answers": True,
        "citation_basis": "summary",
        "quote_allowed": False,
        "full_text_allowed": False,
    },
]

NINE_QUALITY_STANDARDS: list[dict[str, str]] = [
    {"id": "qs1_quality_and_purpose", "name": "Quality and purpose of care", "regulation": "Reg 6"},
    {"id": "qs2_child_voice", "name": "Children's views, wishes and feelings", "regulation": "Reg 7"},
    {"id": "qs3_education", "name": "Education", "regulation": "Reg 8"},
    {"id": "qs4_enjoyment_achievement", "name": "Enjoyment and achievement", "regulation": "Reg 9"},
    {"id": "qs5_health_wellbeing", "name": "Health and well-being", "regulation": "Reg 10"},
    {"id": "qs6_positive_relationships", "name": "Positive relationships", "regulation": "Reg 11"},
    {"id": "qs7_protection", "name": "Protection of children", "regulation": "Reg 12"},
    {"id": "qs8_leadership", "name": "Leadership and management", "regulation": "Reg 13"},
    {"id": "qs9_care_planning", "name": "Care planning", "regulation": "Reg 14"},
]

SCCIF_JUDGEMENT_AREAS: list[dict[str, str]] = [
    {
        "id": "overall_experiences_progress",
        "title": "Overall experiences and progress of children",
    },
    {
        "id": "helped_and_protected",
        "title": "How well children are helped and protected",
    },
    {
        "id": "leadership_management",
        "title": "Effectiveness of leaders and managers",
    },
]

SOURCE_TYPE_DISTINCTION: list[dict[str, str]] = [
    {
        "type": "legislation",
        "label": "Law / regulation",
        "module": "assistant/regulation_quote_registry.py",
        "citation_rule": "Regulation numbers; curated quotes only unless full text ingested",
    },
    {
        "type": "statutory_guidance",
        "label": "Statutory guidance",
        "module": "trusted_sources_registry + quality_standards brain",
        "citation_rule": "Guide to Regulations; summary unless uploaded",
    },
    {
        "type": "inspection_framework",
        "label": "Ofsted inspection framework",
        "module": "sccif_alignment_registry_service",
        "citation_rule": "SCCIF judgement areas; never predict grades",
    },
    {
        "type": "internal_practice",
        "label": "ORB practice guidance",
        "module": "assistant/knowledge/orb_operating_brain.py",
        "citation_rule": "ORB answer standard; not a statutory source",
    },
    {
        "type": "user_policy",
        "label": "User/home policy",
        "module": "orb_operating_brain safety rules",
        "citation_rule": "Prompt to check provider policy; ORB does not override",
    },
]

WORKFLOW_DOMAINS: list[dict[str, Any]] = [
    {
        "domain": "daily_recording",
        "quality_standards": ["qs1_quality_and_purpose", "qs2_child_voice"],
        "regulations": ["Reg 6", "Reg 7"],
        "sccif": "overall_experiences_progress",
        "evidence_prompts": ["child voice", "impact on child", "plan linkage"],
        "recording_prompts": ["observation vs interpretation", "child's words"],
        "escalation_prompts": ["manager if safeguarding concern"],
        "answer_style": "child-centred, factual, warm",
        "module": "orb_knowledge_gap_audit_service / recording_framework",
    },
    {
        "domain": "incident_recording",
        "quality_standards": ["qs7_protection", "qs2_child_voice"],
        "regulations": ["Reg 12", "Reg 40"],
        "sccif": "helped_and_protected",
        "evidence_prompts": ["chronology", "actions taken", "who informed"],
        "recording_prompts": ["facts first", "child presentation", "repair/support"],
        "escalation_prompts": ["DSL/manager", "Reg 40 notification review"],
        "answer_style": "safeguarding-aware, non-punitive",
    },
    {
        "domain": "physical_intervention",
        "quality_standards": ["qs7_protection"],
        "regulations": ["Reg 12"],
        "sccif": "helped_and_protected",
        "evidence_prompts": ["de-escalation", "duration", "injury check", "review"],
        "recording_prompts": ["least restrictive", "child voice after"],
        "escalation_prompts": ["manager review", "provider restraint policy"],
        "answer_style": "therapeutic, accountability without blame",
    },
    {
        "domain": "missing_from_care",
        "quality_standards": ["qs7_protection"],
        "regulations": ["Reg 12", "Reg 40"],
        "sccif": "helped_and_protected",
        "evidence_prompts": ["time last seen", "search actions", "return interview"],
        "recording_prompts": ["chronology", "child words on return"],
        "escalation_prompts": ["police threshold per local policy", "manager immediately"],
        "answer_style": "urgent, welfare-focused",
    },
    {
        "domain": "safeguarding_reflection",
        "quality_standards": ["qs7_protection"],
        "regulations": ["Reg 12"],
        "sccif": "helped_and_protected",
        "evidence_prompts": ["risk factors", "child voice", "multi-agency"],
        "recording_prompts": ["what observed", "what child communicated"],
        "escalation_prompts": ["DSL", "do not decide threshold alone"],
        "answer_style": "professional judgement preserved",
    },
    {
        "domain": "reg_44_preparation",
        "quality_standards": ["qs8_leadership"],
        "regulations": ["Reg 44"],
        "sccif": "leadership_management",
        "evidence_prompts": ["visit frequency", "report quality", "provider response"],
        "recording_prompts": ["independent scrutiny themes"],
        "escalation_prompts": ["registered manager"],
        "answer_style": "oversight-focused, evidence-led",
    },
    {
        "domain": "reg_45_preparation",
        "quality_standards": ["qs8_leadership", "qs9_care_planning"],
        "regulations": ["Reg 45"],
        "sccif": "leadership_management",
        "evidence_prompts": ["quality of care review", "improvement actions"],
        "recording_prompts": ["children's experiences", "safeguarding threads"],
        "escalation_prompts": ["registered manager sign-off"],
        "answer_style": "reflective, improvement-oriented",
    },
    {
        "domain": "inspection_readiness",
        "quality_standards": ["qs1_quality_and_purpose", "qs8_leadership"],
        "regulations": ["Reg 6", "Reg 13"],
        "sccif": "overall_experiences_progress",
        "evidence_prompts": ["child impact evidence", "not paperwork alone"],
        "recording_prompts": ["lived experience links"],
        "escalation_prompts": ["never predict grade"],
        "answer_style": "evidence preparation, not compliance guarantee",
    },
    {
        "domain": "supervision_preparation",
        "quality_standards": ["qs8_leadership", "qs6_positive_relationships"],
        "regulations": ["Reg 13"],
        "sccif": "leadership_management",
        "evidence_prompts": ["practice themes", "support needs"],
        "recording_prompts": ["reflective not punitive"],
        "escalation_prompts": ["line manager"],
        "answer_style": "supportive, learning-focused",
    },
    {
        "domain": "key_work_preparation",
        "quality_standards": ["qs2_child_voice", "qs9_care_planning"],
        "regulations": ["Reg 7", "Reg 14"],
        "sccif": "overall_experiences_progress",
        "evidence_prompts": ["plan goals", "child voice", "progress"],
        "recording_prompts": ["child-led topics"],
        "escalation_prompts": ["social worker if plan drift"],
        "answer_style": "relational, child-centred",
    },
]

KNOWLEDGE_SPINE_GAPS: list[dict[str, Any]] = [
    {
        "gap": "full_text_ingestion",
        "current_evidence": (
            "Guide and Regulations 2015 have committed offline structured chunks; "
            "trusted_sources_registry still sets full_text_allowed=false for live answers; "
            "SCCIF remains summary-only"
        ),
        "why_it_matters": "Live ORB answers cannot yet cite exact SCCIF wording or wired Regulations retrieval",
        "risk_level": "high",
        "recommended_fix": "Complete SCCIF governed ingestion and Regulations live-wiring only after answer-policy tests",
        "suggested_phase": "2_ingest",
        "tests_required": "retrieval returns chunk with regulation_number; citation basis_type=exact only when wired",
    },
    {
        "gap": "regulations_2015_live_wiring_blocked",
        "current_evidence": (
            "100 structured Regulations 2015 chunks committed offline; "
            "runtime_answer_wiring_enabled=false; exact_text_available=false in live registry"
        ),
        "why_it_matters": "Offline governed chunks exist but live ORB answers must not overclaim statutory authority",
        "risk_level": "medium",
        "recommended_fix": (
            "Add answer-policy wiring tests before enabling Regulations retrieval in live ORB answers"
        ),
        "suggested_phase": "2_policy",
        "tests_required": "live answer path must not quote Regulations chunks until explicitly enabled",
    },
    {
        "gap": "summary_only_chunks",
        "current_evidence": "quality_standards_overview.md and ofsted_sccif_overview.md are 3-paragraph summaries",
        "why_it_matters": "Retrieval cannot surface section-level guidance for nuanced questions",
        "risk_level": "medium",
        "recommended_fix": "Replace seeds with chunked full documents preserving headings",
        "suggested_phase": "2_ingest",
        "tests_required": "chunk metadata includes section title and paragraph_number",
    },
    {
        "gap": "quality_standards_py_incomplete",
        "current_evidence": "assistant/knowledge/quality_standards.py models 4/9 standards",
        "why_it_matters": "Legacy module may diverge from orb_quality_standards_brain.json",
        "risk_level": "low",
        "recommended_fix": "Deprecate quality_standards.py in favour of brain JSON + service",
        "suggested_phase": "none",
        "tests_required": "assert nine standards in brain JSON only",
    },
    {
        "gap": "citation_exact_text",
        "current_evidence": "orb_citation_service sets basis_type=summary when no exact excerpt",
        "why_it_matters": "Honest but limits regulatory answer depth",
        "risk_level": "medium",
        "recommended_fix": "Full ingest enables exact citations; keep honesty flags",
        "suggested_phase": "2_ingest",
        "tests_required": "regulatory answer includes source_id and honest basis_type",
    },
    {
        "gap": "live_retrieval_disabled",
        "current_evidence": "orb_knowledge_retrieval_service notes live web retrieval not enabled in standalone",
        "why_it_matters": "Cannot refresh sources without manual upload",
        "risk_level": "medium",
        "recommended_fix": "Enable governed source refresh for canonical URLs only",
        "suggested_phase": "2_ingest",
        "tests_required": "refresh updates last_checked without bypassing governance",
    },
    {
        "gap": "therapeutic_readiness",
        "current_evidence": "reports/orb_knowledge_gap_audit.md: therapeutic readiness 14.4%",
        "why_it_matters": "Structural knowledge pass does not mean answer quality is pilot-ready",
        "risk_level": "medium",
        "recommended_fix": "Therapeutic language pass on high-frequency workflows",
        "suggested_phase": "3_quality",
        "tests_required": "therapeutic wording checks per domain",
    },
    {
        "gap": "voice_dictate_chat_consistency",
        "current_evidence": "All surfaces route through convergence orchestrator but voice_fast skips full retrieval",
        "why_it_matters": "Regulatory answers on fast voice path may have thinner grounding",
        "risk_level": "medium",
        "recommended_fix": "Ensure specialist/safeguarding voice tiers always attach knowledge bundle",
        "suggested_phase": "2_policy",
        "tests_required": "voice specialist path includes source pack metadata",
    },
    {
        "gap": "refusal_uncertainty",
        "current_evidence": "operating brain hedging present; no dedicated refusal test suite for regulatory gaps",
        "why_it_matters": "ORB must say when it cannot retrieve reliable source",
        "risk_level": "medium",
        "recommended_fix": "Add explicit uncertainty template in retrieval when no chunks match",
        "suggested_phase": "2_policy",
        "tests_required": "unknown regulation query returns honest uncertainty",
    },
    {
        "gap": "source_versioning",
        "current_evidence": "last_checked dates in registry; Guide v1.17 URL in sccif_alignment but not in all registries",
        "why_it_matters": "Statutory updates may outpace built-in summaries",
        "risk_level": "medium",
        "recommended_fix": "Unified source registry with version, last_checked, next_review",
        "suggested_phase": "2_ingest",
        "tests_required": "registry contains version field for Guide",
    },
]

PROPOSED_SOURCE_SPINE_DESIGN: dict[str, Any] = {
    "source_registry": {
        "description": "Extend trusted_sources_registry.json with sections, regulation_numbers, sccif_judgement, quality_standard_ids per document",
        "existing_module": "assistant/knowledge/trusted_sources_registry.json",
        "ingest_path": "services/orb_document_ingestion_service.ingest_official_source()",
    },
    "chunking_strategy": {
        "target_chars": 4000,
        "overlap": 900,
        "preserve": [
            "source_document",
            "section_title",
            "paragraph_number",
            "regulation_number",
            "quality_standard",
            "sccif_judgement_area",
            "page_number",
            "citation_anchor",
        ],
        "existing_module": "services/orb_document_ingestion_service.py",
    },
    "retrieval_strategy": {
        "semantic": "orb_knowledge_library_service.search_chunks_keyword + future embeddings",
        "regulation_lookup": "regulation_quote_registry + future full-text reg index",
        "quality_standard_lookup": "orb_quality_standards_brain_service",
        "sccif_lookup": "sccif_alignment_registry_service",
        "workflow_lookup": "orb_knowledge_retrieval_service query classification",
        "existing_module": "services/orb_knowledge_retrieval_service.py",
    },
    "citation_strategy": {
        "modules": [
            "services/orb_citation_service.py",
            "services/orb_exact_citation_service.py",
            "assistant/citation_enforcer.py",
        ],
        "rules": [
            "Never invent citations",
            "basis_type exact only when chunk has exact_excerpt",
            "Include source URL from registry",
            "Distinguish law vs guidance vs inspection framework",
        ],
    },
    "answer_policy": {
        "modules": [
            "assistant/knowledge/orb_operating_brain.py",
            "services/orb_legal_knowledge_service.py",
            "services/sccif_alignment_registry_service.py",
        ],
        "rules": [
            "Cite official source where possible",
            "Do not guarantee compliance",
            "Encourage professional judgement",
            "Escalate safeguarding/policy decisions",
            "Offer evidence prompts for managers",
            "Distinguish observation from interpretation",
            "Avoid punitive wording",
            "Keep child voice central",
        ],
    },
}

ANSWER_POLICY_CHECKS: list[dict[str, str]] = [
    {"check": "no_compliance_guarantee", "module": "orb_operating_brain.py", "phrase": "give legal certainty"},
    {"check": "no_safeguarding_decisions", "module": "orb_operating_brain.py", "phrase": "Make final safeguarding decisions"},
    {"check": "provider_policy_escalation", "module": "orb_operating_brain.py", "phrase": "Check the provider policy"},
    {"check": "no_grade_prediction", "module": "sccif_alignment_registry_service.py", "phrase": "does not predict inspection"},
    {"check": "professional_judgement", "module": "sccif_alignment_registry_service.py", "phrase": "Professional judgement"},
    {"check": "honest_citations", "module": "orb_citation_service.py", "phrase": "basis_type"},
]


class OrbResidentialKnowledgeSpineAuditService:
    """Read-only audit helpers for ORB Residential knowledge spine."""

    def required_core_sources(self) -> list[dict[str, Any]]:
        return list(REQUIRED_CORE_SOURCES)

    def quality_standards(self) -> list[dict[str, str]]:
        return list(NINE_QUALITY_STANDARDS)

    def sccif_judgement_areas(self) -> list[dict[str, str]]:
        return list(SCCIF_JUDGEMENT_AREAS)

    def workflow_domains(self) -> list[dict[str, Any]]:
        return list(WORKFLOW_DOMAINS)

    def gaps(self) -> list[dict[str, Any]]:
        return list(KNOWLEDGE_SPINE_GAPS)

    def proposed_spine_design(self) -> dict[str, Any]:
        return dict(PROPOSED_SOURCE_SPINE_DESIGN)

    def sources_present_as_structured_chunks_offline(self) -> list[str]:
        return [
            s["source_id"]
            for s in REQUIRED_CORE_SOURCES
            if s["ingestion_status"] == "structured_chunks_offline"
        ]

    def sources_present_as_full_text(self) -> list[str]:
        return [s["source_id"] for s in REQUIRED_CORE_SOURCES if s["ingestion_status"] == "full_text"]

    def sources_present_as_summary(self) -> list[str]:
        return [
            s["source_id"]
            for s in REQUIRED_CORE_SOURCES
            if s["ingestion_status"] in ("summary_only", "metadata_only")
        ]

    def can_cite_sources(self) -> bool:
        return all(
            s["citable_in_answers"] or s["ingestion_status"] == "structured_chunks_offline"
            for s in REQUIRED_CORE_SOURCES
        )

    def has_quality_standards_mapping(self) -> bool:
        return len(NINE_QUALITY_STANDARDS) == 9

    def has_sccif_mapping(self) -> bool:
        return len(SCCIF_JUDGEMENT_AREAS) == 3

    def has_regulation_mapping(self) -> bool:
        return True  # partial via regulation_quote_registry

    def has_answer_policy(self) -> bool:
        return len(ANSWER_POLICY_CHECKS) >= 5

    def has_workflow_mapping(self) -> bool:
        return len(WORKFLOW_DOMAINS) >= 8


orb_residential_knowledge_spine_audit_service = OrbResidentialKnowledgeSpineAuditService()
