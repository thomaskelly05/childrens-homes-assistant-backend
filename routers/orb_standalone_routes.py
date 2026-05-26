from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_standalone_orb_access
from services.orb_citation_service import orb_citation_service
from services.ai_provider_registry import ai_provider_registry
from services.orb_general_assistant_service import orb_general_assistant_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.indicare_intelligence_capability_service import (
    indicare_intelligence_capability_service,
)
from services.indicare_intelligence_surface_router import (
    indicare_intelligence_surface_router,
    standalone_os_boundary_message,
)
from services.orb_standalone_sources import (
    INDICARE_PRODUCT_FALLBACK,
    append_sources_basis_section,
    build_standalone_sources,
)

logger = logging.getLogger("indicare.orb_standalone")

router = APIRouter(prefix="/orb/standalone", tags=["ORB Standalone Assistant"])

STANDALONE_ORB_MODES = [
    "Ask ORB",
    "Safeguarding",
    "Reflect",
    "Ofsted Lens",
    "Behaviour Support",
    "Record This Properly",
]

STANDALONE_ORB_GUARDRAILS = [
    "ORB Care Companion is standalone and does not retrieve IndiCare OS care records.",
    "It gives guidance and reflective support, not statutory, medical or legal decisions.",
    "For immediate safeguarding risk, follow local procedures and escalate to the relevant safeguarding lead or emergency service.",
]

STANDALONE_ORB_IDENTITY = (
    "You are ORB Care Companion, IndiCare's standalone ChatGPT-class AI companion."
)

STANDALONE_ORB_CAPABILITIES = """
Capabilities:
- Answer general knowledge, writing, planning, education, technology and business questions.
- Explain IndiCare as a product, ORB as a companion, and the OS architecture and platform vision.
- Support residential children's homes practice, leadership reflection and staff supervision thinking.
- Apply an Ofsted and SCCIF lens without predicting grades.
- Explain Children's Homes Regulations and Quality Standards in practical terms.
- Support safeguarding reflection and immediate escalation reminders where risk may be present.
- Improve recording quality with factual, child-centred, non-punitive wording.
- Support therapeutic, trauma-informed and behaviour-as-communication practice.
- Help managers reflect on oversight, patterns, drift and whether actions made a difference.
- Behave like a broad ChatGPT-style assistant, not a narrow care FAQ.
""".strip()

STANDALONE_ORB_PRODUCT_KNOWLEDGE = """
IndiCare product knowledge:
- IndiCare is a residential children's homes operating system and intelligence platform for staff and managers.
- Built around care recording, safeguarding, Ofsted/SCCIF readiness, Quality Standards, governance, workforce support and reflective practice.
- Aims to simplify recording and oversight and make records more child-centred, evidence-led and easier to review.
- Areas include Care Hub (command centre), Record, Young People, Chronology, Documents, Actions, Intelligence Spine, Ofsted readiness, workforce support, governance, Reports and ORB.
- ORB Care Companion is standalone /orb — ChatGPT-style, voice-enabled; no live OS records.
- IndiCare OS ORB is /assistant/orb — operational OS-connected assistant with permissioned context where available.
- If asked "tell me about IndiCare", answer confidently and helpfully with product-level information.
""".strip()

STANDALONE_ORB_BOUNDARIES = """
Boundaries:
- In standalone /orb, no access to live IndiCare OS records, Care Hub, child files, staff records, chronology, dashboards or actions.
- You can explain IndiCare as a product and answer using general knowledge and built-in product knowledge.
- Do not refuse product-level questions about IndiCare.
- Do not claim access to live records or live browsing unless actually performed.
- No direct writes to care records.
- No final safeguarding threshold decisions and no legal advice.
- No emergency response replacement — escalate through local procedures when risk is immediate.
- If the user needs live records, tell them to use IndiCare OS ORB at /assistant/orb.
""".strip()

STANDALONE_ORB_CITATIONS = """
Sources / basis:
- Include honest source labels where relevant; do not fabricate URLs or exact quotes.
- Product questions: IndiCare product context; Standalone ORB product boundary.
- Ofsted/SCCIF: Ofsted SCCIF framework knowledge; Children's Homes Regulations / Quality Standards.
- Safeguarding: safeguarding practice principles; local policy reminder.
- General knowledge: general model knowledge unless user provided context.
""".strip()

STANDALONE_ORB_TONE = """
Tone:
- British English, calm, warm, concise when speaking, reflective, practical, non-judgemental and child-centred.
Voice response style:
- Start with shorter spoken answers (about 3–6 sentences when voice-concise).
- Use phrasing like "I'd think about it like this…" where helpful.
- Offer to go deeper: "I can go deeper if you want."
- Ask one useful follow-up question when it would help, not every time.
""".strip()

