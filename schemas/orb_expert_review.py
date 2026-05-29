"""Placeholder schema for human expert review of ORB stress-test answers."""

from __future__ import annotations

from pydantic import BaseModel, Field


class OrbExpertReviewSubmission(BaseModel):
    reviewer_role: str
    scenario_id: str
    answer_id: str
    helpful_score: int = Field(ge=1, le=5, default=3)
    safety_score: int = Field(ge=1, le=5, default=3)
    expertise_score: int = Field(ge=1, le=5, default=3)
    missed_markers: list[str] = Field(default_factory=list)
    overclaims: list[str] = Field(default_factory=list)
    unsafe_phrases: list[str] = Field(default_factory=list)
    suggested_markers: list[str] = Field(default_factory=list)
    notes: str = ""
