"""ORB Residential closed-pilot feedback schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

OrbPilotFeatureUsed = Literal["chat", "dictate", "write", "voice", "export", "report", "other"]


class OrbPilotFeedbackCreate(BaseModel):
    pilot_id: str | None = Field(default=None, alias="pilotId")
    feature_used: OrbPilotFeatureUsed = Field(alias="featureUsed")
    task_type: str | None = Field(default=None, alias="taskType", max_length=200)
    time_saved_minutes: int | None = Field(default=None, alias="timeSavedMinutes", ge=0, le=240)
    record_quality_rating: int | None = Field(default=None, alias="recordQualityRating", ge=1, le=5)
    child_voice_rating: int | None = Field(default=None, alias="childVoiceRating", ge=1, le=5)
    therapeutic_language_rating: int | None = Field(
        default=None, alias="therapeuticLanguageRating", ge=1, le=5
    )
    staff_confidence_rating: int | None = Field(default=None, alias="staffConfidenceRating", ge=1, le=5)
    manager_oversight_rating: int | None = Field(default=None, alias="managerOversightRating", ge=1, le=5)
    safeguarding_prompt_rating: int | None = Field(
        default=None, alias="safeguardingPromptRating", ge=1, le=5
    )
    would_use_again: bool | None = Field(default=None, alias="wouldUseAgain")
    what_helped_the_child: str | None = Field(default=None, alias="whatHelpedTheChild", max_length=600)
    what_worked_well: str | None = Field(default=None, alias="whatWorkedWell", max_length=600)
    what_felt_unsafe_or_unhelpful: str | None = Field(
        default=None, alias="whatFeltUnsafeOrUnhelpful", max_length=600
    )
    improvement_suggestion: str | None = Field(default=None, alias="improvementSuggestion", max_length=600)
    bug_or_friction: str | None = Field(default=None, alias="bugOrFriction", max_length=600)

    model_config = {"populate_by_name": True}


class OrbPilotFeedbackResponse(BaseModel):
    id: str
    pilot_id: str | None = Field(default=None, alias="pilotId")
    user_id: int | None = Field(default=None, alias="userId")
    role: str | None = None
    feature_used: OrbPilotFeatureUsed = Field(alias="featureUsed")
    task_type: str | None = Field(default=None, alias="taskType")
    time_saved_minutes: int | None = Field(default=None, alias="timeSavedMinutes")
    record_quality_rating: int | None = Field(default=None, alias="recordQualityRating")
    child_voice_rating: int | None = Field(default=None, alias="childVoiceRating")
    therapeutic_language_rating: int | None = Field(default=None, alias="therapeuticLanguageRating")
    staff_confidence_rating: int | None = Field(default=None, alias="staffConfidenceRating")
    manager_oversight_rating: int | None = Field(default=None, alias="managerOversightRating")
    safeguarding_prompt_rating: int | None = Field(default=None, alias="safeguardingPromptRating")
    would_use_again: bool | None = Field(default=None, alias="wouldUseAgain")
    what_helped_the_child: str | None = Field(default=None, alias="whatHelpedTheChild")
    what_worked_well: str | None = Field(default=None, alias="whatWorkedWell")
    what_felt_unsafe_or_unhelpful: str | None = Field(default=None, alias="whatFeltUnsafeOrUnhelpful")
    improvement_suggestion: str | None = Field(default=None, alias="improvementSuggestion")
    bug_or_friction: str | None = Field(default=None, alias="bugOrFriction")
    created_at: str = Field(alias="createdAt")

    model_config = {"populate_by_name": True}
