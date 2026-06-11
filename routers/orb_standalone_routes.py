from __future__ import annotations

import json
import logging
import os
import time
from collections.abc import AsyncIterator
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_product_bootstrap_dependency import require_orb_product_bootstrap_access
from auth.orb_standalone_premium_dependency import (
    require_rich_orb_premium_access as require_standalone_orb_access,
)
from services.orb_citation_service import orb_citation_service
from services.ai_provider_registry import ai_provider_registry
from services.orb_converged_general_assistant_service import orb_converged_general_assistant_service
from services.orb_general_assistant_service import orb_general_assistant_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.indicare_intelligence_route_finalize_service import (
    finalize_standalone_intelligence,
    merge_intelligence_into_context,
)
from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_chat_timing_service import (
    OrbChatTimingTracker,
    build_route_timing_payload,
    log_orb_route_timing,
)
from services.orb_fast_opening_service import (
    STREAM_INCOMPLETE_FALLBACK_MESSAGE,
    fast_opening_for_message,
    is_fast_opening_only_answer,
    merge_stream_answer,
    strip_streaming_artifacts_from_answer,
)
from services.orb_stream_status_service import (
    stream_status_payload,
    stream_status_sequence,
)
from services.orb_brain_route_service import orb_brain_route_service
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_brain_route_map_service import orb_brain_route_map_service
from services.orb_execution_policy_service import orb_execution_policy_service
from auth.current_user import get_current_user
from services.orb_recording_contract_service import build_incident_report_prompt_block, is_incident_report_draft_request
from services.orb_standalone_brain_service import orb_standalone_brain_service
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.orb_official_source_anchor_service import orb_official_source_anchor_service
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime
from services.orb_unified_explainability_service import orb_unified_explainability_service
from services.indicare_intelligence_capability_service import (
    indicare_intelligence_capability_service,
)
from services.indicare_intelligence_surface_router import (
    indicare_intelligence_surface_router,
    standalone_os_boundary_message,
)
from services.orb_action_engine_service import orb_action_engine_service
from services.orb_brain_metadata_service import attach_to_payload, merge_context_used
from services.orb_brain_visibility_service import (
    build_public_explainability,
    get_safety_pack_map,
    run_contract_quality_pack,
    sanitize_orb_brain_metadata_for_user,
    sanitize_orb_brain_route_preview,
    user_can_view_orb_brain_debug,
)
from services.orb_residential_quality_service import orb_residential_quality_service
from services.orb_brain_selection_shadow_service import (
    attach_brain_selection_shadow,
    run_brain_selection_shadow,
)
from services.orb_plan_enforcement_service import orb_plan_enforcement_service
from services.orb_ai_abuse_guard_service import (
    enforce_conversation_turns,
    enforce_daily_ai_call_budget,
    enforce_document_text_length,
    enforce_prompt_length,
)
from services.orb_standalone_usage_service import record_standalone_orb_usage
from services.orb_standalone_sources import (
    INDICARE_PRODUCT_FALLBACK,
    append_sources_basis_section,
    build_standalone_sources,
    filter_display_sources,
)

logger = logging.getLogger("indicare.orb_standalone")

router = APIRouter(prefix="/orb/standalone", tags=["ORB Standalone Assistant"])

from services.orb_standalone_boundary import FORBIDDEN_STANDALONE_OS_KEYS, reject_standalone_os_ids as _reject_standalone_os_ids


def _sse_event(event: str, payload: Any) -> str:
    return f"event: {event}\ndata: {json.dumps(payload, ensure_ascii=False, default=str)}\n\n"


def _use_converged_runtime() -> bool:
    return os.getenv("ORB_USE_CONVERGED_RUNTIME", "true").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }


def _select_assistant_runtime():
    if _use_converged_runtime():
        return orb_converged_general_assistant_service
    return orb_general_assistant_service


