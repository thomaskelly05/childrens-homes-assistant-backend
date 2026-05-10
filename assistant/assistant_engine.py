from __future__ import annotations

import json
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

OS_ASSISTANT_TYPES = {
    "young_people_os",
    "home_os",
    "quality_os",
    "ofsted_os",
    "manager_os",
}

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
    "daily log",
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
    "report_snapshot",
}

SCOPED_CONTEXT_SIGNAL_KEYS = {
    "scope",
    "scope_type",
    "assistant_type",
    "assistant_surface",
    "requires_evidence_grounding",
    "young_person",
    "identity",
    "active_work",
    "recent_records",
    "links",
    "scoped_record",
    "home",
    "homes",
    "team",
    "tasks",
    "communications",
    "documents",
    "reports",
    "incidents",
    "inspection_actions",
    "inspection_lines",
    "audits",
    "compliance_items",
    "young_people",
    "summary",
    "evidence_index",
    "sources",
}

REPORT_REQUEST_TERMS = {
    "monthly report",
    "monthly summary",
    "monthly overview",
    "reg 45",
    "reg45",
    "regulation 45",
    "annual report",
    "annual overview",
    "yearly report",
    "yearly overview",
    "inspection overview",
    "quality overview",
    "quality review",
    "service overview",
}

OS_RECORD_SPECIFIC_TERMS = {
    "record",
    "records",
    "whole record",
    "whole scoped record",
    "across all records",
    "full summary",
    "full overview",
    "chronology",
    "timeline",
    "risk",
    "incident",
    "handover",
    "daily note",
    "daily log",
    "evidence",
    "what is missing",
    "what does the record show",
    "what do the records show",
    "reg 45",
    "reg45",
    "inspection",
    "ofsted",
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
    assistant_surface: str = "standalone"
    requires_evidence_grounding: bool = False
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
    scoped_context_summary: str = ""
    evidence_safety_context: str = ""
    surface_context: str = ""
    missing_evidence_context: str = ""
    sources_used: list[dict[str, Any]] = field(default_factory=list)
    evidence_index: list[dict[str, Any]] = field(default_factory=list)


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


def _normalise_speed(speed: str | None) -> str:
    value = _safe_string(speed).lower()
    if value in {"quick", "balanced", "deep"}:
        return value
    if value == "slow":
        return "deep"
    return "balanced"


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


def _assistant_surface_from_context(user_context: dict[str, Any] | None) -> str:
    if not isinstance(user_context, dict):
        return "standalone"

    explicit = _safe_string(user_context.get("assistant_surface")).lower()
    if explicit in {"standalone", "os_embedded"}:
        return explicit

    assistant_type = _safe_string(user_context.get("assistant_type")).lower()
    if assistant_type in OS_ASSISTANT_TYPES or assistant_type.endswith("_os"):
        return "os_embedded"

    scope_type = _safe_string(user_context.get("scope_type")).lower()
    if scope_type in {"young_person", "child", "home", "quality"}:
        return "os_embedded"

    scope = user_context.get("scope")
    if isinstance(scope, dict):
        nested_scope_type = _safe_string(scope.get("scope_type") or scope.get("scope")).lower()
        if nested_scope_type in {"young_person", "child", "home", "quality"}:
            return "os_embedded"
    elif _safe_string(scope).lower() in {"young_person", "child", "home", "quality"}:
        return "os_embedded"

    return "standalone"


def _requires_evidence_grounding(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict):
        return False

    explicit = user_context.get("requires_evidence_grounding")
    if isinstance(explicit, bool):
        return explicit

    return _assistant_surface_from_context(user_context) == "os_embedded"


def _looks_like_internal_report_context(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict) or not user_context:
        return False
    return any(key in user_context for key in REPORT_SIGNAL_KEYS)


def _looks_like_scoped_os_context(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict) or not user_context:
        return False
    return any(key in user_context for key in SCOPED_CONTEXT_SIGNAL_KEYS)


def _has_structured_evidence(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict):
        return False

    if _extract_evidence_index_from_user_context(user_context):
        return True

    if _extract_sources_from_user_context(user_context):
        return True

    return False


def _looks_like_internal_report_request(
    message: str,
    user_context: dict[str, Any] | None,
) -> bool:
    if _looks_like_internal_report_context(user_context):
        return True

    text = _normalise_text(message)
    return any(term in text for term in REPORT_REQUEST_TERMS)


def _looks_like_os_record_specific_request(message: str) -> bool:
    text = _normalise_text(message)
    return any(term in text for term in OS_RECORD_SPECIFIC_TERMS)


def _normalise_user_role_profile(
    role: str,
    user_context: dict[str, Any] | None = None,
) -> str:
    text = " ".join(
        part
        for part in [
            _safe_string(role).lower(),
            _safe_string((user_context or {}).get("role")).lower(),
            _safe_string((user_context or {}).get("job_title")).lower(),
            _safe_string((user_context or {}).get("user_role")).lower(),
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
            "ri",
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

    if _contains_any(text, QUALITY_CHECK_KEYWORDS) or mode in {
        "document_review",
        "manager_review",
    }:
        return "review"

    if _contains_any(text, PLANNING_KEYWORDS) or mode == "support_planning":
        return "planning"

    if _contains_any(text, DECISION_SUPPORT_KEYWORDS) or mode == "practical":
        return "decision_support"

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
    if " daily note " in text or " daily log " in text:
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
    user_context: dict[str, Any] | None = None,
) -> str:
    if _looks_like_internal_report_request(message, user_context):
        return "report"

    mapping = {
        "handover_note": "handover_note",
        "incident_record": "incident_record",
        "chronology_entry": "chronology_entry",
        "daily_log": "daily_note",
        "daily_note": "daily_note",
        "support_plan": "risk_summary",
        "manager_update": "manager_review",
        "reflective_debrief": "supervision_reflection",
        "professional_rewrite": "structured_record",
        "safeguarding_note": "structured_record",
        "report": "report",
        "structured_report": "report",
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
    assistant_surface = _assistant_surface_from_context(user_context)
    requires_evidence_grounding = _requires_evidence_grounding(user_context)

    if document_text:
        return "none"

    if _looks_like_internal_report_context(user_context):
        return "none"

    if requires_evidence_grounding and _has_structured_evidence(user_context):
        return "none"

    if requires_evidence_grounding and _looks_like_os_record_specific_request(message):
        return "none"

    if response_mode == "quick":
        if _contains_guidance_trigger(message) and assistant_surface == "standalone":
            return "light"
        return "none"

    if mode in FAST_MODES_SKIP_RETRIEVAL and not _contains_guidance_trigger(message):
        return "none"

    if safeguarding_level in {"heightened", "urgent"} and task_type == "recording":
        return "none"

    if _contains_guidance_trigger(message):
        return "full" if response_mode == "deep" else "light"

    if task_type in {"planning", "review", "decision_support"}:
        return "full" if response_mode == "deep" else "light"

    if mode in {
        "factual",
        "support_planning",
        "manager_review",
        "supervision",
        "general_practice",
    }:
        return "full" if response_mode == "deep" else "light"

    return "none"


def _should_use_memory(
    mode: str,
    response_mode: str,
    task_type: str,
    user_context: dict[str, Any] | None = None,
) -> bool:
    assistant_surface = _assistant_surface_from_context(user_context)

    if response_mode == "quick":
        return False
    if task_type == "report":
        return False
    if assistant_surface == "os_embedded":
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

    if task_type in {"review", "planning", "decision_support"}:
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


def _normalise_sources(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in value:
        if not isinstance(item, dict):
            continue

        record_type = item.get("record_type") or item.get("type")
        record_id = item.get("record_id") or item.get("id")

        source = {
            "type": item.get("type"),
            "source_type": item.get("source_type"),
            "label": item.get("label"),
            "document_title": item.get("document_title"),
            "section": item.get("section"),
            "page_number": item.get("page_number"),
            "excerpt": item.get("excerpt"),
            "url": item.get("url"),
            "record_type": record_type,
            "record_id": record_id,
            "citation_ref": item.get("citation_ref") or item.get("citation_format"),
            "summary": item.get("summary"),
            "title": item.get("title"),
            "description": item.get("description"),
            "date": item.get("date"),
            "event_at": item.get("event_at"),
            "updated_at": item.get("updated_at"),
            "scope_type": item.get("scope_type"),
            "young_person_id": item.get("young_person_id"),
            "home_id": item.get("home_id"),
            "deep_link": item.get("deep_link"),
            "is_record_source": bool(item.get("is_record_source")),
        }

        if source["record_type"] and source["record_id"] and not source["citation_ref"]:
            source["citation_ref"] = f"[{source['record_type']}:{source['record_id']}]"

        key = "|".join(
            str(source.get(k) or "")
            for k in [
                "type",
                "source_type",
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


def _normalise_evidence_index(value: Any, limit: int = 120) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []

    cleaned: list[dict[str, Any]] = []
    seen: set[str] = set()

    for item in value[:limit]:
        if not isinstance(item, dict):
            continue

        record_type = item.get("record_type") or item.get("type")
        record_id = item.get("record_id") or item.get("id")
        citation_ref = item.get("citation_ref") or item.get("citation_format")

        if not citation_ref and record_type and record_id:
            citation_ref = f"[{record_type}:{record_id}]"

        entry = {
            "citation_ref": citation_ref,
            "record_type": record_type,
            "record_id": record_id,
            "label": item.get("label"),
            "title": item.get("title"),
            "section": item.get("section"),
            "excerpt": item.get("excerpt"),
            "summary": item.get("summary"),
            "description": item.get("description"),
            "date": item.get("date") or item.get("event_at") or item.get("updated_at"),
            "event_at": item.get("event_at"),
            "updated_at": item.get("updated_at"),
            "url": item.get("url"),
            "scope_type": item.get("scope_type"),
            "young_person_id": item.get("young_person_id"),
            "home_id": item.get("home_id"),
            "deep_link": item.get("deep_link"),
        }

        key = "|".join(
            str(entry.get(k) or "")
            for k in [
                "citation_ref",
                "record_type",
                "record_id",
                "label",
                "section",
                "url",
            ]
        )

        if key in seen:
            continue

        seen.add(key)
        cleaned.append(entry)

    return cleaned


def _extract_sources_from_user_context(user_context: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(user_context, dict):
        return []

    candidates = (
        user_context.get("sources"),
        (user_context.get("context") or {}).get("sources")
        if isinstance(user_context.get("context"), dict)
        else None,
        (user_context.get("runtime") or {}).get("sources")
        if isinstance(user_context.get("runtime"), dict)
        else None,
    )

    for candidate in candidates:
        if isinstance(candidate, list):
            return _normalise_sources(candidate)

    return []


def _extract_evidence_index_from_user_context(user_context: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(user_context, dict):
        return []

    candidates = (
        user_context.get("evidence_index"),
        (user_context.get("context") or {}).get("evidence_index")
        if isinstance(user_context.get("context"), dict)
        else None,
        (user_context.get("runtime") or {}).get("evidence_index")
        if isinstance(user_context.get("runtime"), dict)
        else None,
    )

    for candidate in candidates:
        if isinstance(candidate, list):
            return _normalise_evidence_index(candidate)

    return []


def _build_evidence_index_prompt_block(evidence_index: list[dict[str, Any]], limit: int = 40) -> str:
    if not evidence_index:
        return ""

    trimmed = evidence_index[:limit]

    return (
        "Use this structured evidence index as the primary evidence pool where relevant.\n"
        "Prefer citation_ref values exactly as supplied.\n"
        "Do not invent citations.\n"
        "Do not cite any record that is not listed here or visible elsewhere in the scoped context.\n"
        "If a point is not supported by this evidence, say it is not visible.\n\n"
        + json.dumps(trimmed, ensure_ascii=False, indent=2)
    )


def _build_surface_context(runtime: AssistantRuntimeContext) -> str:
    if runtime.assistant_surface == "os_embedded":
        return (
            "OS-EMBEDDED ASSISTANT MODE:\n"
            "• You are operating inside IndiCare OS.\n"
            "• Scoped records, evidence indexes, sources, and runtime context are the primary source of truth.\n"
            "• Do not answer record-specific questions from general knowledge alone.\n"
            "• If scoped evidence is missing, limited, unclear, or outside the visible context, say so directly.\n"
            "• Use exact citation_ref values where supplied.\n"
            "• Never invent record IDs, dates, incidents, risks, chronology, outcomes, actions, progress, staff responses, or citations.\n"
            "• General guidance may support interpretation, but it must not be presented as evidence that something happened."
        )

    return (
        "STANDALONE ASSISTANT MODE:\n"
        "• You are operating as the standalone IndiCare assistant.\n"
        "• You can support residential childcare practice, drafting, reflection, learning, and professional wording.\n"
        "• You cannot see IndiCare OS records unless the user supplies record content, an uploaded document, or runtime context.\n"
        "• Do not imply access to a child, home, incident, chronology, care record, or evidence index unless it is visible.\n"
        "• If the user asks for record-specific analysis without records, explain that you need the relevant record content."
    )


def _build_missing_evidence_context(
    runtime: AssistantRuntimeContext,
    message: str,
) -> str:
    if runtime.assistant_surface != "os_embedded":
        return ""

    if runtime.evidence_index or runtime.sources_used:
        return ""

    if not _looks_like_os_record_specific_request(message):
        return ""

    return (
        "MISSING OS EVIDENCE WARNING:\n"
        "• The user appears to be asking something record-specific, but no structured evidence or source list is visible.\n"
        "• Do not infer what the records say.\n"
        "• Say that scoped evidence is not visible.\n"
        "• You may provide general practice guidance only if useful and clearly label it as general guidance, not record evidence."
    )


def _build_evidence_safety_context(runtime: AssistantRuntimeContext) -> str:
    lines = [
        "EVIDENCE SAFETY OVERRIDE:",
        "• Use visible scoped records, structured sources, uploaded documents, or retrieved knowledge only as supplied.",
        "• Do not invent record IDs, dates, incidents, risks, outcomes, actions, or names.",
        "• Cite young person/home record evidence using the exact citation_ref where supplied.",
        "• If no citation_ref is supplied but record_type and record_id are visible, use [record_type:record_id].",
        "• Do not treat internal knowledge or statutory guidance as evidence that something happened to a child.",
        "• Separate facts, patterns, concerns, and recommendations.",
        "• Include what is not visible / missing evidence when answering record summaries, reviews, reports, or risk questions.",
        "• Frame recommendations as staff or manager review points, not final decisions.",
    ]

    if runtime.assistant_surface == "os_embedded":
        lines.append("• OS embedded mode requires evidence-led answers for record-specific questions.")
    else:
        lines.append("• Standalone mode must not imply access to OS records unless records are supplied.")

    if runtime.evidence_index:
        lines.append(f"• Structured evidence items available: {len(runtime.evidence_index)}.")
    else:
        lines.append("• No structured evidence index is visible. Do not pretend one is available.")

    record_sources = [
        source
        for source in runtime.sources_used
        if source.get("record_type") or source.get("record_id") or source.get("citation_ref")
    ]

    if record_sources:
        lines.append(f"• Structured record/source items available: {len(record_sources)}.")

    return "\n".join(lines)


def _build_scoped_context_summary(user_context: dict[str, Any] | None) -> str:
    if not isinstance(user_context, dict) or not user_context:
        return ""

    scope = _safe_string(user_context.get("scope"))
    scope_type = _safe_string(user_context.get("scope_type"))
    assistant_type = _safe_string(user_context.get("assistant_type"))
    assistant_surface = _assistant_surface_from_context(user_context)
    young_person_name = _safe_string(user_context.get("young_person_name"))
    home_name = _safe_string(user_context.get("home_name"))
    access_level = _safe_string(user_context.get("access_level"))
    report_type = _safe_string(user_context.get("report_type"))

    lines: list[str] = []

    lines.append(f"Assistant surface: {assistant_surface}")

    if assistant_type:
        lines.append(f"Assistant type: {assistant_type}")
    if scope or scope_type:
        lines.append(f"Scope: {scope or scope_type}")
    if scope_type:
        lines.append(f"Scope type: {scope_type}")
    if access_level:
        lines.append(f"Access level: {access_level}")
    if young_person_name:
        lines.append(f"Young person: {young_person_name}")
    if home_name:
        lines.append(f"Home: {home_name}")
    if report_type:
        lines.append(f"Report type: {report_type}")

    young_person = user_context.get("young_person")
    if isinstance(young_person, dict):
        placement_status = _safe_string(young_person.get("placement_status"))
        summary_risk_level = _safe_string(young_person.get("summary_risk_level"))
        if placement_status:
            lines.append(f"Placement status: {placement_status}")
        if summary_risk_level:
            lines.append(f"Summary risk level: {summary_risk_level}")

    summary = user_context.get("summary")
    if isinstance(summary, dict) and summary:
        for key, value in summary.items():
            if value in (None, "", [], {}):
                continue
            label = key.replace("_", " ").strip().title()
            lines.append(f"{label}: {value}")

    if isinstance(user_context.get("allowed_home_ids"), list):
        lines.append(f"Allowed homes count: {len(user_context.get('allowed_home_ids') or [])}")

    evidence_count = len(_extract_evidence_index_from_user_context(user_context))
    source_count = len(_extract_sources_from_user_context(user_context))

    if evidence_count:
        lines.append(f"Evidence items available: {evidence_count}")
    if source_count:
        lines.append(f"Structured sources available: {source_count}")

    return "\n".join(lines)


def _build_document_source(document_name: str | None) -> dict[str, Any]:
    return {
        "type": "uploaded_document",
        "source_type": "uploaded_document",
        "label": f"Uploaded document: {_safe_string(document_name) or 'Uploaded document'}",
        "document_title": _safe_string(document_name) or "Uploaded document",
        "section": "",
        "page_number": None,
        "excerpt": "",
        "url": None,
        "record_type": None,
        "record_id": None,
        "citation_ref": None,
        "summary": None,
        "title": None,
        "description": None,
        "date": None,
        "event_at": None,
        "updated_at": None,
        "scope_type": None,
        "young_person_id": None,
        "home_id": None,
        "deep_link": None,
        "is_record_source": False,
    }


def _safe_classify_intent(message: str, history: list[dict[str, Any]], role: str):
    try:
        return classify_intent(message=message, history=history, role=role)
    except Exception:
        logger.exception("Intent classification failed; retrying without history")
        try:
            return classify_intent(message=message, history=[], role=role)
        except Exception:
            logger.exception("Intent classification fallback failed")

            class FallbackClassification:
                legacy_mode = "general_practice"
                response_stance = "practice_support"
                confidence = 0.0
                matched_signals: list[str] = []
                secondary_intents: list[str] = []
                output_format = "plain_response"

            return FallbackClassification()


def _safe_assess_safeguarding(message: str, history: list[dict[str, Any]]) -> str:
    try:
        level = assess_safeguarding_level(message=message, history=history)
    except TypeError:
        try:
            level = assess_safeguarding_level(message)
        except Exception:
            logger.exception("Safeguarding assessment failed")
            return "normal"
    except Exception:
        logger.exception("Safeguarding assessment failed")
        return "normal"

    safe_level = _safe_string(level).lower()
    if safe_level in {"normal", "watchful", "heightened", "urgent"}:
        return safe_level
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


def _safe_retrieval_bundle(
    req: AssistantRequest,
    mode: str,
    safeguarding_level: str,
    speed: str,
    retrieval_level: str,
) -> tuple[str, list[dict[str, Any]]]:
    limit = 1 if retrieval_level == "light" else 2
    if speed == "deep" and retrieval_level == "full":
        limit = 3

    try:
        bundle = retrieve_context_bundle(
            message=req.message,
            mode=mode,
            safeguarding_level=safeguarding_level,
            document_text=req.document_text,
            document_name=req.document_name,
            role=req.role,
            limit=limit,
        )

        context_text = _safe_string(bundle.get("context_text"))
        sources = bundle.get("sources") if isinstance(bundle, dict) else []
        return context_text, _normalise_sources(sources)

    except TypeError:
        try:
            bundle = retrieve_context_bundle(req.message, limit=limit)
            context_text = _safe_string(bundle.get("context_text"))
            sources = bundle.get("sources") if isinstance(bundle, dict) else []
            return context_text, _normalise_sources(sources)
        except Exception:
            logger.exception("Retrieval failed")
            return "", []
    except Exception:
        logger.exception("Retrieval failed")
        return "", []


def _safe_reflection_context(
    message: str,
    mode: str,
    safeguarding_level: str,
    history: list[dict[str, Any]],
) -> str:
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


def _safe_supervision_context(
    message: str,
    mode: str,
    safeguarding_level: str,
    history: list[dict[str, Any]],
) -> str:
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


def _build_runtime_mode_context(runtime: AssistantRuntimeContext, speed: str) -> str:
    lines = [
        f"Detected task mode: {runtime.mode}",
        f"Detected task type: {runtime.task_type}",
        f"Detected output type: {runtime.output_type}",
        f"Safeguarding level: {runtime.safeguarding_level}",
        f"Urgency: {runtime.urgency}",
        f"Selected response mode: {speed}",
        f"Detected user role profile: {runtime.user_role_profile}",
        f"Assistant surface: {runtime.assistant_surface}",
        f"Requires evidence grounding: {runtime.requires_evidence_grounding}",
        f"Response stance: {runtime.response_stance}",
        f"Classification confidence: {runtime.classification_confidence}",
        f"Retrieval level: {runtime.retrieval_level}",
        f"Reflection level: {runtime.reflection_level}",
        f"Structured evidence items: {len(runtime.evidence_index)}",
        f"Structured sources: {len(runtime.sources_used)}",
    ]

    if runtime.secondary_intents:
        lines.append(f"Secondary intents: {', '.join(runtime.secondary_intents)}")

    if runtime.classification_signals:
        lines.append(
            f"Classification signals: {', '.join(runtime.classification_signals[:8])}"
        )

    lines.append("")
    lines.append(
        "Use these as working signals for tone, structure, caution, accountability, and practical focus."
    )

    return "\n".join(lines)


def _build_role_lens_context(role_profile: str) -> str:
    if role_profile == "provider":
        return (
            "PROVIDER / RESPONSIBLE INDIVIDUAL ROLE ADAPTATION:\n"
            "• Write with stronger attention to governance, oversight, patterns, provider risk, quality assurance, and service-wide implications.\n"
            "• Distinguish clearly between a one-off issue and a systemic issue.\n"
            "• Highlight what may require provider-level monitoring, escalation, assurance, or follow-up.\n"
            "• Keep the response grounded in children’s lived experience, but include leadership and governance implications where relevant."
        )

    if role_profile == "manager":
        return (
            "MANAGER / REGISTERED MANAGER ROLE ADAPTATION:\n"
            "• Write with stronger attention to safety, defensibility, staff actions, recording quality, care planning quality, consistency of practice, and management follow-up.\n"
            "• Highlight what should be escalated, reviewed, handed over, monitored, or strengthened.\n"
            "• Where relevant, show what a strong manager would notice, challenge, or tighten."
        )

    return (
        "STAFF ROLE ADAPTATION:\n"
        "• Prioritise practical, shift-usable, clear guidance.\n"
        "• Keep outputs actionable, concrete, and easy to use in real residential care work.\n"
        "• Do not overload the response with management-level analysis unless the task clearly calls for it."
    )


def _build_leadership_lens_context(
    mode: str,
    safeguarding_level: str,
    message: str,
    role_profile: str,
    task_type: str,
) -> str:
    text = _normalise_text(message)

    emphasise_rm = (
        role_profile == "manager"
        or mode in {"manager_review", "support_planning", "supervision", "document_review"}
        or task_type in {"review", "planning", "report"}
        or _contains_any(text, RM_KEYWORDS)
    )
    emphasise_ofsted = (
        mode in {"manager_review", "document_review", "factual"}
        or _contains_any(text, OFSTED_KEYWORDS)
    )
    emphasise_ri = (
        role_profile == "provider"
        or mode in {"manager_review", "supervision"}
        or _contains_any(text, RI_KEYWORDS)
    )

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


def _build_suggested_actions_context(
    mode: str,
    task_type: str,
    output_type: str,
    safeguarding_level: str,
    urgency: str,
    role_profile: str,
    message: str,
) -> str:
    text = _normalise_text(message)
    actions: list[str] = []

    if urgency == "urgent" or safeguarding_level == "urgent":
        actions.extend(
            [
                "Prioritise immediate safety and protective action before documentation detail.",
                "Consider immediate escalation to manager / on-call / safeguarding lead / emergency services where indicated.",
                "Record exact times, actions taken, who was informed, and the immediate outcome.",
            ]
        )
    elif safeguarding_level == "heightened":
        actions.extend(
            [
                "Clarify current risk level and whether additional safeguarding discussion or management oversight is needed.",
                "Record what was observed, what was reported, and what action was taken.",
            ]
        )

    if output_type in {
        "incident_record",
        "chronology_entry",
        "daily_note",
        "structured_record",
    }:
        actions.extend(
            [
                "Keep wording factual, neutral, and time-anchored.",
                "Separate observation, action, and outcome clearly.",
            ]
        )

    if output_type == "handover_note":
        actions.append(
            "Highlight outstanding risks, unfinished actions, and what the next shift needs to know."
        )

    if task_type == "planning":
        actions.extend(
            [
                "Identify triggers, protective factors, and practical staff responses.",
                "Consider whether a plan, risk assessment, or support strategy needs updating.",
            ]
        )

    if task_type == "review":
        actions.extend(
            [
                "Identify any gaps, weak wording, or missing evidence.",
                "Show what should be followed up, reviewed, or strengthened.",
            ]
        )

    if task_type == "report":
        actions.extend(
            [
                "Balance strengths and progress with concerns and risks.",
                "Use only the supplied report facts and clearly state where evidence is limited.",
                "Highlight clear management priorities and recommendations.",
            ]
        )

    if role_profile in {"manager", "provider"}:
        actions.append(
            "Notice any pattern, consistency issue, drift, or management follow-up requirement."
        )

    if _contains_any(text, ESCALATION_KEYWORDS):
        actions.append(
            "Be explicit about who should be informed, by whom, and on what timescale."
        )

    deduped: list[str] = []
    seen: set[str] = set()

    for item in actions:
        lowered = item.lower()
        if lowered in seen:
            continue
        seen.add(lowered)
        deduped.append(item)

    if not deduped:
        return ""

    return "SUGGESTED ACTIONS TO WEIGH INTO THE RESPONSE:\n" + "\n".join(
        f"• {action}" for action in deduped
    )


def _build_practice_quality_context(
    task_type: str,
    output_type: str,
    safeguarding_level: str,
) -> str:
    checks: list[str] = [
        "Keep wording factual, specific, and professionally neutral.",
        "Avoid vague statements, assumptions, or emotional overstatement.",
        "Where relevant, include observation, action taken, outcome, and next step.",
        "Where structured evidence exists, use it directly rather than reverting to generic guidance.",
        "Use citation_ref markers exactly where evidence supports the point.",
        "Do not invent citations where evidence is missing.",
    ]

    if output_type in {
        "incident_record",
        "chronology_entry",
        "daily_note",
        "structured_record",
        "handover_note",
    }:
        checks.extend(
            [
                "Use clear sequencing and time-linked language where possible.",
                "Distinguish what was seen, heard, reported, and done.",
            ]
        )

    if task_type in {"review", "document_work"}:
        checks.extend(
            [
                "Identify missing evidence, missing actions, or weak wording clearly.",
                "Strengthen defensibility and inspection-readiness where relevant.",
            ]
        )

    if task_type == "report":
        checks.extend(
            [
                "Keep the report structured, balanced, and evidence-led.",
                "Do not invent themes, incidents, patterns, or outcomes.",
                "State clearly where evidence is limited or incomplete.",
                "Use the available evidence index and scoped records as the primary source base.",
            ]
        )

    if safeguarding_level in {"heightened", "urgent"}:
        checks.append(
            "Do not let polished wording replace clear safeguarding action and escalation logic."
        )

    return "PRACTICE QUALITY CHECK:\n" + "\n".join(f"• {check}" for check in checks)


def _build_escalation_context(
    urgency: str,
    safeguarding_level: str,
    role_profile: str,
    message: str,
) -> str:
    text = _normalise_text(message)
    blocks: list[str] = []

    if urgency == "urgent" or safeguarding_level == "urgent":
        blocks.append(
            "URGENT SAFEGUARDING OVERRIDE:\n"
            "• Put immediate safety first.\n"
            "• Lead with urgent actions before reflective or stylistic detail.\n"
            "• Be explicit about escalation, who needs to be informed, and what should be recorded immediately."
        )
    elif safeguarding_level == "heightened":
        blocks.append(
            "HEIGHTENED SAFEGUARDING PRIORITY:\n"
            "• Keep escalation, clarity of concern, and recording quality prominent.\n"
            "• Make sure the response does not minimise risk or become overly vague."
        )

    if role_profile in {"manager", "provider"} and _contains_any(
        text, ESCALATION_KEYWORDS | URGENT_KEYWORDS
    ):
        blocks.append(
            "LEADERSHIP ESCALATION FOCUS:\n"
            "• Highlight oversight, follow-up, and assurance responsibilities where relevant."
        )

    return "\n\n".join(blocks).strip()


def build_assistant_prompt_package(req: AssistantRequest) -> AssistantPromptPackage:
    message = _safe_string(req.message)
    speed = _normalise_speed(req.speed)

    history = _normalise_history(
        req.history,
        max_messages=_history_limit_for_speed(speed),
    )

    runtime = AssistantRuntimeContext()
    runtime.assistant_surface = _assistant_surface_from_context(req.user_context)
    runtime.requires_evidence_grounding = _requires_evidence_grounding(req.user_context)

    classification = _safe_classify_intent(message, history, req.role)

    runtime.mode = _safe_string(getattr(classification, "legacy_mode", "")) or "general_practice"
    runtime.response_stance = (
        _safe_string(getattr(classification, "response_stance", "")) or "practice_support"
    )

    raw_confidence = getattr(classification, "confidence", 0.0)
    try:
        runtime.classification_confidence = float(raw_confidence or 0.0)
    except (TypeError, ValueError):
        runtime.classification_confidence = 0.0

    matched_signals = getattr(classification, "matched_signals", []) or []
    runtime.classification_signals = [
        _safe_string(item) for item in matched_signals if _safe_string(item)
    ]

    secondary_intents = getattr(classification, "secondary_intents", []) or []
    runtime.secondary_intents = [
        _safe_string(item) for item in secondary_intents if _safe_string(item)
    ]

    runtime.safeguarding_level = _safe_assess_safeguarding(message, history)
    runtime.user_role_profile = _normalise_user_role_profile(req.role, req.user_context)

    runtime.task_type = _derive_task_type(
        message,
        runtime.mode,
        req.document_text,
        req.user_context,
    )

    runtime.output_type = _map_classifier_output_to_runtime(
        _safe_string(getattr(classification, "output_format", "")),
        runtime.mode,
        runtime.task_type,
        message,
        req.user_context,
    )

    runtime.urgency = _derive_urgency(message, runtime.safeguarding_level)

    runtime.evidence_index = _extract_evidence_index_from_user_context(req.user_context)

    context_sources = _extract_sources_from_user_context(req.user_context)
    if context_sources:
        runtime.sources_used.extend(context_sources)

    runtime.retrieval_level = _retrieval_level(
        runtime.mode,
        runtime.task_type,
        runtime.safeguarding_level,
        message,
        req.document_text,
        speed,
        req.user_context,
    )

    runtime.reflection_level = _reflection_level(
        runtime.mode,
        runtime.task_type,
        speed,
        runtime.safeguarding_level,
    )

    runtime.schema_context = _safe_schema_context(
        runtime.mode,
        runtime.safeguarding_level,
    )

    runtime.role_lens_context = _build_role_lens_context(runtime.user_role_profile)

    runtime.suggested_actions_context = _build_suggested_actions_context(
        runtime.mode,
        runtime.task_type,
        runtime.output_type,
        runtime.safeguarding_level,
        runtime.urgency,
        runtime.user_role_profile,
        message,
    )

    runtime.practice_quality_context = _build_practice_quality_context(
        runtime.task_type,
        runtime.output_type,
        runtime.safeguarding_level,
    )

    runtime.escalation_context = _build_escalation_context(
        runtime.urgency,
        runtime.safeguarding_level,
        runtime.user_role_profile,
        message,
    )

    runtime.scoped_context_summary = _build_scoped_context_summary(req.user_context)

    if speed != "quick":
        if _should_use_memory(runtime.mode, speed, runtime.task_type, req.user_context):
            runtime.memory_context = _safe_memory_context(req, runtime.mode, speed)

        if runtime.retrieval_level != "none":
            retrieved_context, retrieved_sources = _safe_retrieval_bundle(
                req,
                runtime.mode,
                runtime.safeguarding_level,
                speed,
                runtime.retrieval_level,
            )
            runtime.retrieval_context = retrieved_context
            runtime.sources_used.extend(retrieved_sources)

        runtime.sources_used = _normalise_sources(runtime.sources_used)

        if runtime.reflection_level in {"light", "full"}:
            runtime.reflection_context = _safe_reflection_context(
                message,
                runtime.mode,
                runtime.safeguarding_level,
                history,
            )

        if runtime.reflection_level == "full":
            runtime.supervision_context = _safe_supervision_context(
                message,
                runtime.mode,
                runtime.safeguarding_level,
                history,
            )
    else:
        runtime.sources_used = _normalise_sources(runtime.sources_used)

    if _should_use_leadership_lens(
        runtime.mode,
        message,
        speed,
        runtime.user_role_profile,
        runtime.task_type,
    ):
        runtime.leadership_lens_context = _build_leadership_lens_context(
            runtime.mode,
            runtime.safeguarding_level,
            message,
            runtime.user_role_profile,
            runtime.task_type,
        )

    if req.document_text:
        uploaded_source = _build_document_source(req.document_name)
        if not any(
            _safe_string(source.get("type")) == "uploaded_document"
            and _safe_string(source.get("document_title")) == uploaded_source["document_title"]
            for source in runtime.sources_used
            if isinstance(source, dict)
        ):
            runtime.sources_used.append(uploaded_source)

    runtime.sources_used = _normalise_sources(runtime.sources_used)
    runtime.surface_context = _build_surface_context(runtime)
    runtime.missing_evidence_context = _build_missing_evidence_context(runtime, message)
    runtime.evidence_safety_context = _build_evidence_safety_context(runtime)

    system_prompt, user_message = build_chat_prompt(
        message=message,
        role=req.role,
        ld_lens=req.ld_lens,
        training_mode=req.training_mode,
        speed=speed,
    )

    system_prompt = append_ai_boundaries(system_prompt)

    system_prompt = _append_section(
        system_prompt,
        "ASSISTANT SURFACE CONTEXT",
        runtime.surface_context,
    )

    system_prompt = _append_section(
        system_prompt,
        "RUNTIME MODE CONTEXT",
        _build_runtime_mode_context(runtime, speed),
    )

    system_prompt = _append_section(
        system_prompt,
        "EVIDENCE SAFETY CONTEXT",
        runtime.evidence_safety_context,
    )

    system_prompt = _append_section(
        system_prompt,
        "MISSING EVIDENCE CONTEXT",
        runtime.missing_evidence_context,
    )

    system_prompt = _append_section(
        system_prompt,
        "SCOPED OPERATIONAL CONTEXT",
        runtime.scoped_context_summary,
    )

    system_prompt = _append_section(
        system_prompt,
        "RESPONSE STRUCTURE",
        runtime.schema_context,
    )

    system_prompt = _append_section(
        system_prompt,
        "ROLE ADAPTATION CONTEXT",
        runtime.role_lens_context,
    )

    system_prompt = _append_section(
        system_prompt,
        "LEADERSHIP / INSPECTION LENS CONTEXT",
        runtime.leadership_lens_context,
    )

    system_prompt = _append_section(
        system_prompt,
        "SUGGESTED ACTIONS CONTEXT",
        runtime.suggested_actions_context,
    )

    system_prompt = _append_section(
        system_prompt,
        "PRACTICE QUALITY CONTEXT",
        runtime.practice_quality_context,
    )

    system_prompt = _append_section(
        system_prompt,
        "ESCALATION CONTEXT",
        runtime.escalation_context,
    )

    system_prompt = _append_section(
        system_prompt,
        "STRUCTURED EVIDENCE INDEX",
        _build_evidence_index_prompt_block(runtime.evidence_index),
    )

    if speed != "quick":
        system_prompt = _append_section(
            system_prompt,
            "MEMORY CONTEXT",
            runtime.memory_context,
        )

        system_prompt = _append_section(
            system_prompt,
            "RETRIEVED CONTEXT",
            runtime.retrieval_context,
        )

        system_prompt = _append_section(
            system_prompt,
            "REFLECTION CONTEXT",
            runtime.reflection_context,
        )

        system_prompt = _append_section(
            system_prompt,
            "SUPERVISION CONTEXT",
            runtime.supervision_context,
        )

    if req.document_text:
        trimmed_document_text = req.document_text[
            : _document_trim_limit(runtime.mode, speed)
        ]

        system_prompt = _append_section(
            system_prompt,
            "UPLOADED DOCUMENT CONTEXT",
            (
                f"Document name: {req.document_name or 'Uploaded document'}\n\n"
                "Use this document as working source material where relevant.\n"
                "Do not invent facts beyond the document and the user's instructions.\n"
                "Distinguish clearly between source material and inference.\n"
                "If information is missing, label gaps clearly.\n"
                "When rewriting, preserve core facts unless the user explicitly asks for adaptation.\n\n"
                f"Document text:\n{trimmed_document_text}"
            ),
        )

    logger.info(
        (
            "Assistant prompt package built "
            "session_id=%s surface=%s mode=%s task_type=%s output_type=%s "
            "safeguarding=%s urgency=%s response_mode=%s role_profile=%s "
            "stance=%s confidence=%s retrieval_level=%s reflection_level=%s "
            "memory=%s retrieval=%s reflection=%s supervision=%s leadership_lens=%s "
            "suggested_actions=%s sources=%s evidence=%s scoped_context=%s"
        ),
        req.session_id,
        runtime.assistant_surface,
        runtime.mode,
        runtime.task_type,
        runtime.output_type,
        runtime.safeguarding_level,
        runtime.urgency,
        speed,
        runtime.user_role_profile,
        runtime.response_stance,
        runtime.classification_confidence,
        runtime.retrieval_level,
        runtime.reflection_level,
        bool(runtime.memory_context),
        bool(runtime.retrieval_context),
        bool(runtime.reflection_context),
        bool(runtime.supervision_context),
        bool(runtime.leadership_lens_context),
        bool(runtime.suggested_actions_context),
        len(runtime.sources_used),
        len(runtime.evidence_index),
        bool(runtime.scoped_context_summary),
    )

    return AssistantPromptPackage(
        system_prompt=system_prompt.strip(),
        user_message=user_message.strip(),
        runtime=runtime,
    )