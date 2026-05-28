from __future__ import annotations

import logging
import time
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from services.orb_citation_service import orb_citation_service
from services.ai_provider_registry import ai_provider_registry
import os

from services.orb_converged_general_assistant_service import orb_converged_general_assistant_service
from services.orb_general_assistant_service import orb_general_assistant_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_standalone_brain_service import orb_standalone_brain_service
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_official_source_anchor_service import orb_official_source_anchor_service
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime
from services.orb_explainability_runtime_service import orb_explainability_runtime_service
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
    filter_display_sources,
)

logger = logging.getLogger("indicare.orb_standalone")

router = APIRouter(prefix="/orb/standalone", tags=["ORB Standalone Assistant"])

STANDALONE_ORB_MODES = [
    "Ask ORB",
    "Safeguarding Thinking",
    "Ofsted Lens",
    "Therapeutic Reframe",
    "Record This Properly",
    "Manager Copilot",
    "Staff Coach",
    "Reg 44 / Reg 45 Prep",
    "Reflect with ORB",
    "Behaviour Support",
    "Policy Explainer",
    "Scenario Simulator",
]

STANDALONE_ORB_GUARDRAILS = [
    "ORB Care Companion is standalone and does not retrieve IndiCare OS care records.",
    "It gives guidance and reflective support, not statutory, medical or legal decisions.",
    "For immediate safeguarding risk, follow local procedures and escalate to the relevant safeguarding lead or emergency service.",
]

