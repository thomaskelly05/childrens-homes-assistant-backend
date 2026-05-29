from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

OrbFeedbackRating = Literal["up", "down"]

OrbFeedbackReason = Literal[
    "helpful",
    "too_generic",
    "missed_safeguarding",
    "missed_child_voice",
    "missed_ofsted_reg44",
    "missed_manager_oversight",
    "missed_risk",
    "missed_recording",
    "missed_nvq_learning",
    "wrong_tone",
    "too_long",
    "too_short",
    "unsafe",
    "incorrect_source",
    "not_practical",
    "wrong_role",
    "other",
]

ORB_FEEDBACK_DOWN_REASONS: tuple[str, ...] = (
    "too_generic",
    "missed_safeguarding",
    "missed_child_voice",
    "missed_ofsted_reg44",
    "missed_manager_oversight",
    "missed_risk",
    "missed_recording",
    "missed_nvq_learning",
    "wrong_tone",
    "too_long",
    "too_short",
    "unsafe",
    "incorrect_source",
    "not_practical",
    "wrong_role",
    "other",
)

ORB_FEEDBACK_SCENARIO_LOOP_REASONS: frozenset[str] = frozenset(
    {
        "missed_safeguarding",
        "missed_child_voice",
        "missed_manager_oversight",
        "missed_ofsted_reg44",
        "missed_nvq_learning",
        "incorrect_source",
    }
)


class OrbFeedbackSubmitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message_id: str = Field(..., min_length=1, max_length=128)
    conversation_id: str | None = Field(default=None, max_length=128)
    rating: OrbFeedbackRating
    reason: OrbFeedbackReason | None = None
    comment: str | None = Field(default=None, max_length=4000)
    answer_snapshot: str | None = Field(default=None, max_length=12000)
    question_snapshot: str | None = Field(default=None, max_length=8000)
    mode: str | None = Field(default=None, max_length=64)
    profile_role: str | None = Field(default=None, max_length=64)
    prompt_tier: str | None = Field(default=None, max_length=32)
    detected_family: str | None = Field(default=None, max_length=128)
    secondary_families: list[str] = Field(default_factory=list)
    source_anchors: list[str] = Field(default_factory=list)
    action_id: str | None = Field(default=None, max_length=128)
    document_lens: str | None = Field(default=None, max_length=64)
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrbFeedbackRecord(BaseModel):
    id: int | str
    user_id: int | None = None
    message_id: str
    conversation_id: str | None = None
    rating: OrbFeedbackRating
    reason: str | None = None
    comment: str | None = None
    answer_snapshot: str | None = None
    question_snapshot: str | None = None
    mode: str | None = None
    profile_role: str | None = None
    prompt_tier: str | None = None
    detected_family: str | None = None
    secondary_families: list[str] = Field(default_factory=list)
    source_anchors: list[str] = Field(default_factory=list)
    action_id: str | None = None
    document_lens: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: str | None = None
    reviewed: bool = False
    reviewed_by: int | None = None
    reviewed_at: str | None = None
    reviewer_note: str | None = None


class OrbFeedbackSubmitResponse(BaseModel):
    ok: bool = True
    feedback_id: int | str
    message: str = "Thanks — feedback recorded for ORB improvement review."


class OrbImprovementCandidate(BaseModel):
    candidate_id: str
    candidate_type: str
    status: str = "pending"
    source_feedback_ids: list[int | str]
    proposed_change: dict[str, Any]
    affected_family: str | None = None
    affected_action: str | None = None
    affected_source: str | None = None
    affected_role: str | None = None
    reason_count: int = 1
    confidence: float = 0.5
    review_required: bool = True
    created_at: str | None = None
    updated_at: str | None = None
    reviewed_by: int | None = None
    reviewed_at: str | None = None
    reviewer_note: str | None = None


class OrbFeedbackSummaryResponse(BaseModel):
    total_feedback: int
    thumbs_up: int
    thumbs_down: int
    thumbs_up_ratio: float
    helpful_ratio: float | None = None
    top_reasons: list[dict[str, Any]]
    top_downvote_reasons: list[dict[str, Any]] = Field(default_factory=list)
    top_scenario_families: list[dict[str, Any]]
    top_scenario_families_with_downvotes: list[dict[str, Any]] = Field(default_factory=list)
    top_actions_with_downvotes: list[dict[str, Any]]
    top_modes_with_downvotes: list[dict[str, Any]] = Field(default_factory=list)
    top_document_lenses_with_downvotes: list[dict[str, Any]] = Field(default_factory=list)
    recurring_gaps: list[dict[str, Any]]
    source_issues: list[dict[str, Any]]
    source_citation_complaints: int = 0
    unsafe_answer_complaints: int = 0
    role_fit_complaints: int = 0
    downvotes_this_week: int = 0
    cost_this_month: float = 0
    estimated_usage_this_month: int = 0
    suggested_improvement_candidates: list[OrbImprovementCandidate]
    improvement_candidates: list[OrbImprovementCandidate] = Field(default_factory=list)
    usage_summary: dict[str, Any] = Field(default_factory=dict)


class OrbCandidateReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reviewer_note: str | None = Field(default=None, max_length=2000)


class OrbFeedbackMarkReviewedRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reviewer_note: str | None = Field(default=None, max_length=2000)
