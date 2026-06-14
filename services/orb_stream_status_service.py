"""SSE stream status messages for ORB standalone conversation (perceived speed)."""

from __future__ import annotations

import re
from typing import Any

# User-facing status copy only — no backend architecture labels.
USER_STATUS_THINKING = "Thinking…"
USER_STATUS_PREPARING_GUIDANCE = "Preparing guidance…"
USER_STATUS_SAFEST_STEPS = "Checking the safest next steps…"
USER_STATUS_RECORDING_POINTS = "Preparing recording points…"
USER_STATUS_BUILDING_ANSWER = "Building the answer…"
USER_STATUS_STRUCTURING = "Structuring this safely…"

_STRUCTURED_PLAN_RE = re.compile(
    r"\b(action plan|improvement plan|reg\s*44|reg44|evidence summary|handover plan)\b",
    re.I,
)


def stream_status_payload(
    stage: str,
    *,
    message: str | None = None,
    expert_depth: str | None = None,
) -> dict[str, Any]:
    """Build SSE status payload. expert_depth is kept for client routing logic only."""
    payload: dict[str, Any] = {"type": "status", "stage": stage}
    if message:
        payload["message"] = message
    if expert_depth:
        payload["expert_depth"] = expert_depth
    return payload


def stream_status_sequence(expert_depth: str, *, message: str | None = None) -> list[dict[str, Any]]:
    """Ordered status events after `received` for residential/deep paths."""
    depth = (expert_depth or "general_light").strip().lower()
    if depth == "general_light":
        return []

    structured_plan = bool(message and _STRUCTURED_PLAN_RE.search(message))
    structuring = (
        [
            stream_status_payload(
                "structuring",
                message=USER_STATUS_STRUCTURING,
                expert_depth=depth,
            )
        ]
        if structured_plan
        else []
    )

    if depth == "safeguarding_critical":
        return [
            *structuring,
            stream_status_payload(
                "safety_check",
                message=USER_STATUS_SAFEST_STEPS,
                expert_depth=depth,
            ),
            stream_status_payload(
                "building_answer",
                message=USER_STATUS_BUILDING_ANSWER,
                expert_depth=depth,
            ),
        ]

    if depth == "residential_deep":
        return [
            *structuring,
            stream_status_payload(
                "safety_check",
                message=USER_STATUS_SAFEST_STEPS,
                expert_depth=depth,
            ),
            stream_status_payload(
                "building_answer",
                message=USER_STATUS_BUILDING_ANSWER,
                expert_depth=depth,
            ),
        ]

    if depth == "residential_standard":
        return [
            *structuring,
            stream_status_payload(
                "preparing_guidance",
                message=USER_STATUS_PREPARING_GUIDANCE,
                expert_depth=depth,
            ),
            stream_status_payload(
                "recording_points",
                message=USER_STATUS_RECORDING_POINTS,
                expert_depth=depth,
            ),
        ]

    # residential_light and other residential-ish depths
    return [
        *structuring,
        stream_status_payload(
            "preparing_guidance",
            message=USER_STATUS_PREPARING_GUIDANCE,
            expert_depth=depth,
        ),
    ]


def delayed_thinking_status(expert_depth: str) -> dict[str, Any] | None:
    """Optional delayed status for general_light when generation is slow."""
    depth = (expert_depth or "general_light").strip().lower()
    if depth != "general_light":
        return None
    return stream_status_payload("thinking", message=USER_STATUS_THINKING, expert_depth=depth)
