"""ORB Residential founder-only source-grounded alpha — Phase 2l API models."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from services.orb_residential_source_answer_policy import SourceTypeKey, WorkflowAnswerType


class OrbSourceGroundedAlphaEvaluateRequest(BaseModel):
    workflow_type: WorkflowAnswerType
    query: str = ""
    answer_text: str = ""
    include_secondary_source_types: list[SourceTypeKey] | None = None
    boundary_statement_ids_present: list[str] | None = None
    escalation_prompt_ids_present: list[str] | None = None
    proposed_signoffs: dict[str, dict[str, Any]] | None = None
    public_promise_claim_made: bool = False
    nr_1_cleared_for_wiring: bool = False


class OrbSourceGroundedAlphaAccessStatus(BaseModel):
    authenticated: bool
    role: str | None = None
    role_allowed: bool = False
    alpha_enabled: bool = False
    public_source_grounded_enabled: bool = False
    access_allowed: bool = False
    blocked_reason: str | None = None
