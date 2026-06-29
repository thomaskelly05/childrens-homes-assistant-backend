"""ORB Residential founder-only source-grounded alpha — Phase 2l/2m.

Provides a tightly controlled internal alpha path for founder/admin users to
evaluate source-grounded answer assembly. This does not enable public live
source-grounded answers, does not bypass named sign-off, NR-1 or public-promise
controls, and does not call the LLM. Phase 2m strips nested chunk text from API
responses and hardens denied-attempt audit logging.
"""

from __future__ import annotations

import copy
import os
from typing import Any

from services.orb_residential_source_answer_policy import (
    WorkflowAnswerType,
    orb_residential_source_answer_policy_service,
)
from services.orb_residential_source_grounded_answer_assembly_service import (
    orb_residential_source_grounded_answer_assembly_service,
)

INTERNAL_ALPHA_LABEL = "INTERNAL SOURCE-GROUNDED ALPHA — NOT FOR LIVE USE"

REQUIRED_INTERNAL_BOUNDARY_LINES: tuple[str, ...] = (
    "ORB does not provide legal advice.",
    "ORB does not decide statutory compliance.",
    "ORB cannot decide whether something is notifiable or whether Regulation 40 applies.",
    "ORB does not predict Ofsted judgements, grade the home or decide inspection readiness.",
    "Follow local policy and seek management/professional oversight where required.",
    "Registered Manager/provider professional judgement remains required.",
)

PROFESSIONAL_JUDGEMENT_REMINDER = (
    "Follow local policy and seek Registered Manager, provider or professional "
    "oversight where required. This output is for internal founder testing only."
)

_CHUNK_TEXT_FIELDS = frozenset(
    {
        "text",
        "chunk_text",
        "content",
        "body",
        "full_text",
        "quote",
        "excerpt",
        "source_text",
    }
)

_CHUNK_REF_FIELDS = (
    "source_id",
    "source_type",
    "chunk_id",
    "chunk_index",
    "internal_chunk_id",
    "citation_label",
    "regulation_number",
    "quality_standard",
    "quality_standard_id",
    "section_heading",
    "subsection_heading",
    "paragraph_reference",
    "regulation_reference",
    "related_regulations",
    "workflow_domains",
    "related_workflow_domains",
    "sccif_judgement_area",
    "evaluation_area",
    "inspection_evidence_theme",
    "judgement_area",
    "basis_type",
    "quote_allowed",
)


