from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class OrbShiftBuilderRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    notes: str = Field(..., min_length=1, max_length=50000)
    mode: Literal[
        "full_shift_pack",
        "daily_note",
        "handover",
        "incident_review",
        "safeguarding_review",
        "manager_review",
        "therapeutic_reflection",
        "missing_information",
    ] = "full_shift_pack"
    child_context: str | None = Field(default=None, max_length=8000)
    staff_role: str | None = Field(default=None, max_length=120)
    include_ofsted_lens: bool = True
    include_manager_prompts: bool = True


class OrbShiftBuilderSection(BaseModel):
    title: str
    purpose: str
    prompt: str
    output_type: str
    caution: str | None = None


class OrbShiftBuilderResponse(BaseModel):
    success: bool = True
    surface: str = "orb_residential"
    live_record_access: bool = False
    os_linked: bool = False
    mode: str
    sections: list[OrbShiftBuilderSection]
    context_packet: dict[str, Any]
    guardrails: list[str]
    next_step_hint: str
