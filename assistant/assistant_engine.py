from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from assistant.mode_detector import detect_mode
from assistant.safeguarding import assess_safeguarding_level
from assistant.memory import get_memory_context
from assistant.retrieval import retrieve_context
from assistant.reflection_engine import maybe_build_reflection_context
from assistant.supervision_engine import maybe_build_supervision_context
from assistant.prompts import build_chat_prompt
from assistant.response_schemas import get_schema_for_mode, schema_to_prompt_block

logger = logging.getLogger("indicare.engine")

FAST_MODES_SKIP_RETRIEVAL = {
    "handover",
    "rewrite",
    "recording",
    "incident_summary",
    "chronology",
}

FAST_MODES_LIGHT_MEMORY = {
    "handover",
    "recording",
    "incident_summary",
    "rewrite",
    "chronology",
    "practical",
}

REFLECTIVE_MODES = {
    "reflective",
    "supervision",
    "manager_review",
}

GUIDANCE_TRIGGER_WORDS = {
    "how often",
    "regulation",
    "regulations",
    "statutory",
    "ofsted",
    "quality standard",
    "quality standards",
    "sccif",
    "children's homes regulations",
    "childrens homes regulations",
    "law",
    "legal",
    "guidance",
    "framework",
    "policy",
}

DOCUMENT_HEAVY_MODES = {
    "rewrite",
    "document_review",
    "manager_review",
    "support_planning",
}


@dataclass
class AssistantRequest:
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
class AssistantRuntimeContext:
    mode: str = "general_practice"
    safeguarding_level: str = "normal"
    memory_context: str = ""
    retrieval_context: str = ""
    reflection_context: str = ""
    supervision_context: str = ""
    schema_context: str = ""


@dataclass
class AssistantPromptPackage:
    system_prompt: str
    user_message: str
    runtime: AssistantRuntimeContext


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _append_section(base: str, title: str, content: str) -> str:
    content = _safe_string(content)
    if not content:
        return base

    return (
        f"{base}\n\n"
        f"============================================================\n"
        f"{title}\n\n"
        f"{content}"
    )


def _normalise_speed(speed: str | None) -> str:
    value = _safe_string(speed).lower()
    if value in {"quick", "balanced", "deep"}:
        return value
    return "balanced"


def _normalise_history(history: list[dict[str, Any]], max_messages: int = 6) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []

    for item in history or []:
        role = item.get("role")
        message = _safe_string(item.get("message"))

        if role not in {"user", "assistant"}:
            continue
        if not message:
            continue

        cleaned.append({
            "role": role,
            "message": message,
            "created_at": item.get("created_at"),
            "id": item.get("id"),
        })

    return cleaned[-max_messages:]


def _document_trim_limit(mode: str, speed: str) -> int:
    if speed == "quick":
        return 8000
    if speed == "deep":
        return 18000
    if mode in DOCUMENT_HEAVY_MODES:
        return 15000
    return 12000


def _history_limit_for_speed(speed: str) -> int:
    if speed == "quick":
        return 4
    if speed == "deep":
        return 8
    return 6


def _contains_guidance_trigger(message: str) -> bool:
    text = (message or "").lower()
    return any(word in text for word in GUIDANCE_TRIGGER_WORDS)


def _should_use_retrieval(
    mode: str,
    safeguarding_level: str,
    message: str,
    document_text: str | None,
    response_mode: str,
) -> bool:
    if document_text:
        return False

    if response_mode == "quick":
        return False

    if mode in FAST_MODES_SKIP_RETRIEVAL:
        return False

    if safeguarding_level in {"heightened", "urgent"} and mode in {"recording", "incident_summary", "practical"}:
        return False

    if _contains_guidance_trigger(message):
        return True

    return mode in {
        "factual",
        "support_planning",
        "manager_review",
        "reflective",
        "supervision",
        "general_practice",
    }


def _should_use_memory(mode: str, response_mode: str) -> bool:
    if response_mode == "quick":
        return False
    return mode not in FAST_MODES_LIGHT_MEMORY


def _should_use_reflection(mode: str, response_mode: str) -> bool:
    return mode in REFLECTIVE_MODES and response_mode == "deep"


def _build_runtime_mode_context(runtime: AssistantRuntimeContext, speed: str) -> str:
    return (
        f"Detected task mode: {runtime.mode}\n"
        f"Safeguarding level: {runtime.safeguarding_level}\n"
        f"Selected response mode: {speed}\n\n"
        f"Use these as working signals for tone, structure, caution level, and practical focus.\n"
        f"Complete the user's task directly unless doing so would be unsafe or dishonest."
    )


