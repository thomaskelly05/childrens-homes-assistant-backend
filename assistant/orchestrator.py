from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from assistant.assistant_engine import (
    AssistantRequest,
    AssistantRuntimeContext,
    build_assistant_prompt_package,
)
from assistant.response_planner import (
    GuidancePlan,
    ModelPlan,
    ResponsePlan,
    build_response_plan,
)

logger = logging.getLogger("indicare.orchestrator")


# ---------------------------------------------------------
# Public data structures
# ---------------------------------------------------------

@dataclass
class OrchestratorRequest:
    message: str
    session_id: str
    history: list[dict[str, Any]] = field(default_factory=list)
    role: str = "residential care staff"
    document_text: str | None = None
    document_name: str | None = None
    ld_lens: bool = False
    training_mode: bool = False
    speed: str = "balanced"
    user_context: dict[str, Any] = field(default_factory=dict)


@dataclass
class OrchestratorResult:
    system_prompt: str
    user_message: str
    runtime: AssistantRuntimeContext
    messages: list[dict[str, str]]
    selected_mode: str
    trimmed_history: list[dict[str, str]]
    trimmed_document_text: str | None
    sources: list[dict[str, Any]] = field(default_factory=list)
    runtime_payload: dict[str, Any] = field(default_factory=dict)
    response_plan: ResponsePlan = field(default_factory=ResponsePlan)
    guidance_plan: GuidancePlan = field(default_factory=GuidancePlan)
    model_plan: ModelPlan = field(default_factory=ModelPlan)


# ---------------------------------------------------------
# Safe helpers
# ---------------------------------------------------------

def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_response_mode(response_mode: str | None) -> str:
    value = _safe_string(response_mode).lower()
    if value in {"quick", "balanced", "deep"}:
        return value
    return "balanced"


def _trim_history(history: list[dict[str, Any]], selected_mode: str) -> list[dict[str, str]]:
    if not history:
        return []

    if selected_mode == "quick":
        limit = 3
    elif selected_mode == "deep":
        limit = 8
    else:
        limit = 5

    trimmed = history[-limit:]

    if trimmed and trimmed[-1].get("role") == "user":
        trimmed = trimmed[:-1]

    cleaned: list[dict[str, str]] = []
    for item in trimmed:
        role_name = _safe_string(item.get("role")).lower()
        content = _safe_string(item.get("message") or item.get("content"))

        if role_name not in {"user", "assistant"}:
            continue
        if not content:
            continue

        cleaned.append(
            {
                "role": role_name,
                "content": content[:12000],
            }
        )

    return cleaned


def _trim_document_text(document_text: str | None, selected_mode: str) -> str | None:
    text = _safe_string(document_text)
    if not text:
        return None

    if selected_mode == "quick":
        limit = 6000
    elif selected_mode == "deep":
        limit = 24000
    else:
        limit = 12000

    return text[:limit]


def _build_messages(
    system_prompt: str,
    user_message: str,
    history: list[dict[str, str]],
) -> list[dict[str, str]]:
    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})
    return messages


def _normalise_sources(sources: Any) -> list[dict[str, Any]]:
    if not isinstance(sources, list):
        return []

    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in sources:
        if not isinstance(item, dict):
            continue

        source = {
            "type": item.get("type"),
            "label": item.get("label"),
            "document_title": item.get("document_title"),
            "section": item.get("section"),
            "page_number": item.get("page_number"),
            "excerpt": item.get("excerpt"),
            "url": item.get("url"),
        }

        key = "|".join(
            str(source.get(k) or "")
            for k in ["type", "label", "document_title", "section", "page_number", "url"]
        )
        if key in seen:
            continue

        seen.add(key)
        cleaned.append(source)

    return cleaned


