"""Detects standalone agent intent in conversation — no OS record access."""

from __future__ import annotations

import re
from typing import Any

from schemas.orb_agents import OrbAgentRunRequest
from services.orb_agent_registry_service import orb_agent_registry_service
from services.orb_brain_metadata_service import merge_context_used

AUTO_RUN_PATTERNS = (
    r"\bcreate a (?:manager )?briefing\b",
    r"\bdeep research\b",
    r"\bresearch what\b",
    r"\bcompare this policy\b",
    r"\bcreate (?:an? )?checklist\b",
    r"\bevidence map\b",
    r"\baction plan\b",
    r"\bmanager briefing\b",
    r"\banalyse this document\b",
    r"\banalyze this document\b",
    r"\bsummar(?:y|ise|ize) this document\b",
    r"\bcreate an action plan from this\b",
    r"\bwhat should we do next\b",
    r"\bwhat does this document mean\b",
    r"\bmake a manager briefing\b",
    r"\bturn this into staff guidance\b",
    r"\bwhat would ofsted care about\b",
)

SUGGEST_ONLY_PATTERNS = (
    r"\bresearch\b",
    r"\bbriefing\b",
    r"\bcompare\b",
    r"\bchecklist\b",
    r"\banalyse (?:the |this )?document\b",
    r"\banalyze (?:the |this )?document\b",
    r"\bsummar(?:y|ise|ize) (?:the |this )?document\b",
    r"\bexplain this document\b",
)


def detect_document_intent(message: str, *, has_document: bool = False) -> dict[str, Any] | None:
    """Detect standalone document analysis intent without over-triggering general chat."""
    lower = _lower(message)
    if not lower:
        return None

    doc_phrases = (
        "analyse this document",
        "analyze this document",
        "summarise this document",
        "summarize this document",
        "create an action plan from this",
        "what does this document mean",
        "what should we do next",
        "compare this policy",
        "make a manager briefing",
        "turn this into staff guidance",
        "what would ofsted care about",
        "explain this document",
    )
    matched = any(phrase in lower for phrase in doc_phrases)
    if not matched and not (
        has_document
        and any(term in lower for term in ("document", "uploaded", "attached", "policy", "report"))
    ):
        return None

    preferred_output = "briefing"
    if "action plan" in lower or "what should we do" in lower:
        preferred_output = "action_plan"
    elif "compare" in lower:
        preferred_output = "comparison"
    elif "checklist" in lower or "evidence map" in lower:
        preferred_output = "evidence_map"
    elif "staff guidance" in lower:
        preferred_output = "supervision_guide"

    auto_run = matched and has_document
    return {
        "suggested": True,
        "agent_type": "document_analysis",
        "reason": "User asked for standalone document analysis",
        "auto_run": auto_run,
        "preferred_output": preferred_output,
        "needs_document": not has_document,
        "open_documents_panel": not has_document,
    }


def _lower(text: str) -> str:
    return str(text or "").strip().lower()


def detect_agent_intent(message: str, *, mode: str | None = None) -> dict[str, Any] | None:
    """Return agent suggestion metadata if the message looks agent-worthy."""
    lower = _lower(message)
    if not lower:
        return None

    agent_type, reason = orb_agent_registry_service.classify_agent(message, mode=mode)
    auto_run = any(re.search(pattern, lower) for pattern in AUTO_RUN_PATTERNS)
    suggested = auto_run or any(re.search(pattern, lower) for pattern in SUGGEST_ONLY_PATTERNS)

    if not suggested:
        return None

    preferred_output = orb_agent_registry_service.default_output_format(agent_type)
    if "briefing" in lower:
        preferred_output = "briefing"
    elif "checklist" in lower:
        preferred_output = "checklist"
    elif "compare" in lower:
        preferred_output = "comparison"
    elif "action plan" in lower:
        preferred_output = "action_plan"
    elif "evidence map" in lower:
        preferred_output = "evidence_map"
    elif "supervision" in lower:
        preferred_output = "supervision_guide"

    return {
        "suggested": True,
        "agent_type": agent_type,
        "reason": reason,
        "auto_run": auto_run,
        "preferred_output": preferred_output,
        "depth": "deep" if "deep research" in lower else "standard",
    }


async def maybe_run_agent_for_conversation(
    message: str,
    *,
    mode: str | None = None,
    profile_context: str | None = None,
    document_text: str | None = None,
    document_source_id: str | None = None,
    document_title: str | None = None,
) -> dict[str, Any] | None:
    """Auto-run agent when intent is clear; returns answer payload or None."""
    has_document = bool(str(document_text or "").strip() or str(document_source_id or "").strip())
    doc_intent = detect_document_intent(message, has_document=has_document)
    if doc_intent and doc_intent.get("needs_document"):
        return {
            "answer": (
                "I can analyse that document — please upload or paste it in the Documents panel first, "
                "then ask again. Open Documents from the sidebar to add your policy or guidance text."
            ),
            "sources": [],
            "citations": [],
            "context_used": merge_context_used(
                {"document_analysis": {**doc_intent, "auto_run": False}},
                surface="orb_standalone",
                mode=mode,
                feature="agent",
                lens="document_analysis",
            ),
            "tools_used": ["document_analysis_prompt"],
        }

    if doc_intent and doc_intent.get("auto_run"):
        request = OrbAgentRunRequest(
            agent_type="document_analysis",
            prompt=message,
            mode=mode,
            profile_context=profile_context,
            preferred_output=doc_intent.get("preferred_output", "briefing"),
            document_text=document_text,
            document_source_id=document_source_id,
            document_title=document_title,
            depth="standard",
        )
        from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service

        response = await orb_agent_orchestrator_service.run_agent(request)
        return {
            "answer": response.output.body,
            "sources": response.sources,
            "citations": response.citations,
            "context_used": {
                **(response.context_used or {}),
                "document_analysis": {**doc_intent, "auto_run": True, "completed": True},
            },
            "tools_used": ["document_analysis_agent", f"standalone_agent:{response.agent_type}"],
            "agent_run": response.model_dump(),
        }

    intent = detect_agent_intent(message, mode=mode)
    if not intent or not intent.get("auto_run"):
        return None

    request = OrbAgentRunRequest(
        agent_type=intent["agent_type"],
        prompt=message,
        mode=mode,
        profile_context=profile_context,
        preferred_output=intent.get("preferred_output", "briefing"),
        depth=intent.get("depth", "standard"),
        document_text=document_text,
        document_source_id=document_source_id,
        document_title=document_title,
    )
    from services.orb_agent_orchestrator_service import orb_agent_orchestrator_service

    response = await orb_agent_orchestrator_service.run_agent(request)
    return {
        "answer": response.output.body,
        "sources": response.sources,
        "citations": response.citations,
        "context_used": {
            **(response.context_used or {}),
            "agent": {
                "suggested": True,
                "agent_type": response.agent_type,
                "reason": intent.get("reason"),
                "auto_run": True,
            },
        },
        "tools_used": [f"standalone_agent:{response.agent_type}"],
        "agent_run": response.model_dump(),
    }
