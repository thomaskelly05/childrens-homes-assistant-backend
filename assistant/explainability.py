from __future__ import annotations

from typing import Any


MODE_LABELS = {
    "factual": "guidance check",
    "handover": "handover support",
    "recording": "recording support",
    "incident_summary": "incident review",
    "chronology": "chronology drafting",
    "support_planning": "support planning",
    "manager_review": "management review",
    "rewrite": "professional rewrite",
    "reflective": "reflective support",
    "supervision": "supervision support",
    "document_review": "document review",
    "general_practice": "practice support",
    "practical": "practical support",
}

OUTPUT_LABELS = {
    "plain_response": "practical response",
    "structured_record": "structured record",
    "incident_record": "incident record",
    "chronology_entry": "chronology entry",
    "handover_note": "handover note",
    "daily_note": "daily note",
    "risk_summary": "risk or planning summary",
    "manager_review": "management review",
    "supervision_reflection": "reflective or supervision response",
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    cleaned: list[str] = []
    for item in value:
        text = _safe_string(item)
        if text:
            cleaned.append(text)
    return cleaned


def _extract_runtime_attr(runtime: Any, name: str, default: Any = "") -> Any:
    if runtime is None:
        return default
    return getattr(runtime, name, default)


def _mode_label(mode: str) -> str:
    return MODE_LABELS.get(_safe_string(mode), "practice support")


def _output_label(output_type: str) -> str:
    return OUTPUT_LABELS.get(_safe_string(output_type), "response")


def _summarise_request(message: str, limit: int = 140) -> str:
    text = " ".join(_safe_string(message).split())
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].strip() + "..."


def _classification_signals(orchestration: Any) -> list[str]:
    runtime = getattr(orchestration, "runtime", None)
    if runtime is None:
        return []

    signals: list[str] = []

    mode = _safe_string(_extract_runtime_attr(runtime, "mode"))
    task_type = _safe_string(_extract_runtime_attr(runtime, "task_type"))
    output_type = _safe_string(_extract_runtime_attr(runtime, "output_type"))
    urgency = _safe_string(_extract_runtime_attr(runtime, "urgency"))
    safeguarding_level = _safe_string(_extract_runtime_attr(runtime, "safeguarding_level"))
    role_profile = _safe_string(_extract_runtime_attr(runtime, "user_role_profile"))
    response_stance = _safe_string(_extract_runtime_attr(runtime, "response_stance"))

    if mode:
        signals.append(f"Mode detected as {mode}.")
    if task_type:
        signals.append(f"Task type assessed as {task_type}.")
    if output_type:
        signals.append(f"Best output shape assessed as {output_type}.")
    if safeguarding_level:
        signals.append(f"Safeguarding level assessed as {safeguarding_level}.")
    if urgency and urgency != "routine":
        signals.append(f"Urgency assessed as {urgency}.")
    if role_profile:
        signals.append(f"Response adapted for a {role_profile} role profile.")
    if response_stance:
        signals.append(f"Response stance set to {response_stance}.")

    return signals[:6]


def _planning_reasons(orchestration: Any) -> list[str]:
    reasons: list[str] = []

    runtime = getattr(orchestration, "runtime", None)
    guidance_plan = getattr(orchestration, "guidance_plan", None)
    model_plan = getattr(orchestration, "model_plan", None)

    if runtime is not None:
        retrieval_level = _safe_string(_extract_runtime_attr(runtime, "retrieval_level"))
        reflection_level = _safe_string(_extract_runtime_attr(runtime, "reflection_level"))
        if retrieval_level and retrieval_level != "none":
            reasons.append(f"Internal retrieval used at {retrieval_level} level.")
        if reflection_level and reflection_level != "none":
            reasons.append(f"Reflective support used at {reflection_level} level.")

    if guidance_plan is not None:
        enabled = bool(getattr(guidance_plan, "enabled", False))
        reason = _safe_string(getattr(guidance_plan, "reason", ""))
        if enabled:
            reasons.append("Trusted guidance search was enabled.")
            if reason:
                reasons.append(reason)
        else:
            if reason:
                reasons.append(reason)

    if model_plan is not None:
        model = _safe_string(getattr(model_plan, "model", ""))
        if model:
            reasons.append(f"Model selected: {model}.")

    deduped: list[str] = []
    for reason in reasons:
        if reason not in deduped:
            deduped.append(reason)

    return deduped[:6]


