"""ORB Residential named human sign-off gate — Phase 2g.

Defines deterministic sign-off requirements for Guide, Regulations 2015 and
SCCIF children's homes before live source-grounded answers can be enabled.
This module does not perform sign-off, enable live wiring, change runtime
answer behaviour, alter routes, or change frontend behaviour.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scripts.verify_orb_guide_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_GUIDE_CHUNK_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)
from scripts.verify_orb_regulations_2015_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_REGULATIONS_CHUNK_SHA256,
    EXPECTED_SOURCE_FILE_SHA256 as EXPECTED_REGULATIONS_SOURCE_SHA256,
    REGULATIONS_CHUNKS_PATH,
    calculate_checksum as calculate_regulations_checksum,
    load_payload as load_regulations_payload,
)
from scripts.verify_orb_sccif_children_homes_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_SCCIF_CHUNK_SHA256,
    EXPECTED_SOURCE_FILE_SHA256 as EXPECTED_SCCIF_SOURCE_SHA256,
    SCCIF_CHUNKS_PATH,
    calculate_checksum as calculate_sccif_checksum,
    load_payload as load_sccif_payload,
)
from services.orb_residential_source_answer_policy import (
    SOURCE_TYPE_TO_ID,
    SourceTypeKey,
    orb_residential_source_answer_policy_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
SIGNOFF_ARTEFACT_PATH = (
    REPO_ROOT / "data" / "orb_residential_governance" / "named_source_signoffs.json"
)

BOOLEAN_CONFIRMATION_FIELDS: tuple[str, ...] = (
    "source_checksum_verified",
    "chunk_checksum_verified",
    "source_role_approved",
    "citation_policy_approved",
    "routing_policy_approved",
    "unsafe_output_blockers_approved",
    "boundary_statements_approved",
    "local_policy_limitation_acknowledged",
    "no_legal_advice_compliance_guarantee_acknowledged",
    "synthetic_review_rejected_as_sufficient",
    "nr_1_controls_confirmed",
    "public_promise_remains_blocked",
)

SCCIF_ONLY_CONFIRMATION_FIELDS: tuple[str, ...] = (
    "no_ofsted_grade_inspection_readiness_guarantee_acknowledged",
)

REQUIRED_TEXT_FIELDS: tuple[str, ...] = (
    "named_reviewer",
    "reviewer_role",
    "review_date",
)

SOURCE_CHECKSUM_EXPECTATIONS: dict[SourceTypeKey, dict[str, str]] = {
    "guide": {
        "chunk_checksum": EXPECTED_GUIDE_CHUNK_SHA256,
    },
    "regulations_2015": {
        "source_checksum": EXPECTED_REGULATIONS_SOURCE_SHA256,
        "chunk_checksum": EXPECTED_REGULATIONS_CHUNK_SHA256,
    },
    "sccif": {
        "source_checksum": EXPECTED_SCCIF_SOURCE_SHA256,
        "chunk_checksum": EXPECTED_SCCIF_CHUNK_SHA256,
    },
}

LIVE_WIRING_BLOCKED_REASON = (
    "Phase 2g defines named human sign-off and runtime enforcement requirements only. "
    "No committed named sign-off artefacts exist, runtime enforcement is not wired into "
    "live answer assembly, per-source runtime_answer_wiring_enabled remains false, NR-1 "
    "remains open, and public promise remains blocked."
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _current_chunk_checksum(source_type: SourceTypeKey) -> str:
    if source_type == "guide":
        return calculate_guide_checksum(load_guide_payload(GUIDE_CHUNKS_PATH))
    if source_type == "regulations_2015":
        return calculate_regulations_checksum(load_regulations_payload(REGULATIONS_CHUNKS_PATH))
    return calculate_sccif_checksum(load_sccif_payload(SCCIF_CHUNKS_PATH))


class OrbResidentialSourceSignoffGate:
    """Deterministic named human sign-off gate for ORB Residential sources."""

    def __init__(self, artefact_path: Path = SIGNOFF_ARTEFACT_PATH) -> None:
        self._artefact_path = artefact_path
        self._policy = orb_residential_source_answer_policy_service

    def policy_service(self):
        return self._policy

    def signoff_artefact_path(self) -> Path:
        return self._artefact_path

    def source_types(self) -> tuple[SourceTypeKey, ...]:
        return self._policy.source_type_keys()

    def required_confirmations(self, source_type: SourceTypeKey) -> tuple[str, ...]:
        fields = list(BOOLEAN_CONFIRMATION_FIELDS)
        if source_type == "sccif":
            fields.extend(SCCIF_ONLY_CONFIRMATION_FIELDS)
        return tuple(fields)

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
        }

    def all_signoff_requirements(self) -> dict[SourceTypeKey, dict[str, Any]]:
        return {source_type: self.signoff_requirements(source_type) for source_type in self.source_types()}

    def _load_committed_signoffs(self) -> dict[str, dict[str, Any]]:
        if not self._artefact_path.is_file():
            return {}
        payload = json.loads(self._artefact_path.read_text(encoding="utf-8"))
        signoffs = payload.get("signoffs")
        if not isinstance(signoffs, dict):
            return {}
        return {str(key): dict(value) for key, value in signoffs.items() if isinstance(value, dict)}

    def committed_signoff_record(self, source_type: SourceTypeKey) -> dict[str, Any] | None:
        signoffs = self._load_committed_signoffs()
        record = signoffs.get(source_type)
        if not record:
            return None
        if self.validate_signoff_record(source_type, record):
            return None
        return dict(record)

    def is_source_signed_off(self, source_type: SourceTypeKey) -> bool:
        return self.committed_signoff_record(source_type) is not None

    def validate_signoff_record(self, source_type: SourceTypeKey, record: dict[str, Any]) -> list[str]:
        errors: list[str] = []
        if _text(record.get("source_type")) and _text(record.get("source_type")) != source_type:
            errors.append(f"signoff source_type mismatch: expected {source_type}")

        for field in REQUIRED_TEXT_FIELDS:
            if not _text(record.get(field)):
                errors.append(f"missing {field}")

        for field in self.required_confirmations(source_type):
            if record.get(field) is not True:
                errors.append(f"missing or false confirmation: {field}")

        expectations = SOURCE_CHECKSUM_EXPECTATIONS[source_type]
        if record.get("chunk_checksum_verified") is True:
            current = _current_chunk_checksum(source_type)
            if current != expectations["chunk_checksum"]:
                errors.append("chunk checksum no longer matches verified artefact")
            declared = _text(record.get("declared_chunk_checksum"))
            if declared and declared != expectations["chunk_checksum"]:
                errors.append("declared_chunk_checksum does not match expected chunk checksum")

        if record.get("source_checksum_verified") is True and "source_checksum" in expectations:
            declared_source = _text(record.get("declared_source_checksum"))
            if declared_source and declared_source != expectations["source_checksum"]:
                errors.append("declared_source_checksum does not match expected source checksum")
        elif source_type == "guide" and record.get("source_checksum_verified") is True:
            # Guide is committed as a single chunk artefact; no separate source file checksum.
            pass

        if record.get("synthetic_review_rejected_as_sufficient") is not True:
            errors.append("synthetic review must be explicitly rejected as sufficient")

        if record.get("public_promise_remains_blocked") is not True:
            errors.append("public promise must remain blocked unless separately approved")

        return errors

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
            "phase": "Phase 2g",
            "scope": "named human sign-off gate",
            "all_sources_require_named_signoff": True,
            "any_source_signed_off": any(status["signed_off"] for status in statuses.values()),
            "all_sources_signed_off": all(status["signed_off"] for status in statuses.values()),
            "synthetic_review_not_sufficient": True,
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
