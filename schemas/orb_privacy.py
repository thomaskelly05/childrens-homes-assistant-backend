"""ORB Residential privacy request schemas."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

OrbPrivacyRequestType = Literal[
    "delete-my-orb-data",
    "export-my-orb-data",
    "privacy-question",
    "privacy-concern",
]

OrbPrivacyRequestStatus = Literal["submitted", "reviewing", "completed", "rejected"]


class OrbPrivacyRequestCreate(BaseModel):
    request_type: OrbPrivacyRequestType = Field(alias="requestType")
    summary: str = Field(min_length=8, max_length=800)

    model_config = {"populate_by_name": True}


class OrbPrivacyRequestResponse(BaseModel):
    id: str
    user_id: int | None = Field(default=None, alias="userId")
    request_type: OrbPrivacyRequestType = Field(alias="requestType")
    summary: str
    status: OrbPrivacyRequestStatus
    created_at: str = Field(alias="createdAt")
    updated_at: str = Field(alias="updatedAt")
    reviewed_by: str | None = Field(default=None, alias="reviewedBy")
    review_notes: str | None = Field(default=None, alias="reviewNotes")

    model_config = {"populate_by_name": True}