def _build_standalone_request_context(
    payload: OrbStandaloneConversationRequest,
    *,
    timing: OrbChatTimingTracker | None = None,
    route: str = "/orb/standalone/conversation",
    safety_scaffold: dict[str, Any] | None = None,
) -> dict[str, Any]:
    if timing:
        timing.mark("context_build_start")
    mode = orb_standalone_brain_service.normalise_mode(payload.mode or "Ask ORB")
    detail = _resolve_detail(mode, payload.detail)
    history = payload.history[-20:] if payload.history else []
    image_urls = [
        item.data_url
        for item in (payload.images or [])
        if str(item.data_url or "").startswith("data:image/")
    ]
    user_message = orb_brain_route_service.extract_user_message(payload.message)
    profile_context = (
        "standalone context profiles" in user_message.lower() or "profile:" in user_message.lower()
    )
    retrieval_bundle = orb_knowledge_retrieval_service.prepare_request_bundle(
        user_message,
        mode=mode,
        profile_context=profile_context,
        attachments=image_urls[:4] or None,
        history=history,
    )
    if timing:
        timing.mark("retrieval_complete")
    from services.orb_safety_scaffold_service import orb_safety_scaffold_service

    prompt_tier = retrieval_bundle["prompt_tier"]
    grounding_context = retrieval_bundle["grounding_context"]
    retrieval_preview = retrieval_bundle["source_packs"]

    scaffold_obj = (
        orb_safety_scaffold_service.build_from_message(user_message, mode=mode)
        if safety_scaffold is None
        else None
    )
    scaffold = safety_scaffold if safety_scaffold is not None else (scaffold_obj.to_dict() if scaffold_obj else {})
    if scaffold_obj and orb_safety_scaffold_service.requires_deep_routing(scaffold_obj):
        prompt_tier = "deep"
        retrieval_bundle["prompt_tier"] = "deep"
    elif scaffold.get("guardrail_active") and scaffold.get("risk_level") in ("high", "critical"):
        prompt_tier = "deep"
        retrieval_bundle["prompt_tier"] = "deep"
    expert_depth_override = (
        "safeguarding_critical"
        if scaffold.get("guardrail_active") and scaffold.get("risk_level") in ("high", "critical")
        else None
    )

    standalone_operational_context: dict[str, Any] = {}
    if payload.document_text:
        standalone_operational_context["document_text"] = payload.document_text
    if payload.document_title:
        standalone_operational_context["document_title"] = payload.document_title

    brain_convergence = orb_brain_convergence_orchestrator_service.build_brain_decision(
        payload.message,
        mode=mode,
        source_surface=payload.source_surface,
        client_route_hint=payload.client_route_hint,
        location_hint=payload.location_hint,
        requested_action=payload.requested_action,
        note_type=payload.note_type,
        profile_context=profile_context,
        route=route,
        prompt_tier=prompt_tier,
        history=history,
        operational_context=standalone_operational_context or None,
    )
    brain_route = brain_convergence.brain_route

    shared_cognition = orb_brain_convergence_orchestrator_service.build_shared_cognition(
        message=user_message,
        mode=mode,
        prompt_tier=prompt_tier,
        history=history,
        operational_context=standalone_operational_context or None,
    )
    if prompt_tier == "fast":
        shared_runtime_block = ""
    else:
        shared_runtime_block = shared_institutional_cognition_runtime.prompt_addendum(
            surface="standalone_orb",
            message=user_message,
            mode=mode,
            operational_context=standalone_operational_context or None,
            history=history,
        )
    if timing:
        timing.mark("shared_cognition_complete")

    standalone_brain = dict(brain_convergence.standalone_brain)
    standalone_brain["brain_convergence"] = orb_brain_convergence_orchestrator_service.convergence_metadata(
        brain_convergence,
        route=route,
    )
    project_memory_block = ""
    memory_text = (payload.project_memory or "").strip()
    if memory_text:
        project_memory_block = (
            "User-selected ORB project context: "
            f"{memory_text}\n"
            "This is user-supplied ORB memory, not verified live IndiCare OS record data."
        )
    indicare_intelligence = retrieval_bundle.get("indicare_intelligence") or {}
    expert_depth = retrieval_bundle.get("expert_depth") or indicare_intelligence.get("expert_depth")
    if expert_depth_override:
        expert_depth = expert_depth_override
        retrieval_bundle["expert_depth"] = expert_depth_override
    brain_selection_shadow = run_brain_selection_shadow(
        user_message,
        mode=mode,
        attachments=image_urls[:4] or None,
        prompt_tier=prompt_tier,
        expert_depth=expert_depth,
        route=route,
    )
    from services.orb_live_guardrail_service import build_guardrail_prompt_block
    from services.orb_safety_scaffold_service import OrbSafetyScaffold

    guardrail_block = ""
    if scaffold.get("guardrail_active"):
        scaffold_for_prompt = scaffold_obj or OrbSafetyScaffold(
            **{k: v for k, v in scaffold.items() if k in OrbSafetyScaffold.__dataclass_fields__}
        )
        guardrail_block = build_guardrail_prompt_block(scaffold_for_prompt)
    framed_message = _build_framed_message(
        mode=mode,
        user_message=user_message,
        detail=detail,
        history=history,
        grounding_context=grounding_context,
        prompt_tier=prompt_tier,
        shared_runtime_block=shared_runtime_block,
        project_memory_block=project_memory_block or None,
        expert_depth=expert_depth,
        mandatory_contract_block=brain_convergence.prompt_addendum or None,
        guardrail_block=guardrail_block or None,
    )
    if timing:
        timing.mark("prompt_build_complete")
    execution_policy = orb_execution_policy_service.resolve(
        user_message,
        brain_convergence=brain_convergence.to_dict(),
        retrieval_bundle=retrieval_bundle,
        mode=mode,
        note_type=payload.note_type,
        requested_action=payload.requested_action,
    )
    return {
        "mode": mode,
        "detail": detail,
        "history": history,
        "image_urls": image_urls,
        "profile_context": profile_context,
        "retrieval_bundle": retrieval_bundle,
        "prompt_tier": prompt_tier,
        "grounding_context": grounding_context,
        "retrieval_preview": retrieval_preview,
        "shared_cognition": shared_cognition,
        "standalone_brain": standalone_brain,
        "framed_message": framed_message,
        "indicare_intelligence": indicare_intelligence,
        "expert_depth": expert_depth,
        "brain_selection_shadow": brain_selection_shadow,
        "brain_route": brain_route,
        "brain_convergence": brain_convergence.to_dict(),
        "execution_policy": execution_policy.to_dict(),
        "user_message": user_message,
        "safety_scaffold": scaffold,
    }

