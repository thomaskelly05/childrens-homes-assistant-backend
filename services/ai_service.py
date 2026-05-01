from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Any

from assistant.assistant_response_pipeline import (
    build_pipeline_prompt_blocks,
    process_assistant_response,
)
from assistant.audit_logger import (
    AssistantAuditTimer,
    log_assistant_request_finished,
    log_assistant_request_started,
)
from assistant.explainability import (
    build_explainability_payload,
    build_loading_updates,
)
from assistant.llm_provider import ChatStreamRequest, get_llm_provider
from assistant.web_search import web_search
from services.assistant_orchestrator import OrchestratorRequest, build_orchestrator_result

logger = logging.getLogger("indicare.ai_service")

SEARCH_TIMEOUT_SECONDS = float(os.getenv("GUIDANCE_SEARCH_TIMEOUT_SECONDS", "3.0"))

OS_ASSISTANT_TYPES = {
    "young_people_os",
    "home_os",
    "quality_os",
    "ofsted_os",
    "manager_os",
}


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


def _normalise_response_mode(response_mode: str | None, speed: str | None) -> str:
    value = _safe_string(response_mode or speed or "balanced").lower()
    if value in {"quick", "balanced", "deep"}:
        return value
    if value == "slow":
        return "deep"
    return "balanced"


def _assistant_surface_from_context(user_context: dict[str, Any]) -> str:
    explicit = _safe_string(user_context.get("assistant_surface")).lower()
    if explicit in {"standalone", "os_embedded"}:
        return explicit

    assistant_type = _safe_string(user_context.get("assistant_type")).lower()
    if assistant_type in OS_ASSISTANT_TYPES or assistant_type.endswith("_os"):
        return "os_embedded"

    scope_type = _safe_string(user_context.get("scope_type")).lower()
    if scope_type in {"young_person", "home", "quality", "child"}:
        return "os_embedded"

    return "standalone"


def _enrich_surface_context(user_context: dict[str, Any]) -> dict[str, Any]:
    enriched = dict(user_context or {})
    assistant_surface = _assistant_surface_from_context(enriched)

    enriched["assistant_surface"] = assistant_surface
    enriched["requires_evidence_grounding"] = assistant_surface == "os_embedded"

    if assistant_surface == "standalone":
        enriched.setdefault("assistant_type", "standalone")
    else:
        enriched.setdefault("assistant_type", "os_embedded")

    return enriched


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


def _trim_search_results(search_results: str, selected_mode: str) -> str:
    text = _safe_string(search_results)
    if not text:
        return ""

    if selected_mode == "quick":
        limit = 1500
    elif selected_mode == "deep":
        limit = 5000
    else:
        limit = 3000

    return text[:limit]


def _trim_messages_for_mode(
    messages: list[dict[str, Any]] | None,
    selected_mode: str,
) -> list[dict[str, Any]]:
    if not messages:
        return []

    if selected_mode == "quick":
        keep = 4
        max_chars = 1200
    elif selected_mode == "deep":
        keep = 8
        max_chars = 2800
    else:
        keep = 6
        max_chars = 1800

    trimmed: list[dict[str, Any]] = []

    for item in messages[-keep:]:
        if not isinstance(item, dict):
            continue

        role = _safe_string(item.get("role")).lower()
        content = _safe_string(item.get("content") or item.get("message"))

        if role not in {"user", "assistant", "system"}:
            continue
        if not content:
            continue

        trimmed.append(
            {
                "role": role,
                "content": content[:max_chars],
            }
        )

    return trimmed


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
        citation_ref = item.get("citation_ref") or item.get("citation_format")

        if not citation_ref and record_type and record_id:
            citation_ref = f"[{record_type}:{record_id}]"

        source = {
            "type": item.get("type"),
            "source_type": item.get("source_type"),
            "label": item.get("label"),
            "document_title": item.get("document_title"),
            "title": item.get("title"),
            "summary": item.get("summary"),
            "description": item.get("description"),
            "section": item.get("section"),
            "page_number": item.get("page_number"),
            "excerpt": item.get("excerpt"),
            "url": item.get("url"),
            "record_type": record_type,
            "record_id": record_id,
            "citation_ref": citation_ref,
            "date": item.get("date") or item.get("event_at") or item.get("updated_at"),
            "event_at": item.get("event_at"),
            "updated_at": item.get("updated_at"),
            "scope_type": item.get("scope_type"),
            "young_person_id": item.get("young_person_id"),
            "home_id": item.get("home_id"),
            "deep_link": item.get("deep_link"),
            "is_record_source": bool(item.get("is_record_source")),
        }

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