STANDALONE_ORB_IDENTITY = (
    "You are ORB Care Companion, IndiCare's standalone AI copilot for residential children's homes."
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
- Behave like a broad ChatGPT-style assistant with deep children's homes sector intelligence.
""".strip()

STANDALONE_ORB_PRODUCT_KNOWLEDGE = """
IndiCare product knowledge:
- IndiCare is a residential children's homes operating system and intelligence platform for staff and managers.
- Built around care recording, safeguarding, Ofsted/SCCIF readiness, Quality Standards, governance, workforce support and reflective practice.
- Aims to simplify recording and oversight and make records more child-centred, evidence-led and easier to review.
- Areas include Care Hub (command centre), Record, Young People, Chronology, Documents, Actions, Intelligence Spine, Ofsted readiness, workforce support, governance, Reports and ORB.
- ORB Care Companion is standalone /orb — ChatGPT-style guidance, reflection and practice support; no live OS records.
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
- Prefer official source anchors over broad source labels where law, statutory guidance or inspection guidance is relevant.
- Use inline citation anchors beside relevant claims, e.g. [Reg 12], [Reg 13], [SCCIF], [Working Together], [Recording quality].
- Do not fabricate URLs, paragraph numbers or exact quotations.
- Exact quotations are only allowed where exact official source text has been retrieved or provided in the conversation.
- If exact text is unavailable, explain that the answer is based on official-source anchors and built-in guidance summaries.
- Product questions: IndiCare product context; Standalone ORB product boundary.
- General knowledge: general model knowledge unless user provided context.
""".strip()

STANDALONE_ORB_TONE = """
Tone:
- British English, calm, warm, reflective, practical, non-judgemental and child-centred.
- Sound like an experienced registered manager, therapeutic lead and safeguarding-aware practice supervisor.
- Avoid generic chatbot phrasing, robotic disclaimers and vague safeguarding summaries.
- Give the user a helpful answer first, then add boundaries where needed.
- Ask one useful follow-up question when it would materially improve safety, recording or reflection.
""".strip()

MODE_BEHAVIOUR = {
    "Safeguarding": (
        "Mode behaviour — Safeguarding: advise immediate escalation where risk appears immediate; "
        "remind the user to follow local safeguarding policy; do not decide thresholds."
    ),
    "Safeguarding Thinking": (
        "Mode behaviour — Safeguarding Thinking: separate facts, concerns, missing information, escalation considerations and evidence needs. "
        "Use institutional anchors ([Reg 12], [Reg 13], [SCCIF], [Working Together], [LADO], [Recording quality]) inline — not generic safeguarding summaries."
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
    "Therapeutic Reframe": (
        "Mode behaviour — Therapeutic Reframe: reframe behaviour through trauma-informed, relational and repair-focused practice."
    ),
    "Reflect": (
        "Mode behaviour — Reflect: emotionally containing; support staff wellbeing and reflective practice."
    ),
    "Reflect with ORB": (
        "Mode behaviour — Reflect with ORB: supervision-style reflection, emotional containment and practice learning."
    ),
    "Manager Copilot": (
        "Mode behaviour — Manager Copilot: focus on oversight, evidence gaps, actions, learning and inspection readiness."
    ),
    "Staff Coach": (
        "Mode behaviour — Staff Coach: support staff confidence, debrief, practice development and next-time learning."
    ),
    "Reg 44 / Reg 45 Prep": (
        "Mode behaviour — Reg 44 / Reg 45 Prep: focus on provider governance visits, evidence sufficiency, "
        "improvement planning and leadership accountability without predicting inspection outcomes."
    ),
    "Policy Explainer": (
        "Mode behaviour — Policy Explainer: explain policy, regulations or guidance in plain English for use on shift."
    ),
    "Scenario Simulator": (
        "Mode behaviour — Scenario Simulator: identify risks, therapeutic lens, evidence needed and safe next steps from user-described scenarios."
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
    if mode in {"Safeguarding", "Safeguarding Thinking", "Ofsted Lens", "Record This Properly", "Manager Copilot"}:
        return "detailed"
    return "concise"


def _build_framed_message(
    *,
    mode: str,
    user_message: str,
    detail: str,
    history: list[dict] | None = None,
    grounding_context: str | None = None,
    prompt_tier: str = "residential",
    shared_runtime_block: str | None = None,
) -> str:
    resolved_mode = orb_standalone_brain_service.normalise_mode(mode)
    mode_hint = MODE_BEHAVIOUR.get(resolved_mode) or MODE_BEHAVIOUR.get(mode, "")
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

    if prompt_tier == "fast":
        parts = [
            STANDALONE_ORB_IDENTITY,
            STANDALONE_ORB_BOUNDARIES,
            grounding_context or "",
            mode_hint,
            detail_hint,
            f"Mode: {resolved_mode}",
            f"User message: {user_message}",
        ]
        return "\n\n".join(part for part in parts if part)

    brain_block = orb_standalone_brain_service.build_prompt_block(user_message, mode=resolved_mode)
    if shared_runtime_block is None:
        shared_runtime_block = shared_institutional_cognition_runtime.prompt_addendum(
            surface="standalone_orb",
            message=user_message,
            mode=resolved_mode,
            history=history,
        )

    if prompt_tier == "deep":
        parts = [
            STANDALONE_ORB_IDENTITY,
            STANDALONE_ORB_CAPABILITIES,
            STANDALONE_ORB_PRODUCT_KNOWLEDGE,
            STANDALONE_ORB_BOUNDARIES,
            STANDALONE_ORB_CITATIONS,
            shared_runtime_block,
            grounding_context or "",
            STANDALONE_ORB_TONE,
            brain_block,
            mode_hint,
            detail_hint,
            f"Mode: {resolved_mode}",
            f"User message: {user_message}",
        ]
        return "\n\n".join(part for part in parts if part)

    # residential standard path — omit full product essay and citation essay unless needed
    parts = [
        STANDALONE_ORB_IDENTITY,
        STANDALONE_ORB_BOUNDARIES,
        STANDALONE_ORB_CAPABILITIES,
        shared_runtime_block,
        grounding_context or "",
        STANDALONE_ORB_TONE,
        brain_block,
        mode_hint,
        detail_hint,
        f"Mode: {resolved_mode}",
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
            "runtime_note": "Standalone ORB uses guidance and specialist standalone brain framing only. It must not call OS-linked ORB care-context endpoints.",
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
            "standalone_brain": orb_standalone_brain_service.context_payload(body.intent, mode=body.mode),
        },
    }


def _merge_cognition_labels(
    *,
    shared_cognition: dict[str, Any],
    explainability: dict[str, Any],
) -> list[str]:
    shared_explain = shared_cognition.get("explainability") or {}
    return list(
        shared_cognition.get("cognition_display_labels")
        or shared_explain.get("cognition_display_labels")
        or explainability.get("cognition_display_labels")
        or []
    )


def _apply_cognition_context(
    context_used: dict[str, Any],
    *,
    shared_cognition: dict[str, Any],
    explainability: dict[str, Any],
) -> dict[str, Any]:
    labels = _merge_cognition_labels(shared_cognition=shared_cognition, explainability=explainability)
    shared_explain = shared_cognition.get("explainability") or {}
    routing = shared_cognition.get("routing") or {}
    if labels:
        context_used["cognition_display_labels"] = labels
    if shared_explain.get("depth_topic"):
        context_used["depth_topic"] = shared_explain.get("depth_topic")
    if routing.get("active_brains"):
        context_used["active_brains"] = list(routing.get("active_brains") or shared_cognition.get("active_brains") or [])
    if shared_explain.get("reasoning_lenses"):
        context_used["reasoning_lenses"] = list(shared_explain.get("reasoning_lenses") or [])
    context_used["explainability"] = explainability
    return context_used


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
    cognition_display_labels: list[str] | None = None,
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
    resolved_labels = list(
        cognition_display_labels
        or base_context.get("cognition_display_labels")
        or (base_context.get("explainability") or {}).get("cognition_display_labels")
        or []
    )
    if resolved_labels:
        base_context["cognition_display_labels"] = resolved_labels
    payload: dict[str, Any] = {
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
    if resolved_labels:
        payload["cognition_display_labels"] = resolved_labels
    return payload


@router.post("/conversation")
async def standalone_orb_conversation(
    payload: OrbStandaloneConversationRequest,
    current_user=Depends(require_standalone_orb_access),
):
    mode = orb_standalone_brain_service.normalise_mode(payload.mode or "Ask ORB")
    detail = _resolve_detail(mode, payload.detail)
    history = payload.history[-20:] if payload.history else []
    image_urls = [
        item.data_url
        for item in (payload.images or [])
        if str(item.data_url or "").startswith("data:image/")
    ]
    profile_context = (
        "standalone context profiles" in payload.message.lower() or "profile:" in payload.message.lower()
    )
    retrieval_bundle = orb_knowledge_retrieval_service.prepare_request_bundle(
        payload.message,
        mode=mode,
        profile_context=profile_context,
        attachments=image_urls[:4] or None,
    )
    prompt_tier = retrieval_bundle["prompt_tier"]
    grounding_context = retrieval_bundle["grounding_context"]
    retrieval_preview = retrieval_bundle["source_packs"]

    if prompt_tier == "fast":
        shared_cognition = {
            "surface": "standalone_orb",
            "mode": mode,
            "active_brains": ["general_assistant"],
            "cognition_display_labels": ["General knowledge"],
            "explainability": {"cognition_display_labels": ["General knowledge"]},
            "citations": [],
            "prompt_blocks": [],
        }
        shared_runtime_block = ""
    else:
        shared_cognition = shared_institutional_cognition_runtime.build_context(
            surface="standalone_orb",
            message=payload.message,
            mode=mode,
            history=history,
        )
        shared_runtime_block = shared_institutional_cognition_runtime.prompt_addendum(
            surface="standalone_orb",
            message=payload.message,
            mode=mode,
            history=history,
        )

    standalone_brain = orb_standalone_brain_service.context_payload(payload.message, mode=mode)
    framed_message = _build_framed_message(
        mode=mode,
        user_message=payload.message,
        detail=detail,
        history=history,
        grounding_context=grounding_context,
        prompt_tier=prompt_tier,
        shared_runtime_block=shared_runtime_block,
    )

    route_started = time.perf_counter()
    try:
        use_converged = os.getenv("ORB_USE_CONVERGED_RUNTIME", "true").strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        assistant_runtime = (
            orb_converged_general_assistant_service
            if use_converged
            else orb_general_assistant_service
        )
        assistant_data = await assistant_runtime.answer(
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
        elapsed_ms = int((time.perf_counter() - route_started) * 1000)
        model_routing = (assistant_data.get("context_used") or {}).get("model_routing") or {}
        logger.info(
            "standalone_orb_conversation ok mode=%s detail=%s images=%s brains=%s tier=%s elapsed_ms=%s retrieval_ms=%s",
            mode,
            detail,
            len(image_urls),
            ",".join(shared_cognition.get("active_brains") or standalone_brain.get("active_brains") or []),
            prompt_tier,
            elapsed_ms,
            retrieval_bundle.get("retrieval_elapsed_ms"),
        )
        answer = orb_grounded_answer_style_service.sanitize_high_attention_closer(
            str(assistant_data.get("answer") or "I can help with that, but I could not form a response just now."),
            message=payload.message,
            mode=mode,
        )
        response_sources = list(assistant_data.get("sources") or [])
        response_citations = list(assistant_data.get("citations") or [])
        response_citations.extend(shared_cognition.get("citations") or [])
        if not response_sources:
            response_citations.extend(
                orb_citation_service.build_citations(
                    retrieval_preview,
                    message=payload.message,
                    mode=mode,
                    has_images=bool(image_urls),
                )
            )
            response_sources = orb_citation_service.frontend_sources_payload(response_citations)
        elif response_citations:
            response_sources.extend(orb_citation_service.frontend_sources_payload(response_citations))
        confidence = str(assistant_data.get("confidence") or "medium")
        shared_explain = shared_cognition.get("explainability") or {}
        cognition_labels = _merge_cognition_labels(
            shared_cognition=shared_cognition,
            explainability={"cognition_display_labels": shared_explain.get("cognition_display_labels")},
        )
        explainability = orb_explainability_runtime_service.build(
            surface="standalone_orb",
            mode=mode,
            active_brains=list(shared_cognition.get("active_brains") or []),
            citations=response_citations,
            operational_context_used=False,
            confidence=confidence,
            cognition_display_labels=cognition_labels,
            depth_topic=shared_explain.get("depth_topic"),
            reasoning_lenses=list(shared_explain.get("reasoning_lenses") or []),
            vault_domains=list(shared_explain.get("vault_domains") or []),
        )
        response_sources = filter_display_sources(response_sources, message=payload.message, mode=mode)
        response_citations = filter_display_sources(response_citations, message=payload.message, mode=mode)
        context_used = dict(assistant_data.get("context_used") or {})
        context_used["standalone_brain"] = standalone_brain
        context_used["shared_cognition"] = shared_cognition
        context_used["official_source_grounding"] = bool(shared_cognition.get("citations"))
        context_used["orb_knowledge_grounding_injected"] = True
        context_used["orb_knowledge_grounding_preview"] = grounding_context[:1200]
        context_used = _apply_cognition_context(
            context_used,
            shared_cognition=shared_cognition,
            explainability=explainability,
        )
        if not context_used.get("retrieval"):
            context_used["retrieval"] = {
                "strategy": "source_pack_plus_document_rag_plus_operating_brain",
                "live_retrieved": False,
                "source_count": len(retrieval_preview),
                "document_result_count": 0,
            }
        context_used["timing"] = {
            "elapsed_ms": elapsed_ms,
            "retrieval_elapsed_ms": retrieval_bundle.get("retrieval_elapsed_ms"),
            "provider_elapsed_ms": model_routing.get("latency_ms"),
            "prompt_tier": prompt_tier,
            "prompt_char_estimate": len(framed_message),
            "grounding_char_count": retrieval_bundle.get("grounding_char_count"),
            "model": model_routing.get("model"),
            "provider": model_routing.get("provider"),
            "route": "/orb/standalone/conversation",
        }
        return _standalone_conversation_response(
            answer=answer,
            mode=mode,
            conversation_id=payload.conversation_id,
            tools_used=assistant_data.get("tools_used"),
            confidence=confidence,
            image_understanding_available=assistant_data.get("image_understanding_available"),
            error_detail=assistant_data.get("error_detail"),
            sources=response_sources,
            citations=response_citations,
            context_used=context_used,
            cognition_display_labels=cognition_labels,
        )
    except Exception as exc:
        elapsed_ms = int((time.perf_counter() - route_started) * 1000)
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
        citations.extend(shared_cognition.get("citations") or [])
        if citations:
            sources.extend(orb_citation_service.frontend_sources_payload(citations))
        classification = orb_knowledge_retrieval_service.classify_query(
            payload.message,
            mode=mode,
            profile_context=profile_context,
            attachments=image_urls[:4] or None,
        )
        shared_explain = shared_cognition.get("explainability") or {}
        cognition_labels = _merge_cognition_labels(
            shared_cognition=shared_cognition,
            explainability={"cognition_display_labels": shared_explain.get("cognition_display_labels")},
        )
        explainability = orb_explainability_runtime_service.build(
            surface="standalone_orb",
            mode=mode,
            active_brains=list(shared_cognition.get("active_brains") or []),
            citations=citations,
            operational_context_used=False,
            confidence="low",
            cognition_display_labels=cognition_labels,
            depth_topic=shared_explain.get("depth_topic"),
            reasoning_lenses=list(shared_explain.get("reasoning_lenses") or []),
            vault_domains=list(shared_explain.get("vault_domains") or []),
        )
        sources = filter_display_sources(sources, message=payload.message, mode=mode)
        citations = filter_display_sources(citations, message=payload.message, mode=mode)
        context_used = {
            "surface": "standalone_orb_ai",
            "mode": mode,
            "care_record_access": False,
            "os_linked": False,
            "standalone_brain": standalone_brain,
            "shared_cognition": shared_cognition,
            "official_source_grounding": bool(shared_cognition.get("citations")),
            "orb_knowledge_grounding_injected": True,
            "orb_knowledge_grounding_preview": grounding_context[:1200] if grounding_context else "",
            "retrieval": {
                "strategy": "source_pack_plus_document_rag_plus_operating_brain",
                "live_retrieved": False,
                "source_count": len(sources),
                "document_result_count": 0,
                "research_intent": classification.get("research_intent", False),
            },
        }
        context_used = _apply_cognition_context(
            context_used,
            shared_cognition=shared_cognition,
            explainability=explainability,
        )
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
            cognition_display_labels=cognition_labels,
        )
