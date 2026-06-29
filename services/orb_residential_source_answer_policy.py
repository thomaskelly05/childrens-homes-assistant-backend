"""ORB Residential source-grounded answer policy gate — Phase 2e.

Defines the policy that must pass before live ORB answers can use Guide,
Regulations 2015 or SCCIF chunks. This module does not enable live retrieval,
change runtime answer behaviour, alter routes, or change frontend behaviour.
"""

from __future__ import annotations

import re
from typing import Any, Literal

from services.orb_residential_guide_ingestion_service import (
    GUIDE_SOURCE_ID,
    orb_residential_guide_ingestion_service,
)
from services.orb_residential_regulations_2015_ingestion_service import (
    REGULATIONS_2015_SOURCE_ID,
    orb_residential_regulations_2015_ingestion_service,
)
from services.orb_residential_sccif_ingestion_service import (
    SCCIF_CHILDREN_HOMES_SOURCE_ID,
    orb_residential_sccif_ingestion_service,
)

SourceTypeKey = Literal["guide", "regulations_2015", "sccif"]

WorkflowAnswerType = Literal[
    "daily_record",
    "incident_reflection",
    "reg_40_notification",
    "ofsted_evidence_preparation",
    "care_planning_risk_safeguarding",
    "reg_44_45_preparation",
]

AnswerBoundaryType = Literal[
    "regulatory_legal_sensitive",
    "notification_regulation_40",
    "ofsted_sccif",
    "safeguarding",
]

SOURCE_TYPE_TO_ID: dict[SourceTypeKey, str] = {
    "guide": GUIDE_SOURCE_ID,
    "regulations_2015": REGULATIONS_2015_SOURCE_ID,
    "sccif": SCCIF_CHILDREN_HOMES_SOURCE_ID,
}

SOURCE_ID_TO_TYPE: dict[str, SourceTypeKey] = {
    value: key for key, value in SOURCE_TYPE_TO_ID.items()
}

SOURCE_BUNDLE_LIMITS: dict[str, int] = {
    "maximum_primary_source_types": 1,
    "maximum_secondary_source_types": 2,
    "maximum_total_source_ids": 5,
    "maximum_exact_chunks_per_source_type": 3,
    "maximum_exact_chunks_total": 5,
}

DUAL_PRIMARY_WORKFLOWS: frozenset[WorkflowAnswerType] = frozenset({"reg_44_45_preparation"})

BOUNDARY_STATEMENTS: dict[AnswerBoundaryType, tuple[str, ...]] = {
    "regulatory_legal_sensitive": (
        "ORB can support thinking and recording, but does not provide legal advice or decide statutory compliance.",
        "The Registered Manager/provider should apply local policy and professional judgement.",
    ),
    "notification_regulation_40": (
        "ORB cannot decide whether something is notifiable or whether Regulation 40 applies.",
        "The Registered Manager/provider should review the facts, local policy and statutory requirements.",
    ),
    "ofsted_sccif": (
        "ORB can support evidence review and inspection preparation.",
        "ORB does not predict Ofsted judgements, grade the home or decide inspection readiness.",
    ),
    "safeguarding": (
        "Follow local safeguarding procedures and escalate to the appropriate manager/professional "
        "if there is any concern about risk, harm or immediate safety.",
    ),
}

SOURCE_ROLES: dict[SourceTypeKey, dict[str, Any]] = {
    "guide": {
        "source_id": GUIDE_SOURCE_ID,
        "role": "care standards and practice expectations",
        "supports": "safer recording, reflection and quality of care",
        "not_legal_advice": True,
        "not_compliance_guarantee": True,
    },
    "regulations_2015": {
        "source_id": REGULATIONS_2015_SOURCE_ID,
        "role": "statutory/regulatory text",
        "supports": "understanding of regulatory duties",
        "not_legal_advice": True,
        "does_not_decide_compliance": True,
        "does_not_decide_notification_thresholds": True,
    },
    "sccif": {
        "source_id": SCCIF_CHILDREN_HOMES_SOURCE_ID,
        "role": "inspection/evaluation framework",
        "supports": "evidence review and inspection preparation",
        "does_not_predict_ofsted_judgements": True,
        "does_not_grade_home": True,
        "does_not_decide_inspection_readiness": True,
    },
}

