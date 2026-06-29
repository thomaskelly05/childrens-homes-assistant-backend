"""ORB Residential runtime enforcement gate — Phase 2g.

Evaluates future answer-assembly payloads against Phase 2e policy, Phase 2f
retrieval previews and Phase 2g sign-off requirements. Returns evaluation
objects only. Does not enable live source-grounded answers, import into live
routes, or change runtime answer behaviour.
"""

from __future__ import annotations

from typing import Any

from services.orb_residential_citation_backed_retrieval_gate import (
    orb_residential_citation_backed_retrieval_gate,
)
from services.orb_residential_source_answer_policy import (
    AnswerBoundaryType,
    SourceTypeKey,
    WorkflowAnswerType,
    orb_residential_source_answer_policy_service,
)
from services.orb_residential_source_signoff_gate import (
    orb_residential_source_signoff_gate,
)

LIVE_ENABLEMENT_CONDITIONS: tuple[str, ...] = (
    "named_human_signoff_exists_for_every_source_used",
    "source_checksums_verified",
    "chunk_checksums_verified",
    "phase_2e_policy_passed",
    "phase_2f_retrieval_gate_passed",
    "phase_2g_runtime_enforcement_passed",
    "unsafe_output_blockers_pass",
    "required_boundaries_present",
    "no_full_source_blobs",
    "no_metadata_citations",
    "nr_1_closed_or_explicitly_cleared_for_wiring",
    "per_source_runtime_answer_wiring_enabled",
    "public_promise_separately_approved_if_public_claim_made",
)

