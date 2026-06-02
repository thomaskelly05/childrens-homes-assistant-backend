from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OrbShiftBuilderFocus = Literal[
    "full_shift_plan",
    "handover_only",
    "manager_review",
    "safeguarding_review",
    "recording_quality",
    "end_of_shift_reflection",
    "what_am_i_missing",
]

# Legacy prompt-pack modes (backward compatible).
OrbShiftBuilderLegacyMode = Literal[
    "full_shift_pack",
    "daily_note",
    "handover",
    "incident_review",
    "safeguarding_review",
    "manager_review",
    "therapeutic_reflection",
    "missing_information",
]


class OrbShiftBuilderRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    notes: str = Field(..., min_length=1, max_length=50000)
    mode: OrbShiftBuilderLegacyMode = "full_shift_pack"
    child_context: str | None = Field(default=None, max_length=8000)
    staff_role: str | None = Field(default=None, max_length=120)
    include_ofsted_lens: bool = True
    include_manager_prompts: bool = True


class OrbShiftBuilderGenerateRequest(BaseModel):
    """Structured Shift Builder generation from user-supplied notes only."""

    model_config = ConfigDict(extra="ignore")

    shift_notes: str = Field(..., min_length=1, max_length=50000)
    handover_text: str | None = Field(default=None, max_length=50000)
    chat_output: str | None = Field(default=None, max_length=50000)
    context_tags: list[str] = Field(default_factory=list, max_length=24)
    focus: OrbShiftBuilderFocus = "full_shift_plan"
    child_context: str | None = Field(default=None, max_length=8000)
    staff_role: str | None = Field(default=None, max_length=120)
    context: dict[str, Any] = Field(default_factory=dict)


class OrbShiftBuilderSection(BaseModel):
    title: str
    purpose: str
    prompt: str
    output_type: str
    caution: str | None = None


class OrbShiftBuilderOutputSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    heading: str
    body: str
    items: list[str] = Field(default_factory=list)


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


class OrbShiftBuilderGenerateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    success: bool = True
    title: str
    focus: OrbShiftBuilderFocus
    summary: str
    sections: list[OrbShiftBuilderOutputSection]
    checklist: list[str] = Field(default_factory=list)
    actions: list[dict[str, Any]] = Field(default_factory=list)
    risks_or_gaps: list[str] = Field(default_factory=list)
    suggested_next_actions: list[dict[str, str]] = Field(default_factory=list)
    answer: str = ""
    standalone: bool = True
    os_records_accessed: bool = False
    live_record_access: bool = False
    os_linked: bool = False
    brain_metadata: dict[str, Any] = Field(default_factory=dict)
    guardrails: list[str] = Field(default_factory=list)