WORKFLOW_ROUTING: dict[WorkflowAnswerType, dict[str, Any]] = {
    "daily_record": {
        "display_name": "Daily record / child-centred writing",
        "primary_source_types": ("guide",),
        "secondary_source_types": ("regulations_2015", "sccif"),
        "secondary_conditions": {
            "regulations_2015": "only if statutory requirement is explicitly relevant",
            "sccif": "only if evidence/inspection framing is requested",
        },
        "boundary_types": (),
        "escalation_prompts": (),
    },
    "incident_reflection": {
        "display_name": "Incident reflection",
        "primary_source_types": ("guide",),
        "secondary_source_types": ("regulations_2015", "sccif"),
        "secondary_conditions": {
            "regulations_2015": "if notification/statutory duty context is requested",
            "sccif": "if evidence/leadership/impact framing is requested",
        },
        "boundary_types": ("safeguarding",),
        "escalation_prompts": (
            "Apply manager oversight and local policy where incident thresholds or safeguarding concerns arise.",
        ),
        "requires_manager_local_policy_boundary": True,
    },
    "reg_40_notification": {
        "display_name": "Regulation 40 / notifiable event question",
        "primary_source_types": ("regulations_2015",),
        "secondary_source_types": ("guide",),
        "secondary_conditions": {
            "guide": "if practice context is relevant",
        },
        "boundary_types": ("regulatory_legal_sensitive", "notification_regulation_40"),
        "escalation_prompts": (
            "Escalate threshold and notification decisions to the Registered Manager/provider and local policy.",
        ),
        "must_not_decide_threshold": True,
    },
    "ofsted_evidence_preparation": {
        "display_name": "Ofsted evidence / inspection preparation",
        "primary_source_types": ("sccif",),
        "secondary_source_types": ("guide", "regulations_2015"),
        "secondary_conditions": {
            "guide": "for care quality context",
            "regulations_2015": "if statutory framework is relevant",
        },
        "boundary_types": ("ofsted_sccif",),
        "escalation_prompts": (),
        "must_not_predict_grade": True,
        "must_not_decide_inspection_readiness": True,
    },
    "care_planning_risk_safeguarding": {
        "display_name": "Care planning / risk / safeguarding",
        "primary_source_types": ("guide",),
        "secondary_source_types": ("regulations_2015", "sccif"),
        "secondary_conditions": {
            "regulations_2015": "where statutory duties are relevant",
            "sccif": "only for evidence/inspection framing",
        },
        "boundary_types": ("safeguarding", "regulatory_legal_sensitive"),
        "escalation_prompts": (
            "Preserve safeguarding escalation to the appropriate manager/professional.",
        ),
        "preserve_safeguarding_escalation": True,
    },
    "reg_44_45_preparation": {
        "display_name": "Regulation 44/45 preparation",
        "primary_source_types": ("regulations_2015", "guide"),
        "secondary_source_types": ("sccif",),
        "secondary_conditions": {
            "sccif": "where inspection evidence/evaluation is relevant",
        },
        "boundary_types": ("regulatory_legal_sensitive",),
        "escalation_prompts": (),
        "must_not_guarantee_compliance_or_outcome": True,
        "dual_primary_exception": True,
    },
}

