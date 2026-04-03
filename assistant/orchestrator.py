from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from assistant.assistant_engine import (
    AssistantRequest,
    AssistantRuntimeContext,
    build_assistant_prompt_package,
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
class GuidancePlan:
    enabled: bool = False
    reason: str = ""
    search_query: str = ""


@dataclass
class ModelPlan:
    model: str = "gpt-4o-mini"
    temperature: float = 0.2
    max_tokens: int = 850


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
    guidance_plan: GuidancePlan = field(default_factory=GuidancePlan)
    model_plan: ModelPlan = field(default_factory=ModelPlan)


# ---------------------------------------------------------
# Constants
# ---------------------------------------------------------

GUIDANCE_KEYWORDS = [
    "regulation",
    "regulations",
    "law",
    "legal",
    "policy",
    "guidance",
    "statutory",
    "ofsted",
    "inspection",
    "framework",
    "standard",
    "procedure",
    "quality standard",
    "quality standards",
    "children's homes regulations",
    "childrens homes regulations",
    "sccif",
]

LEADERSHIP_TRIGGER_KEYWORDS = [
    "registered manager",
    "manager review",
    "manager oversight",
    "audit",
    "quality assurance",
    "qa",
    "inspection",
    "ofsted",
    "responsible individual",
    "provider oversight",
    "governance",
    "action plan",
    "service issue",
    "pattern",
]


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

    # Prevent duplicate latest user turn if route already stored current user message
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
# Planning helpers
# ---------------------------------------------------------

def _contains_guidance_keyword(text: str) -> bool:
    lower = _safe_string(text).lower()
    return any(keyword in lower for keyword in GUIDANCE_KEYWORDS)


def _contains_leadership_trigger(text: str) -> bool:
    lower = _safe_string(text).lower()
    return any(keyword in lower for keyword in LEADERSHIP_TRIGGER_KEYWORDS)


def build_guidance_plan(
    message: str,
    mode: str,
    safeguarding_level: str,
    selected_mode: str,
) -> GuidancePlan:
    text = _safe_string(message).lower()

    if selected_mode == "quick":
        return GuidancePlan(enabled=False, reason="quick_mode")

    if safeguarding_level in {"heightened", "urgent"}:
        return GuidancePlan(enabled=False, reason="safeguarding_override")

    if mode in {"handover", "recording", "incident_summary", "rewrite", "chronology"}:
        if _contains_guidance_keyword(text):
            return GuidancePlan(
                enabled=True,
                reason="guidance_keywords_in_operational_task",
                search_query=message,
            )
        return GuidancePlan(enabled=False, reason="operational_task_without_guidance_need")

    if _contains_guidance_keyword(text):
        return GuidancePlan(
            enabled=True,
            reason="guidance_keywords_present",
            search_query=message,
        )

    return GuidancePlan(enabled=False, reason="no_guidance_trigger")


def _should_use_leadership_grade_reasoning(
    message: str,
    mode: str,
    selected_mode: str,
) -> bool:
    text = _safe_string(message).lower()

    if selected_mode == "quick":
        return _contains_leadership_trigger(text)

    if mode in {"manager_review", "supervision", "support_planning", "document_review", "reflective"}:
        return True

    return _contains_leadership_trigger(text)


def build_model_plan(
    message: str,
    mode: str,
    safeguarding_level: str,
    selected_mode: str,
    has_document: bool,
) -> ModelPlan:
    if safeguarding_level == "urgent":
        return ModelPlan(model="gpt-4o-mini", temperature=0.15, max_tokens=500)

    if selected_mode == "quick":
        return ModelPlan(model="gpt-4o-mini", temperature=0.15, max_tokens=350)

    if selected_mode == "deep":
        return ModelPlan(model="gpt-4o", temperature=0.3, max_tokens=1200)

    if _should_use_leadership_grade_reasoning(message, mode, selected_mode):
        return ModelPlan(model="gpt-4o", temperature=0.2, max_tokens=1000)

    if has_document and mode in {"document_review", "rewrite"}:
        return ModelPlan(model="gpt-4o", temperature=0.2, max_tokens=1000)

    if mode in {"incident_summary", "recording", "chronology", "handover"}:
        return ModelPlan(model="gpt-4o-mini", temperature=0.1, max_tokens=600)

    if mode in {"manager_review", "supervision", "support_planning", "document_review"}:
        return ModelPlan(model="gpt-4o-mini", temperature=0.2, max_tokens=1000)

    return ModelPlan(model="gpt-4o-mini", temperature=0.2, max_tokens=850)


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
    safeguarding_level = getattr(runtime, "safeguarding_level", "normal")

    sources = _normalise_sources(getattr(runtime, "sources_used", []))
    runtime_payload = _serialise_runtime(runtime)

    guidance_plan = build_guidance_plan(
        message=req.message,
        mode=mode,
        safeguarding_level=safeguarding_level,
        selected_mode=selected_mode,
    )

    model_plan = build_model_plan(
        message=req.message,
        mode=mode,
        safeguarding_level=safeguarding_level,
        selected_mode=selected_mode,
        has_document=bool(trimmed_document_text),
    )

    messages = _build_messages(
        system_prompt=system_prompt,
        user_message=user_message,
        history=trimmed_history,
    )

    logger.info(
        (
            "Orchestrator built session_id=%s mode=%s safeguarding=%s "
            "guidance_enabled=%s guidance_reason=%s model=%s temp=%s max_tokens=%s sources=%s"
        ),
        req.session_id,
        mode,
        safeguarding_level,
        guidance_plan.enabled,
        guidance_plan.reason,
        model_plan.model,
        model_plan.temperature,
        model_plan.max_tokens,
        len(sources),
    )

    return OrchestratorResult(
        system_prompt=system_prompt,
        user_message=user_message,
        runtime=runtime,
        messages=messages,
        selected_mode=selected_mode,
        trimmed_history=trimmed_history,
        trimmed_document_text=trimmed_document_text,
        sources=sources,
        runtime_payload=runtime_payload,
        guidance_plan=guidance_plan,
        model_plan=model_plan,
    )
