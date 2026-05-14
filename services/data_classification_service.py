from __future__ import annotations

from typing import Any

from schemas.data_protection import DataClassification, DataProtectionMetadata


DOCUMENT_TYPE_CLASSIFICATIONS: dict[str, DataClassification] = {
    "reg44": DataClassification.LEGAL_REGULATORY,
    "reg44_report": DataClassification.LEGAL_REGULATORY,
    "reg45": DataClassification.LEGAL_REGULATORY,
    "reg45_report": DataClassification.LEGAL_REGULATORY,
    "care_plan": DataClassification.CONFIDENTIAL_CHILD,
    "placement_plan": DataClassification.CONFIDENTIAL_CHILD,
    "risk_assessment": DataClassification.SAFEGUARDING_SENSITIVE,
    "safeguarding": DataClassification.SAFEGUARDING_SENSITIVE,
    "missing_from_care": DataClassification.SAFEGUARDING_SENSITIVE,
    "health": DataClassification.HEALTH_SENSITIVE,
    "health_plan": DataClassification.HEALTH_SENSITIVE,
    "medication": DataClassification.HEALTH_SENSITIVE,
    "education": DataClassification.EDUCATION_SENSITIVE,
    "education_plan": DataClassification.EDUCATION_SENSITIVE,
    "pep": DataClassification.EDUCATION_SENSITIVE,
    "staff_supervision": DataClassification.CONFIDENTIAL_STAFF,
    "staff_record": DataClassification.CONFIDENTIAL_STAFF,
    "assistant_transcript": DataClassification.AI_RESTRICTED,
}

RECORD_TYPE_DEFAULTS: dict[str, DataClassification] = {
    "young_person": DataClassification.CONFIDENTIAL_CHILD,
    "young_person_profile": DataClassification.CONFIDENTIAL_CHILD,
    "profile": DataClassification.CONFIDENTIAL_CHILD,
    "daily_note": DataClassification.CONFIDENTIAL_CHILD,
    "daily_notes": DataClassification.CONFIDENTIAL_CHILD,
    "chronology": DataClassification.CONFIDENTIAL_CHILD,
    "safeguarding": DataClassification.SAFEGUARDING_SENSITIVE,
    "incident": DataClassification.SAFEGUARDING_SENSITIVE,
    "health": DataClassification.HEALTH_SENSITIVE,
    "medication": DataClassification.HEALTH_SENSITIVE,
    "education": DataClassification.EDUCATION_SENSITIVE,
    "staff": DataClassification.CONFIDENTIAL_STAFF,
    "staff_record": DataClassification.CONFIDENTIAL_STAFF,
    "reg44": DataClassification.LEGAL_REGULATORY,
    "reg45": DataClassification.LEGAL_REGULATORY,
    "report": DataClassification.LEGAL_REGULATORY,
    "document": DataClassification.EXPORT_RESTRICTED,
    "assistant_transcript": DataClassification.AI_RESTRICTED,
    "assistant_query": DataClassification.AI_RESTRICTED,
    "orb_memory": DataClassification.AI_RESTRICTED,
}

AI_RESTRICTED_CLASSIFICATIONS = {
    DataClassification.SAFEGUARDING_SENSITIVE,
    DataClassification.HEALTH_SENSITIVE,
    DataClassification.HIGHLY_SENSITIVE,
    DataClassification.AI_RESTRICTED,
}

EXPORT_RESTRICTED_CLASSIFICATIONS = {
    DataClassification.SAFEGUARDING_SENSITIVE,
    DataClassification.HEALTH_SENSITIVE,
    DataClassification.LEGAL_REGULATORY,
    DataClassification.HIGHLY_SENSITIVE,
    DataClassification.EXPORT_RESTRICTED,
}


def normalise_key(value: Any) -> str:
    return str(value or "").strip().lower().replace("-", "_").replace(" ", "_")


def classify_record_type(record_type: str | None) -> DataClassification:
    key = normalise_key(record_type)
    return RECORD_TYPE_DEFAULTS.get(key, DataClassification.INTERNAL_OPERATIONAL)


def classify_document_type(document_type: str | None, *, title: str | None = None) -> DataClassification:
    key = normalise_key(document_type)
    if key in DOCUMENT_TYPE_CLASSIFICATIONS:
        return DOCUMENT_TYPE_CLASSIFICATIONS[key]

    title_key = normalise_key(title)
    combined = f"{key} {title_key}"
    if any(term in combined for term in ("safeguard", "risk", "missing", "incident", "exploitation", "lado")):
        return DataClassification.SAFEGUARDING_SENSITIVE
    if any(term in combined for term in ("health", "medication", "medical", "camhs")):
        return DataClassification.HEALTH_SENSITIVE
    if any(term in combined for term in ("education", "school", "pep")):
        return DataClassification.EDUCATION_SENSITIVE
    if any(term in combined for term in ("reg44", "reg_44", "reg45", "ofsted", "inspection")):
        return DataClassification.LEGAL_REGULATORY
    if any(term in combined for term in ("staff", "supervision", "adult")):
        return DataClassification.CONFIDENTIAL_STAFF
    return DataClassification.CONFIDENTIAL_CHILD


def highest_classification(*classifications: DataClassification | None) -> DataClassification:
    priority = [
        DataClassification.PUBLIC_SYSTEM,
        DataClassification.INTERNAL_OPERATIONAL,
        DataClassification.CONFIDENTIAL_STAFF,
        DataClassification.CONFIDENTIAL_CHILD,
        DataClassification.EDUCATION_SENSITIVE,
        DataClassification.HEALTH_SENSITIVE,
        DataClassification.LEGAL_REGULATORY,
        DataClassification.SAFEGUARDING_SENSITIVE,
        DataClassification.EXPORT_RESTRICTED,
        DataClassification.AI_RESTRICTED,
        DataClassification.HIGHLY_SENSITIVE,
    ]
    rank = {item: index for index, item in enumerate(priority)}
    safe_values = [item for item in classifications if item is not None]
    if not safe_values:
        return DataClassification.INTERNAL_OPERATIONAL
    return max(safe_values, key=lambda item: rank.get(item, 0))


def metadata_for_record(
    record_type: str,
    *,
    row: dict[str, Any] | None = None,
    classification: DataClassification | None = None,
    reason: str | None = None,
) -> DataProtectionMetadata:
    row = row or {}
    resolved = classification or (
        classify_document_type(row.get("document_type") or row.get("category"), title=row.get("title"))
        if normalise_key(record_type) in {"document", "statutory_document", "child_document"}
        else classify_record_type(record_type)
    )
    return DataProtectionMetadata(
        classification=resolved,
        record_type=record_type,
        provider_id=_safe_int(row.get("provider_id")),
        home_id=_safe_int(row.get("home_id")),
        young_person_id=_safe_int(row.get("young_person_id")),
        staff_id=_safe_int(row.get("staff_id") or row.get("adult_id")),
        ai_restricted=resolved in AI_RESTRICTED_CLASSIFICATIONS,
        export_restricted=resolved in EXPORT_RESTRICTED_CLASSIFICATIONS,
        reason=reason,
    )


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        return int(value)
    except Exception:
        return None