CITATION_RULES: dict[str, Any] = {
    "only_exact_chunks_may_be_cited": True,
    "metadata_cannot_be_cited_as_exact_source_text": True,
    "internal_chunk_labels_must_be_clearly_internal": True,
    "guide_must_not_be_presented_as_regulations_text": True,
    "regulations_must_not_be_presented_as_legal_advice": True,
    "sccif_must_not_be_presented_as_ofsted_grade_prediction": True,
    "if_exact_citation_safety_unavailable": (
        "Use non-citation summary language or ask for human review."
    ),
}

UNSAFE_OUTPUT_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("orb_decides_statutory_compliance", re.compile(r"\borb\b.{0,40}\bdecides?\b.{0,40}\bstatutory compliance\b", re.I)),
    ("orb_decides_legal_compliance", re.compile(r"\borb\b.{0,40}\bdecides?\b.{0,40}\blegal compliance\b", re.I)),
    ("orb_provides_legal_advice", re.compile(r"\borb\b.{0,40}\b(provides?|gives?)\b.{0,40}\blegal advice\b", re.I)),
    ("orb_decides_reg40_notification", re.compile(r"\borb\b.{0,40}\bdecides?\b.{0,40}\bregulation 40\b.{0,40}\bnotification\b", re.I)),
    ("orb_confirms_notifiable", re.compile(r"\borb\b.{0,40}\b(confirms?|decides?)\b.{0,40}\b(is|is not|not)\b.{0,40}\bnotifiable\b", re.I)),
    ("orb_replaces_rm_judgement", re.compile(r"\borb\b.{0,40}\breplaces?\b.{0,40}\bregistered manager\b.{0,40}\bjudgement\b", re.I)),
    ("orb_replaces_ri_judgement", re.compile(r"\borb\b.{0,40}\breplaces?\b.{0,40}\bresponsible individual\b.{0,40}\bjudgement\b", re.I)),
    ("orb_replaces_provider_judgement", re.compile(r"\borb\b.{0,40}\breplaces?\b.{0,40}\bprovider\b.{0,40}\bjudgement\b", re.I)),
    ("orb_replaces_safeguarding_decision", re.compile(r"\borb\b.{0,40}\breplaces?\b.{0,40}\bsafeguarding\b.{0,40}\bdecision", re.I)),
    ("orb_predicts_ofsted_judgement", re.compile(r"\borb\b.{0,40}\bpredicts?\b.{0,40}\bofsted\b.{0,40}\bjudgement\b", re.I)),
    ("orb_grades_home", re.compile(r"\borb\b.{0,40}\bgrades?\b.{0,40}\bthe home\b", re.I)),
    ("orb_confirms_outstanding_good", re.compile(r"\borb\b.{0,40}\b(confirms?|decides?)\b.{0,40}\b(meets?|evidence meets?)\b.{0,40}\b(outstanding|good)\b", re.I)),
    ("orb_decides_inspection_readiness", re.compile(r"\borb\b.{0,40}\bdecides?\b.{0,40}\binspection readiness\b", re.I)),
    ("orb_guarantees_inspection_outcomes", re.compile(r"\borb\b.{0,40}\bguarantees?\b.{0,40}\b(inspection outcomes?|ofsted outcome)\b", re.I)),
    ("orb_guarantees_compliance", re.compile(r"\borb\b.{0,40}\bguarantees?\b.{0,40}\bcompliance\b", re.I)),
)

REGULATIONS_UNSAFE_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("legal_advice", re.compile(r"\b(provides?|gives?)\b.{0,30}\blegal advice\b", re.I)),
    ("compliance_decision", re.compile(r"\bdecides?\b.{0,30}\b(statutory|legal) compliance\b", re.I)),
    ("guarantees_compliance", re.compile(r"\bguarantees?\b.{0,30}\bcompliance\b", re.I)),
)

REG_40_UNSAFE_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("decides_notification_threshold", re.compile(r"\bdecides?\b.{0,40}\b(notification|notifiable|regulation 40)\b", re.I)),
    ("confirms_notifiable", re.compile(r"\b(confirms?|is|is not)\b.{0,30}\bnotifiable\b", re.I)),
)