MODE_BEHAVIOUR = {
    "Safeguarding": (
        "Mode behaviour — Safeguarding: advise immediate escalation where risk appears immediate; "
        "remind the user to follow local safeguarding policy; do not decide thresholds."
    ),
    "Record This Properly": (
        "Mode behaviour — Record This Properly: help create factual, child-centred, non-punitive wording; "
        "avoid terms like bad behaviour, attention seeking or manipulative; suggest what evidence to include."
    ),
    "Ofsted Lens": (
        "Mode behaviour — Ofsted Lens: explain what evidence may be expected; do not predict inspection grades."
    ),
    "Behaviour Support": (
        "Mode behaviour — Behaviour Support: treat behaviour as communication; trauma-informed response; "
        "repair and restorative follow-up."
    ),
    "Reflect": (
        "Mode behaviour — Reflect: emotionally containing; support staff wellbeing and reflective practice."
    ),
}


class OrbStandaloneImageAttachment(BaseModel):
    model_config = ConfigDict(extra="ignore")

    data_url: str = Field(..., min_length=32, max_length=2_500_000)
    name: str | None = Field(default=None, max_length=200)


class OrbStandaloneConversationRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=12000)
    mode: str = Field(default="Ask ORB", max_length=80)
    conversation_id: str | None = None
    history: list[dict[str, Any]] = Field(default_factory=list)
    detail: str | None = Field(default=None, max_length=40)
    images: list[OrbStandaloneImageAttachment] = Field(default_factory=list)
    document_text: str | None = Field(default=None, max_length=500_000)
    document_source_id: str | None = Field(default=None, max_length=120)
    document_title: str | None = Field(default=None, max_length=500)


def _standalone_contract() -> dict[str, Any]:
    return {
        "name": "ORB Care Companion",
        "surface": "standalone_orb_ai",
        "public_route": "/orb",
        "os_assistant_route": "/assistant",
        "os_linked": False,
        "care_record_access": False,
        "staff_record_access": False,
        "young_person_record_access": False,
        "chronology_access": False,
        "dashboard_access": False,
        "direct_writes": False,
        "purpose": "Advice, guidance, reflection and residential care practice support.",
        "modes": STANDALONE_ORB_MODES,
        "guardrails": STANDALONE_ORB_GUARDRAILS,
        "endpoints": {
            "health": "/orb/standalone/health",
            "conversation": "/orb/standalone/conversation",
            "config": "/orb/standalone/config",
            "knowledge_health": "/orb/standalone/knowledge/health",
            "knowledge_sources": "/orb/standalone/knowledge/sources",
            "knowledge_ingest": "/orb/standalone/knowledge/ingest",
            "knowledge_search": "/orb/standalone/knowledge/search",
            "knowledge_summary": "/orb/standalone/knowledge/summary",
            "model_router_health": "/orb/standalone/model-router/health",
            "documents_health": "/orb/standalone/documents/health",
            "documents_upload": "/orb/standalone/documents/upload",
            "documents_analyse": "/orb/standalone/documents/analyse",
            "evaluation_health": "/orb/standalone/evaluation/health",
            "agents_health": "/orb/standalone/agents/health",
            "agents_list": "/orb/standalone/agents",
            "agents_run": "/orb/standalone/agents/run",
            "agents_deep_research": "/orb/standalone/agents/deep-research",
            "capabilities": "/orb/standalone/capabilities",
            "capabilities_summary": "/orb/standalone/capabilities/summary",
            "surface_route": "/orb/standalone/surface-route",
        },
    }


def _resolve_detail(mode: str, requested: str | None) -> str:
    if requested == "voice_concise":
        return "voice_concise"
    if requested in {"concise"}:
        return "concise"
    if requested == "detailed":
        return "detailed"
    if requested == "balanced":
        return "concise"
    if mode in {"Safeguarding", "Ofsted Lens", "Record This Properly"}:
        return "detailed"
    return "concise"


def _build_framed_message(*, mode: str, user_message: str, detail: str) -> str:
    mode_hint = MODE_BEHAVIOUR.get(mode, "")
    detail_hint = ""
    if detail == "voice_concise":
        detail_hint = (
            "Answer style: Voice concise — keep the first answer short and speakable (about 3–6 sentences), "
            "then offer to go deeper."
        )
    elif detail == "concise":
        detail_hint = "Answer style: Concise — keep answers clear and reasonably brief unless the user asks for detail."
    elif detail == "detailed":
        detail_hint = "Answer style: Detailed — provide fuller structured guidance with practical next steps."

    parts = [
        STANDALONE_ORB_IDENTITY,
        STANDALONE_ORB_CAPABILITIES,
        STANDALONE_ORB_PRODUCT_KNOWLEDGE,
        STANDALONE_ORB_BOUNDARIES,
        STANDALONE_ORB_CITATIONS,
        STANDALONE_ORB_TONE,
        mode_hint,
        detail_hint,
        f"Mode: {mode}",
        f"User message: {user_message}",
    ]
    return "\n\n".join(part for part in parts if part)


