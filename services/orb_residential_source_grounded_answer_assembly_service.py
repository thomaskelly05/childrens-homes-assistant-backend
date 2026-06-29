"""ORB Residential source-grounded answer assembly — Phase 2j.

Prepares the live answer assembly integration path by orchestrating Phase 2f
retrieval previews and Phase 2g/2h runtime enforcement into a single blocked
evaluation result. This module does not enable live source-grounded answers,
send source chunks to the LLM, return source citations to users, change live
answer behaviour, alter routes, or change frontend behaviour.
"""

from __future__ import annotations

from typing import Any

from services.orb_residential_citation_backed_retrieval_gate import (
    orb_residential_citation_backed_retrieval_gate,
)
from services.orb_residential_runtime_enforcement_gate import (
    LIVE_ENABLEMENT_CONDITIONS,
    orb_residential_runtime_enforcement_gate,
)
from services.orb_residential_source_answer_policy import (
    SourceTypeKey,
    WorkflowAnswerType,
    orb_residential_source_answer_policy_service,
)
from services.orb_residential_source_signoff_gate import (
    orb_residential_source_signoff_gate,
)

HARD_LIVE_BLOCK_REASON = (
    "Phase 2j source-grounded answer assembly integration remains blocked. Live "
    "source-grounded answers require committed named human sign-off artefacts, "
    "runtime enforcement wiring clearance, NR-1 clearance for this wiring, explicit "
    "per-source runtime_answer_wiring_enabled, and public-promise review. No source "
    "chunks are sent to the LLM and no source citations are returned to users."
)