SCCIF_UNSAFE_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("grade_prediction", re.compile(r"\b(predicts?|will be rated|grade(?:d)? as)\b.{0,30}\b(outstanding|good|requires improvement|inadequate)\b", re.I)),
    ("inspection_readiness_decision", re.compile(r"\bdecides?\b.{0,30}\binspection readiness\b", re.I)),
    ("meets_outstanding_good", re.compile(r"\b(meets?|evidence meets?)\b.{0,30}\b(outstanding|good)\b", re.I)),
)

HUMAN_SIGNOFF_REQUIREMENTS: dict[str, Any] = {
    "named_human_signoff_required_per_source": True,
    "synthetic_human_review_not_sufficient": True,
    "required_confirmations": (
        "named_human_signoff_for_each_source",
        "synthetic_human_review_replaced_by_named_signoff",
        "source_checksum_verified",
        "chunk_checksum_verified",
        "source_role_approved",
        "source_routing_policy_approved",
        "unsafe_answer_blockers_tested",
        "boundary_statements_tested",
        "nr_1_controls_confirmed",
        "public_promise_still_blocked_unless_separately_approved",
    ),
    "live_signoff_performed_in_phase_2e": False,
}

LIVE_WIRING_BLOCKED_REASON = (
    "Phase 2e defines the source-grounded answer policy gate only. Named human sign-off, "
    "citation-backed retrieval wiring (Phase 2d), and live answer assembly enforcement are "
    "not yet complete. Guide, Regulations 2015 and SCCIF remain offline verified but not "
    "live-wired."
)


def _offline_verified(source_type: SourceTypeKey) -> bool:
    if source_type == "guide":
        return orb_residential_guide_ingestion_service.chunk_count() == 371
    if source_type == "regulations_2015":
        return orb_residential_regulations_2015_ingestion_service.chunk_count() == 100
    if source_type == "sccif":
        return orb_residential_sccif_ingestion_service.chunk_count() == 951
    return False


def _runtime_answer_wiring_enabled(source_type: SourceTypeKey) -> bool:
    if source_type == "guide":
        policy = orb_residential_guide_ingestion_service.retrieval_policy()
        return bool(policy.get("runtime_answer_wiring_enabled"))
    if source_type == "regulations_2015":
        return orb_residential_regulations_2015_ingestion_service.runtime_answer_wiring_enabled()
    if source_type == "sccif":
        return orb_residential_sccif_ingestion_service.runtime_answer_wiring_enabled()
    return False


