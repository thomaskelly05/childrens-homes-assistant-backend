"""ORB Residential named human sign-off gate — Phase 2g/2i.

Defines deterministic sign-off requirements for Guide, Regulations 2015 and
SCCIF children's homes before live source-grounded answers can be enabled.
Phase 2i adds governed schema/template validation. This module does not perform
sign-off, enable live wiring, change runtime answer behaviour, alter routes,
or change frontend behaviour.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scripts.verify_orb_named_source_signoffs import (
    SIGNOFF_ARTEFACT_PATH,
    SIGNOFF_TEMPLATE_PATH,
    SOURCE_CHECKSUM_EXPECTATIONS,
    SOURCE_TYPE_TO_ID,
    is_template_payload,
    is_template_record,
    required_boolean_fields,
    validate_signoff_record as verify_signoff_record,
)
from services.orb_residential_source_answer_policy import (
    SourceTypeKey,
    orb_residential_source_answer_policy_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]

REQUIRED_TEXT_FIELDS: tuple[str, ...] = (
    "reviewer_name",
    "reviewer_role",
    "reviewer_organisation",
    "review_date",
    "review_scope",
    "signature_attestation",
    "created_at",
)

LIVE_WIRING_BLOCKED_REASON = (
    "Phase 2i defines named human sign-off schema and template only. No committed "
    "named sign-off artefacts exist, runtime enforcement is not wired into live "
    "answer assembly, per-source runtime_answer_wiring_enabled remains false, NR-1 "
    "remains open, and public promise remains blocked."
)


class OrbResidentialSourceSignoffGate:
    """Deterministic named human sign-off gate for ORB Residential sources."""

    def __init__(
        self,
        artefact_path: Path = SIGNOFF_ARTEFACT_PATH,
        template_path: Path = SIGNOFF_TEMPLATE_PATH,
    ) -> None:
        self._artefact_path = artefact_path
        self._template_path = template_path
        self._policy = orb_residential_source_answer_policy_service

    def policy_service(self):
        return self._policy

    def signoff_artefact_path(self) -> Path:
        return self._artefact_path

    def signoff_template_path(self) -> Path:
        return self._template_path

    def source_types(self) -> tuple[SourceTypeKey, ...]:
        return self._policy.source_type_keys()

    def required_confirmations(self, source_type: SourceTypeKey) -> tuple[str, ...]:
        return required_boolean_fields(source_type)

    def signoff_requirements(self, source_type: SourceTypeKey) -> dict[str, Any]:
        expectations = SOURCE_CHECKSUM_EXPECTATIONS[source_type]
        return {
            "source_type": source_type,
            "source_id": SOURCE_TYPE_TO_ID[source_type],
            "required_text_fields": list(REQUIRED_TEXT_FIELDS),
            "required_boolean_confirmations": list(self.required_confirmations(source_type)),
            "expected_chunk_checksum": expectations["chunk_checksum"],
            "expected_source_checksum": expectations.get("source_checksum"),
            "synthetic_review_not_sufficient": True,
            "named_human_signoff_required_before_live_use": True,
            "signoff_artefact_required": True,
            "template_ignored_by_runtime": True,
            "completed_signoff_artefact_path": str(self._artefact_path),
            "template_artefact_path": str(self._template_path),
        }

    def all_signoff_requirements(self) -> dict[SourceTypeKey, dict[str, Any]]:
        return {source_type: self.signoff_requirements(source_type) for source_type in self.source_types()}

    def template_is_ignored_by_runtime(self) -> bool:
        return True

    def _load_committed_signoffs(self) -> dict[str, dict[str, Any]]:
        if not self._artefact_path.is_file():
            return {}
        if self._artefact_path.resolve() == self._template_path.resolve():
            return {}
        payload = json.loads(self._artefact_path.read_text(encoding="utf-8"))
        if is_template_payload(payload):
            return {}
        signoffs = payload.get("signoffs")
        if not isinstance(signoffs, dict):
            return {}
        committed: dict[str, dict[str, Any]] = {}
        for key, value in signoffs.items():
            if not isinstance(value, dict):
                continue
            if is_template_record(value):
                continue
            committed[str(key)] = dict(value)
        return committed

    def committed_signoff_record(self, source_type: SourceTypeKey) -> dict[str, Any] | None:
        signoffs = self._load_committed_signoffs()
        record = signoffs.get(source_type)
        if not record:
            return None
        if verify_signoff_record(source_type, record):
            return None
        return dict(record)

    def is_source_signed_off(self, source_type: SourceTypeKey) -> bool:
        return self.committed_signoff_record(source_type) is not None

    def validate_signoff_record(self, source_type: SourceTypeKey, record: dict[str, Any]) -> list[str]:
        return verify_signoff_record(source_type, record)

    def evaluate_signoff_record(self, source_type: SourceTypeKey, record: dict[str, Any]) -> dict[str, Any]:
        errors = self.validate_signoff_record(source_type, record)
        return {
            "source_type": source_type,
            "source_id": SOURCE_TYPE_TO_ID[source_type],
            "signoff_complete": not errors,
            "validation_errors": errors,
            "synthetic_review_rejected_as_sufficient": record.get("synthetic_review_rejected_as_sufficient") is True,
            "live_wiring_enabled_by_signoff_alone": False,
            "signoff_enables_live_wiring": False,
        }

    def source_signoff_status(self, source_type: SourceTypeKey) -> dict[str, Any]:
        committed = self.committed_signoff_record(source_type)
        return {
            "source_type": source_type,
            "source_id": SOURCE_TYPE_TO_ID[source_type],
            "named_human_signoff_required": True,
            "committed_signoff_exists": committed is not None,
            "signed_off": committed is not None,
            "signed_off_record": committed,
            "signoff_artefact_path": str(self._artefact_path),
            "signoff_artefact_present": self._artefact_path.is_file(),
            "signoff_template_path": str(self._template_path),
            "signoff_template_present": self._template_path.is_file(),
            "template_ignored_by_runtime": True,
            "requirements": self.signoff_requirements(source_type),
            "synthetic_review_not_sufficient": True,
            "live_wiring_allowed_via_signoff": False,
        }

    def all_source_signoff_status(self) -> dict[SourceTypeKey, dict[str, Any]]:
        return {source_type: self.source_signoff_status(source_type) for source_type in self.source_types()}

    def live_wiring_allowed(self) -> bool:
        return False

    def live_wiring_blocked_reason(self) -> str:
        return LIVE_WIRING_BLOCKED_REASON

    def governance_summary(self) -> dict[str, Any]:
        statuses = self.all_source_signoff_status()
        return {
            "phase": "Phase 2i",
            "scope": "named human sign-off gate",
            "all_sources_require_named_signoff": True,
            "any_source_signed_off": any(status["signed_off"] for status in statuses.values()),
            "all_sources_signed_off": all(status["signed_off"] for status in statuses.values()),
            "synthetic_review_not_sufficient": True,
            "template_ignored_by_runtime": True,
            "completed_signoff_artefact_present": self._artefact_path.is_file(),
            "template_artefact_present": self._template_path.is_file(),
            "live_wiring_allowed": self.live_wiring_allowed(),
            "signoff_enables_live_wiring_alone": False,
            "runtime_answer_behaviour_changed": False,
            "route_frontend_or_os_assistant_files_changed": False,
            "guide_chunks_changed": False,
            "regulations_chunks_changed": False,
            "sccif_chunks_changed": False,
            "nr_1_remains_open": True,
            "public_promise_remains_blocked": True,
        }


orb_residential_source_signoff_gate = OrbResidentialSourceSignoffGate()
