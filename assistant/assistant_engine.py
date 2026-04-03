from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

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


def _derive_task_type(message: str, mode: str, document_text: str | None) -> str:
    text = (message or "").lower()

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
    text = (message or "").lower()

    if "chronology" in text or mode == "chronology":
        return "chronology_entry"
    if "handover" in text or mode == "handover":
        return "handover_note"
    if "incident" in text or mode == "incident_summary":
        return "incident_record"
    if "daily note" in text:
        return "daily_note"
    if "risk assessment" in text or mode == "support_planning":
        return "risk_summary"
    if mode == "manager_review":
        return "manager_review"
    if mode == "supervision":
        return "supervision_reflection"
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
    return mapping.get(classification_output_format, _legacy_output_type_from_mode(legacy_mode, task_type, message))


def _derive_urgency(message: str, safeguarding_level: str) -> str:
    text = (message or "").lower()

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
) -> str:
    if document_text:
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


def _should_use_memory(mode: str, response_mode: str) -> bool:
    if response_mode == "quick":
        return False
    return mode not in FAST_MODES_LIGHT_MEMORY


def _reflection_level(mode: str, task_type: str, response_mode: str, safeguarding_level: str) -> str:
    if response_mode == "quick":
        return "none"

    if response_mode == "deep" and (mode in REFLECTIVE_MODES or task_type in {"reflection", "review", "planning"}):
        return "full"

    if safeguarding_level in {"heightened", "urgent"}:
        return "light"

    if mode in {"manager_review", "document_review", "support_planning", "supervision"}:
        return "light"

    if task_type in {"review", "planning"}:
        return "light"

    return "none"


