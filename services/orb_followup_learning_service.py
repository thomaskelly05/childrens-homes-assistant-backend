"""Classify follow-up questions for learning taxonomy."""

from __future__ import annotations

from typing import Any

CLASSIFICATIONS = (
    "missing_escalation_clarity",
    "missing_recording_clarity",
    "missing_safeguarding_threshold_clarity",
    "missing_manager_oversight",
    "missing_child_voice",
    "missing_plan_update",
    "missing_ofsted_evidence",
    "missing_source_citation",
    "adult_confidence_gap",
    "workflow_gap",
    "policy_gap",
    "training_need",
    "scenario_not_covered",
)

_PATTERNS: list[tuple[tuple[str, ...], str]] = [
    (("tell police", "call police", "999"), "missing_escalation_clarity"),
    (("what do i write", "how do i record", "wording"), "missing_recording_clarity"),
    (("referral", "threshold", "lado", "section"), "missing_safeguarding_threshold_clarity"),
    (("manager", "on-call", "who do i tell"), "missing_manager_oversight"),
    (("child said", "their words", "voice"), "missing_child_voice"),
    (("update plan", "risk plan", "care plan"), "missing_plan_update"),
    (("ofsted evidence", "inspection", "reg 44"), "missing_ofsted_evidence"),
    (("source", "citation", "where does it say"), "missing_source_citation"),
    (("not sure", "confident", "scared to"), "adult_confidence_gap"),
    (("workflow", "system", "indicare"), "workflow_gap"),
    (("policy", "procedure"), "policy_gap"),
    (("training", "learn how"), "training_need"),
]


class OrbFollowupLearningService:
    def classify(
        self,
        initial_message: str,
        follow_up_message: str,
    ) -> dict[str, Any]:
        lower = str(follow_up_message or "").lower()
        initial_lower = str(initial_message or "").lower()
        tags: list[str] = []
        for phrases, tag in _PATTERNS:
            if any(p in lower for p in phrases):
                if tag not in tags:
                    tags.append(tag)
        if not tags:
            tags.append("scenario_not_covered")
        return {
            "classifications": tags,
            "primary": tags[0],
            "initial_context_hint": initial_lower[:120],
            "learning_tags": tags,
        }


orb_followup_learning_service = OrbFollowupLearningService()
