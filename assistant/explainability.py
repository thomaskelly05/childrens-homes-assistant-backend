from __future__ import annotations

from typing import Any


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _summarise_request(message: str, max_len: int = 140) -> str:
    text = " ".join(_safe_string(message).split())
    if len(text) <= max_len:
        return text
    return text[:max_len].rsplit(" ", 1)[0].strip() + "..."


def _pretty_mode(mode: str) -> str:
    mapping = {
        "handover": "handover support",
        "recording": "recording support",
        "incident_summary": "incident review",
        "chronology": "chronology drafting",
        "support_planning": "support planning",
        "manager_review": "manager review",
        "reflective": "reflective support",
        "supervision": "supervision support",
        "rewrite": "professional rewrite",
        "factual": "guidance check",
        "general_practice": "practice support",
        "practical": "practical support",
        "safeguarding": "safeguarding support",
    }
    return mapping.get(_safe_string(mode), _safe_string(mode) or "practice support")


def _pretty_output(output_type: str) -> str:
    mapping = {
        "handover_note": "handover",
        "incident_record": "incident wording",
        "chronology_entry": "chronology entry",
        "daily_note": "daily note",
        "structured_record": "structured record",
        "risk_summary": "planning response",
        "manager_review": "manager summary",
        "supervision_reflection": "reflective response",
        "plain_response": "direct response",
    }
    return mapping.get(_safe_string(output_type), _safe_string(output_type) or "response")


def build_explainability_payload(
    *,
    user_message: str,
    orchestration: Any,
) -> dict[str, Any]:
    runtime = getattr(orchestration, "runtime", None)
    response_plan = getattr(orchestration, "response_plan", None)
    model_plan = getattr(orchestration, "model_plan", None)
    guidance_plan = getattr(orchestration, "guidance_plan", None)
    regulation_payload = getattr(orchestration, "regulation_payload", []) or []

    mode = getattr(runtime, "mode", "general_practice")
    task_type = getattr(runtime, "task_type", "guidance")
    output_type = getattr(runtime, "output_type", "plain_response")
    safeguarding_level = getattr(runtime, "safeguarding_level", "normal")
    urgency = getattr(runtime, "urgency", "routine")
    stance = getattr(runtime, "response_stance", "practice_support")
    confidence = getattr(runtime, "classification_confidence", 0.0)
    secondary_intents = getattr(runtime, "secondary_intents", []) or []
    classification_signals = getattr(runtime, "classification_signals", []) or []

    return {
        "request_summary": _summarise_request(user_message),
        "mode": mode,
        "mode_label": _pretty_mode(mode),
        "task_type": task_type,
        "output_type": output_type,
        "output_label": _pretty_output(output_type),
        "safeguarding_level": safeguarding_level,
        "urgency": urgency,
        "response_stance": stance,
        "classification_confidence": confidence,
        "secondary_intents": secondary_intents,
        "classification_signals": classification_signals[:10],
        "guidance_search_enabled": bool(getattr(guidance_plan, "enabled", False)),
        "guidance_search_reason": getattr(guidance_plan, "reason", ""),
        "model": getattr(model_plan, "model", "gpt-4o-mini"),
        "temperature": getattr(model_plan, "temperature", 0.2),
        "max_tokens": getattr(model_plan, "max_tokens", 850),
        "selected_mode": getattr(orchestration, "selected_mode", "balanced"),
        "has_document": bool(getattr(orchestration, "trimmed_document_text", None)),
        "regulation_basis": regulation_payload,
        "planning_reasons": list(getattr(response_plan, "reasons", []) or []),
    }


def build_loading_updates(
    *,
    stage: str,
    orchestration: Any,
    search_enabled: bool,
    has_search_results: bool,
) -> list[str]:
    runtime = getattr(orchestration, "runtime", None)
    response_plan = getattr(orchestration, "response_plan", None)
    guidance_plan = getattr(orchestration, "guidance_plan", None)
    regulation_payload = getattr(orchestration, "regulation_payload", []) or []

    mode = getattr(runtime, "mode", "general_practice")
    output_type = getattr(runtime, "output_type", "plain_response")
    safeguarding_level = getattr(runtime, "safeguarding_level", "normal")
    stance = getattr(runtime, "response_stance", "practice_support")

    has_document = bool(getattr(orchestration, "trimmed_document_text", None))
    uses_memory = bool(getattr(response_plan, "should_use_memory", False))
    uses_retrieval = bool(getattr(response_plan, "should_use_retrieval", False))
    uses_reflection = bool(getattr(response_plan, "should_use_reflection", False))

    regulation_labels = [item.get("label", "") for item in regulation_payload if isinstance(item, dict)]
    regulation_preview = ", ".join([label for label in regulation_labels[:2] if label])

    sentences: list[str] = []

    if stage == "initial_review":
        first = (
            f"I’m reading this as {_pretty_mode(mode)} and shaping it into {_pretty_output(output_type)}."
        )

        if safeguarding_level in {"heightened", "urgent"}:
            first += " I’m keeping safety, escalation, and defensible wording at the centre."
        elif stance == "management":
            first += " I’m weighing oversight, quality, and follow-up as I build the response."
        else:
            first += " I’m focusing on clear, practical, defensible wording."

        sentences.append(first)

        second_parts: list[str] = []

        if has_document:
            second_parts.append("I’m checking the uploaded document")
        elif uses_retrieval:
            second_parts.append("I’m checking relevant internal knowledge")
        elif uses_memory:
            second_parts.append("I’m using recent conversation context")
        else:
            second_parts.append("I’m working mainly from your current request")

        if search_enabled:
            second_parts.append("and I may pull in guidance where it improves accuracy")

        second = " ".join(second_parts).strip().rstrip(".") + "."
        sentences.append(second)

        if regulation_preview:
            sentences.append(f"I’m also keeping {regulation_preview} in view where relevant.")

    elif stage == "post_search":
        if search_enabled and has_search_results:
            sentences.append(
                "I’ve checked guidance and I’m now combining that with the practice context already loaded."
            )
        elif search_enabled:
            sentences.append(
                "I’ve checked whether guidance is needed and I’m now drafting from the strongest available context."
            )
        else:
            sentences.append(
                "I’ve mapped the request and I’m now drafting the response in the most appropriate structure."
            )

        if uses_reflection and safeguarding_level not in {"heightened", "urgent"}:
            sentences.append(
                "I’m balancing practical action with reflective judgement where that improves the quality of the answer."
            )
        else:
            sentences.append(
                "I’m keeping the response focused on what is clear, useful, and professionally defensible."
            )

    return sentences[:3]
