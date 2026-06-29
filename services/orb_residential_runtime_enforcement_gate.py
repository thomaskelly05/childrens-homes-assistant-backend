"""ORB Residential runtime enforcement gate — Phase 2g/2h.

Evaluates future answer-assembly payloads against Phase 2e policy, Phase 2f
retrieval previews and Phase 2g sign-off requirements. Phase 2h hardens
exact boundary matching, escalation prompt validation and live-enablement
output clarity. Returns evaluation objects only.
"""

from __future__ import annotations

from typing import Any

from services.orb_residential_citation_backed_retrieval_gate import (
    LIVE_PAYLOAD_BLOCKED_POLICY_FIELDS,
    orb_residential_citation_backed_retrieval_gate,
)
from services.orb_residential_source_answer_policy import (
    CANONICAL_BOUNDARY_STATEMENT_IDS,
    CANONICAL_ESCALATION_PROMPT_IDS,
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

HARD_LIVE_ENABLEMENT_BLOCK_REASON = (
    "Phase 2h runtime enforcement remains evaluation-only. Live source-grounded answers "
    "require separate explicit runtime enablement after named human sign-off artefacts "
    "are committed, NR-1 clearance for this wiring, and public-promise review. "
    "Per-source runtime_answer_wiring_enabled remains false."
)

LIVE_WIRING_BLOCKED_REASON = HARD_LIVE_ENABLEMENT_BLOCK_REASON

GENERIC_ESCALATION_PLACEHOLDERS: frozenset[str] = frozenset(
    {
        "escalate if needed",
        "follow local policy",
        "manager oversight required",
        "generic escalation prompt",
    }
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _runtime_wiring_enabled(source_type: SourceTypeKey) -> bool:
    eligibility = orb_residential_source_answer_policy_service.source_eligibility(source_type)
    return bool(eligibility.get("live_answer_wiring_enabled"))


def _resolve_boundary_present_values(
    *,
    boundary_statement_ids_present: list[str] | None,
    boundary_statements_present: list[str] | None,
) -> tuple[set[str], set[str]]:
    ids_present = set(boundary_statement_ids_present or [])
    texts_present = {_text(item) for item in (boundary_statements_present or []) if _text(item)}
    for boundary_id in list(ids_present):
        texts_present.add(orb_residential_source_answer_policy_service.canonical_boundary_text(boundary_id))
    return ids_present, texts_present


def _resolve_escalation_present_values(
    *,
    escalation_prompt_ids_present: list[str] | None,
    escalation_prompts_present: list[str] | None,
) -> tuple[set[str], set[str]]:
    ids_present = set(escalation_prompt_ids_present or [])
    texts_present = {_text(item) for item in (escalation_prompts_present or []) if _text(item)}
    for prompt_id in list(ids_present):
        texts_present.add(orb_residential_source_answer_policy_service.canonical_escalation_text(prompt_id))
    return ids_present, texts_present


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

    def hard_live_enablement_block_active(self) -> bool:
        return True

    def live_source_grounded_answers_enabled(self) -> bool:
        return False

    def live_wiring_blocked_reason(self) -> str:
        return LIVE_WIRING_BLOCKED_REASON

    def required_boundary_statement_ids(self, workflow_type: WorkflowAnswerType) -> tuple[str, ...]:
        return self._policy.required_boundary_statement_ids(workflow_type)

    def required_escalation_prompt_ids(self, workflow_type: WorkflowAnswerType) -> tuple[str, ...]:
        return self._policy.required_escalation_prompt_ids(workflow_type)

    def validate_boundary_statements(
        self,
        *,
        workflow_type: WorkflowAnswerType,
        boundary_statement_ids_present: list[str] | None = None,
        boundary_statements_present: list[str] | None = None,
    ) -> tuple[bool, list[str]]:
        required_ids = set(self.required_boundary_statement_ids(workflow_type))
        ids_present, texts_present = _resolve_boundary_present_values(
            boundary_statement_ids_present=boundary_statement_ids_present,
            boundary_statements_present=boundary_statements_present,
        )
        errors: list[str] = []
        catalog = self._policy.canonical_boundary_catalog()

        for boundary_id in sorted(required_ids):
            canonical_text = self._policy.canonical_boundary_text(boundary_id)
            if boundary_id not in ids_present and canonical_text not in texts_present:
                errors.append(f"missing boundary id: {boundary_id}")

        for boundary_id in sorted(ids_present):
            if boundary_id not in CANONICAL_BOUNDARY_STATEMENT_IDS:
                errors.append(f"unknown boundary id: {boundary_id}")
                continue
            if self._policy.canonical_boundary_text(boundary_id) not in texts_present:
                errors.append(f"boundary id {boundary_id} present without exact canonical text")

        for text in sorted(texts_present):
            exact_matches = [
                boundary_id
                for boundary_id, item in catalog.items()
                if item["canonical_text"] == text
            ]
            if exact_matches:
                if required_ids and not any(boundary_id in required_ids for boundary_id in exact_matches):
                    errors.append(f"wrong boundary group for workflow {workflow_type}: {exact_matches[0]}")
                continue
            prefix_only = False
            for item in catalog.values():
                canonical_text = item["canonical_text"]
                if canonical_text.startswith(text) and canonical_text != text:
                    errors.append(f"prefix-only boundary rejected: {text}")
                    prefix_only = True
                    break
            if not prefix_only:
                errors.append(f"non-canonical boundary text: {text}")

        return not errors, errors

    def validate_escalation_prompts(
        self,
        *,
        workflow_type: WorkflowAnswerType,
        escalation_prompt_ids_present: list[str] | None = None,
        escalation_prompts_present: list[str] | None = None,
    ) -> tuple[bool, list[str]]:
        required_ids = set(self.required_escalation_prompt_ids(workflow_type))
        ids_present, texts_present = _resolve_escalation_present_values(
            escalation_prompt_ids_present=escalation_prompt_ids_present,
            escalation_prompts_present=escalation_prompts_present,
        )
        errors: list[str] = []

        if required_ids and not ids_present and not texts_present:
            errors.append("required escalation prompts missing")

        missing_ids = required_ids - ids_present
        if missing_ids and not all(
            self._policy.canonical_escalation_text(prompt_id) in texts_present
            for prompt_id in missing_ids
        ):
            for prompt_id in sorted(missing_ids):
                if self._policy.canonical_escalation_text(prompt_id) not in texts_present:
                    errors.append(f"missing escalation prompt id: {prompt_id}")

        for prompt_id in ids_present:
            if prompt_id not in CANONICAL_ESCALATION_PROMPT_IDS:
                errors.append(f"unknown escalation prompt id: {prompt_id}")
                continue
            if prompt_id not in required_ids:
                errors.append(f"wrong workflow escalation prompt id: {prompt_id}")
            if self._policy.canonical_escalation_text(prompt_id) not in texts_present:
                errors.append(f"escalation id {prompt_id} present without exact canonical text")

        for text in texts_present:
            if _text(text).lower() in GENERIC_ESCALATION_PLACEHOLDERS:
                errors.append(f"generic escalation placeholder rejected: {text}")
            exact_matches = [
                prompt_id
                for prompt_id, canonical_text in CANONICAL_ESCALATION_PROMPT_IDS.items()
                if canonical_text == text
            ]
            if not exact_matches:
                errors.append(f"non-canonical escalation prompt: {text}")
            elif required_ids and not any(prompt_id in required_ids for prompt_id in exact_matches):
                errors.append(f"wrong workflow escalation prompt: {exact_matches[0]}")

        return not errors, errors

    def _unsafe_output_violations(self, answer_text: str, workflow_type: WorkflowAnswerType) -> list[str]:
        violations: list[str] = []
        violations.extend(self._policy.detect_unsafe_output(answer_text))
        violations.extend(self._policy.detect_contextual_unsafe_output(answer_text))
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
        *,
        live_payload_candidate: bool = False,
    ) -> list[str]:
        errors: list[str] = []
        if retrieval_bundle_preview.get("phase") != "Phase 2f":
            errors.append("source bundle must come from Phase 2f retrieval gate")
        if retrieval_bundle_preview.get("live_answer_wiring_allowed") is True:
            errors.append("retrieval preview must not claim live wiring allowed")
        if live_payload_candidate:
            for field in LIVE_PAYLOAD_BLOCKED_POLICY_FIELDS:
                if field in retrieval_bundle_preview:
                    errors.append(f"live payload candidate must not include {field}")
            preview_policy = retrieval_bundle_preview.get("preview_only_policy_output")
            if isinstance(preview_policy, dict) and not preview_policy.get("blocked_from_live_payloads"):
                errors.append("live payload candidate must not include unguarded preview policy output")
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
        boundary_statements_present: list[str] | None = None,
        boundary_statement_ids_present: list[str] | None = None,
        escalation_prompts_present: list[str] | None = None,
        escalation_prompt_ids_present: list[str] | None = None,
        proposed_signoffs: dict[SourceTypeKey, dict[str, Any]] | None = None,
        public_promise_claim_made: bool = False,
        nr_1_cleared_for_wiring: bool = False,
    ) -> dict[str, Any]:
        """Evaluate a future answer assembly payload without changing live behaviour."""

        routing = self._policy.workflow_routing(workflow_type)
        source_types = list(retrieval_bundle_preview.get("active_source_types", []))
        enforcement_errors: list[str] = []

        enforcement_errors.extend(self._validate_retrieval_bundle_preview(retrieval_bundle_preview))

        boundaries_ok, boundary_errors = self.validate_boundary_statements(
            workflow_type=workflow_type,
            boundary_statement_ids_present=boundary_statement_ids_present,
            boundary_statements_present=boundary_statements_present,
        )
        if not boundaries_ok:
            enforcement_errors.extend(boundary_errors)

        escalation_ok, escalation_errors = self.validate_escalation_prompts(
            workflow_type=workflow_type,
            escalation_prompt_ids_present=escalation_prompt_ids_present,
            escalation_prompts_present=escalation_prompts_present,
        )
        if not escalation_ok:
            enforcement_errors.extend(escalation_errors)

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
        required_boundary_ids = list(self.required_boundary_statement_ids(workflow_type))
        required_escalation_ids = list(self.required_escalation_prompt_ids(workflow_type))

        return {
            "phase": "Phase 2h",
            "scope": "runtime enforcement evaluation (preview only)",
            "workflow_type": workflow_type,
            "workflow_display_name": routing["display_name"],
            "source_types_used": source_types,
            "enforcement_passed": enforcement_passed,
            "enforcement_errors": enforcement_errors,
            "unsafe_output_violations": unsafe_violations,
            "required_boundary_statement_ids": required_boundary_ids,
            "required_escalation_prompt_ids": required_escalation_ids,
            "boundary_validation_errors": boundary_errors,
            "escalation_validation_errors": escalation_errors,
            "nr_1_cleared_for_wiring": nr_1_cleared_for_wiring,
            "public_promise_claim_made": public_promise_claim_made,
            "live_source_grounded_answers_enabled": False,
            "hard_live_enablement_block_active": True,
            "blocked_reason": self.live_wiring_blocked_reason(),
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
        boundary_statements_present: list[str] | None = None,
        boundary_statement_ids_present: list[str] | None = None,
        escalation_prompts_present: list[str] | None = None,
        escalation_prompt_ids_present: list[str] | None = None,
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
            boundary_statement_ids_present=boundary_statement_ids_present,
            escalation_prompts_present=escalation_prompts_present,
            escalation_prompt_ids_present=escalation_prompt_ids_present,
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

        future_enablement_conditions: dict[str, bool] = {
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
            "required_boundaries_present": not assembly["boundary_validation_errors"],
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

        unmet_future_conditions = [
            name for name, met in future_enablement_conditions.items() if not met
        ]
        all_preconditions_met = not unmet_future_conditions

        return {
            "phase": "Phase 2h",
            "scope": "live enablement condition evaluation (preview only)",
            "workflow_type": workflow_type,
            "future_enablement_conditions": dict(future_enablement_conditions),
            "unmet_future_enablement_conditions": unmet_future_conditions,
            "all_preconditions_met": all_preconditions_met,
            "hard_live_enablement_block_active": True,
            "live_source_grounded_answers_enabled": False,
            "blocked_reason": self.live_wiring_blocked_reason(),
            "assembly_evaluation": assembly,
            "nr_1_remains_open": not nr_1_cleared_for_wiring,
            "public_promise_remains_blocked": True,
            "runtime_answer_behaviour_changed": False,
            # Deprecated alias retained for compatibility; always false while hard block active.
            "all_conditions_met": False,
        }

    def validate_live_payload_candidate(self, payload: dict[str, Any]) -> list[str]:
        return self._validate_retrieval_bundle_preview(payload, live_payload_candidate=True)

    def governance_summary(self) -> dict[str, Any]:
        return {
            "phase": "Phase 2h",
            "scope": "runtime enforcement gate",
            "live_source_grounded_answers_enabled": False,
            "hard_live_enablement_block_active": True,
            "future_enablement_conditions": list(LIVE_ENABLEMENT_CONDITIONS),
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