class OrbResidentialSourceAnswerPolicyService:
    """Deterministic source-grounded answer policy for ORB Residential."""

    def source_type_keys(self) -> tuple[SourceTypeKey, ...]:
        return tuple(SOURCE_TYPE_TO_ID)

    def source_eligibility(self, source_type: SourceTypeKey) -> dict[str, Any]:
        offline_verified = _offline_verified(source_type)
        live_wiring = _runtime_answer_wiring_enabled(source_type)
        return {
            "source_type": source_type,
            "source_id": SOURCE_TYPE_TO_ID[source_type],
            "offline_verified": offline_verified,
            "eligible_for_policy_design": offline_verified,
            "live_answer_wiring_enabled": live_wiring,
            "citable_in_live_answers": False,
            "requires_human_signoff_before_live_use": True,
            "source_role": dict(SOURCE_ROLES[source_type]),
        }

    def all_source_eligibility(self) -> dict[SourceTypeKey, dict[str, Any]]:
        return {source_type: self.source_eligibility(source_type) for source_type in self.source_type_keys()}

    def source_role(self, source_type: SourceTypeKey) -> dict[str, Any]:
        return dict(SOURCE_ROLES[source_type])

    def workflow_routing(self, workflow_type: WorkflowAnswerType) -> dict[str, Any]:
        return dict(WORKFLOW_ROUTING[workflow_type])

    def workflow_types(self) -> tuple[WorkflowAnswerType, ...]:
        return tuple(WORKFLOW_ROUTING)

    def source_bundle_limits(self) -> dict[str, int]:
        return dict(SOURCE_BUNDLE_LIMITS)

    def citation_rules(self) -> dict[str, Any]:
        return dict(CITATION_RULES)

    def unsafe_output_blockers(self) -> tuple[str, ...]:
        return tuple(code for code, _ in UNSAFE_OUTPUT_PATTERNS)

    def required_boundary_statements(self, boundary_type: AnswerBoundaryType) -> tuple[str, ...]:
        return BOUNDARY_STATEMENTS[boundary_type]

    def human_signoff_requirements(self) -> dict[str, Any]:
        return dict(HUMAN_SIGNOFF_REQUIREMENTS)

    def live_wiring_allowed(self) -> bool:
        return False

    def live_wiring_blocked_reason(self) -> str:
        return LIVE_WIRING_BLOCKED_REASON

    def detect_unsafe_output(self, text: str) -> list[str]:
        return [code for code, pattern in UNSAFE_OUTPUT_PATTERNS if pattern.search(text)]

    def detect_regulations_unsafe_output(self, text: str) -> list[str]:
        return [code for code, pattern in REGULATIONS_UNSAFE_PATTERNS if pattern.search(text)]

    def detect_reg_40_unsafe_output(self, text: str) -> list[str]:
        return [code for code, pattern in REG_40_UNSAFE_PATTERNS if pattern.search(text)]

    def detect_sccif_unsafe_output(self, text: str) -> list[str]:
        return [code for code, pattern in SCCIF_UNSAFE_PATTERNS if pattern.search(text)]

    def is_output_safe(self, text: str) -> bool:
        return not self.detect_unsafe_output(text)

    def metadata_citation_blocked(self, chunk: dict[str, Any]) -> bool:
        metadata = chunk.get("generated_metadata") or {}
        if metadata.get("content_kind") == "generated_metadata":
            return True
        if chunk.get("basis_type") != "exact":
            return True
        if chunk.get("source_text_exact") is not True:
            return True
        return False

    def full_source_blob_blocked(
        self,
        *,
        source_type: SourceTypeKey,
        chunk_count: int,
    ) -> bool:
        if source_type == "guide":
            return chunk_count >= orb_residential_guide_ingestion_service.chunk_count()
        if source_type == "regulations_2015":
            return chunk_count >= orb_residential_regulations_2015_ingestion_service.chunk_count()
        if source_type == "sccif":
            return chunk_count >= orb_residential_sccif_ingestion_service.chunk_count()
        return True

    def validate_source_bundle(
        self,
        *,
        workflow_type: WorkflowAnswerType,
        primary_source_types: list[SourceTypeKey],
        secondary_source_types: list[SourceTypeKey],
        source_ids: list[str],
        exact_chunks_by_source_type: dict[SourceTypeKey, int],
        total_exact_chunks: int,
        sends_full_source_blob: bool = False,
    ) -> list[str]:
        errors: list[str] = []
        limits = self.source_bundle_limits()
        routing = self.workflow_routing(workflow_type)
        allowed_primary = set(routing["primary_source_types"])
        allowed_secondary = set(routing["secondary_source_types"])
        dual_primary = workflow_type in DUAL_PRIMARY_WORKFLOWS

        if dual_primary:
            max_primary = len(allowed_primary)
        else:
            max_primary = limits["maximum_primary_source_types"]
        if len(primary_source_types) > max_primary:
            errors.append(
                f"primary source type count {len(primary_source_types)} exceeds maximum {max_primary}"
            )
        if len(secondary_source_types) > limits["maximum_secondary_source_types"]:
            errors.append(
                "secondary source type count exceeds maximum "
                f"{limits['maximum_secondary_source_types']}"
            )
        if len(source_ids) > limits["maximum_total_source_ids"]:
            errors.append(
                f"source id count {len(source_ids)} exceeds maximum {limits['maximum_total_source_ids']}"
            )
        for source_type, count in exact_chunks_by_source_type.items():
            if count > limits["maximum_exact_chunks_per_source_type"]:
                errors.append(
                    f"exact chunk count for {source_type} exceeds per-source maximum "
                    f"{limits['maximum_exact_chunks_per_source_type']}"
                )
        if total_exact_chunks > limits["maximum_exact_chunks_total"]:
            errors.append(
                f"total exact chunk count {total_exact_chunks} exceeds maximum "
                f"{limits['maximum_exact_chunks_total']}"
            )
        if sends_full_source_blob:
            errors.append("full source blob use is blocked")
        for source_type in primary_source_types:
            if source_type not in allowed_primary:
                errors.append(f"primary source type {source_type} is not allowed for {workflow_type}")
        for source_type in secondary_source_types:
            if source_type not in allowed_secondary:
                errors.append(
                    f"secondary source type {source_type} is not allowed for {workflow_type}"
                )
        overlap = set(primary_source_types) & set(secondary_source_types)
        if overlap:
            errors.append(f"source types cannot be both primary and secondary: {sorted(overlap)}")
        return errors

    def policy_output(self, workflow_type: WorkflowAnswerType) -> dict[str, Any]:
        routing = self.workflow_routing(workflow_type)
        primary = routing["primary_source_types"]
        secondary = routing["secondary_source_types"]
        boundary_types: tuple[AnswerBoundaryType, ...] = routing["boundary_types"]
        boundaries: list[str] = []
        for boundary_type in boundary_types:
            boundaries.extend(self.required_boundary_statements(boundary_type))

        allowed_source_types = list(dict.fromkeys([*primary, *secondary]))
        return {
            "workflow_type": workflow_type,
            "workflow_display_name": routing["display_name"],
            "allowed_source_types": allowed_source_types,
            "primary_source_types": list(primary),
            "secondary_source_types": list(secondary),
            "secondary_conditions": dict(routing.get("secondary_conditions", {})),
            "maximum_chunks": self.source_bundle_limits(),
            "required_boundary_statements": boundaries,
            "escalation_prompts": list(routing.get("escalation_prompts", ())),
            "unsafe_output_blockers": list(self.unsafe_output_blockers()),
            "citation_rules": self.citation_rules(),
            "source_eligibility": self.all_source_eligibility(),
            "live_wiring_allowed": self.live_wiring_allowed(),
            "live_wiring_blocked_reason": self.live_wiring_blocked_reason(),
            "nr_1_remains_open": True,
            "public_promise_remains_blocked": True,
            "runtime_wiring_changed": False,
            "route_frontend_or_os_assistant_files_changed": False,
        }

    def governance_summary(self) -> dict[str, Any]:
        eligibility = self.all_source_eligibility()
        return {
            "phase": "Phase 2e",
            "scope": "source-grounded answer policy gate",
            "source_count": len(eligibility),
            "all_sources_offline_verified": all(item["offline_verified"] for item in eligibility.values()),
            "all_live_answer_wiring_disabled": all(
                not item["live_answer_wiring_enabled"] for item in eligibility.values()
            ),
            "all_citable_in_live_answers_disabled": all(
                not item["citable_in_live_answers"] for item in eligibility.values()
            ),
            "live_wiring_allowed": self.live_wiring_allowed(),
            "human_signoff_performed": False,
            "runtime_wiring_changed": False,
            "route_frontend_or_os_assistant_files_changed": False,
            "guide_chunks_changed": False,
            "regulations_chunks_changed": False,
            "sccif_chunks_changed": False,
            "nr_1_remains_open": True,
            "public_promise_remains_blocked": True,
        }


orb_residential_source_answer_policy_service = OrbResidentialSourceAnswerPolicyService()
