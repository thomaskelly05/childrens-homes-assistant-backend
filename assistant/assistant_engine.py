from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from assistant.ai_boundaries import append_ai_boundaries
from assistant.classification import classify_intent
from assistant.memory import get_memory_context
from assistant.prompts import build_chat_prompt
from assistant.reflection_engine import maybe_build_reflection_context
from assistant.response_schemas import get_schema_for_mode, schema_to_prompt_block
from assistant.retrieval import retrieve_context_bundle
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

RECORDING_KEYWORDS = {
    "write",
    "record",
    "recording",
    "chronology",
    "daily note",
    "incident",
    "handover",
    "log",
    "entry",
    "document",
    "report",
    "rewrite",
    "draft",
}

DECISION_SUPPORT_KEYWORDS = {
    "what should i do",
    "what do i do",
    "what should staff do",
    "next step",
    "next steps",
    "how should i respond",
    "what action",
    "do i need to",
    "should i report",
    "should this be escalated",
}

PLANNING_KEYWORDS = {
    "plan",
    "support plan",
    "risk plan",
    "placement plan",
    "behaviour plan",
    "care plan",
}

QUALITY_CHECK_KEYWORDS = {
    "is this okay",
    "review this",
    "check this",
    "audit this",
    "improve this",
    "does this make sense",
    "is this defensible",
    "inspection ready",
}

URGENT_KEYWORDS = {
    "immediate danger",
    "unsafe now",
    "missing child",
    "gone missing",
    "sexual exploitation",
    "assault",
    "self-harm now",
    "suicidal",
    "overdose",
    "serious injury",
    "police now",
    "urgent safeguarding",
}

ESCALATION_KEYWORDS = {
    "notify manager",
    "report to manager",
    "dsl",
    "lado",
    "police",
    "local authority",
    "social worker",
    "on-call",
    "escalate",
}

