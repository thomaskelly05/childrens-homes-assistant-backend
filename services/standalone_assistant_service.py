from __future__ import annotations

"""Standalone assistant response foundation with no OS record retrieval."""

from typing import Any

from schemas.standalone_assistant import StandaloneBrain, StandaloneToolRoute
from services.assistant_product_boundary_service import (
    assert_citations_allowed,
    build_product_boundary_decision,
)
from services.standalone_sector_knowledge_service import search_sector_knowledge


CURRENT_FACT_TERMS = {
    "weather",
    "score",
    "sports",
    "news",
    "today",
    "current",
    "latest",
    "price",
    "schedule",
}


def _brain_from_context(context: Any) -> StandaloneBrain:
    value = ""
    if isinstance(context, dict):
        value = str(context.get("brain") or context.get("assistant_brain") or "")
    else:
        value = str(getattr(context, "brain", "") or getattr(context, "assistant_brain", ""))
    try:
        return StandaloneBrain(value)
    except ValueError:
        return StandaloneBrain.GENERAL_ASSISTANT


def _tool_route(message: str, brain: StandaloneBrain) -> StandaloneToolRoute:
    text = message.lower()
    if any(term in text for term in ("summarise", "summarize")) and any(term in text for term in ("upload", "document", "pdf", "file")):
        return StandaloneToolRoute.SUMMARISE_UPLOAD
    if any(term in text for term in ("weather", "news", "latest", "score", "price", "schedule")):
        if "weather" in text:
            return StandaloneToolRoute.WEATHER
        if "score" in text or "sports" in text:
            return StandaloneToolRoute.SPORTS
        return StandaloneToolRoute.WEB_SEARCH
    if any(term in text for term in ("calculate", "sum", "percentage")):
        return StandaloneToolRoute.CALCULATION
    if any(term in text for term in ("draft", "write", "email", "note", "policy")):
        return StandaloneToolRoute.DOCUMENT_DRAFT if brain in {StandaloneBrain.REPORT_WRITER, StandaloneBrain.POLICY_PROCEDURE_WRITER} else StandaloneToolRoute.WRITING
    if any(term in text for term in ("plan", "outline", "steps")):
        return StandaloneToolRoute.PLANNING
    return StandaloneToolRoute.GENERAL_QA


def _is_sector_question(message: str, brain: StandaloneBrain) -> bool:
    text = message.lower()
    sector_terms = ("reg ", "regulation", "ofsted", "sccif", "safeguarding", "children's home", "child-centred", "reg44", "reg45", "lac")
    return brain != StandaloneBrain.GENERAL_ASSISTANT or any(term in text for term in sector_terms)


class StandaloneAssistantService:
    """General and sector assistant foundation isolated from OS records."""

    def query(
        self,
        *,
        message: str,
        context: Any,
        web_provider_configured: bool = False,
    ) -> dict[str, Any]:
        boundary = build_product_boundary_decision(context, mode="standalone")
        if boundary.violations:
            raise PermissionError(", ".join(boundary.violations))

        brain = _brain_from_context(context)
        route = _tool_route(message, brain)
        citations = search_sector_knowledge(message) if _is_sector_question(message, brain) else []
        assert_citations_allowed(boundary.product_mode, citations)

        live_lookup_needed = route in {
            StandaloneToolRoute.WEB_SEARCH,
            StandaloneToolRoute.WEATHER,
            StandaloneToolRoute.SPORTS,
        } or any(term in message.lower() for term in CURRENT_FACT_TERMS)

        if live_lookup_needed and not web_provider_configured:
            answer = (
                "Live lookup is unavailable in this environment, so I will not guess current facts. "
                "Ask a non-current question, paste the source material, or configure a web/search provider."
            )
            confidence = "low"
        elif citations:
            citation_lines = "\n".join(f"- {item['label']}: {item['excerpt']}" for item in citations[:3])
            answer = "\n".join(
                [
                    "Here is standalone sector guidance based only on static knowledge and anything you provide manually.",
                    "",
                    citation_lines,
                    "",
                    "This is practice guidance, not legal advice. For safeguarding, risk or statutory decisions, ask the registered manager or relevant professional to review the facts.",
                ]
            )
            confidence = "medium"
        else:
            answer = (
                "I can help with writing, planning, explanations, productivity and document drafting. "
                "No live IndiCare OS records, child files, home records or staff records are available in this standalone assistant conversation."
            )
            confidence = "medium"

        return {
            "answer": answer,
            "citations": citations,
            "related_records": [],
            "suggested_actions": [],
            "evidence_gaps": [],
            "regulatory_links": citations,
            "follow_up_questions": [
                "Turn this into a professional email.",
                "Make this more child-centred.",
                "Create an action plan outline.",
                "List the evidence gaps I should check.",
            ],
            "confidence": confidence,
            "review_required": True,
            "retrieval": {"source_count": len(citations), "errors": []},
            "assistant_product_mode": boundary.product_mode.value,
            "audit_event_type": boundary.audit_event_type,
            "memory_store": boundary.memory_store,
            "tool_route": route.value,
        }
