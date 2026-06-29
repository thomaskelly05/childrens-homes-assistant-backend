"""ORB Residential citation-backed retrieval wiring gate — Phase 2f.

Connects offline source retrieval services to the Phase 2e answer-policy gate,
exact citation safety checks, unsafe-output blockers and required boundary
statements. This module assembles source-bundle previews only. It does not
enable live source-grounded ORB answers, call the LLM, change runtime answer
behaviour, alter routes, or change frontend behaviour.
"""

from __future__ import annotations

from typing import Any

from services.orb_residential_guide_ingestion_service import (
    orb_residential_guide_ingestion_service,
)
from services.orb_residential_regulations_2015_ingestion_service import (
    orb_residential_regulations_2015_ingestion_service,
)
from services.orb_residential_sccif_ingestion_service import (
    orb_residential_sccif_ingestion_service,
)
from services.orb_residential_source_answer_policy import (
    SOURCE_TYPE_TO_ID,
    SourceTypeKey,
    WorkflowAnswerType,
    orb_residential_source_answer_policy_service,
)

WORKFLOW_RETRIEVAL_HINTS: dict[WorkflowAnswerType, dict[SourceTypeKey, dict[str, Any]]] = {
    "daily_record": {
        "guide": {"workflow_domain": "daily_recording"},
    },
    "incident_reflection": {
        "guide": {"workflow_domain": "incident_recording"},
        "regulations_2015": {"workflow_domain": "incident_recording"},
        "sccif": {"workflow_domain": "incident_recording"},
    },
    "reg_40_notification": {
        "regulations_2015": {"regulation_number": "40"},
        "guide": {"workflow_domain": "safeguarding_concern"},
    },
    "ofsted_evidence_preparation": {
        "sccif": {"workflow_domain": "inspection_readiness"},
        "guide": {"workflow_domain": "inspection_readiness"},
        "regulations_2015": {"workflow_domain": "regulated_home_governance"},
    },
    "care_planning_risk_safeguarding": {
        "guide": {"workflow_domain": "care_planning"},
        "regulations_2015": {"workflow_domain": "safeguarding_concern"},
        "sccif": {"workflow_domain": "safeguarding_concern"},
    },
    "reg_44_45_preparation": {
        "regulations_2015": {"workflow_domain": "regulated_home_governance"},
        "guide": {"workflow_domain": "reg_44_preparation"},
        "sccif": {"workflow_domain": "reg_44_preparation"},
    },
}

SOURCE_PRESENTATION_ROLES: dict[SourceTypeKey, dict[str, str]] = {
    "guide": {
        "presentation_role": "care standards and practice expectations",
        "must_not_present_as": "statutory Regulations text or legal advice",
    },
    "regulations_2015": {
        "presentation_role": "statutory/regulatory text",
        "must_not_present_as": "legal advice or compliance decision",
    },
    "sccif": {
        "presentation_role": "inspection/evaluation framework",
        "must_not_present_as": "Ofsted grade prediction or inspection outcome guarantee",
    },
}

LIVE_WIRING_BLOCKED_REASON = (
    "Phase 2f assembles citation-backed retrieval bundle previews only. Named human "
    "sign-off for Guide, Regulations 2015 and SCCIF children's homes, runtime enforcement "
    "in live answer assembly, and explicit live-wiring enablement are still required. "
    "Synthetic human review is not sufficient for live use."
)


