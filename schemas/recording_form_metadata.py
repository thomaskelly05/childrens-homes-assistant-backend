"""Universal care-record metadata for recording workspace drafts and signed-off records."""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

RecordingFormMetadataSource = Literal["recording_workspace", "manager_review", "formal_submit", "import"]
RecordingFormMetadataStatus = Literal[
    "draft",
    "ready_for_review",
    "submitted",
    "signed_off",
    "archived",
    "read_only",
]

ArchiveBehaviour = Literal["signed_off_only", "restricted_summary", "draft_never", "not_applicable"]
ChronologyBehaviour = Literal["create_story_event", "link_only", "restricted_summary", "not_applicable"]
PlanImpactBehaviour = Literal[
    "health_plan",
    "education_plan",
    "risk_assessment",
    "family_time_plan",
    "behaviour_support_plan",
    "medication_plan",
    "missing_plan",
    "safeguarding_plan",
    "none",
]
LifeEchoBehaviour = Literal["positive_safe_only", "never_auto", "review_required", "not_applicable"]
FormalRouteClassification = Literal[
    "SUPPORTED_NOW",
    "REVIEW_THEN_SUPPORTED",
    "DRAFT_ONLY",
    "ROUTE_HINT_ONLY",
    "NEEDS_FORMAL_BACKEND",
]

SCCIF_EVIDENCE_DISCLAIMER = (
    "May support evidence for inspection themes — not a compliance or grading statement."
)


class RecordingFormLifecycleBehaviour(BaseModel):
    model_config = ConfigDict(extra="ignore")

    archive_behaviour: ArchiveBehaviour = "signed_off_only"
    chronology_behaviour: ChronologyBehaviour = "create_story_event"
    plan_impact_behaviour: PlanImpactBehaviour = "none"
    lifeecho_behaviour: LifeEchoBehaviour = "review_required"


class RecordingFormSccifAlignment(BaseModel):
    model_config = ConfigDict(extra="ignore")

    quality_standards: list[str] = Field(default_factory=list)
    sccif_evidence_areas: list[str] = Field(default_factory=list)
    regulatory_relevance: list[str] = Field(default_factory=list)
    inspection_evidence_type: str | None = None
    alignment_note: str = SCCIF_EVIDENCE_DISCLAIMER


class RecordingFormTherapeuticFlags(BaseModel):
    model_config = ConfigDict(extra="ignore")

    child_voice_prompt: str = "What was the child communicating?"
    adult_response_prompt: str = "What did adults notice and do to help?"
    actions_follow_up_prompt: str = "What follow-up or actions are needed?"
    plan_impact_check_prompt: str = "Does this affect a plan or risk assessment?"
    review_check_prompt: str = "Does this need manager or safeguarding review?"
    language_guidance: list[str] = Field(default_factory=list)


class RecordingFormMetadata(BaseModel):
    """Canonical metadata block stored in draft.metadata.form_record or top-level fields."""

    model_config = ConfigDict(extra="ignore")

    record_date: date | None = None
    event_date: date | None = None
    event_time: str | None = None
    written_by_user_id: str | None = None
    written_by_name: str | None = None
    written_by_role: str | None = None
    created_at: datetime | str | None = None
    updated_at: datetime | str | None = None
    last_edited_by_user_id: str | None = None
    last_edited_by_name: str | None = None
    reviewed_by_user_id: str | None = None
    reviewed_by_name: str | None = None
    reviewed_at: datetime | str | None = None
    signed_off_by_user_id: str | None = None
    signed_off_by_name: str | None = None
    signed_off_at: datetime | str | None = None
    child_id: int | None = None
    home_id: int | None = None
    form_id: str | None = None
    form_type: str | None = None
    category: str | None = None
    source: RecordingFormMetadataSource = "recording_workspace"
    status: RecordingFormMetadataStatus = "draft"
    review_status: str | None = None
    manager_review_required: bool = False
    safeguarding_review_required: bool = False
    privacy_sensitive: bool = False
    therapeutic_flags: RecordingFormTherapeuticFlags = Field(default_factory=RecordingFormTherapeuticFlags)
    child_voice_present: bool | None = None
    adult_response_present: bool | None = None
    actions_required: bool | None = None
    chronology_event_id: str | None = None
    archive_record_id: str | None = None
    plan_impact_ids: list[str] = Field(default_factory=list)
    lifeecho_suggestion_ids: list[str] = Field(default_factory=list)
    lifecycle: RecordingFormLifecycleBehaviour = Field(default_factory=RecordingFormLifecycleBehaviour)
    sccif_alignment: RecordingFormSccifAlignment = Field(default_factory=RecordingFormSccifAlignment)
    formal_route_classification: FormalRouteClassification = "DRAFT_ONLY"
    formal_route_hint: str | None = None
    formal_route_warning: str | None = None
    structured_template_id: str | None = None
    is_signed_off: bool = False
    is_editable: bool = True
    editability_note: str | None = None


def merge_form_metadata(
    existing: dict[str, Any] | None,
    patch: dict[str, Any],
) -> dict[str, Any]:
    """Shallow-merge form_record metadata preserving nested therapeutic_flags."""
    base = dict(existing or {})
    form_record = dict(base.get("form_record") or {})
    for key, value in patch.items():
        if key == "therapeutic_flags" and isinstance(value, dict):
            merged_flags = dict(form_record.get("therapeutic_flags") or {})
            merged_flags.update(value)
            form_record["therapeutic_flags"] = merged_flags
        elif key == "lifecycle" and isinstance(value, dict):
            merged_lifecycle = dict(form_record.get("lifecycle") or {})
            merged_lifecycle.update(value)
            form_record["lifecycle"] = merged_lifecycle
        elif key == "sccif_alignment" and isinstance(value, dict):
            merged_sccif = dict(form_record.get("sccif_alignment") or {})
            merged_sccif.update(value)
            form_record["sccif_alignment"] = merged_sccif
        else:
            form_record[key] = value
    base["form_record"] = form_record
    return base


def default_metadata_for_form(
    *,
    form_id: str,
    form_type: str,
    category: str | None,
    child_id: int | None = None,
    home_id: int | None = None,
    written_by_user_id: str | None = None,
    written_by_name: str | None = None,
    written_by_role: str | None = None,
    manager_review_required: bool = False,
    safeguarding_review_required: bool = False,
    privacy_sensitive: bool = False,
    lifecycle: RecordingFormLifecycleBehaviour | None = None,
    sccif_alignment: RecordingFormSccifAlignment | None = None,
    formal_route_classification: FormalRouteClassification = "DRAFT_ONLY",
) -> dict[str, Any]:
    """Build metadata dict suitable for draft.metadata."""
    today = date.today().isoformat()
    meta = RecordingFormMetadata(
        record_date=date.today(),
        event_date=date.today(),
        written_by_user_id=written_by_user_id,
        written_by_name=written_by_name,
        written_by_role=written_by_role,
        child_id=child_id,
        home_id=home_id,
        form_id=form_id,
        form_type=form_type,
        category=category,
        manager_review_required=manager_review_required,
        safeguarding_review_required=safeguarding_review_required,
        privacy_sensitive=privacy_sensitive,
        lifecycle=lifecycle or RecordingFormLifecycleBehaviour(),
        sccif_alignment=sccif_alignment or RecordingFormSccifAlignment(),
        formal_route_classification=formal_route_classification,
        is_editable=True,
        editability_note=None,
    )
    return {"form_record": meta.model_dump(mode="json")}
