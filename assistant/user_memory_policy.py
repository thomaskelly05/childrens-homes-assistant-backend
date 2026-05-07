from __future__ import annotations

"""Long-term memory policy for IndiCare Assistant.

This module decides what may be remembered about a user across conversations.
Hard rule:
- Remember user preferences, role and safe workflow choices.
- Never store child-specific, home-specific or operational OS evidence as long-term user memory.
"""

from dataclasses import dataclass, field
from typing import Any


SAFE_MEMORY_KEYS = {
    "preferred_tone",
    "preferred_format",
    "preferred_language",
    "role",
    "job_title",
    "writing_style",
    "common_outputs",
    "default_response_depth",
    "accessibility_preferences",
    "training_focus",
}

FORBIDDEN_MEMORY_TERMS = {
    "young person",
    "child name",
    "child's name",
    "childs name",
    "home name",
    "incident",
    "daily note",
    "handover",
    "risk assessment",
    "care plan",
    "placement plan",
    "safeguarding record",
    "medical record",
    "education record",
    "family contact",
    "reg45 evidence",
    "reg 45 evidence",
    "ofsted evidence",
    "[incident:",
    "[daily_note:",
    "[handover:",
    "[risk:",
    "[task:",
}


@dataclass(frozen=True)
class MemoryCandidate:
    key: str
    value: str
    reason: str


@dataclass(frozen=True)
class MemoryPolicyResult:
    safe_to_store: list[MemoryCandidate] = field(default_factory=list)
    rejected: list[MemoryCandidate] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_key(value: Any) -> str:
    return _safe_string(value).lower().replace(" ", "_")


def _contains_forbidden_content(value: str) -> bool:
    text = _safe_string(value).lower()
    return any(term in text for term in FORBIDDEN_MEMORY_TERMS)


def assess_memory_candidates(candidates: list[dict[str, Any]] | None) -> MemoryPolicyResult:
    if not isinstance(candidates, list):
        return MemoryPolicyResult(warnings=["no_memory_candidates_supplied"])

    safe: list[MemoryCandidate] = []
    rejected: list[MemoryCandidate] = []
    warnings: list[str] = []

    for raw in candidates:
        if not isinstance(raw, dict):
            continue

        key = _normalise_key(raw.get("key"))
        value = _safe_string(raw.get("value"))
        reason = _safe_string(raw.get("reason")) or "User preference or workflow memory."

        candidate = MemoryCandidate(key=key, value=value, reason=reason)

        if not key or not value:
            rejected.append(candidate)
            warnings.append("memory_candidate_missing_key_or_value")
            continue

        if key not in SAFE_MEMORY_KEYS:
            rejected.append(candidate)
            warnings.append("memory_key_not_allowed")
            continue

        if _contains_forbidden_content(value):
            rejected.append(candidate)
            warnings.append("memory_candidate_contains_os_or_child_specific_content")
            continue

        safe.append(candidate)

    return MemoryPolicyResult(
        safe_to_store=safe,
        rejected=rejected,
        warnings=sorted(set(warnings)),
    )


def serialise_memory_policy_result(result: MemoryPolicyResult) -> dict[str, Any]:
    return {
        "safe_to_store": [
            {
                "key": item.key,
                "value": item.value,
                "reason": item.reason,
            }
            for item in result.safe_to_store
        ],
        "rejected": [
            {
                "key": item.key,
                "value": item.value,
                "reason": item.reason,
            }
            for item in result.rejected
        ],
        "warnings": result.warnings,
    }


def build_memory_prompt_block(existing_memory: dict[str, Any] | None) -> str:
    if not isinstance(existing_memory, dict) or not existing_memory:
        return ""

    lines = [
        "SAFE USER MEMORY CONTEXT",
        "Use this only for preferences, role and formatting continuity.",
        "Do not treat memory as OS evidence or child/home record evidence.",
        "",
    ]

    for key in sorted(existing_memory):
        normalised_key = _normalise_key(key)
        if normalised_key not in SAFE_MEMORY_KEYS:
            continue
        value = _safe_string(existing_memory.get(key))
        if not value or _contains_forbidden_content(value):
            continue
        lines.append(f"- {normalised_key}: {value}")

    if len(lines) <= 4:
        return ""

    return "\n".join(lines).strip()
