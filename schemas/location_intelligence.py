from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class LocationCategory(StrEnum):
    SCHOOL = "school"
    PARK = "park"
    SHOPPING_CENTRE = "shopping centre"
    FAST_FOOD = "fast food"
    TRAIN_STATION = "train station"
    BUS_STATION = "bus station"
    GP_SURGERY = "GP surgery"
    HOSPITAL = "hospital"
    CAMHS = "CAMHS"
    POLICE_STATION = "police station"
    YOUTH_CENTRE = "youth centre"
    FAMILY_ADDRESS = "family address"
    KNOWN_SAFE_LOCATION = "known safe location"
    KNOWN_CONCERN_LOCATION = "known concern location"
    EXPLOITATION_HOTSPOT = "exploitation hotspot"
    KNOWN_MISSING_RETURN_LOCATION = "known missing return location"
    TRANSPORT_ROUTE = "transport route"
    PEER_ASSOCIATE_AREA = "peer/associate area"


class ReviewRiskLevel(StrEnum):
    LOW = "low"
    MONITOR = "monitor"
    REVIEW = "review"
    PRIORITY_REVIEW = "priority_review"


class LocationIntelligence(BaseModel):
    location_id: str
    name: str
    category: LocationCategory | str
    description: str | None = None
    address: str | None = None
    postcode: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    distance_from_home: str | None = None
    travel_time_estimate: str | None = None
    risk_level: ReviewRiskLevel | str = ReviewRiskLevel.MONITOR
    protective_value: str | None = None
    linked_children: list[int | str] = Field(default_factory=list)
    linked_incidents: list[int | str] = Field(default_factory=list)
    linked_missing_episodes: list[int | str] = Field(default_factory=list)
    linked_safeguarding_records: list[int | str] = Field(default_factory=list)
    linked_professionals: list[int | str] = Field(default_factory=list)
    evidence_refs: list[dict[str, Any]] = Field(default_factory=list)
    last_reviewed_at: str | None = None
    review_required: bool = True
    source_type: str = "record_metadata"
    source_confidence: str = "limited"
    review_notes: str | None = None


class LocalityAssessment(BaseModel):
    assessment_type: str
    scope: dict[str, Any] = Field(default_factory=dict)
    generated_at: str
    summary: str
    locations: list[LocationIntelligence] = Field(default_factory=list)
    protective_resources: list[dict[str, Any]] = Field(default_factory=list)
    locality_concerns: list[dict[str, Any]] = Field(default_factory=list)
    evidence_gaps: list[dict[str, Any]] = Field(default_factory=list)
    manager_review_prompts: list[dict[str, Any]] = Field(default_factory=list)
    review_schedule: list[dict[str, Any]] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    decision_support_notice: str


class DynamicRiskDomain(BaseModel):
    domain: str
    current_level: ReviewRiskLevel | str = ReviewRiskLevel.MONITOR
    trend: str = "monitor"
    evidence: list[dict[str, Any]] = Field(default_factory=list)
    chronology_links: list[int | str] = Field(default_factory=list)
    known_triggers: list[str] = Field(default_factory=list)
    known_locations: list[str] = Field(default_factory=list)
    staff_guidance: list[str] = Field(default_factory=list)
    actions: list[dict[str, Any]] = Field(default_factory=list)
    protective_factors: list[str] = Field(default_factory=list)
    last_reviewed: str | None = None
    review_required: bool = True


class DocumentCatalogueItem(BaseModel):
    document_type: str
    category: str
    owner: str
    linked_child_home_staff: str
    linked_regulation: list[str] = Field(default_factory=list)
    linked_standard: list[str] = Field(default_factory=list)
    review_frequency: str
    evidence_requirements: list[str] = Field(default_factory=list)
    last_reviewed: str | None = None
    next_review: str | None = None
    missing_incomplete_status: str = "not_checked"
    evidence_sufficiency: str = "not_checked"
    qa_state: str = "not_checked"
    signoff_state: str = "not_checked"
    linked_chronology: list[int | str] = Field(default_factory=list)
    linked_actions: list[int | str] = Field(default_factory=list)
    linked_incidents: list[int | str] = Field(default_factory=list)
    linked_safeguarding: list[int | str] = Field(default_factory=list)
    linked_reports: list[int | str] = Field(default_factory=list)