def build_explainability_payload(
    *,
    user_message: str,
    orchestration: Any,
) -> dict[str, Any]:
    runtime = getattr(orchestration, "runtime", None)
    guidance_plan = getattr(orchestration, "guidance_plan", None)
    model_plan = getattr(orchestration, "model_plan", None)
    regulation_basis = getattr(orchestration, "regulation_basis", None)

    mode = _safe_string(_extract_runtime_attr(runtime, "mode", "general_practice"))
    task_type = _safe_string(_extract_runtime_attr(runtime, "task_type", "guidance"))
    output_type = _safe_string(_extract_runtime_attr(runtime, "output_type", "plain_response"))
    safeguarding_level = _safe_string(_extract_runtime_attr(runtime, "safeguarding_level", "normal"))
    urgency = _safe_string(_extract_runtime_attr(runtime, "urgency", "routine"))
    response_stance = _safe_string(_extract_runtime_attr(runtime, "response_stance", "balanced"))
    classification_confidence = _safe_string(
        _extract_runtime_attr(runtime, "classification_confidence", "working")
    )
    secondary_intents = _normalise_list(
        _extract_runtime_attr(runtime, "secondary_intents", [])
    )

    payload = {
        "request_summary": _summarise_request(user_message),
        "mode": mode,
        "mode_label": _mode_label(mode),
        "task_type": task_type,
        "output_type": output_type,
        "output_label": _output_label(output_type),
        "safeguarding_level": safeguarding_level,
        "urgency": urgency,
        "response_stance": response_stance,
        "classification_confidence": classification_confidence,
        "secondary_intents": secondary_intents,
        "classification_signals": _classification_signals(orchestration),
        "guidance_search_enabled": bool(getattr(guidance_plan, "enabled", False))
        if guidance_plan is not None
        else False,
        "guidance_search_reason": _safe_string(getattr(guidance_plan, "reason", ""))
        if guidance_plan is not None
        else "",
        "model": _safe_string(getattr(model_plan, "model", ""))
        if model_plan is not None
        else "",
        "temperature": getattr(model_plan, "temperature", None)
        if model_plan is not None
        else None,
        "max_tokens": getattr(model_plan, "max_tokens", None)
        if model_plan is not None
        else None,
        "selected_mode": _safe_string(getattr(orchestration, "selected_mode", "")),
        "has_document": bool(getattr(orchestration, "has_document", False)),
        "regulation_basis": _normalise_list(regulation_basis),
        "planning_reasons": _planning_reasons(orchestration),
    }

    return {k: v for k, v in payload.items() if v not in (None, "", [])}


def _line_for_initial_review(orchestration: Any) -> str:
    runtime = getattr(orchestration, "runtime", None)
    mode = _safe_string(_extract_runtime_attr(runtime, "mode", "general_practice"))
    safeguarding_level = _safe_string(_extract_runtime_attr(runtime, "safeguarding_level", "normal"))
    output_type = _safe_string(_extract_runtime_attr(runtime, "output_type", "plain_response"))
    has_document = bool(getattr(orchestration, "has_document", False))

    mode_text = _mode_label(mode)
    output_text = _output_label(output_type)

    if safeguarding_level in {"heightened", "urgent"}:
        return (
            f"Reviewing this as {mode_text} with {safeguarding_level} safeguarding priority, "
            f"and shaping the response as a {output_text}."
        )

    if has_document:
        return (
            f"Reviewing your request as {mode_text}, using the uploaded document where relevant, "
            f"and shaping the response as a {output_text}."
        )

    return (
        f"Reviewing your request as {mode_text} and shaping the response as a {output_text}."
    )


def _line_for_search(orchestration: Any, search_enabled: bool, has_search_results: bool) -> str:
    if not search_enabled:
        return "Using the internal practice and response framework without adding a live guidance search."

    if has_search_results:
        return (
            "Checking trusted guidance sources where needed so the response stays grounded "
            "in defensible practice."
        )

    return (
        "Checking whether trusted guidance needs to be brought in for this request."
    )


def _line_for_final_plan(orchestration: Any) -> str:
    runtime = getattr(orchestration, "runtime", None)
    task_type = _safe_string(_extract_runtime_attr(runtime, "task_type", "guidance"))
    role_profile = _safe_string(_extract_runtime_attr(runtime, "user_role_profile", "staff"))
    response_stance = _safe_string(_extract_runtime_attr(runtime, "response_stance", "balanced"))

    if task_type == "recording":
        return (
            f"Preparing paste-ready wording with a {response_stance} stance, adapted for a {role_profile} role."
        )

    if task_type == "review":
        return (
            f"Preparing a review-focused response with oversight and follow-up in mind, adapted for a {role_profile} role."
        )

    if task_type == "planning":
        return (
            f"Preparing a practical planning response with clear next steps, adapted for a {role_profile} role."
        )

    if task_type == "reflection":
        return (
            f"Preparing a reflective but practical response, adapted for a {role_profile} role."
        )

    return (
        f"Preparing a clear, practical response with a {response_stance} stance, adapted for a {role_profile} role."
    )


def build_loading_updates(
    *,
    stage: str,
    orchestration: Any,
    search_enabled: bool,
    has_search_results: bool,
) -> list[str]:
    """
    Returns short professional progress lines for the frontend while streaming.

    Stages:
    - initial_review
    - post_search
    """
    stage_name = _safe_string(stage).lower()

    if stage_name == "initial_review":
        return [
            _line_for_initial_review(orchestration),
            _line_for_search(orchestration, search_enabled, has_search_results=False),
        ]

    if stage_name == "post_search":
        return [
            _line_for_search(orchestration, search_enabled, has_search_results=has_search_results),
            _line_for_final_plan(orchestration),
        ]

    return []
