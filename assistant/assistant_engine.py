from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from assistant.memory import get_memory_context
from assistant.mode_detector import detect_mode
from assistant.prompts import build_chat_prompt
from assistant.reflection_engine import maybe_build_reflection_context
from assistant.response_schemas import get_schema_for_mode, schema_to_prompt_block
from assistant.retrieval import retrieve_context
from assistant.safeguarding import assess_safeguarding_level
from assistant.supervision_engine import maybe_build_supervision_context

logger = logging.getLogger("indicare.engine")

FAST_MODES_SKIP_RETRIEVAL = {
    "handover",
    "rewrite",
    "recording",
    "incident_summary",
    "chronology",
    "practical",
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

LEADERSHIP_LENS_MODES = {
    "manager_review",
    "supervision",
    "support_planning",
    "document_review",
    "reflective",
    "factual",
    "general_practice",
}

RM_KEYWORDS = {
    "manager",
    "registered manager",
    "deputy",
    "oversight",
    "quality",
    "review",
    "audit",
    "action plan",
    "monitoring",
    "follow up",
}

OFSTED_KEYWORDS = {
    "ofsted",
    "inspection",
    "inspect",
    "sccif",
    "quality standard",
    "quality standards",
    "regulation",
    "regulations",
    "evidence",
    "lived experience",
}

RI_KEYWORDS = {
    "responsible individual",
    "provider",
    "governance",
    "oversight",
    "monitoring",
    "quality assurance",
    "service issue",
    "pattern",
    "system issue",
    "provider risk",
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
    leadership_lens_context: str = ""


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


def _history_limit_for_speed(speed: str) -> int:
    if speed == "quick":
        return 3
    if speed == "deep":
        return 8
    return 5


def _normalise_history(history: list[dict[str, Any]], max_messages: int = 5) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []

    for item in history or []:
        role = item.get("role")
        message = _safe_string(item.get("message") or item.get("content"))

        if role not in {"user", "assistant"}:
            continue
        if not message:
            continue

        cleaned.append(
            {
                "role": role,
                "message": message[:8000],
                "created_at": item.get("created_at"),
                "id": item.get("id"),
            }
        )

    return cleaned[-max_messages:]


def _document_trim_limit(mode: str, speed: str) -> int:
    if speed == "quick":
        return 4000
    if speed == "deep":
        return 18000
    if mode in DOCUMENT_HEAVY_MODES:
        return 12000
    return 8000


def _contains_guidance_trigger(message: str) -> bool:
    text = (message or "").lower()
    return any(word in text for word in GUIDANCE_TRIGGER_WORDS)


def _contains_any(text: str, keywords: set[str]) -> bool:
    text = (text or "").lower()
    return any(keyword in text for keyword in keywords)


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
        "supervision",
        "general_practice",
    }


def _should_use_memory(mode: str, response_mode: str) -> bool:
    if response_mode == "quick":
        return False
    return mode not in FAST_MODES_LIGHT_MEMORY


def _should_use_reflection(mode: str, response_mode: str) -> bool:
    return mode in REFLECTIVE_MODES and response_mode == "deep"


def _should_use_leadership_lens(mode: str, message: str, speed: str) -> bool:
    if speed == "quick":
        return _contains_any(message, RM_KEYWORDS | OFSTED_KEYWORDS | RI_KEYWORDS)

    if mode in LEADERSHIP_LENS_MODES:
        return True

    if _contains_any(message, RM_KEYWORDS | OFSTED_KEYWORDS | RI_KEYWORDS):
        return True

    return False


def _build_runtime_mode_context(runtime: AssistantRuntimeContext, speed: str) -> str:
    return (
        f"Detected task mode: {runtime.mode}\n"
        f"Safeguarding level: {runtime.safeguarding_level}\n"
        f"Selected response mode: {speed}\n\n"
        f"Use these as working signals for tone, structure, caution, and practical focus."
    )


def _build_leadership_lens_context(mode: str, safeguarding_level: str, message: str) -> str:
    text = (message or "").lower()

    emphasise_rm = mode in {"manager_review", "support_planning", "supervision", "document_review"} or _contains_any(text, RM_KEYWORDS)
    emphasise_ofsted = _contains_any(text, OFSTED_KEYWORDS) or mode in {"manager_review", "document_review", "factual"}
    emphasise_ri = _contains_any(text, RI_KEYWORDS) or mode in {"manager_review", "supervision"}

    blocks: list[str] = []

    if emphasise_rm:
        blocks.append(
            "REGISTERED MANAGER PRIORITIES:\n"
            "• Check whether practice is safe, clear, defensible, and actionable.\n"
            "• Notice what should be escalated, reviewed, followed up, or strengthened.\n"
            "• Focus on staff consistency, care planning quality, recording quality, and management oversight."
        )

    if emphasise_ofsted:
        blocks.append(
            "OFSTED / INSPECTION PRIORITIES:\n"
            "• Consider the child’s lived experience, progress, safety, and quality of support.\n"
            "• Notice weak wording, vague evidence, inconsistencies, drift, or gaps.\n"
            "• Strengthen clarity, impact, and evidence where relevant."
        )

    if emphasise_ri:
        blocks.append(
            "RESPONSIBLE INDIVIDUAL / PROVIDER OVERSIGHT PRIORITIES:\n"
            "• Notice provider-level risks, patterns, governance concerns, or systemic weaknesses.\n"
            "• Identify where stronger monitoring, quality assurance, or oversight may be needed.\n"
            "• Distinguish between a one-off issue and something that may indicate a wider service concern."
        )

    if safeguarding_level in {"heightened", "urgent"}:
        blocks.append(
            "SAFEGUARDING LEADERSHIP PRIORITY:\n"
            "• Keep practical safety, escalation, recording quality, and defensibility at the centre."
        )

    return "\n\n".join(blocks).strip()


def _safe_detect_mode(message: str, history: list[dict[str, Any]]) -> str:
    try:
        return detect_mode(message=message, history=history)
    except TypeError:
        try:
            return detect_mode(message)
        except Exception:
            logger.exception("Mode detection failed")
            return "general_practice"
    except Exception:
        logger.exception("Mode detection failed")
        return "general_practice"


def _safe_assess_safeguarding(message: str, history: list[dict[str, Any]]) -> str:
    try:
        return assess_safeguarding_level(message=message, history=history)
    except TypeError:
        try:
            return assess_safeguarding_level(message)
        except Exception:
            logger.exception("Safeguarding assessment failed")
            return "normal"
    except Exception:
        logger.exception("Safeguarding assessment failed")
        return "normal"


def _safe_schema_context(mode: str, safeguarding_level: str) -> str:
    try:
        schema = get_schema_for_mode(mode, safeguarding_level)
        return _safe_string(schema_to_prompt_block(schema))
    except Exception:
        logger.exception("Schema selection failed")
        return ""


def _safe_memory_context(req: AssistantRequest, mode: str, speed: str) -> str:
    try:
        return _safe_string(
            get_memory_context(
                session_id=req.session_id,
                user_context=req.user_context,
                message=req.message,
                mode=mode,
                recent_limit=2 if speed == "balanced" else 3,
            )
        )
    except TypeError:
        try:
            return _safe_string(get_memory_context(req.session_id, req.user_context))
        except Exception:
            logger.exception("Memory lookup failed")
            return ""
    except Exception:
        logger.exception("Memory lookup failed")
        return ""


def _safe_retrieval_context(req: AssistantRequest, mode: str, safeguarding_level: str, speed: str) -> str:
    try:
        return _safe_string(
            retrieve_context(
                message=req.message,
                mode=mode,
                safeguarding_level=safeguarding_level,
                document_text=req.document_text,
                document_name=req.document_name,
                role=req.role,
                limit=1 if speed == "balanced" else 2,
            )
        )
    except TypeError:
        try:
            return _safe_string(retrieve_context(req.message))
        except Exception:
            logger.exception("Retrieval failed")
            return ""
    except Exception:
        logger.exception("Retrieval failed")
        return ""


def _safe_reflection_context(message: str, mode: str, safeguarding_level: str, history: list[dict[str, Any]]) -> str:
    try:
        return _safe_string(
            maybe_build_reflection_context(
                message=message,
                mode=mode,
                safeguarding_level=safeguarding_level,
                history=history,
            )
        )
    except TypeError:
        try:
            return _safe_string(maybe_build_reflection_context(message, mode))
        except Exception:
            logger.exception("Reflection context failed")
            return ""
    except Exception:
        logger.exception("Reflection context failed")
        return ""


def _safe_supervision_context(message: str, mode: str, safeguarding_level: str, history: list[dict[str, Any]]) -> str:
    try:
        return _safe_string(
            maybe_build_supervision_context(
                message=message,
                mode=mode,
                safeguarding_level=safeguarding_level,
                history=history,
            )
        )
    except TypeError:
        try:
            return _safe_string(maybe_build_supervision_context(message, mode))
        except Exception:
            logger.exception("Supervision context failed")
            return ""
    except Exception:
        logger.exception("Supervision context failed")
        return ""


def build_assistant_prompt_package(req: AssistantRequest) -> AssistantPromptPackage:
    message = _safe_string(req.message)
    speed = _normalise_speed(req.speed)

    history = _normalise_history(
        req.history,
        max_messages=_history_limit_for_speed(speed),
    )

    runtime = AssistantRuntimeContext()

    runtime.mode = _safe_detect_mode(message, history)
    runtime.safeguarding_level = _safe_assess_safeguarding(message, history)
    runtime.schema_context = _safe_schema_context(runtime.mode, runtime.safeguarding_level)

    if speed != "quick":
        if _should_use_memory(runtime.mode, speed):
            runtime.memory_context = _safe_memory_context(req, runtime.mode, speed)

        if _should_use_retrieval(runtime.mode, runtime.safeguarding_level, message, req.document_text, speed):
            runtime.retrieval_context = _safe_retrieval_context(req, runtime.mode, runtime.safeguarding_level, speed)

        if _should_use_reflection(runtime.mode, speed):
            runtime.reflection_context = _safe_reflection_context(
                message,
                runtime.mode,
                runtime.safeguarding_level,
                history,
            )
            runtime.supervision_context = _safe_supervision_context(
                message,
                runtime.mode,
                runtime.safeguarding_level,
                history,
            )

    if _should_use_leadership_lens(runtime.mode, message, speed):
        runtime.leadership_lens_context = _build_leadership_lens_context(
            runtime.mode,
            runtime.safeguarding_level,
            message,
        )

    system_prompt, user_message = build_chat_prompt(
        message=message,
        role=req.role,
        ld_lens=req.ld_lens,
        training_mode=req.training_mode,
        speed=speed,
    )

    system_prompt = _append_section(
        system_prompt,
        "RUNTIME MODE CONTEXT",
        _build_runtime_mode_context(runtime, speed),
    )

    system_prompt = _append_section(system_prompt, "RESPONSE STRUCTURE", runtime.schema_context)

    system_prompt = _append_section(
        system_prompt,
        "LEADERSHIP / INSPECTION LENS CONTEXT",
        runtime.leadership_lens_context,
    )

    if speed != "quick":
        system_prompt = _append_section(system_prompt, "MEMORY CONTEXT", runtime.memory_context)
        system_prompt = _append_section(system_prompt, "RETRIEVED CONTEXT", runtime.retrieval_context)
        system_prompt = _append_section(system_prompt, "REFLECTION CONTEXT", runtime.reflection_context)
        system_prompt = _append_section(system_prompt, "SUPERVISION CONTEXT", runtime.supervision_context)

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
        "Assistant prompt package built session_id=%s mode=%s safeguarding=%s response_mode=%s memory=%s retrieval=%s reflection=%s supervision=%s leadership_lens=%s",
        req.session_id,
        runtime.mode,
        runtime.safeguarding_level,
        speed,
        bool(runtime.memory_context),
        bool(runtime.retrieval_context),
        bool(runtime.reflection_context),
        bool(runtime.supervision_context),
        bool(runtime.leadership_lens_context),
    )

    return AssistantPromptPackage(
        system_prompt=system_prompt.strip(),
        user_message=user_message.strip(),
        runtime=runtime,
    )