def _serialise_runtime(runtime: AssistantRuntimeContext | None) -> dict[str, Any]:
    if runtime is None:
        return {}

    suggested_actions: list[str] = []
    raw_actions = getattr(runtime, "suggested_actions_context", "") or ""

    if raw_actions:
        for line in raw_actions.splitlines():
            line = line.strip()
            if line.startswith("•"):
                suggested_actions.append(line.lstrip("•").strip())

    payload = {
        "mode": getattr(runtime, "mode", None),
        "task_type": getattr(runtime, "task_type", None),
        "output_type": getattr(runtime, "output_type", None),
        "urgency": getattr(runtime, "urgency", None),
        "safeguarding_level": getattr(runtime, "safeguarding_level", None),
        "user_role_profile": getattr(runtime, "user_role_profile", None),
        "retrieval_level": getattr(runtime, "retrieval_level", None),
        "reflection_level": getattr(runtime, "reflection_level", None),
        "suggested_actions": suggested_actions,
    }

    return {k: v for k, v in payload.items() if v not in (None, "", [])}


# ---------------------------------------------------------
# Main orchestration
# ---------------------------------------------------------

def build_orchestrator_result(req: OrchestratorRequest) -> OrchestratorResult:
    selected_mode = _normalise_response_mode(req.speed)
    trimmed_history = _trim_history(req.history, selected_mode)
    trimmed_document_text = _trim_document_text(req.document_text, selected_mode)

    logger.info(
        "Orchestrator starting session_id=%s response_mode=%s history=%s has_document=%s",
        req.session_id,
        selected_mode,
        len(trimmed_history),
        bool(trimmed_document_text),
    )

    prompt_package = build_assistant_prompt_package(
        AssistantRequest(
            message=req.message,
            session_id=req.session_id,
            history=req.history[-8:],
            role=req.role,
            document_text=trimmed_document_text,
            document_name=req.document_name,
            ld_lens=req.ld_lens,
            training_mode=req.training_mode,
            speed=selected_mode,
            user_context=req.user_context,
        )
    )

    runtime = prompt_package.runtime
    system_prompt = prompt_package.system_prompt
    user_message = prompt_package.user_message

    mode = getattr(runtime, "mode", "general_practice")
    task_type = getattr(runtime, "task_type", "guidance")
    output_type = getattr(runtime, "output_type", "plain_response")
    safeguarding_level = getattr(runtime, "safeguarding_level", "normal")
    urgency = getattr(runtime, "urgency", "routine")
    user_role_profile = getattr(runtime, "user_role_profile", "staff")

    response_plan = build_response_plan(
        message=req.message,
        mode=mode,
        task_type=task_type,
        output_type=output_type,
        safeguarding_level=safeguarding_level,
        urgency=urgency,
        user_role_profile=user_role_profile,
        selected_mode=selected_mode,
        has_document=bool(trimmed_document_text),
    )

    sources = _normalise_sources(getattr(runtime, "sources_used", []))
    runtime_payload = _serialise_runtime(runtime)

    messages = _build_messages(
        system_prompt=system_prompt,
        user_message=user_message,
        history=trimmed_history,
    )

    logger.info(
        (
            "Orchestrator built session_id=%s mode=%s task_type=%s output_type=%s "
            "safeguarding=%s urgency=%s response_mode=%s stance=%s "
            "guidance_enabled=%s guidance_reason=%s model=%s temp=%s max_tokens=%s "
            "memory=%s retrieval=%s reflection=%s supervision=%s leadership=%s sources=%s"
        ),
        req.session_id,
        mode,
        task_type,
        output_type,
        safeguarding_level,
        urgency,
        response_plan.selected_mode,
        response_plan.response_stance,
        response_plan.guidance_plan.enabled,
        response_plan.guidance_plan.reason,
        response_plan.model_plan.model,
        response_plan.model_plan.temperature,
        response_plan.model_plan.max_tokens,
        response_plan.should_use_memory,
        response_plan.should_use_retrieval,
        response_plan.should_use_reflection,
        response_plan.should_use_supervision,
        response_plan.should_use_leadership_lens,
        len(sources),
    )

    return OrchestratorResult(
        system_prompt=system_prompt,
        user_message=user_message,
        runtime=runtime,
        messages=messages,
        selected_mode=response_plan.selected_mode,
        trimmed_history=trimmed_history,
        trimmed_document_text=trimmed_document_text,
        sources=sources,
        runtime_payload=runtime_payload,
        response_plan=response_plan,
        guidance_plan=response_plan.guidance_plan,
        model_plan=response_plan.model_plan,
    )
