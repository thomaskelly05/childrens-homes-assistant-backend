"""ORB Residential governed source ingestion preparation.

Governance helpers for ORB Residential source ingestion.

Phase 2a adds static, committed Guide chunks. This module still does not
scrape, download, wire live ORB answers, alter routes, or change frontend
behaviour at runtime.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

from services.orb_residential_guide_ingestion_service import (
    GUIDE_SOURCE_ID,
    orb_residential_guide_ingestion_service,
)
from services.orb_residential_regulations_2015_ingestion_service import (
    REGULATIONS_2015_SOURCE_ID,
    orb_residential_regulations_2015_ingestion_service,
)
from services.orb_residential_source_catalogue_audit_service import CATALOGUE_PATH

REPO_ROOT = Path(__file__).resolve().parents[1]

IngestionEligibility = Literal[
    "eligible_for_full_text_ingestion",
    "metadata_only",
    "local_policy_upload_required",
    "reflective_practice_only",
    "not_suitable_for_ingestion",
]

FIRST_INGESTION_SOURCE_IDS: tuple[str, str, str] = (
    "dfe_childrens_homes_regulations_guide",
    "childrens_homes_regulations_2015",
    "ofsted_sccif_childrens_homes",
)

REQUIRED_CHUNK_METADATA_FIELDS: tuple[str, ...] = (
    "source_id",
    "source_title",
    "source_type",
    "official_url",
    "publisher",
    "version",
    "last_verified_date",
    "section_heading",
    "paragraph_reference",
    "official_paragraph_reference",
    "internal_chunk_id",
    "quality_standard",
    "related_regulations",
    "related_workflow_domains",
    "regulation_number",
    "sccif_judgement_area",
    "workflow_domains",
    "citation_label",
    "basis_type",
    "quote_allowed",
    "quote_basis",
    "source_text_exact",
    "generated_metadata",
    "retrieval_priority",
    "requires_local_policy",
    "professional_judgement_boundary",
    "not_to_be_used_for",
)

KEY_WORKFLOW_DOMAINS: tuple[str, ...] = (
    "daily_recording",
    "incident_recording",
    "physical_intervention",
    "missing_from_care",
    "safeguarding_concern",
    "allegation",
    "family_time",
    "medication",
    "health",
    "education",
    "send_disability_autism",
    "online_safety",
    "search_confiscation_privacy_surveillance",
    "behaviour_support",
    "reg_40_notification",
    "reg_44_preparation",
    "reg_45_preparation",
    "inspection_readiness",
    "record_access_care_files_future_reading",
    "local_policy_required_workflows",
)

INTERNAL_KNOWLEDGE_BRAIN_FLOW: tuple[dict[str, str], ...] = (
    {
        "step": "classify_intent_and_workflow",
        "purpose": "Determine the workflow domain, risk level, source tier and whether the request is safe to answer directly.",
    },
    {
        "step": "use_deterministic_internal_knowledge",
        "purpose": "Resolve source eligibility, local-policy dependency, escalation, manager oversight, child voice and citation boundaries before any LLM call.",
    },
    {
        "step": "select_smallest_relevant_source_bundle",
        "purpose": "Build one workflow-scoped bundle with only the top relevant source IDs, chunks and prompts.",
    },
    {
        "step": "decide_whether_llm_is_needed",
        "purpose": "Avoid OpenAI where deterministic policy answers the question; use an LLM only for writing, summarising, reasoning or reflective support.",
    },
    {
        "step": "choose_model_tier",
        "purpose": "Route to deterministic-only, small writing, standard reasoning, high safeguarding review or human-escalation-only handling.",
    },
    {
        "step": "apply_prompt_budget",
        "purpose": "Keep prompts small, never send the whole catalogue, and include exact chunks only when citation-backed wording is needed.",
    },
    {
        "step": "apply_citation_and_uncertainty_rules",
        "purpose": "Preserve exact-citation, metadata-only, local-policy, SCCIF, compliance and safeguarding threshold boundaries.",
    },
    {
        "step": "use_cached_templates_and_skeletons",
        "purpose": "Use deterministic workflow skeletons and standard caveats before asking an LLM to polish or personalise.",
    },
    {
        "step": "escalate_to_human_judgement",
        "purpose": "Escalate emergency, threshold, legal, clinical, allegation outcome, placement approval and grade prediction requests.",
    },
)

DETERMINISTIC_INTERNAL_ANSWER_LAYER: tuple[dict[str, str], ...] = (
    {"decision": "identify_workflow", "output": "workflow_domain"},
    {"decision": "identify_relevant_source_tier", "output": "required_source_tier"},
    {"decision": "identify_regulations_quality_standards_sccif", "output": "regulation_qs_sccif_map"},
    {"decision": "identify_local_policy_requirement", "output": "requires_local_policy"},
    {"decision": "identify_professional_judgement_boundary", "output": "professional_judgement_boundary"},
    {"decision": "identify_escalation_prompts", "output": "escalation_prompt"},
    {"decision": "identify_manager_oversight_prompts", "output": "manager_oversight_prompt"},
    {"decision": "identify_child_voice_prompts", "output": "child_voice_prompts"},
    {"decision": "identify_safer_recording_checks", "output": "safer_recording_checks"},
    {"decision": "identify_citation_eligibility", "output": "citation_eligibility"},
    {"decision": "identify_unsafe_direct_answer", "output": "human_escalation_only"},
    {"decision": "return_structured_policy_bundle", "output": "internal_policy_bundle"},
)

LLM_DECISION_LAYER: dict[str, Any] = {
    "use_llm_for": [
        "drafting",
        "rewriting",
        "summarising",
        "reflective_prompts",
        "therapeutic_language_improvement",
        "complex_reasoning",
        "record_structuring",
        "user_facing_explanation",
    ],
    "do_not_use_llm_for": [
        "which_workflow_is_this",
        "does_this_require_local_policy",
        "which_source_tier_applies",
        "is_this_source_statutory",
        "should_this_be_citable",
        "does_this_require_manager_oversight",
        "is_this_an_ofsted_grade_prediction_request",
        "source_ingestion_eligibility",
        "citation_eligibility",
        "local_policy_dependency",
    ],
    "default_rule": (
        "Run deterministic policy first; call an LLM only when the user-facing answer needs writing, "
        "summarising, reasoning or reflective support."
    ),
}

MODEL_TIER_POLICY: dict[str, dict[str, Any]] = {
    "deterministic_only": {
        "when_to_use": "Classification, source eligibility, local-policy checks, citation eligibility, escalation flags and simple source/workflow mapping.",
        "maximum_source_bundle_size": {
            "workflow_bundles": 1,
            "source_ids": 5,
            "exact_chunks": 0,
            "metadata_summaries": 5,
        },
        "maximum_prompt_context": "No LLM prompt; return structured internal policy bundle only.",
        "allowed_source_bundle": "Source IDs, authority labels, workflow metadata and deterministic prompts only.",
        "citation_expectation": "No generated citation text; report citation eligibility only.",
        "human_review_required": False,
        "examples": [
            "which workflow is this",
            "does this require local policy",
            "is SCCIF grade prediction allowed",
        ],
    },
    "small_model_write": {
        "when_to_use": "Simple rewrite, formatting, short summary, record tidy-up and basic structure.",
        "maximum_source_bundle_size": {
            "workflow_bundles": 1,
            "source_ids": 3,
            "exact_chunks": 1,
            "metadata_summaries": 3,
        },
        "maximum_prompt_context": "Short workflow bundle plus one answer skeleton; no full catalogue.",
        "allowed_source_bundle": "Selected workflow bundle, short source summaries and one exact chunk only if needed.",
        "citation_expectation": "Use citations only where the selected bundle includes an exact chunk or approved source label.",
        "human_review_required": False,
        "examples": ["tidy this daily record", "make this incident note clearer"],
    },
    "standard_model_reasoning": {
        "when_to_use": "Normal ORB chat, reflective support, report shaping and moderate complexity practice reasoning.",
        "maximum_source_bundle_size": {
            "workflow_bundles": 1,
            "source_ids": 5,
            "exact_chunks": 3,
            "metadata_summaries": 5,
        },
        "maximum_prompt_context": "One capped workflow bundle, relevant skeleton and uncertainty/citation rules.",
        "allowed_source_bundle": "Top relevant statutory/guidance sources, exact chunks only when citation-backed answer is requested.",
        "citation_expectation": "Distinguish exact, summary and metadata basis; never invent citation text.",
        "human_review_required": False,
        "examples": ["reflect on a missing return", "shape a Reg 45 evidence paragraph"],
    },
    "high_model_safeguarding_review": {
        "when_to_use": "Complex safeguarding, allegations, significant incidents, inspection preparation, serious risk, competing factors or high-stakes management reflection.",
        "maximum_source_bundle_size": {
            "workflow_bundles": 1,
            "source_ids": 5,
            "exact_chunks": 3,
            "metadata_summaries": 5,
        },
        "maximum_prompt_context": "Capped source bundle plus explicit escalation, manager oversight and professional judgement boundaries.",
        "allowed_source_bundle": "Tier 1/Tier 2 source IDs, exact chunks where available, local-policy warning and escalation block.",
        "citation_expectation": "Cite only exact chunks or approved source labels; state uncertainty and local-policy gaps.",
        "human_review_required": True,
        "examples": ["allegation reflection", "serious incident review", "inspection readiness with safeguarding concerns"],
    },
    "human_escalation_only": {
        "when_to_use": "Emergency risk, safeguarding threshold decision, legal compliance judgement, Ofsted grade prediction, clinical diagnosis, allegation outcome or placement suitability approval.",
        "maximum_source_bundle_size": {
            "workflow_bundles": 1,
            "source_ids": 2,
            "exact_chunks": 0,
            "metadata_summaries": 2,
        },
        "maximum_prompt_context": "No substantive LLM answer; deterministic safety/escalation guidance only.",
        "allowed_source_bundle": "Escalation and boundary wording only.",
        "citation_expectation": "Do not cite as decision authority; direct to manager/professional/local process.",
        "human_review_required": True,
        "examples": [
            "is this a safeguarding referral threshold",
            "will Ofsted rate us good",
            "is this placement suitable",
        ],
    },
}

PROMPT_BUDGET_POLICY: dict[str, Any] = {
    "never_send_all_catalogue_sources_to_llm": True,
    "maximum_workflow_bundles": 1,
    "maximum_source_ids": 5,
    "maximum_exact_chunks": 3,
    "maximum_reflective_practice_sources": 2,
    "maximum_metadata_summaries": 5,
    "maximum_local_policy_warning_blocks": 1,
    "maximum_escalation_blocks": 1,
    "maximum_child_voice_blocks": 1,
    "maximum_manager_oversight_blocks": 1,
    "rules": [
        "Send only the selected workflow bundle.",
        "Send only top relevant sources/chunks.",
        "Use source IDs and short summaries unless exact citation is needed.",
        "Use exact chunks only for citation-backed answers.",
        "Do not repeat static safety text where deterministic policy already enforces it.",
        "Use cached regulation, Quality Standard and SCCIF mappings.",
        "Use deterministic answer skeletons before LLM polishing.",
    ],
}

SOURCE_BUNDLE_POLICY: dict[str, Any] = {
    "contains": [
        "workflow_domain",
        "selected_source_ids",
        "source_authority_labels",
        "relevant_regulation_numbers",
        "relevant_quality_standards",
        "relevant_sccif_areas",
        "local_policy_dependency",
        "escalation_prompts",
        "manager_oversight_prompts",
        "child_voice_prompts",
        "citation_eligibility",
        "uncertainty_behaviour",
        "not_to_be_used_for_boundaries",
    ],
    "limits": {
        "workflow_bundles": 1,
        "source_ids": 5,
        "exact_chunks": 3,
        "reflective_practice_sources": 2,
        "metadata_summaries": 5,
    },
    "never_send_whole_catalogue": True,
}

CACHE_TEMPLATE_STRATEGY: dict[str, Any] = {
    "principle": "Use deterministic cached assets first; an LLM may polish or personalise but must not invent the structure.",
    "cached_assets": [
        "workflow_templates",
        "safer_recording_checklists",
        "escalation_wording",
        "local_policy_caveats",
        "child_voice_prompt_sets",
        "manager_oversight_prompt_sets",
        "citation_disclaimer_blocks",
        "uncertainty_wording",
        "regulation_quality_standard_sccif_mappings",
    ],
    "answer_skeletons": [
        "regulation_40_consideration_skeleton",
        "reg_44_preparation_skeleton",
        "reg_45_preparation_skeleton",
        "incident_reflection_skeleton",
        "missing_from_care_reflection_skeleton",
        "daily_record_skeleton",
        "allegation_recording_skeleton",
        "medication_record_skeleton",
    ],
}

SOURCE_TYPE_RULES: dict[str, dict[str, Any]] = {
    "legislation": {
        "eligibility": "eligible_for_full_text_ingestion",
        "citation_eligible_after_ingestion": True,
        "authority_boundary": "law",
        "notes": "May support regulation-level citation only after exact text is ingested and chunked.",
    },
    "statutory_guidance": {
        "eligibility": "eligible_for_full_text_ingestion",
        "citation_eligible_after_ingestion": True,
        "authority_boundary": "statutory_guidance",
        "notes": "May support statutory-guidance citation after headings and paragraphs are preserved.",
    },
    "inspection_framework": {
        "eligibility": "eligible_for_full_text_ingestion",
        "citation_eligible_after_ingestion": True,
        "authority_boundary": "inspection_framework",
        "notes": "May support SCCIF evidence framing, never grade prediction.",
    },
    "government_practice_guidance": {
        "eligibility": "eligible_for_full_text_ingestion",
        "citation_eligible_after_ingestion": True,
        "authority_boundary": "practice_guidance",
        "notes": "May be cited as practice guidance, not as law or statutory certainty.",
    },
    "clinical_guidance": {
        "eligibility": "eligible_for_full_text_ingestion",
        "citation_eligible_after_ingestion": True,
        "authority_boundary": "clinical_guidance",
        "notes": "May support health-aware prompts; clinical decisions stay with qualified professionals.",
    },
    "data_protection_guidance": {
        "eligibility": "eligible_for_full_text_ingestion",
        "citation_eligible_after_ingestion": True,
        "authority_boundary": "data_protection_guidance",
        "notes": "May support records and privacy prompts; legal decisions stay with manager/DPO/legal advice.",
    },
    "professional_guidance": {
        "eligibility": "eligible_for_full_text_ingestion",
        "citation_eligible_after_ingestion": True,
        "authority_boundary": "professional_guidance",
        "notes": "May support professional practice context, not statutory authority.",
    },
    "third_sector": {
        "eligibility": "reflective_practice_only",
        "citation_eligible_after_ingestion": False,
        "authority_boundary": "reflective_practice",
        "notes": "May inform reflection but must not be presented as statutory authority.",
    },
    "lived_experience": {
        "eligibility": "reflective_practice_only",
        "citation_eligible_after_ingestion": False,
        "authority_boundary": "reflective_practice",
        "notes": "May inform humane reflection but must not be used as determinative authority.",
    },
    "provider_policy": {
        "eligibility": "local_policy_upload_required",
        "citation_eligible_after_ingestion": False,
        "authority_boundary": "local_policy",
        "notes": "Non-citable unless the verified local provider document is uploaded.",
    },
}

CITATION_POLICY: dict[str, Any] = {
    "exact_citation_requires_exact_ingested_chunk": True,
    "summary_metadata_is_not_exact_citation": True,
    "local_policy_sources_non_citable_unless_uploaded": True,
    "third_sector_lived_experience_not_statutory_authority": True,
    "sccif_must_not_predict_grades": True,
    "regulations_and_guide_do_not_guarantee_compliance": True,
    "say_when_no_reliable_source": True,
    "distinguish_source_types": [
        "law",
        "statutory_guidance",
        "inspection_framework",
        "practice_guidance",
        "local_policy",
    ],
}

RETRIEVAL_UNCERTAINTY_POLICY: dict[str, dict[str, str]] = {
    "no_source_matches": {
        "answer": "Do not invent citations; say ORB does not have a reliable source for the point.",
        "safe_next_step": "Give only cautious general recording prompts where safe and ask for manager review.",
    },
    "only_metadata_matches": {
        "answer": "Do not present catalogue metadata as exact source text.",
        "safe_next_step": "Explain that full text has not been ingested yet and offer source title/URL as a check point.",
    },
    "only_reflective_practice_sources_match": {
        "answer": "Use reflective wording only and do not frame it as statutory or inspection authority.",
        "safe_next_step": "Prompt the adult to check statutory guidance and local policy before deciding.",
    },
    "local_policy_required_missing": {
        "answer": "Do not make the operational decision; state that local policy is required and not available to ORB.",
        "safe_next_step": "Prompt manager/local policy review before operational decisions.",
    },
    "legal_or_compliance_judgement": {
        "answer": "Do not give legal certainty or guarantee compliance.",
        "safe_next_step": "Distinguish law/guidance from professional judgement and prompt manager/legal review.",
    },
    "safeguarding_threshold_decision": {
        "answer": "Do not decide threshold, referral route, or outcome.",
        "safe_next_step": "Prompt DSL/manager escalation and emergency response where immediate danger exists.",
    },
    "ofsted_grade_prediction": {
        "answer": "Refuse grade prediction and do not infer inspection outcomes.",
        "safe_next_step": "Support evidence review against SCCIF judgement areas without predicting a grade.",
    },
}

RUNTIME_WIRING_PHASES: tuple[dict[str, str], ...] = (
    {
        "phase": "Phase 1",
        "scope": "ingestion prep and tests",
        "runtime_change": "none",
    },
    {
        "phase": "Phase 2a",
        "scope": "ingest Guide to Children's Homes Regulations",
        "runtime_change": "governed retrieval only after tests",
    },
    {
        "phase": "Phase 2b",
        "scope": "ingest Children's Homes Regulations 2015 with regulation index",
        "runtime_change": "regulation-index retrieval only after exact-citation tests",
    },
    {
        "phase": "Phase 2c",
        "scope": "ingest SCCIF children's homes with judgement-area tags",
        "runtime_change": "SCCIF-area retrieval without grade prediction",
    },
    {
        "phase": "Phase 2d",
        "scope": "citation-backed retrieval",
        "runtime_change": "exact citations only from exact chunks",
    },
    {
        "phase": "Phase 2e",
        "scope": "workflow answer policy enforcement",
        "runtime_change": "source-grounding boundaries in answer assembly",
    },
    {
        "phase": "Phase 2f",
        "scope": "Voice/Dictate grounding parity",
        "runtime_change": "no UI behaviour change without separate governed PR",
    },
    {
        "phase": "Phase 3",
        "scope": "therapeutic language quality pass",
        "runtime_change": "answer-quality refinement after grounding is stable",
    },
)


def _load_catalogue(path: Path = CATALOGUE_PATH) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _normalise(value: Any) -> str:
    return str(value or "").strip()


class OrbResidentialGovernedIngestionPrepService:
    """Read-only policy view over the ORB Residential source catalogue."""

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

    def source_type_rules(self) -> dict[str, dict[str, Any]]:
        return dict(SOURCE_TYPE_RULES)

    def internal_knowledge_brain_architecture(self) -> tuple[dict[str, str], ...]:
        return INTERNAL_KNOWLEDGE_BRAIN_FLOW

    def deterministic_internal_answer_layer(self) -> tuple[dict[str, str], ...]:
        return DETERMINISTIC_INTERNAL_ANSWER_LAYER

    def llm_decision_layer(self) -> dict[str, Any]:
        return dict(LLM_DECISION_LAYER)

    def model_tier_policy(self) -> dict[str, dict[str, Any]]:
        return dict(MODEL_TIER_POLICY)

    def prompt_budget_policy(self) -> dict[str, Any]:
        return dict(PROMPT_BUDGET_POLICY)

    def source_bundle_policy(self) -> dict[str, Any]:
        return dict(SOURCE_BUNDLE_POLICY)

    def cache_template_strategy(self) -> dict[str, Any]:
        return dict(CACHE_TEMPLATE_STRATEGY)

    def can_send_full_catalogue_to_llm(self) -> bool:
        return False

    def no_llm_decisions_supported(self) -> set[str]:
        return {item["decision"] for item in DETERMINISTIC_INTERNAL_ANSWER_LAYER}

    def eligibility_for_source(self, source: dict[str, Any]) -> dict[str, Any]:
        source_type = source["source_type"]
        rule = SOURCE_TYPE_RULES.get(
            source_type,
            {
                "eligibility": "metadata_only",
                "citation_eligible_after_ingestion": False,
                "authority_boundary": "unknown",
                "notes": "Keep metadata-only until reviewed by a human.",
            },
        )
        eligibility = rule["eligibility"]
        requires_local_policy = bool(source.get("requires_local_policy"))
        if requires_local_policy:
            eligibility = "local_policy_upload_required"

        reflective = eligibility == "reflective_practice_only"
        local_policy_upload_required = eligibility == "local_policy_upload_required"
        full_text_eligible = eligibility == "eligible_for_full_text_ingestion"
        not_suitable = eligibility == "not_suitable_for_ingestion"
        citation_eligible = bool(rule["citation_eligible_after_ingestion"]) and not (
            reflective or local_policy_upload_required or not_suitable
        )

        return {
            "source_id": source["source_id"],
            "source_title": source["title"],
            "source_type": source_type,
            "statutory_status": source["statutory_status"],
            "current_content_state": "metadata_only",
            "ingestion_eligibility": eligibility,
            "eligible_for_full_text_ingestion": full_text_eligible,
            "metadata_only": True,
            "local_policy_upload_required": local_policy_upload_required,
            "reflective_practice_only": reflective,
            "citation_eligible_after_ingestion": citation_eligible,
            "non_citable_unless_uploaded_locally": local_policy_upload_required,
            "not_suitable_for_ingestion": not_suitable,
            "quote_allowed_after_ingestion": bool(source.get("quote_allowed_default")) and citation_eligible,
            "requires_local_policy": requires_local_policy,
            "authority_boundary": rule["authority_boundary"],
            "professional_judgement_boundary": source["professional_judgement_boundary"],
            "not_to_be_used_for": list(source["not_to_be_used_for"]),
            "notes": rule["notes"],
        }

    def ingestion_eligibility_by_source(self) -> dict[str, dict[str, Any]]:
        return {
            source["source_id"]: self.eligibility_for_source(source)
            for source in self.sources()
        }

    def ingestion_eligibility_by_category(self) -> dict[str, dict[str, Any]]:
        return self.source_type_rules()

    def tier_1_first_ingestion_sequence(self) -> list[dict[str, Any]]:
        by_id = self.source_by_id()
        plans: list[dict[str, Any]] = []
        for priority, source_id in enumerate(FIRST_INGESTION_SOURCE_IDS, start=1):
            source = by_id[source_id]
            plans.append(
                {
                    "priority": priority,
                    "source_id": source_id,
                    "source_title": source["title"],
                    "official_url": source["official_url"],
                    "source_type": source["source_type"],
                    "statutory_inspection_status": source["statutory_status"],
                    "why_tier_1": _tier_1_reason(source_id),
                    "expected_chunking_strategy": _chunking_strategy(source_id),
                    "expected_citation_strategy": _citation_strategy(source_id),
                    "relevant_workflows": list(source["related_workflow_domains"]),
                    "relevant_regulations": list(source["related_regulations"]),
                    "relevant_quality_standards": list(source["related_quality_standards"]),
                    "relevant_sccif_areas": list(source["related_sccif_judgement_areas"]),
                    "quote_allowed_rules": _quote_allowed_rules(source_id),
                    "freshness_update_handling": source["review_frequency"],
                }
            )
        return plans

    def required_chunk_metadata_fields(self) -> tuple[str, ...]:
        return REQUIRED_CHUNK_METADATA_FIELDS

    def citation_policy(self) -> dict[str, Any]:
        return dict(CITATION_POLICY)

    def retrieval_uncertainty_policy(self) -> dict[str, dict[str, str]]:
        return dict(RETRIEVAL_UNCERTAINTY_POLICY)

    def runtime_wiring_phases(self) -> tuple[dict[str, str], ...]:
        return RUNTIME_WIRING_PHASES

    def full_text_ingestion_performed(self) -> bool:
        return True

    def full_text_ingested_source_ids(self) -> set[str]:
        return {
            *orb_residential_guide_ingestion_service.full_text_source_ids(),
            *orb_residential_regulations_2015_ingestion_service.full_text_source_ids(),
        }

    def guide_chunks(self) -> list[dict[str, Any]]:
        return orb_residential_guide_ingestion_service.chunks()

    def guide_chunk_count(self) -> int:
        return orb_residential_guide_ingestion_service.chunk_count()

    def guide_retrieval_policy(self) -> dict[str, Any]:
        return orb_residential_guide_ingestion_service.retrieval_policy()

    def retrieve_guide_chunks(self, **kwargs: Any) -> list[dict[str, Any]]:
        return orb_residential_guide_ingestion_service.retrieve_chunks(**kwargs)

    def guide_source_bundle(self, **kwargs: Any) -> dict[str, Any]:
        return orb_residential_guide_ingestion_service.source_bundle(**kwargs)

    def scraping_or_downloading_performed(self) -> bool:
        return orb_residential_guide_ingestion_service.runtime_scraping_or_downloading_performed()

    def exact_citation_allowed(self, chunk: dict[str, Any]) -> bool:
        if _normalise(chunk.get("source_id")) == GUIDE_SOURCE_ID:
            return orb_residential_guide_ingestion_service.exact_citation_allowed(chunk)
        if _normalise(chunk.get("basis_type")) != "exact":
            return False
        if _normalise(chunk.get("source_integrity")) == "summary_only":
            return False
        return bool(
            _normalise(chunk.get("exact_text") or chunk.get("exact_excerpt"))
            and _normalise(chunk.get("source_id"))
            and _normalise(chunk.get("citation_label"))
        )

    def summary_metadata_can_be_exact_citation(self) -> bool:
        return False

    def can_be_statutory_authority(self, source: dict[str, Any]) -> bool:
        if source["source_type"] in {"third_sector", "lived_experience"}:
            return False
        if source["statutory_status"] in {"third_sector_resource", "lived_experience_resource"}:
            return False
        return source["citation_authority"] in {
            "authoritative_statute",
            "authoritative_guidance",
            "authoritative_inspection",
        }

    def source_bundle_for_workflow(self, domain: str) -> dict[str, Any]:
        workflow_by_domain = {
            workflow["domain"]: workflow
            for workflow in self.workflow_domain_behaviours()
        }
        workflow = workflow_by_domain[domain]
        by_id = self.source_by_id()
        cap = int(PROMPT_BUDGET_POLICY["maximum_source_ids"])
        selected_source_ids = list(workflow["relevant_sources"])[:cap]
        authority_labels = {
            source_id: by_id[source_id]["citation_authority"]
            for source_id in selected_source_ids
            if source_id in by_id
        }
        selected_sources = [by_id[source_id] for source_id in selected_source_ids if source_id in by_id]
        return {
            "workflow_domain": domain,
            "selected_source_ids": selected_source_ids,
            "source_authority_labels": authority_labels,
            "relevant_regulation_numbers": list(workflow["regulation_guidance_links"]),
            "relevant_quality_standards": list(workflow["quality_standards"]),
            "relevant_sccif_areas": [workflow["sccif_judgement_area"]],
            "local_policy_dependency": bool(workflow.get("requires_local_policy")),
            "escalation_prompts": list(workflow["escalation_prompts"]),
            "manager_oversight_prompts": list(workflow["manager_oversight_prompts"]),
            "child_voice_prompts": list(workflow["child_voice_prompts"]),
            "citation_eligibility": {
                source["source_id"]: self.eligibility_for_source(source)[
                    "citation_eligible_after_ingestion"
                ]
                for source in selected_sources
            },
            "uncertainty_behaviour": workflow["uncertainty_behaviour"],
            "not_to_be_used_for_boundaries": list(workflow["not_to_be_used_for"]),
        }

    def workflow_answer_policy(self) -> dict[str, dict[str, Any]]:
        workflow_by_domain = {
            workflow["domain"]: workflow
            for workflow in self.workflow_domain_behaviours()
        }
        policies: dict[str, dict[str, Any]] = {}
        for domain in KEY_WORKFLOW_DOMAINS:
            if domain == "local_policy_required_workflows":
                policies[domain] = {
                    "required_source_tier": "local_upload_plus_relevant_national_sources",
                    "when_to_cite": "Cite only uploaded and verified local policy, or cite national source limits separately.",
                    "when_not_to_cite": "Do not cite missing provider policy or catalogue metadata as policy text.",
                    "escalation_prompt": "Escalate to manager where the provider policy is needed for a decision.",
                    "manager_oversight_prompt": "Manager verifies local document, owner, version and operational decision.",
                    "local_policy_dependency": True,
                    "answer_boundary": "No operational approval without verified local policy.",
                    "professional_judgement_boundary": "Local policy and manager judgement remain controlling.",
                }
                continue

            workflow = workflow_by_domain[domain]
            requires_local = bool(workflow.get("requires_local_policy"))
            policies[domain] = {
                "required_source_tier": "tier_1" if domain in _tier_1_workflows() else "relevant_catalogue_tier",
                "when_to_cite": workflow["citation_expectations"],
                "when_not_to_cite": (
                    "Do not cite if only metadata is matched, local policy is missing, or the answer would imply a decision."
                ),
                "escalation_prompt": workflow["escalation_prompt"]
                if "escalation_prompt" in workflow
                else "; ".join(workflow["escalation_prompts"]),
                "manager_oversight_prompt": workflow["manager_oversight_prompt"]
                if "manager_oversight_prompt" in workflow
                else "; ".join(workflow["manager_oversight_prompts"]),
                "local_policy_dependency": requires_local,
                "answer_boundary": "; ".join(workflow["not_to_be_used_for"]),
                "professional_judgement_boundary": (
                    "Adult, manager, safeguarding lead, health professional, DPO or legal judgement remains required where relevant."
                ),
            }
        return policies

    def governance_summary(self) -> dict[str, Any]:
        eligibility = self.ingestion_eligibility_by_source()
        return {
            "source_count": len(eligibility),
            "workflow_answer_policy_count": len(self.workflow_answer_policy()),
            "tier_1_ingestion_order": list(FIRST_INGESTION_SOURCE_IDS),
            "internal_knowledge_brain_design_present": True,
            "cost_control_design_present": True,
            "never_send_all_catalogue_sources_to_llm": True,
            "full_text_ingestion_performed": self.full_text_ingestion_performed(),
            "full_text_ingested_source_ids": sorted(self.full_text_ingested_source_ids()),
            "guide_chunk_count": self.guide_chunk_count(),
            "scraping_or_downloading_performed": self.scraping_or_downloading_performed(),
            "runtime_behaviour_changed": False,
            "route_frontend_or_os_assistant_files_changed": False,
            "nr_1_remains_open": True,
            "public_promise_remains_blocked": True,
        }


def _tier_1_reason(source_id: str) -> str:
    reasons = {
        "dfe_childrens_homes_regulations_guide": (
            "Core statutory guidance linking the Quality Standards, regulation intent, recording expectations and leadership duties."
        ),
        "childrens_homes_regulations_2015": (
            "The legal spine for children's homes duties, including Quality Standards and Reg 40/44/45 duties."
        ),
        "ofsted_sccif_childrens_homes": (
            "The inspection framework used to organise evidence about children's experiences, protection and leadership."
        ),
    }
    return reasons[source_id]


def _chunking_strategy(source_id: str) -> str:
    strategies = {
        "dfe_childrens_homes_regulations_guide": (
            "Chunk by Quality Standard, section heading and paragraph; preserve guide version, page/paragraph labels and linked regulations."
        ),
        "childrens_homes_regulations_2015": (
            "Chunk by regulation number and schedule; preserve regulation title, sub-paragraphs and legislation URL anchors."
        ),
        "ofsted_sccif_childrens_homes": (
            "Chunk by judgement area, evaluation criteria and grade descriptor context without enabling grade prediction."
        ),
    }
    return strategies[source_id]


def _citation_strategy(source_id: str) -> str:
    strategies = {
        "dfe_childrens_homes_regulations_guide": (
            "Exact citation only from ingested paragraphs; otherwise cite as metadata/summary with clear limitation."
        ),
        "childrens_homes_regulations_2015": (
            "Exact citation by regulation number only from ingested SI chunks or existing curated quote registry."
        ),
        "ofsted_sccif_childrens_homes": (
            "Cite judgement-area evidence expectations only from exact SCCIF chunks; never cite as grade prediction."
        ),
    }
    return strategies[source_id]


def _quote_allowed_rules(source_id: str) -> str:
    if source_id == "childrens_homes_regulations_2015":
        return "Short exact statutory quotes allowed only from ingested regulation chunks or curated quotes."
    return "Quotes allowed only after exact full-text chunk ingestion; summary metadata is not quotable."


def _tier_1_workflows() -> set[str]:
    return {
        "daily_recording",
        "incident_recording",
        "physical_intervention",
        "missing_from_care",
        "safeguarding_concern",
        "reg_40_notification",
        "reg_44_preparation",
        "reg_45_preparation",
        "inspection_readiness",
    }


orb_residential_governed_ingestion_prep_service = (
    OrbResidentialGovernedIngestionPrepService()
)