def _attach_execution_policy_context(
    context_used: dict[str, Any],
    *,
    ctx: dict[str, Any],
    assistant_data: dict[str, Any],
    model_routing: dict[str, Any] | None = None,
    elapsed_ms: int | None = None,
    framed_message: str = "",
    retrieval_bundle: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Merge execution policy and cost/speed telemetry for founder/admin debug."""
    execution_policy_dict = dict(ctx.get("execution_policy") or {})
    if execution_policy_dict:
        context_used["execution_policy"] = execution_policy_dict
        context_used["selected_contract"] = execution_policy_dict.get("selected_contract")
    tools = assistant_data.get("tools_used") or []
    openai_called = "ai_model_router" in tools or (
        bool((model_routing or {}).get("provider"))
        and str((model_routing or {}).get("provider")).lower() not in {"local", "template", ""}
    )
    if assistant_data.get("no_llm"):
        openai_called = False
    bundle = dict(retrieval_bundle or ctx.get("retrieval_bundle") or {})
    telemetry = orb_execution_policy_service.build_execution_telemetry(
        policy=execution_policy_dict or {},
        openai_called=openai_called,
        embeddings_called=int(bundle.get("embedding_calls") or 0) > 0,
        embeddings_count=int(bundle.get("embedding_calls") or 0),
        scenario_bank_loaded=bool(
            (bundle.get("expert_scenario_context") or {}).get("matched")
        ),
        prompt_chars=len(framed_message or ""),
        total_ms=elapsed_ms,
        final_answer_validation_passed=(assistant_data.get("context_used") or {}).get(
            "execution_telemetry", {}
        ).get("final_answer_validation_passed"),
        public_explainability_labels=list(
            (ctx.get("brain_convergence") or {}).get("public_considerations") or []
        )[:6],
    )
    context_used["execution_telemetry"] = telemetry
    if telemetry.get("optimisation_gap"):
        context_used["optimisation_gap"] = telemetry["optimisation_gap"]
    return context_used


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
    "ORB Residential is standalone and does not retrieve IndiCare OS care records.",
    "It gives guidance and reflective support, not statutory, medical or legal decisions.",
    "For immediate safeguarding risk, follow local procedures and escalate to the relevant safeguarding lead or emergency service.",
]

STANDALONE_ORB_IDENTITY = (
    "You are ORB, a general assistant powered by IndiCare Intelligence. "
    "ORB can answer broad questions and has specialist expertise in children's homes, "
    "safeguarding, Ofsted-readiness, recording, leadership and residential care practice. "
    "When a question relates to children's homes or safeguarding, automatically bring in "
    "the IndiCare Residential specialist brain."
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
- ORB Residential is standalone /orb — ChatGPT-style guidance, reflection and practice support; no live OS records.
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
- British English, calm, warm, reflective, practical and non-judgemental.
- For general knowledge questions, answer clearly without forcing a children's homes lens.
- For residential practice questions, sound like an experienced registered manager, therapeutic lead and safeguarding-aware practice supervisor; be child-centred.
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
        "avoid terms like bad behaviour, attention seeking or manipulative; suggest what evidence to include; "
        "never invent facts, quotes, actions or outcomes; use placeholders and missing-information checklists."
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
    project_memory: str | None = Field(default=None, max_length=20000)
    source_surface: str | None = Field(default=None, max_length=40)
    client_route_hint: str | None = Field(default=None, max_length=80)
    requested_action: str | None = Field(default=None, max_length=120)
    note_type: str | None = Field(default=None, max_length=80)
    location_hint: str | None = Field(default=None, max_length=200)


class OrbStandaloneActionRunRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action: str = Field(..., min_length=1, max_length=80)
    source_message: str | None = Field(default=None, max_length=12000)
    source_answer: str | None = Field(default=None, max_length=50000)
    mode: str = Field(default="Ask ORB", max_length=80)
    context: dict[str, Any] = Field(default_factory=dict)


def _standalone_contract() -> dict[str, Any]:
    return {
        "name": "ORB Residential",
        "surface": "standalone_orb_ai",
        "public_route": "/orb",
        "os_assistant_route": "/assistant",
        "standalone": True,
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
            "conversation_stream": "/orb/standalone/conversation/stream",
            "actions_run": "/orb/standalone/actions/run",
            "actions_registry": "/orb/standalone/actions",
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
    project_memory_block: str | None = None,
    expert_depth: str | None = None,
    mandatory_contract_block: str | None = None,
    guardrail_block: str | None = None,
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

    depth_hint = ""
    if expert_depth:
        depth_hint = (
            f"IndiCare Intelligence depth: {expert_depth}. "
            "ORB shell — brain has scanned this request; adapt answer length and framing to depth."
        )
    if prompt_tier == "fast" and expert_depth == "general_light":
        parts = [
            STANDALONE_ORB_IDENTITY,
            STANDALONE_ORB_BOUNDARIES,
            depth_hint,
            guardrail_block or "",
            project_memory_block or "",
            grounding_context or "",
            mode_hint,
            detail_hint,
            f"Mode: {resolved_mode}",
            f"User message: {user_message}",
        ]
        return "\n\n".join(part for part in parts if part)

    brain_block = orb_standalone_brain_service.build_prompt_block(user_message, mode=resolved_mode)
    mandatory_block = (mandatory_contract_block or "").strip()
    incident_contract_block = ""
    if is_incident_report_draft_request(user_message):
        incident_contract_block = build_incident_report_prompt_block(user_message)
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
            guardrail_block or "",
            project_memory_block or "",
            grounding_context or "",
            STANDALONE_ORB_TONE,
            brain_block,
            mandatory_block,
            incident_contract_block,
            mode_hint,
            detail_hint,
            depth_hint,
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
        guardrail_block or "",
        project_memory_block or "",
        grounding_context or "",
        STANDALONE_ORB_TONE,
        brain_block,
        mandatory_block,
        incident_contract_block,
        mode_hint,
        detail_hint,
        depth_hint,
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
async def standalone_orb_config(current_user=Depends(require_orb_product_bootstrap_access)):
    return {
        "success": True,
        "data": _standalone_contract(),
    }


class OrbStandaloneSurfaceRouteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    intent: str = Field(..., min_length=1, max_length=8000)
    mode: str | None = Field(default=None, max_length=80)
    has_document_upload: bool = False


class OrbStandaloneBrainRouteRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=12000)
    mode: str = Field(default="Ask ORB", max_length=80)
    source_surface: str | None = Field(default=None, max_length=40)
    client_route_hint: str | None = Field(default=None, max_length=80)
    requested_action: str | None = Field(default=None, max_length=120)
    note_type: str | None = Field(default=None, max_length=80)
    location_hint: str | None = Field(default=None, max_length=200)


class OrbStandaloneQualityCheckRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str = Field(..., min_length=1, max_length=120_000)
    note_type: str = Field(default="daily_record", max_length=80)
    record_type_id: str | None = Field(default=None, max_length=120)
    template_id: str | None = Field(default=None, max_length=120)
    surface: str = Field(default="write", max_length=40)


@router.post("/quality-check")
async def standalone_orb_quality_check(
    body: OrbStandaloneQualityCheckRequest,
    current_user=Depends(require_standalone_orb_access),
):
    """Shared child-centred quality layer for Voice, Dictate, Chat and Write."""
    surface = body.surface if body.surface in {"voice", "dictate", "chat", "write", "template", "output"} else "write"
    result = orb_residential_quality_service.run_residential_quality_check(
        body.text,
        note_type=body.note_type,
        record_type_id=body.record_type_id,
        template_id=body.template_id,
        surface=surface,  # type: ignore[arg-type]
    )
    return {"success": True, "data": result}


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
    brain_convergence = orb_brain_convergence_orchestrator_service.build_brain_decision(
        body.intent,
        mode=body.mode,
        source_surface="surface_route",
        route="/orb/standalone/surface-route",
        feature="conversation",
    )
    return {
        "success": True,
        "data": {
            **decision.model_dump(),
            "standalone_boundary_message": boundary,
            "standalone_brain": orb_standalone_brain_service.context_payload(body.intent, mode=body.mode),
            "brain_convergence": orb_brain_convergence_orchestrator_service.convergence_metadata(
                brain_convergence,
                route="/orb/standalone/surface-route",
            ),
            "public_explainability": build_public_explainability(
                brain_convergence=orb_brain_convergence_orchestrator_service.convergence_metadata(
                    brain_convergence
                ),
                mode=body.mode,
            ),
        },
    }


@router.post("/brain-route")
async def standalone_orb_brain_route(
    body: OrbStandaloneBrainRouteRequest,
    current_user=Depends(require_standalone_orb_access),
):
    """Canonical server-authoritative ORB brain route decision."""
    decision = orb_brain_convergence_orchestrator_service.build_brain_decision(
        body.message,
        mode=body.mode,
        source_surface=body.source_surface,
        client_route_hint=body.client_route_hint,
        location_hint=body.location_hint,
        requested_action=body.requested_action,
        note_type=body.note_type,
        route="/orb/standalone/brain-route",
    )
    user_message = orb_brain_route_service.extract_user_message(body.message)
    preview = {
        **decision.brain_route,
        "user_message": user_message,
        "authoritative": True,
        "client_hint_ignored": decision.brain_route.get("client_hint_ignored"),
        "active_brains": decision.active_brains,
        "scenario_types": decision.scenario_types,
        "multi_scenario": decision.multi_scenario,
        "standalone_boundary": decision.standalone_boundary,
    }
    return {
        "success": True,
        "data": sanitize_orb_brain_route_preview(preview, current_user),
    }


def _require_orb_brain_route_debug_access(
    current_user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    if not user_can_view_orb_brain_debug(current_user):
        raise HTTPException(status_code=403, detail="Brain-route debug is restricted to founder/admin QA.")
    return current_user


@router.post("/brain-route/debug")
async def standalone_orb_brain_route_debug(
    body: OrbStandaloneBrainRouteRequest,
    current_user=Depends(_require_orb_brain_route_debug_access),
):
    """Founder/admin QA — brain convergence visibility without secrets or live OS records."""
    _ = current_user
    payload = orb_brain_convergence_orchestrator_service.build_debug_payload(
        body.message,
        mode=body.mode,
    )
    payload["route_map"] = orb_brain_route_map_service.trace_live_route(
        route="/orb/standalone/conversation"
    )
    return {"success": True, "data": payload}


@router.get("/brain-route/map")
async def standalone_orb_brain_route_map(
    current_user=Depends(_require_orb_brain_route_debug_access),
):
    """Documented canonical standalone ORB brain route (founder/admin)."""
    _ = current_user
    return {
        "success": True,
        "data": {
            "surface": "orb_standalone",
            "canonical_route": orb_brain_route_map_service.canonical_route(),
            "audit_gaps": orb_brain_route_map_service.audit_gaps(),
            "parallel_non_authoritative": orb_brain_route_map_service.parallel_layers(),
            "safety_pack": get_safety_pack_map(),
        },
    }


@router.post("/brain-route/qa-run")
async def standalone_orb_brain_route_qa_run(
    current_user=Depends(_require_orb_brain_route_debug_access),
):
    """Founder/admin-only golden prompt contract QA pack."""
    _ = current_user
    return {"success": True, "data": run_contract_quality_pack()}


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
    current_user: dict[str, Any] | None = None,
) -> dict[str, Any]:
    resolved_sources = sources or []
    resolved_citations = citations or orb_citation_service.normalise_sources(resolved_sources)
    if not resolved_sources and resolved_citations:
        resolved_sources = orb_citation_service.frontend_sources_payload(resolved_citations)
    base_context = merge_context_used(
        {
            "mode": mode,
            "tools_used": tools_used or ["standalone_orb_general_assistant"],
            **(context_used or {}),
        },
        surface="orb_standalone",
        mode=mode,
        feature="conversation",
        sources=sources,
        citations=citations,
    )
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
    base_context = sanitize_orb_brain_metadata_for_user(base_context, current_user)
    resolved_labels = list(base_context.get("cognition_display_labels") or resolved_labels)
    payload: dict[str, Any] = attach_to_payload(
        {
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
                "ORB Residential did not retrieve IndiCare OS records.",
                "Use professional judgement and follow safeguarding procedures where risk is present.",
            ],
        },
        surface="orb_standalone",
        mode=mode,
        feature="conversation",
        sources=resolved_sources,
        citations=resolved_citations,
    )
    if resolved_labels:
        payload["cognition_display_labels"] = resolved_labels
    return payload


def _user_id_from(current_user: dict[str, Any]) -> int | None:
    raw = current_user.get("user_id") or current_user.get("id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _enforce_conversation_abuse_guards(
    payload: "OrbStandaloneConversationRequest",
    current_user: dict[str, Any],
) -> None:
    user_id = _user_id_from(current_user)
    enforce_daily_ai_call_budget(user_id)
    enforce_prompt_length(payload.message, user_id=user_id)
    if payload.document_text:
        enforce_document_text_length(payload.document_text, user_id=user_id)
    enforce_conversation_turns(payload.history, user_id=user_id)


def _enforce_plan_limits(
    *,
    current_user: dict[str, Any],
    message: str | None = None,
    prompt_tier: str | None = None,
    event_type: str = "conversation",
) -> dict[str, Any] | None:
    user_id = current_user.get("user_id") or current_user.get("id")
    decision = orb_plan_enforcement_service.enforce_or_raise(
        user_id=int(user_id) if user_id is not None else None,
        user=current_user,
        message=message,
        prompt_tier=prompt_tier,
        event_type=event_type,
    )
    if decision.use_safeguarding_template:
        return {
            "answer": decision.message,
            "confidence": "medium",
            "context_used": {
                "usage_limit": "hard_safeguarding_fallback",
                "hard_limit_reached": True,
            },
        }
    if decision.soft_limit_reached:
        current_user["orb_usage_warning"] = decision.message
    return None


@router.post("/conversation")
async def standalone_orb_conversation(
    payload: OrbStandaloneConversationRequest,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_standalone_os_ids(payload.model_dump())
    _enforce_conversation_abuse_guards(payload, current_user)
    timing = OrbChatTimingTracker()
    timing.mark("request_received")
    ctx = _build_standalone_request_context(payload, timing=timing)
    mode = ctx["mode"]
    detail = ctx["detail"]
    history = ctx["history"]
    image_urls = ctx["image_urls"]
    retrieval_bundle = ctx["retrieval_bundle"]
    prompt_tier = ctx["prompt_tier"]
    grounding_context = ctx["grounding_context"]
    retrieval_preview = ctx["retrieval_preview"]
    shared_cognition = ctx["shared_cognition"]
    standalone_brain = ctx["standalone_brain"]
    framed_message = ctx["framed_message"]
    profile_context = ctx["profile_context"]
    indicare_intelligence = ctx.get("indicare_intelligence") or retrieval_bundle.get("indicare_intelligence") or {}

    limited = _enforce_plan_limits(
        current_user=current_user,
        message=payload.message,
        prompt_tier=prompt_tier,
        event_type="conversation",
    )
    if limited:
        return {
            "success": True,
            "data": _standalone_conversation_response(
                answer=str(limited["answer"]),
                mode=mode,
                conversation_id=payload.conversation_id,
                confidence=str(limited.get("confidence") or "medium"),
                context_used=limited.get("context_used"),
                current_user=current_user,
            ),
        }

    route_started = time.perf_counter()
    try:
        assistant_runtime = _select_assistant_runtime()
        timing.mark("model_start")
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
            user=current_user,
            brain_convergence=ctx.get("brain_convergence"),
            execution_policy=ctx.get("execution_policy"),
            safety_scaffold=ctx.get("safety_scaffold"),
        )
        timing.mark("model_complete")
        elapsed_ms = int((time.perf_counter() - route_started) * 1000)
        record_standalone_orb_usage(
            user_id=int(current_user["id"]) if current_user.get("id") is not None else None,
            result=assistant_data,
            event_type="conversation",
            mode=mode,
            latency_ms=elapsed_ms,
            success=bool(assistant_data.get("answer")),
        )
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
        answer = strip_streaming_artifacts_from_answer(
            str(assistant_data.get("answer") or "I can help with that, but I could not form a response just now."),
        )
        answer = orb_grounded_answer_style_service.sanitize_high_attention_closer(
            answer,
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
        timing.mark("citations_complete")
        confidence = str(assistant_data.get("confidence") or "medium")
        shared_explain = shared_cognition.get("explainability") or {}
        cognition_labels = _merge_cognition_labels(
            shared_cognition=shared_cognition,
            explainability={"cognition_display_labels": shared_explain.get("cognition_display_labels")},
        )
        explainability = orb_unified_explainability_service.build(
            surface="standalone_orb",
            mode=mode,
            active_brains=list(shared_cognition.get("active_brains") or []),
            citations=response_citations,
            operational_context_used=False,
            confidence=confidence,
            cognition_display_labels=cognition_labels,
            reasoning_lenses=list(shared_explain.get("reasoning_lenses") or shared_cognition.get("active_lenses") or []),
            vault_domains=list(shared_explain.get("vault_domains") or []),
            shared_explainability=shared_explain,
            source_anchors=list(shared_explain.get("source_anchors") or []),
        )
        timing.mark("explainability_complete")
        response_sources = filter_display_sources(response_sources, message=payload.message, mode=mode)
        response_citations = filter_display_sources(response_citations, message=payload.message, mode=mode)
        context_used = dict(assistant_data.get("context_used") or {})
        context_used["standalone_brain"] = standalone_brain
        context_used["shared_cognition"] = shared_cognition
        context_used["official_source_grounding"] = bool(shared_cognition.get("citations"))
        context_used["orb_knowledge_grounding_injected"] = True
        context_used["orb_knowledge_grounding_preview"] = grounding_context[:1200]
        expert_packet = retrieval_bundle.get("expert_answer_packet") or {}
        if expert_packet.get("active") and not context_used.get("expert_answer_engine"):
            from services.orb_expert_answer_engine_service import orb_expert_answer_engine_service

            context_used["expert_answer_engine"] = orb_expert_answer_engine_service.metadata_for_context(
                expert_packet,
                context_used.get("expert_self_check"),
            )
        context_used = _apply_cognition_context(
            context_used,
            shared_cognition=shared_cognition,
            explainability=explainability,
        )
        context_used = attach_brain_selection_shadow(
            context_used,
            ctx.get("brain_selection_shadow"),
        )
        if not context_used.get("retrieval"):
            context_used["retrieval"] = {
                "strategy": "source_pack_plus_document_rag_plus_operating_brain",
                "live_retrieved": False,
                "source_count": len(retrieval_preview),
                "document_result_count": 0,
            }
        expert_depth = str(
            ctx.get("expert_depth")
            or indicare_intelligence.get("expert_depth")
            or ""
        )
        if indicare_intelligence:
            answer, intel_meta = finalize_standalone_intelligence(
                indicare_intelligence=indicare_intelligence,
                answer=answer,
                prompt_text=payload.message,
                message=payload.message,
                mode=mode,
                sanitize_closer=orb_grounded_answer_style_service.sanitize_high_attention_closer,
                timing=timing,
            )
            context_used = merge_intelligence_into_context(context_used, intel_meta)
        context_used = _attach_execution_policy_context(
            context_used,
            ctx=ctx,
            assistant_data=assistant_data,
            model_routing=model_routing,
            elapsed_ms=elapsed_ms,
            framed_message=framed_message,
            retrieval_bundle=retrieval_bundle,
        )
        timing.mark("response_sent")
        context_used["timing"] = build_route_timing_payload(
            timing,
            route="/orb/standalone/conversation",
            elapsed_ms=elapsed_ms,
            retrieval_elapsed_ms=retrieval_bundle.get("retrieval_elapsed_ms"),
            provider_elapsed_ms=model_routing.get("latency_ms"),
            prompt_tier=prompt_tier,
            prompt_char_estimate=len(framed_message),
            grounding_char_count=retrieval_bundle.get("grounding_char_count"),
            model=model_routing.get("model"),
            provider=model_routing.get("provider"),
            shared_cognition_skipped=bool(shared_cognition.get("skipped")),
            expert_depth=expert_depth or None,
        )
        log_orb_route_timing(
            "/orb/standalone/conversation",
            context_used["timing"],
            mode=mode,
        )
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
            current_user=current_user,
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
        explainability = orb_unified_explainability_service.build(
            surface="standalone_orb",
            mode=mode,
            active_brains=list(shared_cognition.get("active_brains") or []),
            citations=citations,
            operational_context_used=False,
            confidence="low",
            cognition_display_labels=cognition_labels,
            reasoning_lenses=list(shared_explain.get("reasoning_lenses") or shared_cognition.get("active_lenses") or []),
            vault_domains=list(shared_explain.get("vault_domains") or []),
            shared_explainability=shared_explain,
            source_anchors=list(shared_explain.get("source_anchors") or []),
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
        context_used = attach_brain_selection_shadow(
            context_used,
            ctx.get("brain_selection_shadow"),
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
            current_user=current_user,
        )


@router.post("/conversation/stream")
async def standalone_orb_conversation_stream(
    payload: OrbStandaloneConversationRequest,
    current_user=Depends(require_standalone_orb_access),
):
    """SSE stream of ORB answer tokens with final metadata (standalone boundary preserved)."""
    _reject_standalone_os_ids(payload.model_dump())
    _enforce_conversation_abuse_guards(payload, current_user)
    mode = orb_standalone_brain_service.normalise_mode(payload.mode or "Ask ORB")

    async def event_generator() -> AsyncIterator[str]:
        timing = OrbChatTimingTracker()
        timing.mark("request_received")
        request_started = time.perf_counter()
        first_token_ms: int | None = None
        provider_started: float | None = None
        stream_meta: dict[str, Any] = {}
        answer_parts: list[str] = []

        yield _sse_event("status", stream_status_payload("received"))

        user_message = orb_brain_route_service.extract_user_message(payload.message)
        profile_context = (
            "standalone context profiles" in user_message.lower() or "profile:" in user_message.lower()
        )
        quick_depth = indicare_intelligence_core_service.estimate_expert_depth(
            user_message,
            mode=mode,
            profile_context=profile_context,
        )
        for status_event in stream_status_sequence(quick_depth):
            yield _sse_event("status", status_event)

        fast_opening = fast_opening_for_message(
            user_message,
            expert_depth=quick_depth,
            mode=mode,
        )
        fast_opening_emitted = False
        model_token_count = 0
        if fast_opening:
            fast_opening_emitted = True
            answer_parts.append(f"{fast_opening}\n\n")
            if first_token_ms is None:
                first_token_ms = int((time.perf_counter() - request_started) * 1000)
                timing.mark("first_token")
            yield _sse_event("token", {"delta": f"{fast_opening}\n\n"})

        timing.mark("core_start")
        try:
            ctx = _build_standalone_request_context(
                payload,
                timing=timing,
                route="/orb/standalone/conversation/stream",
            )
        except Exception as exc:
            logger.warning(
                "standalone_orb_conversation_stream context_build failed mode=%s error_type=%s",
                mode,
                type(exc).__name__,
                exc_info=True,
            )
            fallback_answer = merge_stream_answer(
                fast_opening=fast_opening,
                model_answer=STREAM_INCOMPLETE_FALLBACK_MESSAGE,
                streamed_text="".join(answer_parts),
            )
            yield _sse_event(
                "error",
                {
                    "error": "stream_incomplete",
                    "detail": type(exc).__name__,
                    "message": STREAM_INCOMPLETE_FALLBACK_MESSAGE,
                },
            )
            yield _sse_event(
                "metadata",
                {
                    "ok": False,
                    "standalone": True,
                    "os_records_accessed": False,
                    "answer": fallback_answer,
                    "conversation_id": payload.conversation_id,
                    "error_detail": "context_build_failed",
                },
            )
            yield _sse_event("done", {"ok": False})
            return
        timing.mark("core_complete")
        detail = ctx["detail"]
        history = ctx["history"]
        image_urls = ctx["image_urls"]
        retrieval_bundle = ctx["retrieval_bundle"]
        prompt_tier = ctx["prompt_tier"]
        grounding_context = ctx["grounding_context"]
        retrieval_preview = ctx["retrieval_preview"]
        shared_cognition = ctx["shared_cognition"]
        standalone_brain = ctx["standalone_brain"]
        framed_message = ctx["framed_message"]
        indicare_intelligence = ctx.get("indicare_intelligence") or retrieval_bundle.get("indicare_intelligence") or {}
        expert_depth = str(
            ctx.get("expert_depth")
            or indicare_intelligence.get("expert_depth")
            or quick_depth
        )

        limited = _enforce_plan_limits(
            current_user=current_user,
            message=payload.message,
            prompt_tier=prompt_tier,
            event_type="conversation_stream",
        )
        if limited:
            yield _sse_event(
                "error",
                {
                    "message": str(limited.get("answer") or "Usage limit reached."),
                    "code": "usage_limit",
                },
            )
            yield _sse_event("done", {"context_used": limited.get("context_used") or {}})
            return

        try:
            assistant_runtime = _select_assistant_runtime()
            provider_started = time.perf_counter()
            timing.mark("model_start")
            async for delta in assistant_runtime.stream_answer(
                framed_message,
                history=history,
                detail=detail,
                image_data_urls=image_urls[:4],
                mode=mode,
                profile_context=profile_context,
                document_text=payload.document_text,
                document_source_id=payload.document_source_id,
                document_title=payload.document_title,
                raw_user_message=user_message,
                stream_meta=stream_meta,
            ):
                model_token_count += 1
                if first_token_ms is None:
                    first_token_ms = int((time.perf_counter() - request_started) * 1000)
                    timing.mark("first_token")
                answer_parts.append(delta)
                yield _sse_event("token", {"delta": delta})

            timing.mark("stream_complete")
            assistant_data = dict(stream_meta)
            streamed_text = "".join(answer_parts).strip()
            model_answer = str(assistant_data.get("answer") or "").strip()
            merged_answer = merge_stream_answer(
                fast_opening=fast_opening,
                model_answer=model_answer,
                streamed_text=streamed_text,
            )
            assistant_data["answer"] = merged_answer or streamed_text

            if is_fast_opening_only_answer(
                fast_opening=fast_opening,
                final_answer=str(assistant_data.get("answer") or ""),
                model_token_count=model_token_count,
            ):
                fallback_answer = merge_stream_answer(
                    fast_opening=fast_opening,
                    model_answer=STREAM_INCOMPLETE_FALLBACK_MESSAGE,
                    streamed_text=streamed_text,
                )
                yield _sse_event(
                    "error",
                    {
                        "error": "stream_incomplete",
                        "detail": "model_stream_empty",
                        "message": STREAM_INCOMPLETE_FALLBACK_MESSAGE,
                    },
                )
                assistant_data["answer"] = fallback_answer
                assistant_data["error_detail"] = "model_stream_empty_after_fast_opening"

            answer = strip_streaming_artifacts_from_answer(
                str(assistant_data.get("answer") or ""),
                fast_opening=fast_opening,
            )
            answer = orb_grounded_answer_style_service.sanitize_high_attention_closer(
                answer,
                message=user_message,
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
            timing.mark("citations_complete")

            confidence = str(assistant_data.get("confidence") or "medium")
            shared_explain = shared_cognition.get("explainability") or {}
            cognition_labels = _merge_cognition_labels(
                shared_cognition=shared_cognition,
                explainability={"cognition_display_labels": shared_explain.get("cognition_display_labels")},
            )
            explainability = orb_unified_explainability_service.build(
                surface="standalone_orb",
                mode=mode,
                active_brains=list(shared_cognition.get("active_brains") or []),
                citations=response_citations,
                operational_context_used=False,
                confidence=confidence,
                cognition_display_labels=cognition_labels,
                reasoning_lenses=list(shared_explain.get("reasoning_lenses") or shared_cognition.get("active_lenses") or []),
                vault_domains=list(shared_explain.get("vault_domains") or []),
                shared_explainability=shared_explain,
                source_anchors=list(shared_explain.get("source_anchors") or []),
            )
            timing.mark("explainability_complete")
            response_sources = filter_display_sources(response_sources, message=payload.message, mode=mode)
            response_citations = filter_display_sources(response_citations, message=payload.message, mode=mode)
            context_used = dict(assistant_data.get("context_used") or {})
            context_used["standalone_brain"] = standalone_brain
            context_used["shared_cognition"] = shared_cognition
            context_used["official_source_grounding"] = bool(shared_cognition.get("citations"))
            context_used["orb_knowledge_grounding_injected"] = True
            context_used["orb_knowledge_grounding_preview"] = grounding_context[:1200]
            expert_packet = retrieval_bundle.get("expert_answer_packet") or {}
            if expert_packet.get("active") and not context_used.get("expert_answer_engine"):
                from services.orb_expert_answer_engine_service import orb_expert_answer_engine_service

                context_used["expert_answer_engine"] = orb_expert_answer_engine_service.metadata_for_context(
                    expert_packet,
                    context_used.get("expert_self_check"),
                )
            context_used = _apply_cognition_context(
                context_used,
                shared_cognition=shared_cognition,
                explainability=explainability,
            )
            context_used = attach_brain_selection_shadow(
                context_used,
                ctx.get("brain_selection_shadow"),
            )
            if not context_used.get("retrieval"):
                context_used["retrieval"] = {
                    "strategy": "source_pack_plus_document_rag_plus_operating_brain",
                    "live_retrieved": False,
                    "source_count": len(retrieval_preview),
                    "document_result_count": 0,
                }
            model_routing = context_used.get("model_routing") or {}
            total_elapsed_ms = int((time.perf_counter() - request_started) * 1000)
            provider_elapsed_ms = (
                int((time.perf_counter() - provider_started) * 1000) if provider_started else None
            )
            if indicare_intelligence:
                answer, intel_meta = finalize_standalone_intelligence(
                    indicare_intelligence=indicare_intelligence,
                    answer=answer,
                    prompt_text=payload.message,
                    message=payload.message,
                    mode=mode,
                    sanitize_closer=orb_grounded_answer_style_service.sanitize_high_attention_closer,
                    timing=timing,
                )
                context_used = merge_intelligence_into_context(context_used, intel_meta)
            context_used = _attach_execution_policy_context(
                context_used,
                ctx=ctx,
                assistant_data=assistant_data,
                model_routing=model_routing,
                elapsed_ms=total_elapsed_ms,
                framed_message=framed_message,
                retrieval_bundle=retrieval_bundle,
            )
            timing.mark("response_sent")
            context_used["timing"] = build_route_timing_payload(
                timing,
                route="/orb/standalone/conversation/stream",
                elapsed_ms=total_elapsed_ms,
                retrieval_elapsed_ms=retrieval_bundle.get("retrieval_elapsed_ms"),
                provider_elapsed_ms=model_routing.get("latency_ms") or provider_elapsed_ms,
                prompt_tier=prompt_tier,
                prompt_char_estimate=len(framed_message),
                grounding_char_count=retrieval_bundle.get("grounding_char_count"),
                model=model_routing.get("model"),
                provider=model_routing.get("provider"),
                first_token_ms=first_token_ms,
                shared_cognition_skipped=bool(shared_cognition.get("skipped")),
                expert_depth=expert_depth,
                stream_mode="provider_tokens",
                extra={"request_started": True},
            )
            log_orb_route_timing(
                "/orb/standalone/conversation/stream",
                context_used["timing"],
                mode=mode,
            )
            sanitized_context = sanitize_orb_brain_metadata_for_user(context_used, current_user)
            metadata_payload = {
                "ok": True,
                "standalone": True,
                "os_records_accessed": False,
                "answer": answer,
                "summary": answer.split("\n", 1)[0][:220],
                "confidence": confidence,
                "conversation_id": payload.conversation_id,
                "sources": response_sources,
                "citations": response_citations,
                "context_used": sanitized_context,
                "cognition_display_labels": list(
                    sanitized_context.get("cognition_display_labels") or cognition_labels
                ),
                "image_understanding_available": assistant_data.get("image_understanding_available"),
                "error_detail": assistant_data.get("error_detail"),
            }
            yield _sse_event("metadata", metadata_payload)
            yield _sse_event("done", {"ok": True})
            logger.info(
                "standalone_orb_conversation_stream ok mode=%s tier=%s first_token_ms=%s total_ms=%s",
                mode,
                prompt_tier,
                first_token_ms,
                total_elapsed_ms,
            )
        except Exception as exc:
            logger.warning(
                "standalone_orb_conversation_stream failed mode=%s error_type=%s",
                mode,
                type(exc).__name__,
                exc_info=True,
            )
            fallback_answer = merge_stream_answer(
                fast_opening=fast_opening if fast_opening_emitted else None,
                model_answer=STREAM_INCOMPLETE_FALLBACK_MESSAGE,
                streamed_text="".join(answer_parts),
            )
            yield _sse_event(
                "error",
                {
                    "error": "provider_unavailable",
                    "detail": type(exc).__name__,
                    "message": STREAM_INCOMPLETE_FALLBACK_MESSAGE,
                },
            )
            yield _sse_event(
                "metadata",
                {
                    "ok": False,
                    "standalone": True,
                    "os_records_accessed": False,
                    "answer": fallback_answer,
                    "conversation_id": payload.conversation_id,
                    "error_detail": "provider_unavailable",
                },
            )
            yield _sse_event("done", {"ok": False})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/actions")
async def standalone_orb_actions_registry(
    current_user=Depends(require_standalone_orb_access),
):
    """Structured ORB action registry for standalone residential follow-ups."""
    return {
        "success": True,
        "data": {
            "actions": orb_action_engine_service.list_actions(),
            "backend_supported_ids": sorted(
                item["id"]
                for item in orb_action_engine_service.list_actions()
                if item.get("backend_supported")
            ),
            "standalone": True,
            "os_records_accessed": False,
        },
    }


@router.post("/actions/run")
async def standalone_orb_action_run(
    payload: OrbStandaloneActionRunRequest,
    current_user=Depends(require_standalone_orb_access),
):
    _reject_standalone_os_ids(payload.model_dump())
    action_id = orb_action_engine_service.resolve_backend_action_id(payload.action)
    if not orb_action_engine_service.is_backend_supported(action_id):
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error": "action_not_backend_supported",
                "action": payload.action,
                "message": "Use composer prefill for this action until backend support is enabled.",
            },
        )
    if not _text(payload.source_message) and not _text(payload.source_answer):
        raise HTTPException(
            status_code=400,
            detail={
                "success": False,
                "error": "missing_source",
                "message": "Provide source_message and/or source_answer.",
            },
        )

    try:
        result = await orb_action_engine_service.run_action(
            action=action_id,
            source_message=payload.source_message,
            source_answer=payload.source_answer,
            mode=payload.mode,
            context=payload.context,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail={"success": False, "error": str(exc)}) from exc

    return {
        "success": True,
        "data": attach_to_payload(
            result,
            surface="orb_standalone",
            mode=payload.mode,
            feature="action_engine",
            lens=payload.action,
            sources=result.get("sources"),
        ),
    }


def _text(value: Any) -> str:
    return str(value or "").strip()