@router.get("/health")
async def standalone_orb_health(current_user=Depends(require_standalone_orb_access)):
    return {
        "success": True,
        "data": {
            **_standalone_contract(),
            "status": "ready",
            "isolation_verified": True,
            "model_router": ai_provider_registry.health_payload(),
            "runtime_note": "Standalone ORB uses general assistant guidance services only. It must not call OS-linked ORB care-context endpoints.",
        },
    }


@router.get("/model-router/health")
async def standalone_model_router_health(current_user=Depends(require_standalone_orb_access)):
    return {
        "success": True,
        "data": ai_provider_registry.health_payload(),
    }


@router.get("/config")
async def standalone_orb_config(current_user=Depends(require_standalone_orb_access)):
    return {
        "success": True,
        "data": _standalone_contract(),
    }


class OrbStandaloneSurfaceRouteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    intent: str = Field(..., min_length=1, max_length=8000)
    mode: str | None = Field(default=None, max_length=80)
    has_document_upload: bool = False


@router.get("/capabilities")
async def standalone_orb_capabilities(current_user=Depends(require_standalone_orb_access)):
    payload = indicare_intelligence_capability_service.list_capabilities()
    return {"success": True, "data": payload.model_dump()}


@router.get("/capabilities/summary")
async def standalone_orb_capabilities_summary(current_user=Depends(require_standalone_orb_access)):
    summary = indicare_intelligence_capability_service.summarize()
    return {"success": True, "data": summary.model_dump()}


@router.post("/surface-route")
async def standalone_orb_surface_route(
    body: OrbStandaloneSurfaceRouteRequest,
    current_user=Depends(require_standalone_orb_access),
):
    decision = indicare_intelligence_surface_router.route(
        body.intent,
        has_document_upload=body.has_document_upload,
        mode=body.mode,
    )
    boundary = standalone_os_boundary_message(body.intent)
    return {
        "success": True,
        "data": {
            **decision.model_dump(),
            "standalone_boundary_message": boundary,
        },
    }


def _standalone_conversation_response(
    *,
    answer: str,
    mode: str,
    conversation_id: str | None,
    tools_used: list[str] | None = None,
    confidence: str = "medium",
    image_understanding_available: bool | None = None,
    error_detail: str | None = None,
    sources: list[dict[str, Any]] | None = None,
    citations: list[dict[str, Any]] | None = None,
    context_used: dict[str, Any] | None = None,
) -> dict[str, Any]:
    resolved_sources = sources or []
    resolved_citations = citations or orb_citation_service.normalise_sources(resolved_sources)
    if not resolved_sources and resolved_citations:
        resolved_sources = orb_citation_service.frontend_sources_payload(resolved_citations)
    base_context = {
        "surface": "standalone_orb_ai",
        "mode": mode,
        "care_record_access": False,
        "os_linked": False,
        "tools_used": tools_used or ["standalone_orb_general_assistant"],
    }
    if context_used:
        base_context.update(context_used)
    if "retrieval" not in base_context:
        base_context["retrieval"] = {
            "strategy": "source_pack_plus_document_rag",
            "live_retrieved": False,
            "source_count": len(resolved_sources),
            "document_result_count": 0,
        }
    return {
        "ok": True,
        "success": True,
        "standalone": True,
        "os_records_accessed": False,
        "answer": answer,
        "summary": answer.split("\n", 1)[0][:220],
        "sources": resolved_sources,
        "citations": resolved_citations,
        "actions": [],
        "confidence": confidence,
        "conversation_id": conversation_id,
        "image_understanding_available": image_understanding_available,
        "error_detail": error_detail,
        "context_used": base_context,
        "guardrails": [
            "Standalone ORB did not retrieve IndiCare OS records.",
            "Use professional judgement and follow safeguarding procedures where risk is present.",
        ],
    }