def _merge_sources(*source_lists: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()

    for source_list in source_lists:
        for item in _normalise_sources(source_list):
            key = "|".join(
                str(item.get(k) or "")
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
            merged.append(item)

    return merged


def _normalise_evidence_index(value: Any, *, limit: int = 300) -> list[dict[str, Any]]:
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

        evidence = {
            "citation_ref": citation_ref,
            "record_type": record_type,
            "record_id": record_id,
            "label": item.get("label"),
            "title": item.get("title"),
            "section": item.get("section"),
            "excerpt": item.get("excerpt"),
            "summary": item.get("summary"),
            "description": item.get("description"),
            "event_at": item.get("event_at"),
            "updated_at": item.get("updated_at"),
            "date": item.get("date") or item.get("event_at") or item.get("updated_at"),
            "url": item.get("url"),
            "scope_type": item.get("scope_type"),
            "young_person_id": item.get("young_person_id"),
            "home_id": item.get("home_id"),
            "deep_link": item.get("deep_link"),
        }

        key = "|".join(
            str(evidence.get(k) or "")
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
        cleaned.append(evidence)

    return cleaned


def _merge_evidence_indexes(*evidence_lists: list[dict[str, Any]]) -> list[dict[str, Any]]:
    merged: list[dict[str, Any]] = []
    seen: set[str] = set()

    for evidence_list in evidence_lists:
        for item in _normalise_evidence_index(evidence_list):
            key = "|".join(
                str(item.get(k) or "")
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
            merged.append(item)

    return merged


def _normalise_suggested_actions(value: Any) -> list[Any]:
    if not isinstance(value, list):
        return []

    cleaned: list[Any] = []
    seen: set[str] = set()

    for item in value:
        if isinstance(item, dict):
            try:
                key = json.dumps(item, sort_keys=True, ensure_ascii=False)
            except Exception:
                continue

            if key in seen:
                continue

            seen.add(key)
            cleaned.append(item)
            continue

        text = _safe_string(item)
        if not text:
            continue

        lowered = text.lower()
        if lowered in seen:
            continue

        seen.add(lowered)
        cleaned.append(text)

    return cleaned


def _extract_structured_payload(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None

    structured_keys = {
        "answer",
        "text",
        "message",
        "content",
        "sources",
        "runtime",
        "explainability",
        "assistant_scope",
        "assistant_context",
        "suggested_actions",
        "evidence_index",
    }

    if any(key in value for key in structured_keys):
        return value

    return None


def _extract_text_from_provider_payload(value: Any) -> str:
    if isinstance(value, str):
        return value

    if not isinstance(value, dict):
        return ""

    direct_candidates = [
        value.get("text"),
        value.get("message"),
        value.get("answer"),
        value.get("output"),
        value.get("content"),
    ]

    for candidate in direct_candidates:
        if isinstance(candidate, str) and candidate.strip():
            return candidate

    content = value.get("content")
    if isinstance(content, dict):
        for candidate in [
            content.get("text"),
            content.get("message"),
            content.get("answer"),
            content.get("output"),
            content.get("content"),
        ]:
            if isinstance(candidate, str) and candidate.strip():
                return candidate

    return ""


def _has_internal_snapshot_context(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict) or not user_context:
        return False

    if user_context.get("report_type") in {"monthly", "reg45", "yearly"}:
        return True

    if user_context.get("report_snapshot"):
        return True

    keys = {
        "children_outcomes",
        "incident_summary",
        "safeguarding_summary",
        "compliance_summary",
        "staffing_summary",
        "supervision_summary",
        "management_summary",
        "positive_indicators",
        "young_person",
        "identity",
        "active_work",
        "recent_records",
        "team",
        "tasks",
        "communications",
        "documents",
        "inspection_actions",
        "inspection_lines",
        "homes",
        "audits",
        "evidence_index",
        "sources",
    }

    return any(key in user_context for key in keys)


def _should_skip_guidance_search(
    *,
    task_type: str,
    output_type: str,
    user_context: dict[str, Any] | None,
    has_document_text: bool,
) -> bool:
    internal_snapshot_task = _has_internal_snapshot_context(user_context)

    if internal_snapshot_task and not has_document_text:
        return True

    if task_type in {"report", "summary", "draft"} and internal_snapshot_task:
        return True

    if output_type in {"report", "structured_report", "email_report", "reg45_report"} and internal_snapshot_task:
        return True

    return False


async def _maybe_run_guidance_search(
    *,
    enabled: bool,
    search_query: str,
) -> str:
    if not enabled:
        return ""

    query = _safe_string(search_query)
    if not query:
        return ""

    try:
        result = await asyncio.wait_for(
            asyncio.to_thread(web_search, query),
            timeout=SEARCH_TIMEOUT_SECONDS,
        )
        return _safe_string(result)
    except asyncio.TimeoutError:
        logger.warning("Guidance search timed out")
        return ""
    except Exception:
        logger.exception("Guidance search failed")
        return ""


def _append_live_guidance_context(system_prompt: str, search_results: str) -> str:
    if not _safe_string(search_results):
        return system_prompt

    return (
        f"{system_prompt}\n\n"
        "============================================================\n"
        "LIVE GUIDANCE CONTEXT\n\n"
        "The following trusted guidance excerpts were retrieved for this request.\n"
        "Where relevant, prioritise Children’s Homes Regulations 2015, the Quality Standards,\n"
        "the Guide to the Children’s Homes Regulations including the Quality Standards,\n"
        "SCCIF expectations, safeguarding guidance, and official children’s homes practice frameworks.\n\n"
        f"{search_results}\n\n"
        "Use this material only where it genuinely improves accuracy.\n"
        "Do not overstate what the guidance says.\n"
        "Do not let guidance replace the specific evidence in the OS record.\n"
        "If guidance and local evidence differ, say so clearly."
    ).strip()


def _append_service_level_answer_rules(
    system_prompt: str,
    *,
    assistant_surface: str,
) -> str:
    if assistant_surface == "os_embedded":
        surface_rules = """
OS-EMBEDDED ASSISTANT RULES:
- Treat scoped OS evidence as the primary source of truth.
- Do not answer record-specific questions from general practice knowledge alone.
- If scoped evidence is missing, limited or unclear, say this directly.
- Cite exact citation_ref values where evidence supports a claim.
- Do not invent chronology, incidents, risks, progress, outcomes, staff actions or dates.
- General guidance may support interpretation, but must not be presented as evidence that something happened.
""".strip()
    else:
        surface_rules = """
STANDALONE ASSISTANT RULES:
- You are not inside the OS record unless the user supplies record content.
- Do not imply access to a child, home, incident, chronology or care record unless provided.
- You may give practice guidance, drafting support, reflective support and professional wording.
- If the user asks about their IndiCare records, explain that you need the relevant record content or OS context.
""".strip()

    extra = f"""
============================================================
SERVICE-LEVEL ANSWER RULES

{surface_rules}

Your answer must:
- stay within the authorised children’s residential care scope
- be practical, analytical and safeguarding-aware
- keep children’s lived experience central where relevant
- distinguish clearly between evidence, concern, inference and missing information
- avoid generic filler and unsupported statements
- use inline citations throughout when evidence exists
- not cluster all citations only at the end
- not invent citations for unsupported claims
- match the user’s requested structure exactly where one is given
- avoid markdown headings if the user asked for plain section labels only

If the request is inspection, RI, manager, home oversight, chronology, Reg 45, compliance or safeguarding related:
- answer as an experienced children’s homes professional
- think in line with Ofsted, SCCIF, the Quality Standards, leadership and management expectations, and safe residential practice
"""
    return f"{system_prompt}\n\n{extra}".strip()


def _build_context_evidence_block(
    *,
    evidence_index: list[dict[str, Any]],
    sources: list[dict[str, Any]],
    user_context: dict[str, Any],
    selected_mode: str,
) -> str:
    lines: list[str] = []

    scope_value = user_context.get("scope")
    scope_type = _safe_string(user_context.get("scope_type"))
    if not scope_type and isinstance(scope_value, dict):
        scope_type = _safe_string(scope_value.get("scope_type"))
    elif not scope_type:
        scope_type = _safe_string(scope_value)

    young_person = user_context.get("young_person")
    home = user_context.get("home")

    young_person_name = _safe_string(user_context.get("young_person_name"))
    if not young_person_name and isinstance(young_person, dict):
        young_person_name = _safe_string(
            young_person.get("preferred_name")
            or young_person.get("full_name")
            or young_person.get("name")
        )

    home_name = _safe_string(user_context.get("home_name"))
    if not home_name and isinstance(home, dict):
        home_name = _safe_string(home.get("home_name") or home.get("name"))

    lines.append("============================================================")
    lines.append("OPERATIONAL RECORD CONTEXT")
    lines.append("")

    if scope_type:
        lines.append(f"Scope type: {scope_type}")
    if young_person_name:
        lines.append(f"Young person: {young_person_name}")
    if home_name:
        lines.append(f"Home: {home_name}")

    child_voice_summary = user_context.get("child_voice_summary")
    if isinstance(child_voice_summary, dict):
        themes = child_voice_summary.get("themes") or []
        voice_entries = child_voice_summary.get("recent_voice_entries") or []
        if themes:
            lines.append(f"Child voice themes: {', '.join(str(x) for x in themes[:6])}")
        if voice_entries:
            lines.append("Recent child voice extracts:")
            for entry in voice_entries[:4]:
                if not isinstance(entry, dict):
                    continue
                text = _safe_string(entry.get("text"))
                source_bucket = _safe_string(entry.get("source_bucket"))
                record_id = entry.get("record_id")
                if text:
                    lines.append(f"- {source_bucket}:{record_id} — {text[:180]}")

    report_snapshot = user_context.get("report_snapshot")
    if isinstance(report_snapshot, dict):
        lines.append("")
        lines.append("Report snapshot available: yes")
        report_type = _safe_string(report_snapshot.get("report_type"))
        if report_type:
            lines.append(f"Report type: {report_type}")

    if not evidence_index and not sources:
        lines.append("")
        lines.append("No structured evidence items were attached.")
        lines.append("If the user asks for record-specific conclusions, say the evidence is not visible.")
        return "\n".join(lines).strip()

    if selected_mode == "quick":
        evidence_limit = 10
        source_limit = 8
    elif selected_mode == "deep":
        evidence_limit = 28
        source_limit = 20
    else:
        evidence_limit = 18
        source_limit = 12

    if evidence_index:
        lines.append("")
        lines.append("Evidence index:")
        for item in evidence_index[:evidence_limit]:
            if not isinstance(item, dict):
                continue
            citation_ref = _safe_string(item.get("citation_ref"))
            label = _safe_string(item.get("label") or item.get("title"))
            section = _safe_string(item.get("section"))
            excerpt = _safe_string(item.get("excerpt") or item.get("summary") or item.get("description"))
            record_type = _safe_string(item.get("record_type"))
            record_id = _safe_string(item.get("record_id"))
            lines.append(
                f"- citation_ref={citation_ref}; type={record_type}; id={record_id}; "
                f"section={section}; label={label}; excerpt={excerpt[:220]}"
            )

    if sources:
        lines.append("")
        lines.append("Available sources:")
        for item in sources[:source_limit]:
            if not isinstance(item, dict):
                continue
            citation_ref = _safe_string(item.get("citation_ref"))
            record_type = _safe_string(item.get("record_type"))
            record_id = _safe_string(item.get("record_id"))
            label = _safe_string(item.get("label") or item.get("title"))
            section = _safe_string(item.get("section"))
            excerpt = _safe_string(item.get("excerpt"))
            lines.append(
                f"- citation_ref={citation_ref}; type={record_type}; id={record_id}; "
                f"section={section}; label={label}; excerpt={excerpt[:180]}"
            )

    lines.append("")
    lines.append("Use these citation_ref values inline wherever evidence supports the statement.")
    lines.append("Prefer specific operational evidence before general guidance.")
    lines.append("If evidence is missing, limited or unclear, say this explicitly.")

    return "\n".join(lines).strip()


def _append_internal_evidence_context(
    system_prompt: str,
    *,
    evidence_index: list[dict[str, Any]],
    sources: list[dict[str, Any]],
    user_context: dict[str, Any],
    selected_mode: str,
) -> str:
    evidence_block = _build_context_evidence_block(
        evidence_index=evidence_index,
        sources=sources,
        user_context=user_context,
        selected_mode=selected_mode,
    )
    if not evidence_block:
        return system_prompt

    return f"{system_prompt}\n\n{evidence_block}".strip()


def _append_citation_rules(
    system_prompt: str,
    *,
    evidence_index: list[dict[str, Any]],
    sources: list[dict[str, Any]],
) -> str:
    if not evidence_index and not sources:
        return system_prompt

    extra = """
============================================================
EVIDENCE AND CITATION RULES

You have access to internal operational evidence with citation_ref values.

Rules:
- When making evidence-based statements, cite inline using the exact citation_ref in square brackets, for example [incident:123].
- Prefer direct internal evidence over generic guidance.
- Do not invent citation_ref values.
- Never write broken citations such as [daily_note:] or [incident:] without an ID.
- If no ID is visible, say "record ID not visible" rather than creating a broken citation.
- If multiple items support a sentence, cite more than one when useful.
- If evidence is partial, say it is partial.
- If the request asks for an overview, synthesise the evidence but still cite key claims.
- If the user asks for "whole scoped record", "across all records", "full summary", or similar, use the evidence index as the source boundary.
- If the evidence index is small or missing, say clearly that only limited evidence is visible.
- For Reg 45, overview, chronology, safeguarding, quality or compliance requests, evidence-led analysis is required.
"""
    return f"{system_prompt}\n\n{extra}".strip()


def _classify_source_groups(sources: list[dict[str, Any]]) -> dict[str, int]:
    counts = {
        "internal_evidence": 0,
        "live_guidance": 0,
        "documents": 0,
        "other": 0,
    }

    for item in sources:
        source_type = _safe_string(item.get("type") or item.get("source_type")).lower()
        url = _safe_string(item.get("url")).lower()
        record_type = _safe_string(item.get("record_type")).lower()

        if record_type or source_type in {
            "record",
            "record_item",
            "timeline",
            "incident",
            "daily_note",
            "handover",
            "chronology",
            "evidence",
            "internal",
        }:
            counts["internal_evidence"] += 1
        elif source_type in {"guidance", "web", "live_guidance", "official_guidance"} or url.startswith("http"):
            counts["live_guidance"] += 1
        elif source_type in {"document", "uploaded_document", "library_document"} or item.get("document_title"):
            counts["documents"] += 1
        else:
            counts["other"] += 1

    return counts


def _has_inline_citation_markers(answer_text: str) -> bool:
    text = _safe_string(answer_text)
    if not text:
        return False

    return bool(re.search(r"\[[A-Za-z][A-Za-z0-9_\-]*:\d+[A-Za-z0-9_\-]*\]", text))


def _estimate_evidence_sufficiency(
    *,
    sources: list[dict[str, Any]],
    evidence_index: list[dict[str, Any]],
    guidance_used: bool,
) -> str:
    evidence_count = len(evidence_index)
    source_count = len(sources)

    if evidence_count >= 8 or source_count >= 8:
        return "strong"
    if evidence_count >= 3 or source_count >= 4:
        return "moderate"
    if guidance_used or evidence_count >= 1 or source_count >= 1:
        return "limited"
    return "weak"


def _estimate_answer_confidence(
    *,
    answer_text: str,
    output_type: str,
    evidence_sufficiency: str,
    provider_success: bool,
) -> str:
    text = _safe_string(answer_text)

    if not provider_success or not text:
        return "low"

    if output_type in {"report", "structured_report", "email_report", "reg45_report"}:
        if evidence_sufficiency == "strong" and len(text) >= 800:
            return "high"
        if evidence_sufficiency in {"strong", "moderate"} and len(text) >= 400:
            return "medium"
        return "low"

    if evidence_sufficiency == "strong" and len(text) >= 200:
        return "high"
    if evidence_sufficiency in {"strong", "moderate", "limited"} and len(text) >= 80:
        return "medium"
    return "low"


def _build_answer_quality_flags(
    *,
    answer_text: str,
    output_type: str,
    sources: list[dict[str, Any]],
    evidence_index: list[dict[str, Any]],
    assistant_surface: str,
) -> dict[str, Any]:
    text = _safe_string(answer_text)
    evidence_available = bool(sources or evidence_index)
    has_citation_markers = _has_inline_citation_markers(text)

    answer_empty = not bool(text)
    too_short_for_report = output_type in {
        "report",
        "structured_report",
        "email_report",
        "reg45_report",
    } and len(text) < 250
    possible_missing_citations = evidence_available and text and not has_citation_markers
    os_answer_without_evidence = assistant_surface == "os_embedded" and not evidence_available

    warnings: list[str] = []
    if answer_empty:
        warnings.append("answer_empty")
    if too_short_for_report:
        warnings.append("report_answer_short")
    if possible_missing_citations:
        warnings.append("possible_missing_citations")
    if os_answer_without_evidence:
        warnings.append("os_answer_without_visible_evidence")

    return {
        "answer_empty": answer_empty,
        "too_short_for_report": too_short_for_report,
        "possible_missing_citations": possible_missing_citations,
        "os_answer_without_evidence": os_answer_without_evidence,
        "warnings": warnings,
    }


def _build_safe_user_fallback_text(
    *,
    safeguarding_level: str = "normal",
) -> str:
    if safeguarding_level in {"heightened", "urgent"}:
        return (
            "I couldn’t generate the full response. If this involves immediate risk or a safeguarding concern, "
            "follow your home’s safeguarding, on-call, medical, police or emergency procedure now. "
            "Record the facts, times, actions taken, who was informed, and the current outcome."
        )

    return "Sorry, something went wrong while generating the response. Please try again."


def _build_empty_answer_fallback_text(
    *,
    output_type: str,
    guidance_used: bool,
    source_count: int,
    safeguarding_level: str,
) -> str:
    if safeguarding_level in {"heightened", "urgent"}:
        return (
            "I couldn’t generate a usable response. Because this may involve safeguarding, prioritise immediate safety, "
            "follow your safeguarding/on-call procedure, and record the facts, actions, people informed, and outcome."
        )

    if output_type in {"report", "structured_report", "email_report", "reg45_report"}:
        return (
            "I couldn’t generate a usable report from the available material. "
            "Please review the evidence, then try again."
        )

    if guidance_used or source_count > 0:
        return (
            "I couldn’t generate a usable response from the available material. "
            "Please try again or refine the request."
        )

    return "I couldn’t generate a usable response. Please try again."


def _filter_provider_runtime_overrides(value: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}

    allowed_keys = {
        "provider_name",
        "provider_model",
        "token_usage",
        "finish_reason",
        "citations_used",
        "tools_used",
        "answer_style",
        "reasoning_mode",
    }

    return {
        key: value[key]
        for key in allowed_keys
        if key in value
    }


def _normalise_assistant_scope(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _normalise_assistant_context(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _looks_record_specific_request(message: str) -> bool:
    text = _safe_string(message).lower()
    terms = {
        "record",
        "records",
        "chronology",
        "timeline",
        "summary",
        "overview",
        "risk",
        "incident",
        "handover",
        "daily note",
        "daily log",
        "whole scoped",
        "whole record",
        "across all",
        "what is missing",
        "what evidence",
        "reg 45",
        "reg45",
        "inspection",
    }
    return any(term in text for term in terms)


def _append_os_no_evidence_warning_if_needed(
    *,
    answer_text: str,
    assistant_surface: str,
    evidence_index: list[dict[str, Any]],
    sources: list[dict[str, Any]],
    message: str,
) -> str:
    if assistant_surface != "os_embedded":
        return answer_text

    if evidence_index or sources:
        return answer_text

    if not _looks_record_specific_request(message):
        return answer_text

    warning = (
        "I can’t see enough scoped OS evidence to answer this as a record-based view. "
        "I can give general practice guidance, but I should not infer incidents, risks, patterns, "
        "actions or outcomes without visible records."
    )

    if not answer_text:
        return warning

    if warning.lower() in answer_text.lower():
        return answer_text

    return f"{warning}\n\n{answer_text}".strip()


async def generate_ai_stream(
    message: str,
    session_id: str,
    history=None,
    document_text: str | None = None,
    document_name: str | None = None,
    role: str = "residential care staff",
    ld_lens: bool = False,
    training_mode: bool = False,
    speed: str = "balanced",
    user_context: dict | None = None,
    response_mode: str = "balanced",
    user_id: str | int | None = None,
    conversation_id: str | int | None = None,
):
    history = history or []
    user_context = _enrich_surface_context(user_context or {})

    timer = AssistantAuditTimer.start()
    request_audit_event = None

    selected_mode = _normalise_response_mode(response_mode, speed)
    trimmed_document_text = _trim_document_text(document_text, selected_mode)
    assistant_surface = _assistant_surface_from_context(user_context)

    orchestration = build_orchestrator_result(
        OrchestratorRequest(
            message=message,
            session_id=session_id,
            history=history,
            role=role,
            document_text=trimmed_document_text,
            document_name=document_name,
            ld_lens=ld_lens,
            training_mode=training_mode,
            speed=selected_mode,
            user_context=user_context,
            user_id=user_id,
        )
    )

    runtime = orchestration.runtime
    model_plan = orchestration.model_plan
    guidance_plan = orchestration.guidance_plan

    system_prompt = orchestration.system_prompt
    user_message = orchestration.user_message
    trimmed_history = _trim_messages_for_mode(orchestration.trimmed_history, selected_mode)

    mode = getattr(runtime, "mode", "general_practice")
    safeguarding_level = getattr(runtime, "safeguarding_level", "normal")
    task_type = getattr(runtime, "task_type", "guidance")
    output_type = getattr(runtime, "output_type", "plain_response")

    if _safe_bool(user_context.get("reg45_requested")) or _safe_string(user_context.get("report_type")).lower() == "reg45":
        output_type = "structured_report"
        task_type = "report"

    orchestration_sources = _normalise_sources(orchestration.sources)
    context_sources = _normalise_sources(user_context.get("sources"))

    runtime_payload = dict(orchestration.runtime_payload or {})
    runtime_payload["assistant_surface"] = assistant_surface
    runtime_payload["requires_evidence_grounding"] = assistant_surface == "os_embedded"

    explainability_payload = build_explainability_payload(
        user_message=message,
        orchestration=orchestration,
    )
    explainability_payload["assistant_surface"] = assistant_surface

    orchestration_evidence_index = _normalise_evidence_index(
        runtime_payload.get("evidence_index") or []
    )
    context_evidence_index = _normalise_evidence_index(user_context.get("evidence_index") or [])

    request_audit_event = log_assistant_request_started(
        session_id=session_id,
        conversation_id=_safe_string(conversation_id or session_id),
        user_id=user_id,
        role=role,
        message=message,
        selected_mode=selected_mode,
        orchestration=orchestration,
    )

    skip_guidance_search = _should_skip_guidance_search(
        task_type=task_type,
        output_type=output_type,
        user_context=user_context,
        has_document_text=bool(trimmed_document_text),
    )
    guidance_enabled = bool(guidance_plan.enabled) and not skip_guidance_search

    for sentence in build_loading_updates(
        stage="initial_review",
        orchestration=orchestration,
        search_enabled=guidance_enabled,
        has_search_results=False,
    ):
        if _safe_string(sentence):
            yield {
                "type": "progress",
                "content": sentence,
            }

    search_results = await _maybe_run_guidance_search(
        enabled=guidance_enabled,
        search_query=guidance_plan.search_query,
    )
    trimmed_search_results = _trim_search_results(search_results, selected_mode)

    for sentence in build_loading_updates(
        stage="post_search",
        orchestration=orchestration,
        search_enabled=guidance_enabled,
        has_search_results=bool(trimmed_search_results),
    ):
        if _safe_string(sentence):
            yield {
                "type": "progress",
                "content": sentence,
            }

    merged_pre_provider_sources = _merge_sources(
        orchestration_sources,
        context_sources,
    )
    merged_pre_provider_evidence = _merge_evidence_indexes(
        orchestration_evidence_index,
        context_evidence_index,
        runtime_payload.get("evidence_index") or [],
    )

    final_system_prompt = _append_live_guidance_context(system_prompt, trimmed_search_results)
    final_system_prompt = _append_internal_evidence_context(
        final_system_prompt,
        evidence_index=merged_pre_provider_evidence,
        sources=merged_pre_provider_sources,
        user_context=user_context,
        selected_mode=selected_mode,
    )
    final_system_prompt = _append_citation_rules(
        final_system_prompt,
        evidence_index=merged_pre_provider_evidence,
        sources=merged_pre_provider_sources,
    )
    final_system_prompt = _append_service_level_answer_rules(
        final_system_prompt,
        assistant_surface=assistant_surface,
    )

    pipeline_prompt_block = build_pipeline_prompt_blocks(
        message=message,
        user_context=user_context,
        runtime=runtime_payload,
        selected_mode=selected_mode,
        output_type=output_type,
        task_type=task_type,
        user_role=role,
    )

    final_system_prompt = (
        f"{final_system_prompt}\n\n"
        "============================================================\n"
        f"{pipeline_prompt_block}"
    ).strip()

    messages = [
        {"role": "system", "content": final_system_prompt},
        *trimmed_history,
        {"role": "user", "content": user_message},
    ]

    logger.info(
        (
            "Starting AI stream session_id=%s surface=%s mode=%s task_type=%s output_type=%s "
            "safeguarding=%s response_mode=%s model=%s temperature=%s max_tokens=%s "
            "message_count=%s has_document=%s sources=%s evidence=%s guidance_enabled=%s "
            "guidance_reason=%s guidance_skipped=%s"
        ),
        session_id,
        assistant_surface,
        mode,
        task_type,
        output_type,
        safeguarding_level,
        selected_mode,
        model_plan.model,
        model_plan.temperature,
        model_plan.max_tokens,
        len(messages),
        bool(trimmed_document_text),
        len(merged_pre_provider_sources),
        len(merged_pre_provider_evidence),
        guidance_enabled,
        guidance_plan.reason,
        skip_guidance_search,
    )

    provider = get_llm_provider()
    provider_success = False
    provider_error_code = None
    provider_error_message = None

    raw_answer_parts: list[str] = []

    provider_meta_sources: list[dict[str, Any]] = []
    provider_runtime: dict[str, Any] = {}
    provider_explainability: dict[str, Any] = {}
    provider_assistant_scope: dict[str, Any] = {}
    provider_assistant_context: dict[str, Any] = {}
    provider_suggested_actions: list[Any] = []
    provider_evidence_index: list[dict[str, Any]] = []

    try:
        async for content in provider.stream_chat(
            ChatStreamRequest(
                messages=messages,
                model=model_plan.model,
                temperature=model_plan.temperature,
                max_tokens=model_plan.max_tokens,
                metadata={
                    "session_id": session_id,
                    "mode": mode,
                    "task_type": task_type,
                    "output_type": output_type,
                    "safeguarding_level": safeguarding_level,
                    "response_mode": selected_mode,
                    "conversation_id": _safe_string(conversation_id or session_id),
                    "user_id": _safe_string(user_id),
                    "scope_type": _safe_string(
                        user_context.get("scope_type")
                        or (
                            user_context.get("scope", {}).get("scope_type")
                            if isinstance(user_context.get("scope"), dict)
                            else user_context.get("scope")
                        )
                    ),
                    "assistant_type": _safe_string(user_context.get("assistant_type")),
                    "assistant_surface": assistant_surface,
                    "evidence_count": len(merged_pre_provider_evidence),
                    "source_count": len(merged_pre_provider_sources),
                    "structured_output": True,
                },
            )
        ):
            if isinstance(content, dict):
                structured = _extract_structured_payload(content)

                if structured:
                    text = _extract_text_from_provider_payload(structured)
                    if text:
                        raw_answer_parts.append(text)

                    if isinstance(structured.get("sources"), list):
                        provider_meta_sources = _normalise_sources(structured.get("sources"))

                    if isinstance(structured.get("runtime"), dict):
                        provider_runtime = {
                            **provider_runtime,
                            **_filter_provider_runtime_overrides(structured.get("runtime", {})),
                        }

                    if isinstance(structured.get("explainability"), dict):
                        provider_explainability = {
                            **provider_explainability,
                            **structured.get("explainability", {}),
                        }

                    provider_assistant_scope = {
                        **provider_assistant_scope,
                        **_normalise_assistant_scope(structured.get("assistant_scope")),
                    }

                    provider_assistant_context = {
                        **provider_assistant_context,
                        **_normalise_assistant_context(structured.get("assistant_context")),
                    }

                    if isinstance(structured.get("suggested_actions"), list):
                        provider_suggested_actions = _normalise_suggested_actions(
                            structured.get("suggested_actions")
                        )

                    if isinstance(structured.get("evidence_index"), list):
                        provider_evidence_index = _normalise_evidence_index(
                            structured.get("evidence_index")
                        )

                    continue

                token_text = _extract_text_from_provider_payload(content)
                if _safe_string(token_text):
                    raw_answer_parts.append(token_text)

                continue

            if _safe_string(content):
                raw_answer_parts.append(str(content))

        provider_success = True

    except Exception as exc:
        provider_error_code = "provider_stream_failed"
        provider_error_message = _safe_string(exc) or "AI provider stream failed"

        logger.exception(
            "AI provider stream failed for session_id=%s model=%s error=%r",
            session_id,
            model_plan.model,
            exc,
        )

        raw_answer_parts.append(
            _build_safe_user_fallback_text(
                safeguarding_level=safeguarding_level,
            )
        )

    raw_answer_text = "".join(raw_answer_parts).strip()

    final_sources = _merge_sources(
        orchestration_sources,
        context_sources,
        provider_meta_sources,
    )

    final_runtime = {
        **runtime_payload,
        **_filter_provider_runtime_overrides(provider_runtime),
        "guidance_results_used": bool(trimmed_search_results),
        "guidance_search_skipped": skip_guidance_search,
        "response_mode": selected_mode,
        "task_type": task_type,
        "output_type": output_type,
        "safeguarding_level": safeguarding_level,
        "assistant_surface": assistant_surface,
        "requires_evidence_grounding": assistant_surface == "os_embedded",
    }

    final_evidence_index = _merge_evidence_indexes(
        orchestration_evidence_index,
        context_evidence_index,
        final_runtime.get("evidence_index") or [],
        provider_evidence_index,
    )

    raw_answer_text = _append_os_no_evidence_warning_if_needed(
        answer_text=raw_answer_text,
        assistant_surface=assistant_surface,
        evidence_index=final_evidence_index,
        sources=final_sources,
        message=message,
    )

    source_group_counts = _classify_source_groups(final_sources)
    evidence_sufficiency = _estimate_evidence_sufficiency(
        sources=final_sources,
        evidence_index=final_evidence_index,
        guidance_used=bool(trimmed_search_results),
    )

    quality_flags = _build_answer_quality_flags(
        answer_text=raw_answer_text,
        output_type=output_type,
        sources=final_sources,
        evidence_index=final_evidence_index,
        assistant_surface=assistant_surface,
    )

    answer_confidence = _estimate_answer_confidence(
        answer_text=raw_answer_text,
        output_type=output_type,
        evidence_sufficiency=evidence_sufficiency,
        provider_success=provider_success,
    )

    if quality_flags["answer_empty"]:
        raw_answer_text = _build_empty_answer_fallback_text(
            output_type=output_type,
            guidance_used=bool(trimmed_search_results),
            source_count=len(final_sources),
            safeguarding_level=safeguarding_level,
        )

        quality_flags = _build_answer_quality_flags(
            answer_text=raw_answer_text,
            output_type=output_type,
            sources=final_sources,
            evidence_index=final_evidence_index,
            assistant_surface=assistant_surface,
        )

        answer_confidence = _estimate_answer_confidence(
            answer_text=raw_answer_text,
            output_type=output_type,
            evidence_sufficiency=evidence_sufficiency,
            provider_success=provider_success,
        )

    final_runtime["source_group_counts"] = source_group_counts
    final_runtime["evidence_sufficiency"] = evidence_sufficiency
    final_runtime["answer_confidence"] = answer_confidence
    final_runtime["answer_quality_flags"] = quality_flags
    final_runtime["source_count"] = len(final_sources)
    final_runtime["evidence_items_loaded"] = len(final_evidence_index)

    if final_evidence_index:
        final_runtime["evidence_index"] = final_evidence_index

    pipeline_result = process_assistant_response(
        answer_text=raw_answer_text,
        message=message,
        user_context=user_context,
        runtime=final_runtime,
        sources=final_sources,
        evidence_index=final_evidence_index,
        selected_mode=selected_mode,
        output_type=output_type,
        task_type=task_type,
        user_role=role,
    )

    final_answer_text = _safe_string(pipeline_result.get("answer")) or raw_answer_text
    pipeline_meta = pipeline_result.get("meta") if isinstance(pipeline_result, dict) else {}

    final_runtime["pipeline"] = pipeline_meta

    yield {
        "type": "token",
        "content": final_answer_text,
    }

    final_explainability = {
        **(explainability_payload or {}),
        **provider_explainability,
        "answer_quality_flags": quality_flags,
        "evidence_sufficiency": evidence_sufficiency,
        "answer_confidence": answer_confidence,
        "assistant_surface": assistant_surface,
        "pipeline": (pipeline_meta or {}).get("explainability"),
    }

    meta_payload = {
        "type": "meta",
        "sources": final_sources,
        "runtime": final_runtime,
        "explainability": final_explainability,
        "assistant_scope": provider_assistant_scope or {},
        "assistant_context": provider_assistant_context or {},
        "suggested_actions": provider_suggested_actions or [],
        "assistant_surface": assistant_surface,
        "pipeline": pipeline_meta,
        "user_transparency_panel": (pipeline_meta or {}).get("user_transparency_panel"),
        "audit_panel": (pipeline_meta or {}).get("audit_panel"),
    }

    if final_evidence_index:
        meta_payload["evidence_index"] = final_evidence_index

    duration_ms = timer.duration_ms()

    if request_audit_event is not None:
        log_assistant_request_finished(
            base_event=request_audit_event,
            duration_ms=duration_ms,
            success=provider_success,
            source_count=len(final_sources),
            evidence_count=len(final_evidence_index),
            error_code=provider_error_code,
            error_message=provider_error_message,
            extra={
                "assistant_surface": assistant_surface,
                "guidance_results_used": bool(trimmed_search_results),
                "guidance_search_skipped": skip_guidance_search,
                "trimmed_history_count": len(trimmed_history),
                "message_count": len(messages),
                "evidence_count": len(final_evidence_index),
                "evidence_sufficiency": evidence_sufficiency,
                "answer_confidence": answer_confidence,
                "answer_quality_warnings": quality_flags.get("warnings", []),
                "pipeline_quality": (pipeline_meta or {}).get("quality"),
            },
        )

    yield meta_payload

    logger.info(
        (
            "Completed AI stream session_id=%s surface=%s success=%s "
            "evidence_sufficiency=%s answer_confidence=%s sources=%s evidence=%s"
        ),
        session_id,
        assistant_surface,
        provider_success,
        evidence_sufficiency,
        answer_confidence,
        len(final_sources),
        len(final_evidence_index),
    )


async def generate_ai_response(
    message: str,
    session_id: str = "non_stream",
    history=None,
    document_text: str | None = None,
    document_name: str | None = None,
    role: str = "residential care staff",
    ld_lens: bool = False,
    training_mode: bool = False,
    speed: str = "balanced",
    user_context: dict | None = None,
    response_mode: str = "balanced",
    user_id: str | int | None = None,
    conversation_id: str | int | None = None,
) -> str:
    parts: list[str] = []

    async for item in generate_ai_stream(
        message=message,
        session_id=session_id,
        history=history,
        document_text=document_text,
        document_name=document_name,
        role=role,
        ld_lens=ld_lens,
        training_mode=training_mode,
        speed=speed,
        user_context=user_context,
        response_mode=response_mode,
        user_id=user_id,
        conversation_id=conversation_id,
    ):
        if isinstance(item, dict) and item.get("type") == "token":
            content = _safe_string(item.get("content"))
            if content:
                parts.append(content)

    return "".join(parts).strip()