class OrbResidentialCitationBackedRetrievalGate:
    """Deterministic retrieval-wiring gate for ORB Residential source bundles."""

    def __init__(self) -> None:
        self._policy = orb_residential_source_answer_policy_service
        self._guide = orb_residential_guide_ingestion_service
        self._regulations = orb_residential_regulations_2015_ingestion_service
        self._sccif = orb_residential_sccif_ingestion_service

    def policy_service(self):
        return self._policy

    def workflow_types(self) -> tuple[WorkflowAnswerType, ...]:
        return self._policy.workflow_types()

    def live_answer_wiring_allowed(self) -> bool:
        return False

    def live_wiring_blocked_reason(self) -> str:
        return LIVE_WIRING_BLOCKED_REASON

    def detect_unsafe_output(self, text: str) -> list[str]:
        return self._policy.detect_unsafe_output(text)

    def detect_regulations_unsafe_output(self, text: str) -> list[str]:
        return self._policy.detect_regulations_unsafe_output(text)

    def detect_reg_40_unsafe_output(self, text: str) -> list[str]:
        return self._policy.detect_reg_40_unsafe_output(text)

    def detect_sccif_unsafe_output(self, text: str) -> list[str]:
        return self._policy.detect_sccif_unsafe_output(text)

    def is_output_safe(self, text: str) -> bool:
        return self._policy.is_output_safe(text)

    def metadata_citation_blocked(self, chunk: dict[str, Any]) -> bool:
        return self._policy.metadata_citation_blocked(chunk)

    def full_source_blob_blocked(self, *, source_type: SourceTypeKey, chunk_count: int) -> bool:
        return self._policy.full_source_blob_blocked(
            source_type=source_type,
            chunk_count=chunk_count,
        )

    def _ingestion_service(self, source_type: SourceTypeKey):
        if source_type == "guide":
            return self._guide
        if source_type == "regulations_2015":
            return self._regulations
        return self._sccif

    def _exact_citation_allowed(self, source_type: SourceTypeKey, chunk: dict[str, Any]) -> bool:
        service = self._ingestion_service(source_type)
        return bool(service.exact_citation_allowed(chunk))

    def _retrieve_chunks(
        self,
        *,
        source_type: SourceTypeKey,
        workflow_type: WorkflowAnswerType,
        query: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        hints = dict(WORKFLOW_RETRIEVAL_HINTS.get(workflow_type, {}).get(source_type, {}))
        service = self._ingestion_service(source_type)
        if source_type == "guide":
            return service.retrieve_chunks(
                query=query,
                workflow_domain=hints.get("workflow_domain"),
                regulation_reference=hints.get("regulation_reference"),
                quality_standard=hints.get("quality_standard"),
                limit=limit,
            )
        if source_type == "regulations_2015":
            return service.retrieve_chunks(
                query=query,
                workflow_domain=hints.get("workflow_domain"),
                regulation_number=hints.get("regulation_number"),
                quality_standard=hints.get("quality_standard"),
                limit=limit,
            )
        return service.retrieve_chunks(
            query=query,
            workflow_domain=hints.get("workflow_domain"),
            judgement_area=hints.get("judgement_area"),
            evaluation_area=hints.get("evaluation_area"),
            inspection_evidence_theme=hints.get("inspection_evidence_theme"),
            quality_standard=hints.get("quality_standard"),
            regulation=hints.get("regulation"),
            limit=limit,
        )

    def _prepare_citation_candidate(
        self,
        *,
        source_type: SourceTypeKey,
        chunk: dict[str, Any],
        role: str,
    ) -> dict[str, Any]:
        metadata_blocked = self.metadata_citation_blocked(chunk)
        exact_allowed = self._exact_citation_allowed(source_type, chunk)
        misrepresented = _lower(chunk.get("source_id")) != SOURCE_TYPE_TO_ID[source_type]
        citation_available = exact_allowed and not metadata_blocked and not misrepresented
        presentation = dict(SOURCE_PRESENTATION_ROLES[source_type])
        return {
            "source_type": source_type,
            "source_id": chunk.get("source_id"),
            "chunk_index": chunk.get("chunk_index"),
            "internal_chunk_id": chunk.get("internal_chunk_id"),
            "citation_label": chunk.get("citation_label"),
            "role_in_bundle": role,
            "presentation_role": presentation["presentation_role"],
            "must_not_present_as": presentation["must_not_present_as"],
            "metadata_citation_blocked": metadata_blocked,
            "exact_citation_allowed": exact_allowed,
            "citation_candidate": citation_available,
            "human_review_required": not citation_available,
            "chunk": chunk,
        }

    def assemble_bundle_preview(
        self,
        workflow_type: WorkflowAnswerType,
        *,
        query: str = "",
        include_secondary_source_types: list[SourceTypeKey] | None = None,
    ) -> dict[str, Any]:
        """Assemble a capped, policy-governed source bundle preview for a workflow."""

        policy_output = self._policy.policy_output(workflow_type)
        routing = self._policy.workflow_routing(workflow_type)
        limits = self._policy.source_bundle_limits()
        primary_types = list(routing["primary_source_types"])
        allowed_secondary = set(routing["secondary_source_types"])
        requested_secondary = [
            source_type
            for source_type in (include_secondary_source_types or [])
            if source_type in allowed_secondary and source_type not in primary_types
        ]
        active_source_types = list(dict.fromkeys([*primary_types, *requested_secondary]))

        per_type_limit = limits["maximum_exact_chunks_per_source_type"]
        total_limit = limits["maximum_exact_chunks_total"]
        remaining_total = total_limit

        source_bundles: dict[str, dict[str, Any]] = {}
        citation_candidates: list[dict[str, Any]] = []
        metadata_rejected_chunks: list[dict[str, Any]] = []
        exact_chunks_by_source_type: dict[SourceTypeKey, int] = {}
        source_ids: list[str] = []

        for source_type in active_source_types:
            role = "primary" if source_type in primary_types else "secondary"
            type_limit = min(per_type_limit, remaining_total)
            chunks = self._retrieve_chunks(
                source_type=source_type,
                workflow_type=workflow_type,
                query=query,
                limit=type_limit,
            )
            exact_chunks_by_source_type[source_type] = len(chunks)
            remaining_total = max(0, remaining_total - len(chunks))
            source_id = SOURCE_TYPE_TO_ID[source_type]
            if source_id not in source_ids:
                source_ids.append(source_id)

            bundle_chunks: list[dict[str, Any]] = []
            for chunk in chunks:
                candidate = self._prepare_citation_candidate(
                    source_type=source_type,
                    chunk=chunk,
                    role=role,
                )
                if candidate["citation_candidate"]:
                    citation_candidates.append(candidate)
                if candidate["metadata_citation_blocked"] or not candidate["exact_citation_allowed"]:
                    metadata_rejected_chunks.append(candidate)
                bundle_chunks.append(candidate)

            blob_blocked = self.full_source_blob_blocked(
                source_type=source_type,
                chunk_count=len(chunks),
            )
            source_bundles[source_type] = {
                "source_type": source_type,
                "source_id": source_id,
                "role_in_bundle": role,
                "exact_chunk_count": len(chunks),
                "full_source_blob_blocked": blob_blocked,
                "chunks": bundle_chunks,
            }

        total_exact_chunks = sum(exact_chunks_by_source_type.values())
        bundle_errors = self._policy.validate_source_bundle(
            workflow_type=workflow_type,
            primary_source_types=primary_types,
            secondary_source_types=requested_secondary,
            source_ids=source_ids,
            exact_chunks_by_source_type=exact_chunks_by_source_type,
            total_exact_chunks=total_exact_chunks,
            sends_full_source_blob=any(
                bundle["full_source_blob_blocked"] for bundle in source_bundles.values()
            ),
        )

        exact_citation_safety_available = bool(citation_candidates) and not any(
            item["human_review_required"] for item in citation_candidates
        )
        human_review_required = not exact_citation_safety_available

        return {
            "phase": "Phase 2f",
            "scope": "citation-backed retrieval wiring gate (preview only)",
            "workflow_type": workflow_type,
            "workflow_display_name": policy_output["workflow_display_name"],
            "policy_phase": "Phase 2e",
            "policy_output": policy_output,
            "primary_source_types": primary_types,
            "allowed_secondary_source_types": list(allowed_secondary),
            "included_secondary_source_types": requested_secondary,
            "active_source_types": active_source_types,
            "source_bundles": source_bundles,
            "citation_candidates": citation_candidates,
            "metadata_rejected_chunks": metadata_rejected_chunks,
            "bundle_validation_errors": bundle_errors,
            "source_bundle_limits": limits,
            "required_boundary_statements": policy_output["required_boundary_statements"],
            "escalation_prompts": policy_output["escalation_prompts"],
            "citation_rules": self._policy.citation_rules(),
            "unsafe_output_blockers": policy_output["unsafe_output_blockers"],
            "exact_citation_safety_available": exact_citation_safety_available,
            "human_review_required": human_review_required,
            "citable_in_live_answers": False,
            "live_answer_wiring_allowed": False,
            "live_wiring_blocked_reason": self.live_wiring_blocked_reason(),
            "named_human_signoff_required": True,
            "synthetic_human_review_insufficient": True,
            "human_signoff_requirements": self._policy.human_signoff_requirements(),
            "runtime_answer_behaviour_changed": False,
            "public_promise_allowed": False,
            "nr_1_remains_open": True,
            "route_frontend_or_os_assistant_files_changed": False,
            "llm_called": False,
            "sent_to_live_orb_answers": False,
        }

    def governance_summary(self) -> dict[str, Any]:
        policy_summary = self._policy.governance_summary()
        previews = {
            workflow_type: self.assemble_bundle_preview(workflow_type)
            for workflow_type in self.workflow_types()
        }
        return {
            "phase": "Phase 2f",
            "scope": "citation-backed retrieval wiring gate",
            "policy_integration": "Phase 2e source answer policy",
            "workflow_preview_count": len(previews),
            "all_live_answer_wiring_blocked": all(
                not preview["live_answer_wiring_allowed"] for preview in previews.values()
            ),
            "all_citable_in_live_answers_disabled": all(
                not preview["citable_in_live_answers"] for preview in previews.values()
            ),
            "named_human_signoff_required": True,
            "synthetic_human_review_insufficient": True,
            "human_signoff_performed": False,
            "runtime_answer_behaviour_changed": False,
            "route_frontend_or_os_assistant_files_changed": False,
            "guide_chunks_changed": False,
            "regulations_chunks_changed": False,
            "sccif_chunks_changed": False,
            "nr_1_remains_open": True,
            "public_promise_remains_blocked": True,
            "policy_governance_summary": policy_summary,
        }


def _lower(value: Any) -> str:
    return str(value or "").strip().lower()


orb_residential_citation_backed_retrieval_gate = OrbResidentialCitationBackedRetrievalGate()