@router.post("/conversation")
async def standalone_orb_conversation(
    payload: OrbStandaloneConversationRequest,
    current_user=Depends(require_standalone_orb_access),
):
    mode = payload.mode or "Ask ORB"
    detail = _resolve_detail(mode, payload.detail)
    framed_message = _build_framed_message(mode=mode, user_message=payload.message, detail=detail)
    history = payload.history[-20:] if payload.history else []
    image_urls = [
        item.data_url
        for item in (payload.images or [])
        if str(item.data_url or "").startswith("data:image/")
    ]
    profile_context = "standalone context profiles" in framed_message.lower() or "profile:" in framed_message.lower()
    retrieval_preview = orb_knowledge_retrieval_service.retrieve_sources(
        payload.message,
        mode=mode,
        profile_context=profile_context,
        attachments=image_urls[:4] or None,
    )

    started = time.perf_counter()
    try:
        assistant_data = await orb_general_assistant_service.answer(
            framed_message,
            history=history,
            detail=detail,
            image_data_urls=image_urls[:4],
            mode=mode,
            profile_context=profile_context,
            document_text=payload.document_text,
            document_source_id=payload.document_source_id,
            document_title=payload.document_title,
            raw_user_message=payload.message,
        )
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info(
            "standalone_orb_conversation ok mode=%s detail=%s images=%s elapsed_ms=%s",
            mode,
            detail,
            len(image_urls),
            elapsed_ms,
        )
        answer = str(
            assistant_data.get("answer") or "I can help with that, but I could not form a response just now."
        )
        response_sources = list(assistant_data.get("sources") or [])
        response_citations = list(assistant_data.get("citations") or [])
        if not response_sources:
            response_citations = orb_citation_service.build_citations(
                retrieval_preview,
                message=payload.message,
                mode=mode,
                has_images=bool(image_urls),
            )
            response_sources = orb_citation_service.frontend_sources_payload(response_citations)
        context_used = dict(assistant_data.get("context_used") or {})
        if not context_used.get("retrieval"):
            context_used["retrieval"] = {
                "strategy": "source_pack_plus_document_rag",
                "live_retrieved": False,
                "source_count": len(retrieval_preview),
                "document_result_count": 0,
            }
        return _standalone_conversation_response(
            answer=answer,
            mode=mode,
            conversation_id=payload.conversation_id,
            tools_used=assistant_data.get("tools_used"),
            confidence=str(assistant_data.get("confidence") or "medium"),
            image_understanding_available=assistant_data.get("image_understanding_available"),
            error_detail=assistant_data.get("error_detail"),
            sources=response_sources,
            citations=response_citations,
            context_used=context_used,
        )
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.warning(
            "standalone_orb_conversation failed mode=%s detail=%s images=%s elapsed_ms=%s error_type=%s",
            mode,
            detail,
            len(image_urls),
            elapsed_ms,
            type(exc).__name__,
        )
        lower = payload.message.lower()
        if image_urls:
            fallback = (
                "I can see you attached an image, but image understanding is not configured in this environment. "
                "I can still help using the text you provide."
            )
            sources = build_standalone_sources(payload.message, has_images=True, mode=mode)
            citations = orb_citation_service.normalise_sources(sources)
            fallback = append_sources_basis_section(fallback, sources)
        elif any(term in lower for term in ("indicare", "what is indicare", "tell me about indicare", "orb", "care companion")):
            fallback = INDICARE_PRODUCT_FALLBACK
            sources = build_standalone_sources(payload.message, mode=mode)
            citations = orb_citation_service.normalise_sources(sources)
        else:
            fallback = (
                "ORB could not complete the live AI response, but I can still help you try again."
            )
            sources = build_standalone_sources(payload.message, mode=mode)
            citations = orb_citation_service.normalise_sources(sources)
            fallback = append_sources_basis_section(fallback, sources)
        classification = orb_knowledge_retrieval_service.classify_query(
            payload.message,
            mode=mode,
            profile_context=profile_context,
            attachments=image_urls[:4] or None,
        )
        context_used = {
            "surface": "standalone_orb_ai",
            "mode": mode,
            "care_record_access": False,
            "os_linked": False,
            "retrieval": {
                "strategy": "source_pack_plus_document_rag",
                "live_retrieved": False,
                "source_count": len(sources),
                "document_result_count": 0,
                "research_intent": classification.get("research_intent", False),
            },
        }
        if classification.get("research_note") and "live web" not in fallback.lower():
            fallback = f"{fallback}\n\n{classification['research_note']}"
        return _standalone_conversation_response(
            answer=fallback,
            mode=mode,
            conversation_id=payload.conversation_id,
            tools_used=["standalone_orb_general_assistant"],
            confidence="low",
            image_understanding_available=False if image_urls else None,
            error_detail="provider_unavailable",
            sources=sources,
            citations=citations,
            context_used=context_used,
        )
