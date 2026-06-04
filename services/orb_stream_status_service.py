"""SSE stream status messages for ORB standalone conversation (perceived speed)."""

from __future__ import annotations

from typing import Any

SAFEGUARDING_IMMEDIATE_OPENING = (
    "First, check immediate safety and follow your local safeguarding procedure. "
    "I'm preparing the full steps now."
)


def stream_status_payload(stage: str, *, message: str | None = None, expert_depth: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"type": "status", "stage": stage}
    if message:
        payload["message"] = message
    if expert_depth:
        payload["expert_depth"] = expert_depth
    return payload


def stream_status_sequence(expert_depth: str) -> list[dict[str, Any]]:
    """Ordered status events after `received` for residential/deep paths."""
    depth = (expert_depth or "general_light").strip().lower()
    if depth == "general_light":
        return []

    if depth == "safeguarding_critical":
        return [
            stream_status_payload(
                "safety_check",
                message="Checking immediate safety steps…",
                expert_depth=depth,
            ),
            stream_status_payload(
                "preparing_answer",
                message="Preparing answer…",
                expert_depth=depth,
            ),
        ]

    if depth == "residential_deep":
        return [
            stream_status_payload(
                "context_check",
                message="Checking safety, recording and oversight…",
                expert_depth=depth,
            ),
            stream_status_payload(
                "preparing_answer",
                message="Preparing answer…",
                expert_depth=depth,
            ),
        ]

    if depth == "residential_standard":
        return [
            stream_status_payload(
                "recording_gaps",
                message="Checking recording gaps…",
                expert_depth=depth,
            ),
            stream_status_payload(
                "preparing_answer",
                message="Preparing answer…",
                expert_depth=depth,
            ),
        ]

    # residential_light and other residential-ish depths
    return [
        stream_status_payload(
            "context_check",
            message="Checking context…",
            expert_depth=depth,
        ),
        stream_status_payload(
            "preparing_answer",
            message="Preparing answer…",
            expert_depth=depth,
        ),
    ]


def safeguarding_opening_token() -> str | None:
    return SAFEGUARDING_IMMEDIATE_OPENING