def build_assistant_prompt_package(req: AssistantRequest) -> AssistantPromptPackage:
    message = _safe_string(req.message)
    speed = _normalise_speed(req.speed)

    history = _normalise_history(
        req.history,
        max_messages=_history_limit_for_speed(speed),
    )

    runtime = AssistantRuntimeContext()

    # 1. Task / mode detection
    try:
        runtime.mode = detect_mode(message=message, history=history)
    except TypeError:
        try:
            runtime.mode = detect_mode(message)
        except Exception as e:
            logger.exception("Mode detection failed: %s", e)
            runtime.mode = "general_practice"
    except Exception as e:
        logger.exception("Mode detection failed: %s", e)
        runtime.mode = "general_practice"

    # 2. Safeguarding level
    try:
        runtime.safeguarding_level = assess_safeguarding_level(message=message, history=history)
    except TypeError:
        try:
            runtime.safeguarding_level = assess_safeguarding_level(message)
        except Exception as e:
            logger.exception("Safeguarding assessment failed: %s", e)
            runtime.safeguarding_level = "normal"
    except Exception as e:
        logger.exception("Safeguarding assessment failed: %s", e)
        runtime.safeguarding_level = "normal"

    # 3. Response schema
    try:
        schema = get_schema_for_mode(runtime.mode, runtime.safeguarding_level)
        runtime.schema_context = _safe_string(schema_to_prompt_block(schema))
    except Exception as e:
        logger.exception("Schema selection failed: %s", e)
        runtime.schema_context = ""

    # 4. Memory
    if _should_use_memory(runtime.mode, speed):
        try:
            runtime.memory_context = _safe_string(
                get_memory_context(
                    session_id=req.session_id,
                    user_context=req.user_context,
                    message=message,
                    mode=runtime.mode,
                    recent_limit=3 if speed == "balanced" else 4,
                )
            )
        except TypeError:
            try:
                runtime.memory_context = _safe_string(get_memory_context(req.session_id, req.user_context))
            except Exception as e:
                logger.exception("Memory lookup failed: %s", e)
                runtime.memory_context = ""
        except Exception as e:
            logger.exception("Memory lookup failed: %s", e)
            runtime.memory_context = ""

    # 5. Retrieval
    if _should_use_retrieval(runtime.mode, runtime.safeguarding_level, message, req.document_text, speed):
        try:
            runtime.retrieval_context = _safe_string(
                retrieve_context(
                    message=message,
                    mode=runtime.mode,
                    safeguarding_level=runtime.safeguarding_level,
                    document_text=req.document_text,
                    document_name=req.document_name,
                    role=req.role,
                    limit=2 if speed == "balanced" else 3,
                )
            )
        except TypeError:
            try:
                runtime.retrieval_context = _safe_string(retrieve_context(message))
            except Exception as e:
                logger.exception("Retrieval failed: %s", e)
                runtime.retrieval_context = ""
        except Exception as e:
            logger.exception("Retrieval failed: %s", e)
            runtime.retrieval_context = ""

    # 6. Reflection / supervision only when useful
    if _should_use_reflection(runtime.mode, speed):
        try:
            runtime.reflection_context = _safe_string(
                maybe_build_reflection_context(
                    message=message,
                    mode=runtime.mode,
                    safeguarding_level=runtime.safeguarding_level,
                    history=history,
                )
            )
        except TypeError:
            try:
                runtime.reflection_context = _safe_string(maybe_build_reflection_context(message, runtime.mode))
            except Exception as e:
                logger.exception("Reflection context failed: %s", e)
                runtime.reflection_context = ""
        except Exception as e:
            logger.exception("Reflection context failed: %s", e)
            runtime.reflection_context = ""

        try:
            runtime.supervision_context = _safe_string(
                maybe_build_supervision_context(
                    message=message,
                    mode=runtime.mode,
                    safeguarding_level=runtime.safeguarding_level,
                    history=history,
                )
            )
        except TypeError:
            try:
                runtime.supervision_context = _safe_string(maybe_build_supervision_context(message, runtime.mode))
            except Exception as e:
                logger.exception("Supervision context failed: %s", e)
                runtime.supervision_context = ""
        except Exception as e:
            logger.exception("Supervision context failed: %s", e)
            runtime.supervision_context = ""

    # 7. Base prompt
    system_prompt, user_message = build_chat_prompt(
        message=message,
        role=req.role,
        ld_lens=req.ld_lens,
        training_mode=req.training_mode,
        speed=speed,
    )

    # 8. Runtime mode context
    system_prompt = _append_section(
        system_prompt,
        "RUNTIME MODE CONTEXT",
        _build_runtime_mode_context(runtime, speed),
    )

    # 9. Response structure
    system_prompt = _append_section(system_prompt, "RESPONSE STRUCTURE", runtime.schema_context)

    # 10. Attach only useful runtime contexts
    system_prompt = _append_section(system_prompt, "MEMORY CONTEXT", runtime.memory_context)
    system_prompt = _append_section(system_prompt, "RETRIEVED CONTEXT", runtime.retrieval_context)
    system_prompt = _append_section(system_prompt, "REFLECTION CONTEXT", runtime.reflection_context)
    system_prompt = _append_section(system_prompt, "SUPERVISION CONTEXT", runtime.supervision_context)

    # 11. Uploaded document context
    if req.document_text:
        trimmed_document_text = req.document_text[:_document_trim_limit(runtime.mode, speed)]
        system_prompt = _append_section(
            system_prompt,
            "UPLOADED DOCUMENT CONTEXT",
            (
                f"Document name: {req.document_name or 'Uploaded document'}\n\n"
                f"Use this document as working source material where relevant.\n"
                f"Do not invent facts beyond the document and the user's instructions.\n"
                f"If information is missing, label gaps clearly.\n\n"
                f"Document text:\n{trimmed_document_text}"
            ),
        )

    logger.info(
        "Assistant prompt package built | session_id=%s | mode=%s | safeguarding=%s | response_mode=%s",
        req.session_id,
        runtime.mode,
        runtime.safeguarding_level,
        speed,
    )

    return AssistantPromptPackage(
        system_prompt=system_prompt.strip(),
        user_message=user_message.strip(),
        runtime=runtime,
    )