class OrbResidentialSourceGroundedAnswerAssemblyService:
    """Blocked integration orchestrator for future source-grounded ORB answers."""

    def __init__(self) -> None:
        self._policy = orb_residential_source_answer_policy_service
        self._retrieval = orb_residential_citation_backed_retrieval_gate
        self._runtime = orb_residential_runtime_enforcement_gate
        self._signoff = orb_residential_source_signoff_gate

    def policy_service(self):
        return self._policy

    def retrieval_gate(self):
        return self._retrieval

    def runtime_gate(self):
        return self._runtime

    def signoff_gate(self):
        return self._signoff

    def workflow_types(self) -> tuple[WorkflowAnswerType, ...]:
        return self._policy.workflow_types()

    def live_source_grounded_answers_enabled(self) -> bool:
        return False

    def hard_live_enablement_block_active(self) -> bool:
        return True

    def live_enablement_conditions(self) -> tuple[str, ...]:
        return LIVE_ENABLEMENT_CONDITIONS

    def blocked_reason(self) -> str:
        return HARD_LIVE_BLOCK_REASON

    def _source_signoff_status(self, source_types: list[SourceTypeKey]) -> dict[str, Any]:
        return {
            source_type: self._signoff.source_signoff_status(source_type)
            for source_type in source_types
        }

    def _source_eligibility_status(self, source_types: list[SourceTypeKey]) -> dict[str, Any]:
        return {
            source_type: self._policy.source_eligibility(source_type)
            for source_type in source_types
        }

    def evaluate_source_grounded_assembly(
        self,
        *,
        workflow_type: WorkflowAnswerType,
        query: str = "",
        answer_text: str = "",
        include_secondary_source_types: list[SourceTypeKey] | None = None,
        boundary_statements_present: list[str] | None = None,
        boundary_statement_ids_present: list[str] | None = None,
        escalation_prompts_present: list[str] | None = None,
        escalation_prompt_ids_present: list[str] | None = None,
        proposed_signoffs: dict[SourceTypeKey, dict[str, Any]] | None = None,
        public_promise_claim_made: bool = False,
        nr_1_cleared_for_wiring: bool = False,
    ) -> dict[str, Any]:
        """Evaluate a source-grounded assembly request without changing live behaviour."""

        retrieval_bundle_preview = self._retrieval.assemble_bundle_preview(
            workflow_type,
            query=query,
            include_secondary_source_types=include_secondary_source_types,
        )
        source_types = list(retrieval_bundle_preview.get("active_source_types", []))

        runtime_enforcement = self._runtime.evaluate_answer_assembly(
            workflow_type=workflow_type,
            retrieval_bundle_preview=retrieval_bundle_preview,
            answer_text=answer_text,
            boundary_statements_present=boundary_statements_present,
            boundary_statement_ids_present=boundary_statement_ids_present,
            escalation_prompts_present=escalation_prompts_present,
            escalation_prompt_ids_present=escalation_prompt_ids_present,
            proposed_signoffs=proposed_signoffs,
            public_promise_claim_made=public_promise_claim_made,
            nr_1_cleared_for_wiring=nr_1_cleared_for_wiring,
        )
        live_enablement = self._runtime.evaluate_live_enablement(
            workflow_type=workflow_type,
            retrieval_bundle_preview=retrieval_bundle_preview,
            answer_text=answer_text,
            boundary_statements_present=boundary_statements_present,
            boundary_statement_ids_present=boundary_statement_ids_present,
            escalation_prompts_present=escalation_prompts_present,
            escalation_prompt_ids_present=escalation_prompt_ids_present,
            source_types_used=source_types,
            proposed_signoffs=proposed_signoffs,
            public_promise_claim_made=public_promise_claim_made,
            nr_1_cleared_for_wiring=nr_1_cleared_for_wiring,
        )

        signoff_status = self._source_signoff_status(source_types)
        eligibility_status = self._source_eligibility_status(source_types)
        any_signed_off = any(status["signed_off"] for status in signoff_status.values())
        all_wiring_disabled = all(
            not item.get("live_answer_wiring_enabled") for item in eligibility_status.values()
        )

        enforcement_passed = runtime_enforcement["enforcement_passed"]
        assembly_allowed = False

        return {
            "phase": "Phase 2j",
            "scope": "source-grounded answer assembly integration (blocked preview only)",
            "workflow_type": workflow_type,
            "workflow_display_name": retrieval_bundle_preview.get("workflow_display_name"),
            "source_grounded_assembly_requested": True,
            "source_grounded_assembly_allowed": assembly_allowed,
            "live_source_grounded_answers_enabled": False,
            "hard_live_enablement_block_active": True,
            "blocked_reason": self.blocked_reason(),
            "runtime_enforcement_result": runtime_enforcement,
            "live_enablement_result": live_enablement,
            "retrieval_bundle_preview": retrieval_bundle_preview,
            "named_signoff_status": signoff_status,
            "any_source_signed_off": any_signed_off,
            "source_eligibility_status": eligibility_status,
            "all_runtime_answer_wiring_disabled": all_wiring_disabled,
            "required_future_conditions": list(LIVE_ENABLEMENT_CONDITIONS),
            "unmet_future_enablement_conditions": live_enablement.get(
                "unmet_future_enablement_conditions", []
            ),
            "enforcement_passed": enforcement_passed,
            "source_chunks_sent_to_llm": False,
            "source_citations_returned_to_user": False,
            "llm_called": False,
            "sent_to_live_orb_answers": False,
            "live_answer_behaviour_changed": False,
            "route_frontend_or_os_assistant_files_changed": False,
            "nr_1_remains_open": not nr_1_cleared_for_wiring,
            "public_promise_remains_blocked": not public_promise_claim_made,
            "completed_signoff_artefact_present": self._signoff.signoff_artefact_path().is_file(),
        }

    def governance_summary(self) -> dict[str, Any]:
        return {
            "phase": "Phase 2j",
            "scope": "source-grounded answer assembly integration",
            "live_source_grounded_answers_enabled": False,
            "hard_live_enablement_block_active": True,
            "source_grounded_assembly_allowed": False,
            "source_chunks_sent_to_llm": False,
            "source_citations_returned_to_user": False,
            "llm_called": False,
            "sent_to_live_orb_answers": False,
            "runtime_answer_behaviour_changed": False,
            "route_frontend_or_os_assistant_files_changed": False,
            "guide_chunks_changed": False,
            "regulations_chunks_changed": False,
            "sccif_chunks_changed": False,
            "nr_1_remains_open": True,
            "public_promise_remains_blocked": True,
            "completed_signoff_artefact_present": self._signoff.signoff_artefact_path().is_file(),
            "template_artefact_present": self._signoff.signoff_template_path().is_file(),
            "runtime_enforcement_governance_summary": self._runtime.governance_summary(),
            "signoff_governance_summary": self._signoff.governance_summary(),
        }


orb_residential_source_grounded_answer_assembly_service = (
    OrbResidentialSourceGroundedAnswerAssemblyService()
)
