from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field

from schemas.data_protection import DataClassification


class IntelligenceRecordType(StrEnum):
    YOUNG_PERSON = "young_person"
    HOME = "home"
    STAFF_ADULT = "staff_adult"
    DAILY_NOTE = "daily_note"
    INCIDENT = "incident"
    SAFEGUARDING_CONCERN = "safeguarding_concern"
    MISSING_EPISODE = "missing_episode"
    HEALTH_MEDICATION = "health_medication"
    EDUCATION = "education"
    FAMILY_TIME_CONTACT = "family_time_contact"
    KEYWORK_DIRECT_WORK = "keywork_direct_work"
    RISK_ASSESSMENT = "risk_assessment"
    ACTION = "action"
    EVIDENCE = "evidence"
    DOCUMENT = "document"
    REPORT = "report"
    CHRONOLOGY_EVENT = "chronology_event"
    ASSISTANT_INTERACTION = "orb_assistant_interaction"


class OperationalMetadata(BaseModel):
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    staff_id: int | None = None
    shift_id: int | str | None = None
    record_type: str
    event_type: str | None = None
    workflow_status: str | None = None
    source_record_id: int | str | None = None
    linked_action_ids: list[int | str] = Field(default_factory=list)
    linked_evidence_ids: list[int | str] = Field(default_factory=list)
    linked_document_ids: list[int | str] = Field(default_factory=list)
    linked_report_ids: list[int | str] = Field(default_factory=list)
    created_at: str | None = None
    updated_at: str | None = None


class CareMetadata(BaseModel):
    child_voice_present: bool = False
    child_voice_missing: bool = False
    emotional_wellbeing_present: bool = False
    trauma_informed_support: bool = False
    neurodiversity_adjustment: bool = False
    sensory_factor: bool = False
    health_present: bool = False
    education_present: bool = False
    sleep_present: bool = False
    family_contact_present: bool = False
    exercise_activity_present: bool = False
    relationship_present: bool = False
    regulation_support_present: bool = False
    behaviour_support_present: bool = False
    positive_progress_present: bool = False
    safeguarding_marker: bool = False
    risk_marker: bool = False
    exploitation_possible_indicator: bool = False
    missing_marker: bool = False
    incident_marker: bool = False
    follow_up_required: bool = False
    plan_update_suggested: bool = False
    risk_update_suggested: bool = False
    document_evidence_relevance: bool = False
    inspection_relevance: bool = False
    handover_relevance: bool = False
    manager_review_required: bool = False
    detected_signals: list[str] = Field(default_factory=list)
    record_quality_flags: list[str] = Field(default_factory=list)


class RegulatoryMetadata(BaseModel):
    quality_standard_ids: list[str] = Field(default_factory=list)
    children_home_regulation_ids: list[str] = Field(default_factory=list)
    sccif_area_ids: list[str] = Field(default_factory=list)
    evidence_strength: str = "limited"
    evidence_gap_ids: list[str] = Field(default_factory=list)
    inspection_relevance: str = "none"
    report_relevance: list[str] = Field(default_factory=list)
    reg44_relevance: bool = False
    reg45_relevance: bool = False
    lac_review_relevance: bool = False


class AIMetadata(BaseModel):
    sensitivity_classification: DataClassification = DataClassification.INTERNAL_OPERATIONAL
    ai_restricted: bool = True
    redaction_required: bool = True
    summarised: bool = False
    embedding_id: str | None = None
    retrieval_priority: str = "normal"
    last_ai_summary_at: str | None = None
    cache_key: str | None = None
    anonymised_reference: str | None = None
    external_ai_allowed: bool = False


class DataIntelligenceMetadata(BaseModel):
    operational: OperationalMetadata
    care: CareMetadata = Field(default_factory=CareMetadata)
    regulatory: RegulatoryMetadata = Field(default_factory=RegulatoryMetadata)
    ai: AIMetadata = Field(default_factory=AIMetadata)
    metadata_version: str = "2026-05-14.v1"
    extraction_method: str = "deterministic_rules"
    deterministic_confidence: float = 1.0


class IntelligenceRecord(BaseModel):
    id: int | str
    record_type: str
    title: str | None = None
    summary: str | None = None
    event_date: str | None = None
    metadata: DataIntelligenceMetadata
    citation_ref: str | None = None
    hidden: bool = False


class CitationSnippet(BaseModel):
    citation_ref: str
    record_type: str
    record_id: int | str
    title: str
    snippet: str
    event_date: str | None = None
    metadata_tags: list[str] = Field(default_factory=list)


class EvidencePack(BaseModel):
    question: str
    scope: dict[str, Any] = Field(default_factory=dict)
    relevant_metadata: dict[str, Any] = Field(default_factory=dict)
    citations: list[CitationSnippet] = Field(default_factory=list)
    cached_summaries: list[dict[str, Any]] = Field(default_factory=list)
    evidence_gaps: list[dict[str, Any]] = Field(default_factory=list)
    linked_actions: list[int | str] = Field(default_factory=list)
    regulatory_links: list[dict[str, Any]] = Field(default_factory=list)
    chronology_clusters: list[dict[str, Any]] = Field(default_factory=list)
    ai_required: bool = False
    external_ai_allowed: bool = False


class ChronologyCluster(BaseModel):
    cluster_id: str
    young_person_id: int | None = None
    home_id: int | None = None
    theme: str
    date_range: dict[str, str | None] = Field(default_factory=dict)
    summary: str
    supporting_event_ids: list[int | str] = Field(default_factory=list)
    linked_actions: list[int | str] = Field(default_factory=list)
    linked_evidence: list[int | str] = Field(default_factory=list)
    linked_regulations: list[str] = Field(default_factory=list)
    linked_sccif: list[str] = Field(default_factory=list)
    last_updated_at: str | None = None
    cache_key: str


class ProviderDataIntelligenceSettings(BaseModel):
    provider_id: int | None = None
    home_id: int | None = None
    external_ai_enabled: bool = False
    redaction_mode: str = "strict"
    allowed_ai_features: list[str] = Field(default_factory=lambda: ["metadata", "orb_text_fallback"])
    orb_enabled: bool = True
    realtime_voice_enabled: bool = False
    report_ai_drafting_enabled: bool = False
    premium_tts_enabled: bool = False
    data_retention_days: int | None = None
    local_policy_sources_enabled: bool = False
    transcript_storage: bool = False
    prompt_storage: bool = False
    demo_mode_disabled: bool = True
    inspection_readiness_enabled: bool = True
    metadata_extraction_enabled: bool = True


class ProviderAISettingsSourceBundle(BaseModel):
    """Effective settings plus per-field source metadata for admin APIs."""

    effective: ProviderDataIntelligenceSettings
    provider_level: ProviderDataIntelligenceSettings | None = None
    home_override: ProviderDataIntelligenceSettings | None = None
    env_defaults: ProviderDataIntelligenceSettings
    sources: dict[str, str] = Field(default_factory=dict)
    warnings: list[str] = Field(default_factory=list)
    db_available: bool = True


class CacheEntry(BaseModel):
    key: str
    value: dict[str, Any]
    provider_id: int | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    cache_type: str
    record_version: str | int | None = None
    metadata_version: str = "2026-05-14.v1"
    created_at: str


class AIUsageEvent(BaseModel):
    provider_id: int | None = None
    home_id: int | None = None
    feature: str
    model_tier: str
    tokens_estimated: int = 0
    cache_hit: bool = False
    realtime_voice_seconds: int = 0
    expensive_model: bool = False
    redaction_mode: str = "strict"
    external_call_blocked: bool = False
    workflow: str | None = None
