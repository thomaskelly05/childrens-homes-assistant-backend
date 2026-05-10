from __future__ import annotations

"""
assistant/assistant_response_pipeline.py

Elite production post-processing pipeline for IndiCare Assistant.

Purpose:
- Route the assistant response
- Apply response contracts
- Format final answer
- Run answer quality checks
- Build transparency/explainability payload
- Return final answer and metadata for UI, audit and testing

This file does not call the LLM.
It processes the answer after the model has generated it.
"""

from typing import Any

from assistant.answer_quality import check_answer_quality
from assistant.explainability_builder import (
    build_audit_panel,
    build_explainability_payload,
    build_user_transparency_panel,
)
from assistant.prompt_router import build_prompt_route, build_route_prompt_block, route_to_metadata
from assistant.response_contracts import (
    build_contract_prompt_block,
    contract_to_ui_schema,
    normalise_contract_mode,
    validate_response_structure,
)
from assistant.response_formatter import format_response, infer_response_mode


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _safe_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"1", "true", "yes", "y", "on"}:
            return True
        if lowered in {"0", "false", "no", "n", "off"}:
            return False
    return bool(value)


def build_pre_response_context(
    *,
    message: str,
    user_context: dict[str, Any] | None = None,
    runtime: dict[str, Any] | None = None,
    selected_mode: str | None = None,
    output_type: str | None = None,
    task_type: str | None = None,
    user_role: str | None = None,
) -> dict[str, Any]:
    """
    Use this before the LLM call if you want to append route + contract
    information to the prompt.

    Returns:
    - route metadata
    - prompt blocks
    - response mode
    - contract schema
    """
    user_context = user_context or {}
    runtime = runtime or {}

    route = build_prompt_route(
        message=message,
        user_context=user_context,
        runtime=runtime,
        selected_mode=selected_mode,
        output_type=output_type,
        task_type=task_type,
        user_role=user_role,
    )

    contract_mode = normalise_contract_mode(route.response_mode)

    return {
        "route": route_to_metadata(route),
        "response_mode": route.response_mode,
        "contract_mode": contract_mode,
        "route_prompt_block": build_route_prompt_block(route),
        "contract_prompt_block": build_contract_prompt_block(
            contract_mode,
            assistant_surface=route.assistant_surface,
            requires_evidence_grounding=route.requires_evidence_grounding,
        ),
        "contract_ui_schema": contract_to_ui_schema(contract_mode),
    }


def process_assistant_response(
    *,
    answer_text: str,
    message: str,
    user_context: dict[str, Any] | None = None,
    runtime: dict[str, Any] | None = None,
    sources: list[dict[str, Any]] | None = None,
    evidence_index: list[dict[str, Any]] | None = None,
    selected_mode: str | None = None,
    output_type: str | None = None,
    task_type: str | None = None,
    user_role: str | None = None,
) -> dict[str, Any]:
    """
    Main production post-processing function.

    Use after the LLM has produced answer_text.

    Returns:
    {
      "answer": str,
      "meta": {...}
    }
    """
    user_context = user_context or {}
    runtime = runtime or {}
    sources = sources or []
    evidence_index = evidence_index or []

    route = build_prompt_route(
        message=message,
        user_context=user_context,
        runtime=runtime,
        selected_mode=selected_mode,
        output_type=output_type,
        task_type=task_type,
        user_role=user_role,
    )

    inferred_response_mode = infer_response_mode(
        output_type=_safe_string(output_type or runtime.get("output_type")),
        task_type=_safe_string(task_type or runtime.get("task_type")),
        mode=route.mode,
        message=message,
    )

    response_mode = route.response_mode or inferred_response_mode
    contract_mode = normalise_contract_mode(response_mode)

    formatted_answer = format_response(
        answer_text,
        mode=response_mode,
        metadata={
            **runtime,
            "assistant_surface": route.assistant_surface,
            "requires_evidence_grounding": route.requires_evidence_grounding,
            "safeguarding_level": route.safeguarding_level,
            "sources": sources,
            "evidence_index": evidence_index,
            "source_count": len(sources),
        },
    )

    quality = check_answer_quality(
        answer_text=formatted_answer,
        mode=route.mode,
        output_type=response_mode,
        assistant_surface=route.assistant_surface,
        safeguarding_level=route.safeguarding_level,
        requires_evidence_grounding=route.requires_evidence_grounding,
        sources=sources,
        evidence_index=evidence_index,
        runtime=runtime,
    )

    structure_validation = validate_response_structure(
        contract_mode,
        formatted_answer,
    )

    explainability = build_explainability_payload(
        message=message,
        answer_text=formatted_answer,
        mode=route.mode,
        response_mode=response_mode,
        runtime={
            **runtime,
            "answer_quality_flags": quality,
        },
        route=route_to_metadata(route),
        sources=sources,
        evidence_index=evidence_index,
        assistant_surface=route.assistant_surface,
        role_profile=route.role_profile,
        safeguarding_level=route.safeguarding_level,
        confidence=quality.get("confidence"),
    )

    user_transparency_panel = build_user_transparency_panel(explainability)
    audit_panel = build_audit_panel(explainability)

    final_answer = formatted_answer

    user_safe_notice = _safe_string(quality.get("user_safe_notice"))
    if user_safe_notice and quality.get("severity") == "blocker":
        final_answer = f"{user_safe_notice}\n\n{formatted_answer}".strip()

    meta = {
        "route": route_to_metadata(route),
        "response_mode": response_mode,
        "contract_mode": contract_mode,
        "contract_ui_schema": contract_to_ui_schema(contract_mode),
        "structure_validation": structure_validation,
        "quality": quality,
        "explainability": explainability,
        "user_transparency_panel": user_transparency_panel,
        "audit_panel": audit_panel,
        "sources": sources,
        "evidence_index": evidence_index,
        "assistant_surface": route.assistant_surface,
    }

    return {
        "answer": final_answer,
        "meta": meta,
    }


def build_pipeline_prompt_blocks(
    *,
    message: str,
    user_context: dict[str, Any] | None = None,
    runtime: dict[str, Any] | None = None,
    selected_mode: str | None = None,
    output_type: str | None = None,
    task_type: str | None = None,
    user_role: str | None = None,
) -> str:
    """
    Convenience helper.

    Returns route + contract blocks as one system-prompt-safe string.
    """
    context = build_pre_response_context(
        message=message,
        user_context=user_context,
        runtime=runtime,
        selected_mode=selected_mode,
        output_type=output_type,
        task_type=task_type,
        user_role=user_role,
    )

    return (
        f"{context['route_prompt_block']}\n\n"
        f"{context['contract_prompt_block']}"
    ).strip()
