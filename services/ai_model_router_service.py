from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from typing import Any

from schemas.ai_models import (
    AiCostTier,
    AiModelCapability,
    AiProviderName,
    AiProviderRequest,
    AiProviderResponse,
    AiQualityTier,
    AiRiskLevel,
    AiRoutingDecision,
    AiRoutingRequest,
    AiTaskType,
    AiModelRouterTrace,
)
from services.ai_cost_policy_service import ai_cost_policy_service
from services.ai_provider_registry import ai_provider_registry
from services.ai_providers.mock_provider import mock_provider
from services.ai_providers.openai_provider import openai_provider

logger = logging.getLogger("indicare.ai_model_router")

STANDALONE_LLM_TIMEOUT_SECONDS = 40.0


def _text(value: Any) -> str:
    return str(value or "").strip()


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


class AiModelRouterService:
    """Provider-agnostic task classification, routing, and completion for standalone ORB."""

    def classify_task(
        self,
        message: str,
        *,
        mode: str | None = None,
        has_images: bool = False,
        research_intent: bool = False,
        retrieval_context: dict[str, Any] | None = None,
        voice_mode: bool = False,
        detail_level: str = "concise",
    ) -> AiTaskType:
        lower = message.lower()
        mode_name = _text(mode)

        if voice_mode or detail_level == "voice_concise":
            return AiTaskType.VOICE_CONCISE

        if has_images:
            return AiTaskType.IMAGE_UNDERSTANDING

        mode_map = {
            "Safeguarding": AiTaskType.SAFEGUARDING_REFLECTION,
            "Ofsted Lens": AiTaskType.REGULATORY_GUIDANCE,
            "Record This Properly": AiTaskType.RECORDING_REWRITE,
            "Behaviour Support": AiTaskType.THERAPEUTIC_REFLECTION,
            "Reflect": AiTaskType.THERAPEUTIC_REFLECTION,
        }
        if mode_name in mode_map:
            return mode_map[mode_name]

        if research_intent or any(
            phrase in lower
            for phrase in ("research what", "deep research", "what guidance says", "look up guidance")
        ):
            return AiTaskType.DEEP_RESEARCH

        if any(
            phrase in lower
            for phrase in (
                "tell me about indicare",
                "what is indicare",
                "about orb",
                "care companion",
                "what is orb",
                "indicare product",
            )
        ):
            return AiTaskType.PRODUCT_EXPLANATION

        if any(
            phrase in lower
            for phrase in (
                "ofsted",
                "sccif",
                "quality standards",
                "regulation",
                "what would ofsted",
                "inspection",
            )
        ):
            return AiTaskType.REGULATORY_GUIDANCE

        if any(
            phrase in lower
            for phrase in (
                "safeguarding",
                "does this need safeguarding",
                "threshold",
                "lado",
                "immediate risk",
            )
        ):
            return AiTaskType.SAFEGUARDING_REFLECTION

        if any(
            phrase in lower
            for phrase in (
                "daily note",
                "write a note",
                "record this",
                "rewrite",
                "recording",
                "professional wording",
            )
        ):
            return AiTaskType.RECORDING_REWRITE

        if retrieval_context and (retrieval_context.get("source_packs") or retrieval_context.get("document_results")):
            if any(term in lower for term in ("help me write", "guidance", "policy", "framework")):
                return AiTaskType.KNOWLEDGE_RAG_ANSWER

        if "summar" in lower:
            return AiTaskType.SUMMARISATION

        return AiTaskType.GENERAL_CHAT

    def classify_risk(self, message: str, *, mode: str | None = None) -> AiRiskLevel:
        lower = message.lower()
        mode_name = _text(mode)
        if mode_name == "Safeguarding" or any(
            term in lower for term in ("safeguarding", "abuse", "exploitation", "self-harm", "suicide")
        ):
            return AiRiskLevel.SAFEGUARDING_SENSITIVE
        if any(term in lower for term in ("ofsted", "regulation", "statutory", "legal advice")):
            return AiRiskLevel.HIGH
        if any(term in lower for term in ("child", "young person", "placement")):
            return AiRiskLevel.MEDIUM
        return AiRiskLevel.LOW

    def route(self, request: AiRoutingRequest) -> AiRoutingDecision:
        if request.surface == "operational_os" or request.surface == "operational_os_context":
            task_type = AiTaskType.OPERATIONAL_OS_CONTEXT
        else:
            research = request.research_intent or bool(
                (request.retrieval_context or {}).get("research_intent")
            )
            task_type = self.classify_task(
                request.message,
                mode=request.mode,
                has_images=bool(request.images),
                research_intent=research,
                retrieval_context=request.retrieval_context,
                voice_mode=request.voice_mode,
                detail_level=request.detail_level,
            )

        risk = self.classify_risk(request.message, mode=request.mode)
        quality = ai_cost_policy_service.classify_quality_tier(
            task_type,
            risk,
            mode=request.mode,
            has_images=bool(request.images),
            research_intent=request.research_intent,
            voice_mode=request.voice_mode,
        )
        cost = ai_cost_policy_service.classify_cost_tier(
            task_type,
            risk,
            mode=request.mode,
            has_images=bool(request.images),
            research_intent=request.research_intent,
        )

        capability = AiModelCapability.VISION if request.images else AiModelCapability.TEXT
        provider = ai_provider_registry.get_default_provider()
        model = ai_provider_registry.choose_default_model_for_capability(
            capability,
            quality_tier=quality,
            cost_tier=cost,
            provider=provider,
        )[1]

        fallback_provider = AiProviderName.MOCK
        fallback_model = "mock-text"
        if provider == AiProviderName.MOCK:
            fallback_provider = None  # type: ignore[assignment]
            fallback_model = None

        reason = self._routing_reason(task_type, quality, cost, provider, model)
        max_tokens = ai_cost_policy_service.max_tokens_for_task(
            task_type,
            request.detail_level,
            voice_mode=request.voice_mode,
        )
        timeout = ai_cost_policy_service.timeout_for_task(task_type, quality)

        return AiRoutingDecision(
            provider=provider,
            model=model,
            task_type=task_type,
            risk_level=risk,
            quality_tier=quality,
            cost_tier=cost,
            reason=reason,
            fallback_provider=fallback_provider,
            fallback_model=fallback_model,
            estimated_cost_tier=cost,
            requires_citations=task_type
            in {
                AiTaskType.REGULATORY_GUIDANCE,
                AiTaskType.KNOWLEDGE_RAG_ANSWER,
                AiTaskType.PRODUCT_EXPLANATION,
            },
            requires_rag=task_type
            in {AiTaskType.KNOWLEDGE_RAG_ANSWER, AiTaskType.REGULATORY_GUIDANCE, AiTaskType.DEEP_RESEARCH},
            requires_vision=bool(request.images),
            requires_safety_review=task_type == AiTaskType.SAFEGUARDING_REFLECTION
            or risk == AiRiskLevel.SAFEGUARDING_SENSITIVE,
            max_output_tokens=max_tokens,
            timeout_seconds=timeout,
            metadata={"surface": request.surface},
        )

    def _routing_reason(
        self,
        task_type: AiTaskType,
        quality: AiQualityTier,
        cost: AiCostTier,
        provider: AiProviderName,
        model: str,
    ) -> str:
        return (
            f"{task_type.value} task routed to {provider.value}/{model} "
            f"with {quality.value} quality and {cost.value} cost tier."
        )

    def _get_provider(self, name: AiProviderName):
        if name == AiProviderName.OPENAI:
            return openai_provider
        return mock_provider

    async def complete(
        self,
        request: AiProviderRequest,
        decision: AiRoutingDecision | None = None,
    ) -> AiProviderResponse:
        provider_impl = self._get_provider(request.provider)
        if not provider_impl.is_available():
            return AiProviderResponse(
                text="",
                provider=request.provider,
                model=request.model,
                error="provider_unavailable",
            )
        return await provider_impl.complete(request)

    async def complete_with_routing(
        self,
        *,
        message: str,
        system_prompt: str,
        history: list[dict[str, Any]] | None = None,
        images: list[str] | None = None,
        mode: str | None = None,
        retrieval_context: dict[str, Any] | None = None,
        detail_level: str = "concise",
        research_intent: bool = False,
        voice_mode: bool = False,
        surface: str = "standalone_orb_ai",
    ) -> tuple[AiProviderResponse, AiRoutingDecision, AiModelRouterTrace]:
        routing_request = AiRoutingRequest(
            message=message,
            system_prompt=system_prompt,
            history=history or [],
            images=images or [],
            mode=mode,
            detail_level=detail_level,
            research_intent=research_intent,
            retrieval_context=retrieval_context,
            voice_mode=voice_mode,
            surface=surface,
        )
        decision = self.route(routing_request)
        provider_request = AiProviderRequest(
            provider=decision.provider,
            model=decision.model,
            system_prompt=system_prompt,
            message=message,
            history=history or [],
            images=images or [],
            max_output_tokens=decision.max_output_tokens,
            timeout_seconds=decision.timeout_seconds,
            metadata={"task_type": decision.task_type.value},
        )

        started = time.perf_counter()
        response = await self.complete(provider_request, decision)
        fallback_used = False

        strict = _env_bool("AI_PROVIDER_STRICT", False)
        if (response.error or not response.text) and not strict:
            if decision.fallback_provider and decision.fallback_model:
                fallback_used = True
                fallback_request = provider_request.model_copy(
                    update={
                        "provider": decision.fallback_provider,
                        "model": decision.fallback_model,
                    }
                )
                response = await self.complete(fallback_request, decision)

        trace = AiModelRouterTrace(
            task_type=decision.task_type,
            risk_level=decision.risk_level,
            quality_tier=decision.quality_tier,
            cost_tier=decision.cost_tier,
            provider=response.provider,
            model=response.model,
            reason=decision.reason,
            fallback_used=fallback_used,
            fallback_provider=decision.fallback_provider if fallback_used else None,
            fallback_model=decision.fallback_model if fallback_used else None,
            latency_ms=response.latency_ms,
            error=response.error,
        )
        return response, decision, trace

    def fallback_response(
        self,
        error: str | None,
        request: AiProviderRequest,
        decision: AiRoutingDecision,
    ) -> AiProviderResponse:
        return AiProviderResponse(
            text="",
            provider=request.provider,
            model=request.model,
            error=error or "unavailable",
            metadata={
                "task_type": decision.task_type.value,
                "reason": decision.reason,
            },
        )

    def routing_metadata_for_context(
        self,
        decision: AiRoutingDecision,
        trace: AiModelRouterTrace,
        *,
        response: AiProviderResponse | None = None,
    ) -> dict[str, Any]:
        return {
            "provider": trace.provider.value,
            "model": trace.model,
            "task_type": trace.task_type.value,
            "quality_tier": trace.quality_tier.value,
            "cost_tier": trace.cost_tier.value,
            "reason": trace.reason,
            "fallback_used": trace.fallback_used,
            "latency_ms": trace.latency_ms or (response.latency_ms if response else None),
            "risk_level": decision.risk_level.value,
            "requires_citations": decision.requires_citations,
            "requires_rag": decision.requires_rag,
            "requires_vision": decision.requires_vision,
            "error": trace.error,
        }

    async def complete_with_timeout(
        self,
        **kwargs: Any,
    ) -> tuple[AiProviderResponse, AiRoutingDecision, AiModelRouterTrace]:
        return await asyncio.wait_for(
            self.complete_with_routing(**kwargs),
            timeout=STANDALONE_LLM_TIMEOUT_SECONDS,
        )


ai_model_router_service = AiModelRouterService()