def _should_use_leadership_lens(mode: str, message: str, speed: str, role_profile: str, task_type: str) -> bool:
    if role_profile == "provider":
        return True

    if role_profile == "manager" and task_type in {"review", "planning", "reflection", "document_work"}:
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
    lines.append("Use these as working signals for tone, structure, caution, accountability, and practical focus.")

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
    text = (message or "").lower()

    emphasise_rm = (
        role_profile == "manager"
        or mode in {"manager_review", "support_planning", "supervision", "document_review"}
        or task_type in {"review", "planning"}
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
    text = (message or "").lower()
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

    if output_type in {"incident_record", "chronology_entry", "daily_note", "structured_record"}:
        actions.extend(
            [
                "Keep wording factual, neutral, and time-anchored.",
                "Separate observation, action, and outcome clearly.",
            ]
        )

    if output_type == "handover_note":
        actions.extend(
            [
                "Highlight outstanding risks, unfinished actions, and what the next shift needs to know.",
            ]
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

    if role_profile in {"manager", "provider"}:
        actions.extend(
            [
                "Notice any pattern, consistency issue, drift, or management follow-up requirement.",
            ]
        )

    if _contains_any(text, ESCALATION_KEYWORDS):
        actions.append("Be explicit about who should be informed, by whom, and on what timescale.")

    deduped: list[str] = []
    for item in actions:
        if item not in deduped:
            deduped.append(item)

    if not deduped:
        return ""

    return "SUGGESTED ACTIONS TO WEIGH INTO THE RESPONSE:\n" + "\n".join(f"• {a}" for a in deduped)


def _build_practice_quality_context(task_type: str, output_type: str, safeguarding_level: str) -> str:
    checks: list[str] = [
        "Keep wording factual, specific, and professionally neutral.",
        "Avoid vague statements, assumptions, or emotional overstatement.",
        "Where relevant, include observation, action taken, outcome, and next step.",
    ]

    if output_type in {"incident_record", "chronology_entry", "daily_note", "structured_record", "handover_note"}:
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

    if safeguarding_level in {"heightened", "urgent"}:
        checks.append("Do not let polished wording replace clear safeguarding action and escalation logic.")

    return "PRACTICE QUALITY CHECK:\n" + "\n".join(f"• {c}" for c in checks)


def _build_escalation_context(urgency: str, safeguarding_level: str, role_profile: str, message: str) -> str:
    text = (message or "").lower()
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

    if role_profile in {"manager", "provider"} and _contains_any(text, ESCALATION_KEYWORDS | URGENT_KEYWORDS):
        blocks.append(
            "LEADERSHIP ESCALATION FOCUS:\n"
            "• Highlight oversight, follow-up, and assurance responsibilities where relevant."
        )

    return "\n\n".join(blocks).strip()


def _build_document_source(document_name: str | None) -> dict[str, Any]:
    return {
        "type": "uploaded_document",
        "label": f"Uploaded document: {_safe_string(document_name) or 'Uploaded document'}",
        "document_title": _safe_string(document_name) or "Uploaded document",
        "section": "",
        "page_number": None,
        "excerpt": "",
        "url": None,
    }


def _safe_classify_intent(message: str, history: list[dict[str, Any]], role: str):
    try:
        return classify_intent(message=message, history=history, role=role)
    except Exception:
        logger.exception("Intent classification failed")
        return classify_intent(message=message, history=[], role=role)


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
        if not isinstance(sources, list):
            sources = []
        return context_text, sources
    except TypeError:
        try:
            bundle = retrieve_context_bundle(req.message, limit=limit)
            context_text = _safe_string(bundle.get("context_text"))
            sources = bundle.get("sources") if isinstance(bundle, dict) else []
            if not isinstance(sources, list):
                sources = []
            return context_text, sources
        except Exception:
            logger.exception("Retrieval failed")
            return "", []
    except Exception:
        logger.exception("Retrieval failed")
        return "", []


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

    classification = _safe_classify_intent(message, history, req.role)

    runtime.mode = classification.legacy_mode or "general_practice"
    runtime.response_stance = classification.response_stance or "practice_support"
    runtime.classification_confidence = classification.confidence or 0.0
    runtime.classification_signals = classification.matched_signals or []
    runtime.secondary_intents = classification.secondary_intents or []

    runtime.safeguarding_level = _safe_assess_safeguarding(message, history)
    runtime.user_role_profile = _normalise_user_role_profile(req.role, req.user_context)
    runtime.task_type = _derive_task_type(message, runtime.mode, req.document_text)
    runtime.output_type = _map_classifier_output_to_runtime(
        classification.output_format,
        runtime.mode,
        runtime.task_type,
        message,
    )
    runtime.urgency = _derive_urgency(message, runtime.safeguarding_level)
    runtime.retrieval_level = _retrieval_level(
        runtime.mode,
        runtime.task_type,
        runtime.safeguarding_level,
        message,
        req.document_text,
        speed,
    )
    runtime.reflection_level = _reflection_level(
        runtime.mode,
        runtime.task_type,
        speed,
        runtime.safeguarding_level,
    )
    runtime.schema_context = _safe_schema_context(runtime.mode, runtime.safeguarding_level)
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

    if speed != "quick":
        if _should_use_memory(runtime.mode, speed):
            runtime.memory_context = _safe_memory_context(req, runtime.mode, speed)

        if runtime.retrieval_level != "none":
            runtime.retrieval_context, runtime.sources_used = _safe_retrieval_bundle(
                req,
                runtime.mode,
                runtime.safeguarding_level,
                speed,
                runtime.retrieval_level,
            )

        if not isinstance(runtime.sources_used, list):
            runtime.sources_used = []

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
            s.get("type") == "uploaded_document"
            and s.get("document_title") == uploaded_source["document_title"]
            for s in runtime.sources_used
        ):
            runtime.sources_used.append(uploaded_source)

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
    system_prompt = _append_section(system_prompt, "ROLE ADAPTATION CONTEXT", runtime.role_lens_context)
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
    system_prompt = _append_section(system_prompt, "ESCALATION CONTEXT", runtime.escalation_context)

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
                f"Distinguish clearly between source material and inference.\n"
                f"If information is missing, label gaps clearly.\n"
                f"When rewriting, preserve core facts unless the user explicitly asks for adaptation.\n\n"
                f"Document text:\n{trimmed_document_text}"
            ),
        )

    logger.info(
        (
            "Assistant prompt package built "
            "session_id=%s mode=%s task_type=%s output_type=%s "
            "safeguarding=%s urgency=%s response_mode=%s role_profile=%s "
            "stance=%s confidence=%s retrieval_level=%s reflection_level=%s "
            "memory=%s retrieval=%s reflection=%s supervision=%s leadership_lens=%s suggested_actions=%s sources=%s"
        ),
        req.session_id,
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
    )

    return AssistantPromptPackage(
        system_prompt=system_prompt.strip(),
        user_message=user_message.strip(),
        runtime=runtime,
    )