REPORT_SIGNAL_KEYS = {
    "report_type",
    "period",
    "children_outcomes",
    "incident_summary",
    "safeguarding_summary",
    "compliance_summary",
    "staffing_summary",
    "supervision_summary",
    "management_summary",
    "positive_indicators",
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
    task_type: str = "guidance"
    output_type: str = "plain_response"
    urgency: str = "routine"
    safeguarding_level: str = "normal"
    user_role_profile: str = "staff"
    retrieval_level: str = "none"
    reflection_level: str = "none"
    response_stance: str = "practice_support"
    classification_confidence: float = 0.0
    classification_signals: list[str] = field(default_factory=list)
    secondary_intents: list[str] = field(default_factory=list)
    memory_context: str = ""
    retrieval_context: str = ""
    reflection_context: str = ""
    supervision_context: str = ""
    schema_context: str = ""
    leadership_lens_context: str = ""
    role_lens_context: str = ""
    suggested_actions_context: str = ""
    practice_quality_context: str = ""
    escalation_context: str = ""
    sources_used: list[dict[str, Any]] = field(default_factory=list)


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


def _normalise_text(value: Any) -> str:
    return f" {_safe_string(value).lower()} "


def _normalise_list_of_strings(value: Any, *, limit: int = 20) -> list[str]:
    if not isinstance(value, list):
        return []

    cleaned: list[str] = []
    seen: set[str] = set()

    for item in value[:limit]:
        text = _safe_string(item)
        if not text:
            continue
        lowered = text.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        cleaned.append(text)

    return cleaned


def _normalise_sources(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in value:
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
            "record_type": item.get("record_type"),
            "record_id": item.get("record_id"),
            "citation_ref": item.get("citation_ref"),
            "summary": item.get("summary"),
            "title": item.get("title"),
            "description": item.get("description"),
        }

        key = "|".join(
            str(source.get(k) or "")
            for k in [
                "type",
                "label",
                "document_title",
                "section",
                "page_number",
                "url",
                "record_type",
                "record_id",
                "citation_ref",
            ]
        )
        if key in seen:
            continue

        seen.add(key)
        cleaned.append(source)

    return cleaned


def _append_section(base: str, title: str, content: str) -> str:
    content = _safe_string(content)
    if not content:
        return base

    return (
        f"{base}\n\n"
        "============================================================\n"
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


def _normalise_history(
    history: list[dict[str, Any]] | None,
    max_messages: int = 5,
) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []

    for item in history or []:
        if not isinstance(item, dict):
            continue

        role = _safe_string(item.get("role")).lower()
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
    text = _normalise_text(message)
    return any(word in text for word in GUIDANCE_TRIGGER_WORDS)


def _contains_any(text: str, keywords: set[str]) -> bool:
    normalised = _normalise_text(text)
    return any(keyword in normalised for keyword in keywords)


def _looks_like_internal_report_context(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict) or not user_context:
        return False
    return any(key in user_context for key in REPORT_SIGNAL_KEYS)


def _looks_like_internal_report_request(message: str, user_context: dict[str, Any] | None) -> bool:
    if _looks_like_internal_report_context(user_context):
        return True

    text = _normalise_text(message)
    report_terms = {
        "monthly report",
        "monthly summary",
        "monthly overview",
        "reg 45",
        "regulation 45",
        "annual report",
        "annual overview",
        "yearly report",
        "yearly overview",
    }
    return any(term in text for term in report_terms)


def _normalise_user_role_profile(role: str, user_context: dict[str, Any] | None = None) -> str:
    text = " ".join(
        part
        for part in [
            _safe_string(role).lower(),
            _safe_string((user_context or {}).get("role")).lower(),
            _safe_string((user_context or {}).get("job_title")).lower(),
        ]
        if part
    )

    if any(
        term in text
        for term in {
            "responsible individual",
            "provider",
            "director",
            "head of care",
            "operations manager",
            "service manager",
            "governance",
        }
    ):
        return "provider"

    if any(
        term in text
        for term in {
            "registered manager",
            "deputy",
            "manager",
            "senior",
            "team leader",
            "shift leader",
        }
    ):
        return "manager"

    return "staff"


def _derive_task_type(
    message: str,
    mode: str,
    document_text: str | None,
    user_context: dict[str, Any] | None = None,
) -> str:
    text = _normalise_text(message)

    if _looks_like_internal_report_request(message, user_context):
        return "report"

    if document_text:
        return "document_work"

    if _contains_any(text, QUALITY_CHECK_KEYWORDS) or mode in {"document_review", "manager_review"}:
        return "review"

    if _contains_any(text, DECISION_SUPPORT_KEYWORDS) or mode in {"practical", "support_planning"}:
        return "decision_support"

    if _contains_any(text, PLANNING_KEYWORDS) or mode == "support_planning":
        return "planning"

    if mode in {"supervision", "reflective"}:
        return "reflection"

    if mode in {"handover", "recording", "incident_summary", "chronology", "rewrite"}:
        return "recording"

    if _contains_any(text, RECORDING_KEYWORDS):
        return "recording"

    return "guidance"


def _legacy_output_type_from_mode(mode: str, task_type: str, message: str) -> str:
    text = _normalise_text(message)

    if " chronology " in text or mode == "chronology":
        return "chronology_entry"
    if " handover " in text or mode == "handover":
        return "handover_note"
    if " incident " in text or mode == "incident_summary":
        return "incident_record"
    if " daily note " in text:
        return "daily_note"
    if " risk assessment " in text or mode == "support_planning":
        return "risk_summary"
    if mode == "manager_review":
        return "manager_review"
    if mode == "supervision":
        return "supervision_reflection"
    if task_type == "report":
        return "report"
    if task_type == "recording":
        return "structured_record"
    return "plain_response"


def _map_classifier_output_to_runtime(
    classification_output_format: str,
    legacy_mode: str,
    task_type: str,
    message: str,
) -> str:
    mapping = {
        "handover_note": "handover_note",
        "incident_record": "incident_record",
        "chronology_entry": "chronology_entry",
        "daily_log": "daily_note",
        "support_plan": "risk_summary",
        "manager_update": "manager_review",
        "reflective_debrief": "supervision_reflection",
        "professional_rewrite": "structured_record",
        "safeguarding_note": "structured_record",
        "plain_response": _legacy_output_type_from_mode(legacy_mode, task_type, message),
    }
    return mapping.get(
        classification_output_format,
        _legacy_output_type_from_mode(legacy_mode, task_type, message),
    )


def _derive_urgency(message: str, safeguarding_level: str) -> str:
    text = _normalise_text(message)

    if safeguarding_level == "urgent" or _contains_any(text, URGENT_KEYWORDS):
        return "urgent"
    if safeguarding_level == "heightened":
        return "heightened"
    return "routine"


def _retrieval_level(
    mode: str,
    task_type: str,
    safeguarding_level: str,
    message: str,
    document_text: str | None,
    response_mode: str,
    user_context: dict[str, Any] | None = None,
) -> str:
    if document_text:
        return "none"

    if task_type == "report" or _looks_like_internal_report_context(user_context):
        return "none"

    if response_mode == "quick":
        if _contains_guidance_trigger(message):
            return "light"
        return "none"

    if mode in FAST_MODES_SKIP_RETRIEVAL and not _contains_guidance_trigger(message):
        return "none"

    if safeguarding_level in {"heightened", "urgent"} and task_type == "recording":
        return "none"

    if _contains_guidance_trigger(message):
        return "full" if response_mode == "deep" else "light"

    if task_type in {"planning", "review"}:
        return "full" if response_mode == "deep" else "light"

    if mode in {"factual", "support_planning", "manager_review", "supervision", "general_practice"}:
        return "full" if response_mode == "deep" else "light"

    return "none"


def _should_use_memory(mode: str, response_mode: str, task_type: str) -> bool:
    if response_mode == "quick":
        return False
    if task_type == "report":
        return False
    return mode not in FAST_MODES_LIGHT_MEMORY


def _reflection_level(
    mode: str,
    task_type: str,
    response_mode: str,
    safeguarding_level: str,
) -> str:
    if response_mode == "quick":
        return "none"

    if task_type == "report":
        return "none"

    if response_mode == "deep" and (
        mode in REFLECTIVE_MODES or task_type in {"reflection", "review", "planning"}
    ):
        return "full"

    if safeguarding_level in {"heightened", "urgent"}:
        return "light"

    if mode in {"manager_review", "document_review", "support_planning", "supervision"}:
        return "light"

    if task_type in {"review", "planning"}:
        return "light"

    return "none"


def _should_use_leadership_lens(
    mode: str,
    message: str,
    speed: str,
    role_profile: str,
    task_type: str,
) -> bool:
    if role_profile == "provider":
        return True

    if role_profile == "manager" and task_type in {
        "review",
        "planning",
        "reflection",
        "document_work",
        "report",
    }:
        return True

    if speed == "quick":
        return _contains_any(message, RM_KEYWORDS | OFSTED_KEYWORDS | RI_KEYWORDS)

    if mode in LEADERSHIP_LENS_MODES:
        return True

    if _contains_any(message, RM_KEYWORDS | OFSTED_KEYWORDS | RI_KEYWORDS):
        return True

    return False


def _build_runtime_mode_context(runtime: AssistantRuntimeContext, speed: str) -> str:
    lines = [
        f"Detected task mode: {runtime.mode}",
        f"Detected task type: {runtime.task_type}",
        f"Detected output type: {runtime.output_type}",
        f"Safeguarding level: {runtime.safeguarding_level}",
        f"Urgency: {runtime.urgency}",
        f"Selected response mode: {speed}",
        f"Detected user role profile: {runtime.user_role_profile}",
        f"Response stance: {runtime.response_stance}",
        f"Classification confidence: {runtime.classification_confidence}",
        f"Retrieval level: {runtime.retrieval_level}",
        f"Reflection level: {runtime.reflection_level}",
    ]

    if runtime.secondary_intents:
        lines.append(f"Secondary intents: {', '.join(runtime.secondary_intents)}")

    if runtime.classification_signals:
        lines.append(f"Classification signals: {', '.join(runtime.classification_signals[:8])}")

    lines.append("")
    lines.append(
        "Use these as working signals for tone, structure, caution, accountability, and practical focus."
    )

    return "\n".join(lines)


def _build_role_lens_context(role_profile: str) -> str:
    if role_profile