LIVE_WIRING_BLOCKED_REASON = (
    "Phase 2g runtime enforcement is evaluation-only. Named human sign-off artefacts "
    "are not committed, runtime enforcement is not wired into live answer assembly, "
    "per-source runtime_answer_wiring_enabled remains false, NR-1 remains open, and "
    "public promise remains blocked."
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(value: Any) -> str:
    return _text(value).lower()


def _runtime_wiring_enabled(source_type: SourceTypeKey) -> bool:
    eligibility = orb_residential_source_answer_policy_service.source_eligibility(source_type)
    return bool(eligibility.get("live_answer_wiring_enabled"))


class OrbResidentialRuntimeEnforcementGate:
    """Deterministic runtime enforcement evaluator for ORB Residential answers."""

    def __init__(self) -> None:
        self._policy = orb_residential_source_answer_policy_service
        self._retrieval = orb_residential_citation_backed_retrieval_gate
        self._signoff = orb_residential_source_signoff_gate

    def policy_service(self):
        return self._policy

    def retrieval_gate(self):
        return self._retrieval

    def signoff_gate(self):
        return self._signoff

    def live_enablement_conditions(self) -> tuple[str, ...]:
        return LIVE_ENABLEMENT_CONDITIONS

    def live_source_grounded_answers_enabled(self) -> bool:
        return False

    def live_wiring_blocked_reason(self) -> str:
        return LIVE_WIRING_BLOCKED_REASON

    def _boundary_types_for_workflow(self, workflow_type: WorkflowAnswerType) -> tuple[AnswerBoundaryType, ...]:
        routing = self._policy.workflow_routing(workflow_type)
        return tuple(routing.get("boundary_types", ()))

    def _required_boundaries(self, workflow_type: WorkflowAnswerType) -> list[str]:
        statements: list[str] = []
        for boundary_type in self._boundary_types_for_workflow(workflow_type):
            statements.extend(self._policy.required_boundary_statements(boundary_type))
        return statements

    def _boundary_statements_satisfied(
        self,
        *,
        workflow_type: WorkflowAnswerType,
        boundary_statements_present: list[str],
    ) -> tuple[bool, list[str]]:
        missing: list[str] = []
        present_text = " ".join(boundary_statements_present).lower()
        for statement in self._required_boundaries(workflow_type):
            key = statement.lower()[:40]
            if key not in present_text and statement.lower() not in present_text:
                missing.append(statement)
        return not missing, missing

    def _unsafe_output_violations(self, answer_text: str, workflow_type: WorkflowAnswerType) -> list[str]:
        violations: list[str] = []
        violations.extend(self._policy.detect_unsafe_output(answer_text))
        routing = self._policy.workflow_routing(workflow_type)
        primary = set(routing["primary_source_types"])
        secondary = set(routing["secondary_source_types"])
        active = primary | secondary
        if "regulations_2015" in active:
            violations.extend(self._policy.detect_regulations_unsafe_output(answer_text))
        if workflow_type == "reg_40_notification" or "regulations_2015" in active:
            violations.extend(self._policy.detect_reg_40_unsafe_output(answer_text))
        if "sccif" in active or workflow_type == "ofsted_evidence_preparation":
            violations.extend(self._policy.detect_sccif_unsafe_output(answer_text))
        return sorted(set(violations))

    def _validate_retrieval_bundle_preview(
        self,
        retrieval_bundle_preview: dict[str, Any],
    ) -> list[str]:
        errors: list[str] = []
        if retrieval_bundle_preview.get("phase") != "Phase 2f":
            errors.append("source bundle must come from Phase 2f retrieval gate")
        if retrieval_bundle_preview.get("live_answer_wiring_allowed") is True:
            errors.append("retrieval preview must not claim live wiring allowed")
        if retrieval_bundle_preview.get("bundle_validation_errors"):
            errors.extend(
                f"bundle validation: {item}" for item in retrieval_bundle_preview["bundle_validation_errors"]
            )
        for bundle in retrieval_bundle_preview.get("source_bundles", {}).values():
            if bundle.get("full_source_blob_blocked") is True:
                errors.append(f"full source blob blocked for {bundle.get('source_type')}")
        for candidate in retrieval_bundle_preview.get("citation_candidates", []):
            if candidate.get("metadata_citation_blocked"):
                errors.append("metadata chunk cannot be a citation candidate")
            if not candidate.get("citation_candidate"):
                errors.append("non-citation chunk present in citation candidates")
        for rejected in retrieval_bundle_preview.get("metadata_rejected_chunks", []):
            if rejected.get("citation_candidate"):
                errors.append("metadata rejected chunk incorrectly marked citable")
        return errors

    def _validate_signoffs_for_sources(
        self,
        source_types: list[SourceTypeKey],
        proposed_signoffs: dict[SourceTypeKey, dict[str, Any]] | None = None,
    ) -> list[str]:
        errors: list[str] = []
        proposed_signoffs = proposed_signoffs or {}
        for source_type in source_types:
            committed = self._signoff.committed_signoff_record(source_type)
            record = committed or proposed_signoffs.get(source_type)
            if not record:
                errors.append(f"named human sign-off missing for {source_type}")
                continue
            signoff_errors = self._signoff.validate_signoff_record(source_type, record)
            errors.extend(f"signoff {source_type}: {item}" for item in signoff_errors)
        return errors

    def evaluate_answer_assembly(
        self,
        *,
        workflow_type: WorkflowAnswerType,
        retrieval_bundle_preview: dict[str, Any],
        answer_text: str,
        boundary_statements_present: list[str],
        escalation_prompts_present: list[str] | None = None,
        proposed_signoffs: dict[SourceTypeKey, dict[str, Any]] | None = None,
        public_promise_claim_made: bool = False,
        nr_1_cleared_for_wiring: bool = False,
    ) -> dict[str, Any]:
        """Evaluate a future answer assembly payload without changing live behaviour."""

        policy_output = self._policy.policy_output(workflow_type)
        routing = self._policy.workflow_routing(workflow_type)
        source_types = list(retrieval_bundle_preview.get("active_source_types", []))
        enforcement_errors: list[str] = []

        enforcement_errors.extend(self._validate_retrieval_bundle_preview(retrieval_bundle_preview))

        boundaries_ok, missing_boundaries = self._boundary_statements_satisfied(
            workflow_type=workflow_type,
            boundary_statements_present=boundary_statements_present,
        )
        if not boundaries_ok:
            enforcement_errors.extend(f"missing boundary: {item}" for item in missing_boundaries)

        required_escalation = list(routing.get("escalation_prompts", ()))
        escalation_present = list(escalation_prompts_present or [])
        if required_escalation and not escalation_present:
            enforcement_errors.append("required escalation prompts missing")

        unsafe_violations = self._unsafe_output_violations(answer_text, workflow_type)
        if unsafe_violations:
            enforcement_errors.extend(f"unsafe output: {code}" for code in unsafe_violations)

        enforcement_errors.extend(self._validate_signoffs_for_sources(source_types, proposed_signoffs))

        for source_type in source_types:
            if not _runtime_wiring_enabled(source_type):
                enforcement_errors.append(f"runtime_answer_wiring_enabled is false for {source_type}")

        if not nr_1_cleared_for_wiring:
            enforcement_errors.append("NR-1 remains open and is not cleared for this wiring")

        if public_promise_claim_made:
            enforcement_errors.append("public promise requires separate approval before any public claim")

        enforcement_passed = not enforcement_errors

        return {
            "phase": "Phase 2g",
            "scope": "runtime enforcement evaluation (preview only)",
            "workflow_type": workflow_type,
            "workflow_display_name": policy_output["workflow_display_name"],
            "source_types_used": source_types,
            "enforcement_passed": enforcement_passed,
            "enforcement_errors": enforcement_errors,
            "unsafe_output_violations": unsafe_violations,
            "missing_boundary_statements": missing_boundaries,
            "required_boundary_statements": self._required_boundaries(workflow_type),
            "required_escalation_prompts": required_escalation,
            "boundary_statements_present": boundary_statements_present,
            "escalation_prompts_present": escalation_present,
            "retrieval_bundle_preview_phase": retrieval_bundle_preview.get("phase"),
            "nr_1_cleared_for_wiring": nr_1_cleared_for_wiring,
            "public_promise_claim_made": public_promise_claim_made,
            "live_source_grounded_answers_enabled": False,
            "live_wiring_blocked_reason": self.live_wiring_blocked_reason(),
            "runtime_answer_behaviour_changed": False,
            "route_frontend_or_os_assistant_files_changed": False,
            "sent_to_live_orb_answers": False,
        }

    def evaluate_live_enablement(
        self,
        *,
        workflow_type: WorkflowAnswerType,
        retrieval_bundle_preview: dict[str, Any],
        answer_text: str,
        boundary_statements_present: list[str],
        source_types_used: list[SourceTypeKey],
        proposed_signoffs: dict[SourceTypeKey, dict[str, Any]] | None = None,
        public_promise_claim_made: bool = False,
        nr_1_cleared_for_wiring: bool = False,
    ) -> dict[str, Any]:
        assembly = self.evaluate_answer_assembly(
            workflow_type=workflow_type,
            retrieval_bundle_preview=retrieval_bundle_preview,
            answer_text=answer_text,
            boundary_statements_present=boundary_statements_present,
            proposed_signoffs=proposed_signoffs,
            public_promise_claim_made=public_promise_claim_made,
            nr_1_cleared_for_wiring=nr_1_cleared_for_wiring,
        )

        proposed_signoffs = proposed_signoffs or {}

        def _signoff_complete(source_type: SourceTypeKey) -> bool:
            committed = self._signoff.committed_signoff_record(source_type)
            if committed:
                return True
            record = proposed_signoffs.get(source_type)
            if not record:
                return False
            return not self._signoff.validate_signoff_record(source_type, record)

        conditions: dict[str, bool] = {
            "named_human_signoff_exists_for_every_source_used": all(
                _signoff_complete(source_type) for source_type in source_types_used
            )
            if source_types_used
            else False,
            "source_checksums_verified": all(
                (
                    (self._signoff.committed_signoff_record(source_type) or proposed_signoffs.get(source_type) or {}).get(
                        "source_checksum_verified"
                    )
                    is True
                )
                for source_type in source_types_used
            )
            if source_types_used
            else False,
            "chunk_checksums_verified": all(
                (
                    (self._signoff.committed_signoff_record(source_type) or proposed_signoffs.get(source_type) or {}).get(
                        "chunk_checksum_verified"
                    )
                    is True
                )
                for source_type in source_types_used
            )
            if source_types_used
            else False,
            "phase_2e_policy_passed": retrieval_bundle_preview.get("policy_phase") == "Phase 2e",
            "phase_2f_retrieval_gate_passed": retrieval_bundle_preview.get("phase") == "Phase 2f"
            and not retrieval_bundle_preview.get("bundle_validation_errors"),
            "phase_2g_runtime_enforcement_passed": assembly["enforcement_passed"],
            "unsafe_output_blockers_pass": not assembly["unsafe_output_violations"],
            "required_boundaries_present": not assembly["missing_boundary_statements"],
            "no_full_source_blobs": not any(
                bundle.get("full_source_blob_blocked")
                for bundle in retrieval_bundle_preview.get("source_bundles", {}).values()
            ),
            "no_metadata_citations": not any(
                candidate.get("metadata_citation_blocked")
                for candidate in retrieval_bundle_preview.get("citation_candidates", [])
            ),
            "nr_1_closed_or_explicitly_cleared_for_wiring": nr_1_cleared_for_wiring,
            "per_source_runtime_answer_wiring_enabled": all(
                _runtime_wiring_enabled(source_type) for source_type in source_types_used
            )
            if source_types_used
            else False,
            "public_promise_separately_approved_if_public_claim_made": not public_promise_claim_made,
        }

        unmet = [name for name, met in conditions.items() if not met]

        return {
            "phase": "Phase 2g",
            "scope": "live enablement condition evaluation (preview only)",
            "workflow_type": workflow_type,
            "live_enablement_conditions": dict(conditions),
            "unmet_conditions": unmet,
            "all_conditions_met": not unmet,
            "live_source_grounded_answers_enabled": False,
            "live_wiring_blocked_reason": self.live_wiring_blocked_reason(),
            "assembly_evaluation": assembly,
            "nr_1_remains_open": not nr_1_cleared_for_wiring,
            "public_promise_remains_blocked": True,
            "runtime_answer_behaviour_changed": False,
        }

    def governance_summary(self) -> dict[str, Any]:
        return {
            "phase": "Phase 2g",
            "scope": "runtime enforcement gate",
            "live_source_grounded_answers_enabled": False,
            "live_enablement_conditions": list(LIVE_ENABLEMENT_CONDITIONS),
            "runtime_answer_behaviour_changed": False,
            "route_frontend_or_os_assistant_files_changed": False,
            "guide_chunks_changed": False,
            "regulations_chunks_changed": False,
            "sccif_chunks_changed": False,
            "nr_1_remains_open": True,
            "public_promise_remains_blocked": True,
            "signoff_governance_summary": self._signoff.governance_summary(),
        }


orb_residential_runtime_enforcement_gate = OrbResidentialRuntimeEnforcementGate()
