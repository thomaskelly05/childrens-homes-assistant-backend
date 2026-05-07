from __future__ import annotations

"""Multi-thread continuity for IndiCare Assistant.

This module prepares safe summaries across conversation threads so the assistant
can behave like ChatGPT/Copilot while preserving the hard boundary:
- User preferences and task continuity may carry across threads.
- OS evidence, child/home facts and record citations must not become long-term memory.
- OS threads may resume using current scoped evidence only, not old chat wording as evidence.
"""

from dataclasses import dataclass, field
from typing import Any

from assistant.conversation_continuity import build_conversation_continuity, serialise_conversation_continuity
from assistant.user_memory_policy import assess_memory_candidates, serialise_memory_policy_result


@dataclass(frozen=True)
class ThreadSummary:
    thread_id: str
    title: str
    assistant_surface: str
    summary: str
    last_user_intent: str
    safe_memory_candidates: list[dict[str, Any]] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class MultiThreadContinuityResult:
    assistant_surface: str
    thread_count: int
    current_thread: dict[str, Any]
    prior_threads: list[ThreadSummary] = field(default_factory=list)
    safe_memory: dict[str, Any] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_surface(value: Any) -> str:
    text = _safe_string(value).lower()
    if text in {"standalone", "os_embedded"}:
        return text
    return "standalone"


def _thread_id(thread: dict[str, Any], index: int) -> str:
    return _safe_string(thread.get("thread_id") or thread.get("conversation_id") or thread.get("id") or f"thread-{index}")


def _thread_title(thread: dict[str, Any], index: int) -> str:
    return _safe_string(thread.get("title") or thread.get("name") or f"Conversation {index}")


def _history(thread: dict[str, Any]) -> list[dict[str, Any]]:
    history = thread.get("messages") or thread.get("history")
    return history if isinstance(history, list) else []


def _last_user_intent(history: list[dict[str, Any]]) -> str:
    for item in reversed(history):
        if not isinstance(item, dict):
            continue
        if _safe_string(item.get("role")).lower() == "user":
            return _safe_string(item.get("content") or item.get("message") or item.get("text"))[:280]
    return ""


def _summary_from_history(*, history: list[dict[str, Any]], assistant_surface: str) -> tuple[str, list[str]]:
    continuity = build_conversation_continuity(
        history=history,
        assistant_surface=assistant_surface,
        max_items=6,
    )
    payload = serialise_conversation_continuity(continuity)
    return _safe_string(payload.get("summary")), list(payload.get("warnings") or [])


def _memory_candidates_from_thread(thread: dict[str, Any]) -> list[dict[str, Any]]:
    raw = thread.get("memory_candidates") or thread.get("safe_memory_candidates") or []
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    return []


def _safe_memory_dict(candidates: list[dict[str, Any]]) -> tuple[dict[str, Any], list[str]]:
    result = assess_memory_candidates(candidates)
    payload = serialise_memory_policy_result(result)
    memory: dict[str, Any] = {}
    for item in payload.get("safe_to_store", []):
        if isinstance(item, dict):
            key = _safe_string(item.get("key"))
            value = _safe_string(item.get("value"))
            if key and value:
                memory[key] = value
    return memory, list(payload.get("warnings") or [])


def build_multi_thread_continuity(
    *,
    current_thread: dict[str, Any] | None,
    prior_threads: list[dict[str, Any]] | None = None,
    assistant_surface: str = "standalone",
    max_prior_threads: int = 6,
) -> MultiThreadContinuityResult:
    surface = _normalise_surface(assistant_surface)
    current = current_thread if isinstance(current_thread, dict) else {}
    priors = prior_threads if isinstance(prior_threads, list) else []

    warnings: list[str] = []
    current_history = _history(current)
    current_summary, current_warnings = _summary_from_history(history=current_history, assistant_surface=surface)
    warnings.extend(current_warnings)

    thread_summaries: list[ThreadSummary] = []
    all_memory_candidates: list[dict[str, Any]] = []

    safe_limit = max(0, min(int(max_prior_threads), 20))
    for index, thread in enumerate(priors[-safe_limit:], start=1):
        if not isinstance(thread, dict):
            continue

        thread_surface = _normalise_surface(thread.get("assistant_surface") or surface)
        if thread_surface != surface:
            warnings.append("skipped_thread_with_different_assistant_surface")
            continue

        history = _history(thread)
        summary, thread_warnings = _summary_from_history(history=history, assistant_surface=surface)
        warnings.extend(thread_warnings)

        candidates = _memory_candidates_from_thread(thread)
        all_memory_candidates.extend(candidates)

        thread_summaries.append(
            ThreadSummary(
                thread_id=_thread_id(thread, index),
                title=_thread_title(thread, index),
                assistant_surface=thread_surface,
                summary=summary,
                last_user_intent=_last_user_intent(history),
                safe_memory_candidates=candidates,
                warnings=thread_warnings,
            )
        )

    current_candidates = _memory_candidates_from_thread(current)
    all_memory_candidates.extend(current_candidates)
    safe_memory, memory_warnings = _safe_memory_dict(all_memory_candidates)
    warnings.extend(memory_warnings)

    return MultiThreadContinuityResult(
        assistant_surface=surface,
        thread_count=1 + len(thread_summaries),
        current_thread={
            "thread_id": _thread_id(current, 0),
            "title": _thread_title(current, 0),
            "summary": current_summary,
            "last_user_intent": _last_user_intent(current_history),
        },
        prior_threads=thread_summaries,
        safe_memory=safe_memory,
        warnings=sorted(set(warnings)),
    )


def serialise_multi_thread_continuity(result: MultiThreadContinuityResult) -> dict[str, Any]:
    return {
        "assistant_surface": result.assistant_surface,
        "thread_count": result.thread_count,
        "current_thread": result.current_thread,
        "safe_memory": result.safe_memory,
        "warnings": result.warnings,
        "prior_threads": [
            {
                "thread_id": item.thread_id,
                "title": item.title,
                "assistant_surface": item.assistant_surface,
                "summary": item.summary,
                "last_user_intent": item.last_user_intent,
                "safe_memory_candidates": item.safe_memory_candidates,
                "warnings": item.warnings,
            }
            for item in result.prior_threads
        ],
    }


def build_multi_thread_continuity_prompt_block(result: MultiThreadContinuityResult) -> str:
    lines = [
        "MULTI-THREAD CONTINUITY CONTEXT",
        "Use this only for task continuity, preferences and follow-up awareness.",
        "Do not treat prior conversation wording as OS evidence or child/home record evidence.",
        f"Assistant surface: {result.assistant_surface}. Threads considered: {result.thread_count}.",
        "",
    ]

    current_summary = _safe_string(result.current_thread.get("summary"))
    if current_summary:
        lines.append("Current thread summary:")
        lines.append(current_summary)
        lines.append("")

    if result.prior_threads:
        lines.append("Prior related threads:")
        for thread in result.prior_threads[:6]:
            if not thread.summary and not thread.last_user_intent:
                continue
            lines.append(f"- {thread.title}: {thread.last_user_intent or thread.summary[:240]}")

    if result.safe_memory:
        lines.append("")
        lines.append("Safe user preferences:")
        for key in sorted(result.safe_memory):
            lines.append(f"- {key}: {result.safe_memory[key]}")

    if result.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in result.warnings[:10]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
