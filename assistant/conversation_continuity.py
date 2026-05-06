from __future__ import annotations

"""Conversation continuity helpers for the IndiCare Assistant.

Goal:
- Make follow-up answers feel continuous like ChatGPT/Copilot/Gemini.
- Keep continuity safe for children’s residential care.
- Never use old conversation context as evidence of something in the OS record.
- Keep standalone and OS continuity separate.
"""

from dataclasses import dataclass, field
from typing import Any


MAX_CONTINUITY_ITEMS = 8
MAX_ITEM_CHARS = 420


@dataclass(frozen=True)
class ContinuityItem:
    role: str
    content: str


@dataclass(frozen=True)
class ConversationContinuity:
    assistant_surface: str
    summary: str
    items: list[ContinuityItem] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_role(value: Any) -> str:
    role = _safe_string(value).lower()
    if role in {"user", "assistant", "system"}:
        return role
    return ""


def _clip_text(value: Any, limit: int = MAX_ITEM_CHARS) -> str:
    text = " ".join(_safe_string(value).split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].strip() + "..."


def _message_content(item: dict[str, Any]) -> str:
    return _safe_string(
        item.get("content")
        or item.get("message")
        or item.get("text")
        or item.get("answer")
    )


def normalise_history_items(
    history: list[dict[str, Any]] | None,
    *,
    max_items: int = MAX_CONTINUITY_ITEMS,
    include_system: bool = False,
) -> list[ContinuityItem]:
    if not isinstance(history, list):
        return []

    safe_max = max(1, min(int(max_items), 16))
    result: list[ContinuityItem] = []

    for raw in history[-safe_max:]:
        if not isinstance(raw, dict):
            continue

        role = _normalise_role(raw.get("role"))
        if not role:
            continue
        if role == "system" and not include_system:
            continue

        content = _clip_text(_message_content(raw))
        if not content:
            continue

        result.append(ContinuityItem(role=role, content=content))

    return result


def _looks_like_os_context(text: str) -> bool:
    lowered = _safe_string(text).lower()
    return any(
        term in lowered
        for term in (
            "[incident:",
            "[daily_note:",
            "[handover:",
            "[risk:",
            "[task:",
            "young person:",
            "home:",
            "scope type:",
            "operational record context",
            "evidence index",
        )
    )


def build_continuity_summary(
    items: list[ContinuityItem],
    *,
    assistant_surface: str,
) -> tuple[str, list[str]]:
    if not items:
        return "", []

    warnings: list[str] = []
    lines = [
        "CONVERSATION CONTINUITY",
        "Use this only to understand the user’s follow-up question and preferred format.",
    ]

    if assistant_surface == "os_embedded":
        lines.append("Do not treat previous chat wording as OS evidence; only scoped evidence/source refs prove record facts.")
    else:
        lines.append("Standalone continuity must not imply access to IndiCare OS records.")

    lines.append("")
    lines.append("Recent thread:")

    for item in items:
        if assistant_surface == "standalone" and _looks_like_os_context(item.content):
            warnings.append("standalone_history_contains_possible_os_context")
            continue

        label = "User" if item.role == "user" else "Assistant" if item.role == "assistant" else "System"
        lines.append(f"- {label}: {item.content}")

    if len(lines) <= 5:
        return "", warnings

    return "\n".join(lines).strip(), warnings


def build_conversation_continuity(
    *,
    history: list[dict[str, Any]] | None,
    assistant_surface: str,
    max_items: int = MAX_CONTINUITY_ITEMS,
) -> ConversationContinuity:
    items = normalise_history_items(history, max_items=max_items)
    summary, warnings = build_continuity_summary(
        items,
        assistant_surface=assistant_surface,
    )

    return ConversationContinuity(
        assistant_surface=assistant_surface,
        summary=summary,
        items=items,
        warnings=warnings,
    )


def serialise_conversation_continuity(continuity: ConversationContinuity) -> dict[str, Any]:
    return {
        "assistant_surface": continuity.assistant_surface,
        "summary": continuity.summary,
        "item_count": len(continuity.items),
        "items": [
            {
                "role": item.role,
                "content": item.content,
            }
            for item in continuity.items
        ],
        "warnings": continuity.warnings,
    }