def _chunk_refs_only(chunk: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(chunk, dict):
        return None
    return {field: chunk[field] for field in _CHUNK_REF_FIELDS if chunk.get(field) is not None}


def _strip_chunk_text_value(value: Any) -> Any:
    if isinstance(value, dict):
        sanitized: dict[str, Any] = {}
        for key, item in value.items():
            if key in _CHUNK_TEXT_FIELDS:
                continue
            if key == "chunk":
                sanitized[key] = _chunk_refs_only(item) if isinstance(item, dict) else None
                continue
            sanitized[key] = _strip_chunk_text_value(item)
        return sanitized
    if isinstance(value, list):
        return [_strip_chunk_text_value(item) for item in value]
    return value


def _env_truthy(key: str, *, default: str = "false") -> bool:
    raw = os.getenv(key)
    if raw is None:
        raw = default
    return str(raw).strip().lower() in {"1", "true", "yes", "on"}


def _parse_allowed_roles() -> frozenset[str]:
    raw = os.getenv("ORB_SOURCE_GROUNDED_ALPHA_ALLOWED_ROLES", "founder,admin")
    if raw is None or not str(raw).strip():
        return frozenset()
    return frozenset(part.strip().lower() for part in str(raw).split(",") if part.strip())


def _normalise_role(role: str | None) -> str:
    return str(role or "").strip().lower()


class OrbResidentialSourceGroundedAlphaService:
    """Founder/admin-only internal alpha evaluator — not public live enablement."""

    def __init__(self) -> None:
        self._assembly = orb_residential_source_grounded_answer_assembly_service
        self._policy = orb_residential_source_answer_policy_service

    def feature_flag_status(self) -> dict[str, Any]:
        alpha_enabled = self.alpha_enabled()
        public_enabled = self.public_source_grounded_enabled()
        return {
            "ORB_SOURCE_GROUNDED_ALPHA_ENABLED": alpha_enabled,
            "ORB_SOURCE_GROUNDED_ALPHA_ALLOWED_ROLES": sorted(_parse_allowed_roles()),
            "ORB_SOURCE_GROUNDED_PUBLIC_ENABLED": public_enabled,
            "default_safe_when_missing": True,
            "public_live_source_grounded_answers_enabled": False,
            "phase_2j_hard_public_block_remains_active": True,
        }

    def alpha_enabled(self) -> bool:
        return _env_truthy("ORB_SOURCE_GROUNDED_ALPHA_ENABLED", default="false")

    def public_source_grounded_enabled(self) -> bool:
        return _env_truthy("ORB_SOURCE_GROUNDED_PUBLIC_ENABLED", default="false")

    def allowed_roles(self) -> frozenset[str]:
        return _parse_allowed_roles()

    def user_role_allowed(self, user: dict[str, Any] | None) -> bool:
        if not user:
            return False
        role = _normalise_role(user.get("role"))
        if not role:
            return False
        return role in self.allowed_roles()

    def check_access(self, user: dict[str, Any] | None) -> dict[str, Any]:
        if not user or not user.get("id"):
            return {
                "authenticated": False,
                "role": None,
                "role_allowed": False,
                "alpha_enabled": self.alpha_enabled(),
                "public_source_grounded_enabled": self.public_source_grounded_enabled(),
                "access_allowed": False,
                "blocked_reason": "Authentication required for internal source-grounded alpha.",
            }

        role = _normalise_role(user.get("role"))
        if self.public_source_grounded_enabled():
            return {
                "authenticated": True,
                "role": role,
                "role_allowed": self.user_role_allowed(user),
                "alpha_enabled": self.alpha_enabled(),
                "public_source_grounded_enabled": True,
                "access_allowed": False,
                "blocked_reason": "Public source-grounded answers remain disabled by governance.",
            }

        if not self.user_role_allowed(user):
            return {
                "authenticated": True,
                "role": role,
                "role_allowed": False,
                "alpha_enabled": self.alpha_enabled(),
                "public_source_grounded_enabled": False,
                "access_allowed": False,
                "blocked_reason": (
                    "Internal source-grounded alpha is restricted to founder/admin roles only."
                ),
            }

        if not self.alpha_enabled():
            return {
                "authenticated": True,
                "role": role,
                "role_allowed": True,
                "alpha_enabled": False,
                "public_source_grounded_enabled": False,
                "access_allowed": False,
                "blocked_reason": (
                    "Internal source-grounded alpha is disabled. "
                    "Set ORB_SOURCE_GROUNDED_ALPHA_ENABLED=true for founder-only testing."
                ),
            }

        return {
            "authenticated": True,
            "role": role,
            "role_allowed": True,
            "alpha_enabled": True,
            "public_source_grounded_enabled": False,
            "access_allowed": True,
            "blocked_reason": None,
        }

    def _boundary_wording_for_workflow(self, workflow_type: WorkflowAnswerType) -> list[dict[str, str]]:
        rows: list[dict[str, str]] = []
        for boundary_id in self._policy.required_boundary_statement_ids(workflow_type):
            rows.append(
                {
                    "boundary_id": boundary_id,
                    "canonical_text": self._policy.canonical_boundary_text(boundary_id),
                }
            )
        return rows

    def sanitize_assembly_evaluation_for_api(
        self, assembly_evaluation: dict[str, Any] | None
    ) -> dict[str, Any] | None:
        if assembly_evaluation is None:
            return None
        sanitized = _strip_chunk_text_value(copy.deepcopy(assembly_evaluation))
        if isinstance(sanitized, dict):
            sanitized["chunk_text_stripped_for_api"] = True
            sanitized["hardening_phase"] = "Phase 2m"
        return sanitized

    def sanitize_alpha_response_for_api(self, payload: dict[str, Any]) -> dict[str, Any]:
        sanitized = copy.deepcopy(payload)
        sanitized["assembly_evaluation"] = self.sanitize_assembly_evaluation_for_api(
            sanitized.get("assembly_evaluation")
        )
        sanitized["hardening_phase"] = "Phase 2m"
        sanitized["chunk_text_stripped_for_api"] = True
        return sanitized

    def _internal_citation_refs(self, retrieval_bundle_preview: dict[str, Any]) -> list[dict[str, Any]]:
        refs: list[dict[str, Any]] = []
        for candidate in retrieval_bundle_preview.get("citation_candidates", [])[:5]:
            refs.append(
                {
                    "source_type": candidate.get("source_type"),
                    "source_id": candidate.get("source_id"),
                    "chunk_index": candidate.get("chunk_index"),
                    "internal_chunk_id": candidate.get("internal_chunk_id"),
                    "citation_label": candidate.get("citation_label"),
                    "citation_candidate": candidate.get("citation_candidate"),
                    "human_review_required": candidate.get("human_review_required"),
                    "for_internal_checking_only": True,
                }
            )
        return refs

    def _internal_alpha_answer_text(
        self,
        *,
        workflow_type: WorkflowAnswerType,
        boundary_wording: list[dict[str, str]],
        citation_refs: list[dict[str, Any]],
        assembly_evaluation: dict[str, Any],
    ) -> str:
        lines = [
            INTERNAL_ALPHA_LABEL,
            "",
            "This is internal founder/admin testing only. Not for live use, providers, staff or public users.",
            "",
            "Governance visibility:",
            f"- named sign-off artefact present: {assembly_evaluation.get('completed_signoff_artefact_present')}",
            f"- any source signed off: {assembly_evaluation.get('any_source_signed_off')}",
            f"- NR-1 remains open: {assembly_evaluation.get('nr_1_remains_open')}",
            f"- public promise remains blocked: {assembly_evaluation.get('public_promise_remains_blocked')}",
            "- public live source-grounded answers enabled: False",
            "- Phase 2j hard public block remains active: True",
            "",
            "Required boundary wording:",
        ]
        for row in boundary_wording:
            lines.append(f"- {row['canonical_text']}")
        for line in REQUIRED_INTERNAL_BOUNDARY_LINES:
            lines.append(f"- {line}")
        lines.extend(
            [
                "",
                PROFESSIONAL_JUDGEMENT_REMINDER,
                "",
                "Internal citation references for checking only:",
            ]
        )
        if citation_refs:
            for ref in citation_refs:
                lines.append(
                    f"- {ref.get('source_type')} / {ref.get('internal_chunk_id')} / "
                    f"{ref.get('citation_label')} (candidate={ref.get('citation_candidate')})"
                )
        else:
            lines.append("- No citation candidates available in this preview.")
        lines.extend(
            [
                "",
                "Assembly evaluation remains blocked for public live use.",
                "No LLM call was made in this Phase 2l alpha path.",
            ]
        )
        return "\n".join(lines)

    def evaluate_internal_alpha(
        self,
        *,
        user: dict[str, Any] | None,
        workflow_type: WorkflowAnswerType,
        query: str = "",
        answer_text: str = "",
        include_secondary_source_types: list | None = None,
        boundary_statement_ids_present: list[str] | None = None,
        escalation_prompt_ids_present: list[str] | None = None,
        proposed_signoffs: dict | None = None,
        public_promise_claim_made: bool = False,
        nr_1_cleared_for_wiring: bool = False,
    ) -> dict[str, Any]:
        access = self.check_access(user)
        flags = self.feature_flag_status()

        if not access["access_allowed"]:
            return {
                "phase": "Phase 2l",
                "scope": "founder-only internal source-grounded alpha (blocked)",
                "internal_alpha_label": INTERNAL_ALPHA_LABEL,
                "internal_alpha_access_allowed": False,
                "internal_alpha_mode_enabled": False,
                "access_status": access,
                "feature_flags": flags,
                "public_source_grounded_answers_enabled": False,
                "live_source_grounded_answers_enabled": False,
                "hard_live_enablement_block_active": True,
                "source_grounded_assembly_allowed": False,
                "source_chunks_sent_to_llm": False,
                "source_citations_returned_to_user": False,
                "llm_called": False,
                "sent_to_live_orb_answers": False,
                "blocked_reason": access["blocked_reason"],
                "citation_candidates_for_internal_checking": [],
                "required_boundary_wording": [],
                "internal_alpha_answer_text": None,
                "assembly_evaluation": None,
                "governance_visibility": self.build_governance_visibility(),
                "audit_logged": False,
            }

        assembly = self._assembly.evaluate_source_grounded_assembly(
            workflow_type=workflow_type,
            query=query,
            answer_text=answer_text,
            include_secondary_source_types=include_secondary_source_types,
            boundary_statement_ids_present=boundary_statement_ids_present,
            escalation_prompt_ids_present=escalation_prompt_ids_present,
            proposed_signoffs=proposed_signoffs,
            public_promise_claim_made=public_promise_claim_made,
            nr_1_cleared_for_wiring=nr_1_cleared_for_wiring,
        )
        retrieval_preview = assembly.get("retrieval_bundle_preview", {})
        boundary_wording = self._boundary_wording_for_workflow(workflow_type)
        citation_refs = self._internal_citation_refs(retrieval_preview)
        internal_text = self._internal_alpha_answer_text(
            workflow_type=workflow_type,
            boundary_wording=boundary_wording,
            citation_refs=citation_refs,
            assembly_evaluation=assembly,
        )

        return self.sanitize_alpha_response_for_api(
            {
                "phase": "Phase 2l",
                "scope": "founder-only internal source-grounded alpha (evaluation only)",
                "internal_alpha_label": INTERNAL_ALPHA_LABEL,
                "internal_alpha_access_allowed": True,
                "internal_alpha_mode_enabled": True,
                "access_status": access,
                "feature_flags": flags,
                "workflow_type": workflow_type,
                "public_source_grounded_answers_enabled": False,
                "live_source_grounded_answers_enabled": False,
                "hard_live_enablement_block_active": True,
                "source_grounded_assembly_allowed": False,
                "source_chunks_sent_to_llm": False,
                "source_citations_returned_to_user": False,
                "llm_called": False,
                "sent_to_live_orb_answers": False,
                "blocked_reason": assembly.get("blocked_reason"),
                "required_boundary_wording": boundary_wording,
                "required_internal_boundary_lines": list(REQUIRED_INTERNAL_BOUNDARY_LINES),
                "professional_judgement_reminder": PROFESSIONAL_JUDGEMENT_REMINDER,
                "citation_candidates_for_internal_checking": citation_refs,
                "internal_alpha_answer_text": internal_text,
                "assembly_evaluation": assembly,
                "governance_visibility": self.build_governance_visibility(),
                "audit_logged": True,
                "claims_not_made": {
                    "legal_advice": False,
                    "statutory_compliance_decision": False,
                    "regulation_40_decision": False,
                    "notification_threshold_decision": False,
                    "ofsted_grade_prediction": False,
                    "inspection_readiness_decision": False,
                    "good_or_outstanding_confirmation": False,
                    "compliance_guarantee": False,
                    "ofsted_ready": False,
                    "independent_signoff_completed": False,
                    "final_source_signoff_completed": False,
                },
            }
        )

    def build_governance_visibility(self) -> dict[str, Any]:
        summary = self._assembly.governance_summary()
        signoff = self._assembly.signoff_gate()
        return {
            "named_signoff_artefact_present": signoff.signoff_artefact_path().is_file(),
            "template_artefact_present": signoff.signoff_template_path().is_file(),
            "all_sources_signed_off": all(
                signoff.source_signoff_status(source_type)["signed_off"]  # type: ignore[arg-type]
                for source_type in ("guide", "regulations_2015", "sccif")
            ),
            "nr_1_remains_open": summary.get("nr_1_remains_open", True),
            "public_promise_remains_blocked": summary.get("public_promise_remains_blocked", True),
            "public_live_source_grounded_answers_enabled": False,
            "phase_2j_hard_public_block_remains_active": True,
        }

    def build_status(self) -> dict[str, Any]:
        return {
            "phase": "Phase 2l",
            "scope": "founder-only internal source-grounded alpha",
            "internal_alpha_label": INTERNAL_ALPHA_LABEL,
            "feature_flags": self.feature_flag_status(),
            "governance_visibility": self.build_governance_visibility(),
            "assembly_governance_summary": self._assembly.governance_summary(),
            "workflow_types": list(self._assembly.workflow_types()),
            "public_source_grounded_answers_enabled": False,
            "evaluation_only_no_llm": True,
        }


orb_residential_source_grounded_alpha_service = OrbResidentialSourceGroundedAlphaService()
