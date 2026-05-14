from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import current_home_id, current_provider_id, current_user_id, table_exists
from services.assistant_citation_service import build_citations, related_records_from_sources
from services.assistant_context_service import SharedAssistantContext
from services.assistant_prompt_policy import (
    REPORT_WRITER_MODES,
    SAFETY_RULES,
    context_summary,
    is_record_specific_question,
    suggested_prompts_for_context,
)
from services.assistant_product_boundary_service import (
    build_product_boundary_decision,
    sanitize_standalone_context,
)
from services.assistant_retrieval_service import AssistantRetrievalResult, AssistantRetrievalService
from services.standalone_assistant_service import StandaloneAssistantService


def _text(value: Any) -> str:
    return str(value or "").strip()


def _sentence_excerpt(value: Any, limit: int = 220) -> str:
    text = " ".join(_text(value).split())
    if len(text) <= limit:
        return text
    return text[: limit - 1].rstrip() + "..."


def _confidence(source_count: int, gap_count: int, errors: list[str]) -> str:
    if errors or source_count == 0:
        return "low"
    if source_count >= 5 and gap_count == 0:
        return "high"
    return "medium"


def _dedupe_links(links: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[str, str]] = set()
    output: list[dict[str, Any]] = []
    for link in links:
        key = (_text(link.get("type") or "link"), _text(link.get("label") or link.get("key") or link.get("regulation")))
        if not key[1] or key in seen:
            continue
        seen.add(key)
        output.append(link)
    return output


def _report_mode_title(mode: str, message: str) -> str:
    titles = {
        "report_writer": "Report draft",
        "reg44_action_plan": "Reg 44 action plan draft",
        "reg45_writer": "Reg 45 quality-of-care draft",
        "lac_review_writer": "LAC review draft",
        "safeguarding_chronology": "Safeguarding chronology draft",
        "manager_oversight_report": "Manager oversight report draft",
        "ofsted_evidence_pack": "Ofsted evidence pack draft",
    }
    if mode in titles:
        return titles[mode]
    text = message.lower()
    if "reg 44" in text or "reg44" in text:
        return titles["reg44_action_plan"]
    if "reg 45" in text or "reg45" in text:
        return titles["reg45_writer"]
    if "lac" in text:
        return titles["lac_review_writer"]
    if "ofsted" in text:
        return titles["ofsted_evidence_pack"]
    return titles["report_writer"]


def _build_summary_answer(
    *,
    message: str,
    context: SharedAssistantContext,
    retrieval: AssistantRetrievalResult,
    citations: list[dict[str, Any]],
) -> str:
    if is_record_specific_question(message, context) and not citations:
        return (
            "I cannot answer that record-specific question from the permitted records because no citable sources were found. "
            "Please check the selected record, filters or permissions. Review required."
        )

    if not citations:
        return (
            "I could not find matching OS records in your permitted scope. "
            "No evidence was found, so I cannot make record-specific claims. Review the filters or add evidence before using this operationally."
        )

    label_text = ", ".join(citation["label"] for citation in citations[:5])
    source_lines = []
    for citation in citations[:5]:
        source_lines.append(f"- {citation['label']}: {_sentence_excerpt(citation.get('excerpt')) or 'Record available for review.'}")

    if context.assistant_mode in REPORT_WRITER_MODES:
        title = _report_mode_title(context.assistant_mode, message)
        gap_lines = [
            f"- {gap.get('gap') or gap.get('area')}"
            for gap in retrieval.evidence_gaps[:6]
        ] or ["- No evidence gaps were identified from the retrieved records, but manager review is still required."]
        return "\n".join(
            [
                f"{title} - draft for adult/manager review.",
                "",
                "Records indicate the following evidence base:",
                *source_lines,
                "",
                "Draft section:",
                f"Evidence suggests the key points above should be considered, with direct reference to {label_text}. "
                "This draft must be checked against the source records before inclusion in a statutory or management report.",
                "",
                "Evidence gaps / review points:",
                *gap_lines,
                "",
                "Review required: this is draft support only and does not finalise professional judgement.",
            ]
        )

    mode_label = str(context.assistant_mode).replace("_", " ")
    return "\n".join(
        [
            f"Records indicate the following for this {mode_label} question:",
            *source_lines,
            "",
            f"Summary: evidence suggests the strongest support currently comes from {label_text}. "
            "Where evidence is incomplete, this should be treated as a gap rather than a conclusion.",
            "",
            "Review required before this is used in a record, action plan or report.",
        ]
    )


def _fallback_suggested_actions(retrieval: AssistantRetrievalResult, context: SharedAssistantContext) -> list[dict[str, Any]]:
    actions = list(retrieval.suggested_actions)
    if retrieval.evidence_gaps:
        actions.append(
            {
                "title": "Review evidence gaps",
                "priority": "high",
                "status": "recommended",
                "route": "/evidence",
                "source_type": "assistant_gap",
                "source_id": "evidence_gaps",
            }
        )
    if context.assistant_mode in REPORT_WRITER_MODES:
        actions.append(
            {
                "title": "Manager review of assistant draft",
                "priority": "high",
                "status": "recommended",
                "route": "/reports",
                "source_type": "assistant_review",
                "source_id": context.assistant_mode,
            }
        )
    return actions[:8]


def _audit_assistant_query(
    conn: Any,
    *,
    current_user: dict[str, Any],
    context: SharedAssistantContext,
    question: str,
    retrieval: AssistantRetrievalResult,
    citations: list[dict[str, Any]],
    draft_generated: bool,
) -> None:
    if not table_exists(conn, "os_audit_events"):
        return
    metadata = {
        "assistant_product_mode": build_product_boundary_decision(context).product_mode.value,
        "assistant_mode": context.assistant_mode,
        "context_summary": context_summary(context),
        "source_records_retrieved": retrieval.related_records[:30],
        "citations_returned": [
            {"source_type": item.get("source_type"), "source_id": item.get("source_id"), "label": item.get("label")}
            for item in citations[:30]
        ],
        "draft_generated": draft_generated,
        "safety_rules": SAFETY_RULES,
        "retrieval_errors": retrieval.retrieval_errors,
    }
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO public.os_audit_events (
              provider_id, home_id, actor_user_id, action, entity_table, entity_id,
              previous_state, new_state, reason, metadata
            )
            VALUES (%s, %s, %s, %s, %s, %s, NULL, %s::jsonb, %s, %s::jsonb)
            """,
            (
                current_provider_id(current_user),
                context.home_id or current_home_id(current_user),
                current_user_id(current_user),
                "assistant_query",
                "assistant",
                context.conversation_id or f"assistant-{datetime.now(timezone.utc).timestamp()}",
                Json({"citations": citations, "confidence_sources": len(retrieval.sources)}),
                question[:500],
                Json(metadata),
            ),
        )


class AssistantResponseService:
    """Shared intelligence core for embedded and standalone assistant UX."""

    def __init__(
        self,
        retrieval_service: AssistantRetrievalService | None = None,
        standalone_service: StandaloneAssistantService | None = None,
    ) -> None:
        self.retrieval_service = retrieval_service or AssistantRetrievalService()
        self.standalone_service = standalone_service or StandaloneAssistantService()

    def query(
        self,
        conn: Any,
        *,
        message: str,
        context: SharedAssistantContext,
        current_user: dict[str, Any],
    ) -> dict[str, Any]:
        boundary = build_product_boundary_decision(context)
        if boundary.product_mode.value == "standalone_assistant":
            standalone_context = sanitize_standalone_context(context)
            return self.standalone_service.query(
                message=message,
                context=standalone_context,
            )

        retrieval = self.retrieval_service.retrieve(
            conn,
            message=message,
            context=context,
            current_user=current_user,
        )
        citations = build_citations(retrieval.sources)
        related_records = related_records_from_sources(retrieval.sources)
        confidence = _confidence(len(citations), len(retrieval.evidence_gaps), retrieval.retrieval_errors)
        answer = _build_summary_answer(message=message, context=context, retrieval=retrieval, citations=citations)
        regulatory_links = _dedupe_links(retrieval.regulatory_links)
        suggested_actions = _fallback_suggested_actions(retrieval, context)
        review_required = True

        _audit_assistant_query(
            conn,
            current_user=current_user,
            context=context,
            question=message,
            retrieval=retrieval,
            citations=citations,
            draft_generated=context.assistant_mode in REPORT_WRITER_MODES,
        )

        return {
            "answer": answer,
            "citations": citations,
            "related_records": related_records,
            "suggested_actions": suggested_actions,
            "evidence_gaps": retrieval.evidence_gaps,
            "regulatory_links": regulatory_links,
            "follow_up_questions": suggested_prompts_for_context(context)[:4],
            "confidence": confidence,
            "review_required": review_required,
            "assistant_product_mode": boundary.product_mode.value,
            "audit_event_type": boundary.audit_event_type,
            "memory_store": boundary.memory_store,
            "retrieval": {
                "source_count": len(retrieval.sources),
                "errors": retrieval.retrieval_errors,
            },
        }
