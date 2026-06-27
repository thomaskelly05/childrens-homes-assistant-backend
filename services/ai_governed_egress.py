"""Provider-agnostic governed AI egress layer (NR-1 Phase 1).

Every product AI request must pass through this layer before reaching any
external or local AI provider adapter. OpenAI is one adapter among many — not
the governance layer itself.
"""

from __future__ import annotations

import logging
import re
from collections.abc import AsyncIterator
from dataclasses import dataclass, field
from typing import Any

from schemas.ai_models import (
    AiProviderGovernanceContext,
    AiProviderName,
    AiProviderRequest,
    AiProviderResponse,
)
from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.ai_external_call_governance import (
    evaluate_external_call,
    record_model_usage,
    redact_plain_text,
)
from services.ai_provider_adapter_registry import ai_provider_adapter_registry
from services.ai_provider_registry import ai_provider_registry

logger = logging.getLogger("indicare.ai_governed_egress")

_EXTERNAL_PROVIDERS = frozenset(
    {
        AiProviderName.OPENAI,
        AiProviderName.ANTHROPIC,
        AiProviderName.GOOGLE,
    }
)

_SENSITIVE_ERROR_PATTERNS = (
    re.compile(r"sk-[a-zA-Z0-9]{10,}"),
    re.compile(r"api[_-]?key", re.IGNORECASE),
    re.compile(r"authorization", re.IGNORECASE),
    re.compile(r"bearer\s+", re.IGNORECASE),
)


@dataclass
class ProviderEgressDecision:
    """Outcome of the governed egress pre-flight."""

    allowed: bool
    blocked_reason: str | None = None
    privacy_decision: AIPrivacyDecision | None = None
    redaction_applied: bool = False
    governance_blocked: bool = False
    provider_blocked: bool = False
    model_blocked: bool = False
    feature_blocked: bool = False
    used_local_fallback: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _is_external_provider(provider: AiProviderName) -> bool:
    return provider in _EXTERNAL_PROVIDERS


def _sanitize_provider_error(error: str | None, *, error_type: str | None = None) -> str:
    cleaned = _text(error) or "provider_error"
    for pattern in _SENSITIVE_ERROR_PATTERNS:
        cleaned = pattern.sub("[redacted]", cleaned)
    if len(cleaned) > 200:
        cleaned = cleaned[:200]
    if error_type and error_type not in cleaned:
        return f"{cleaned} ({error_type})"
    return cleaned


def _audit_egress_decision(
    governance: AiProviderGovernanceContext,
    egress: ProviderEgressDecision,
    *,
    provider: AiProviderName | None = None,
    model: str | None = None,
) -> None:
    try:
        from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

        indicare_ai_governance_event_service.record_event(
            {
                "surface": "model_router",
                "event_type": "governed_egress_decision",
                "user_id": str(governance.user_id) if governance.user_id is not None else None,
                "user_role": governance.role,
                "home_id": governance.home_id,
                "child_id": governance.child_id,
                "model_provider": provider.value if provider else None,
                "model_name": model,
                "metadata": {
                    "feature": governance.feature,
                    "governance_surface": governance.surface,
                    "route": governance.route,
                    "allowed": egress.allowed,
                    "blocked_reason": egress.blocked_reason,
                    "governance_blocked": egress.governance_blocked,
                    "redaction_applied": egress.redaction_applied,
                    "used_local_fallback": egress.used_local_fallback,
                },
            }
        )
    except Exception:
        logger.debug("governed egress audit event skipped", exc_info=True)


class AiGovernedEgress:
    """Mandatory governance chokepoint between product callers and provider adapters."""

    def __init__(self, adapter_registry: Any | None = None) -> None:
        self._registry = adapter_registry or ai_provider_adapter_registry

    def _require_governance(self, governance: AiProviderGovernanceContext | None) -> AiProviderGovernanceContext:
        if governance is None:
            raise ValueError("governance_context_required")
        return governance

    def _evaluate(
        self,
        governance: AiProviderGovernanceContext,
        *,
        provider: AiProviderName,
        model: str,
    ) -> ProviderEgressDecision:
        privacy = evaluate_external_call(
            feature=governance.feature,
            provider_id=governance.provider_id,
            home_id=governance.home_id,
            user_id=governance.user_id,
            data_classification=governance.data_classification,
            metadata={
                **(governance.metadata or {}),
                "feature": governance.feature,
                "surface": governance.surface,
                "route": governance.route,
                "ai_provider": provider.value,
                "ai_model": model,
            },
            local_fallback_available=governance.local_fallback_available,
        )

        if not ai_provider_registry.provider_available(provider) and provider != AiProviderName.MOCK:
            if provider == AiProviderName.OPENAI and governance.local_fallback_available:
                pass
            elif not self._registry.is_registered(provider):
                return ProviderEgressDecision(
                    allowed=False,
                    blocked_reason="provider_unavailable",
                    privacy_decision=privacy,
                    provider_blocked=True,
                    governance_blocked=True,
                )

        profile = ai_provider_registry.get_model_profile(provider, model)
        if profile is None and provider != AiProviderName.MOCK:
            return ProviderEgressDecision(
                allowed=False,
                blocked_reason="model_not_allowlisted",
                privacy_decision=privacy,
                model_blocked=True,
                governance_blocked=True,
            )

        external = _is_external_provider(provider)
        if external and not privacy.allowed:
            if governance.local_fallback_available:
                return ProviderEgressDecision(
                    allowed=False,
                    blocked_reason=privacy.reason,
                    privacy_decision=privacy,
                    governance_blocked=False,
                    used_local_fallback=True,
                    metadata={"local_fallback_only": True},
                )
            return ProviderEgressDecision(
                allowed=False,
                blocked_reason=privacy.reason,
                privacy_decision=privacy,
                governance_blocked=True,
                feature_blocked=privacy.reason == "feature_not_allowlisted",
            )

        if not external:
            return ProviderEgressDecision(
                allowed=True,
                privacy_decision=privacy,
                metadata={"local_provider": True},
            )

        return ProviderEgressDecision(
            allowed=True,
            privacy_decision=privacy,
        )

    def _redact_request(
        self,
        request: AiProviderRequest,
        *,
        redaction_mode: str,
    ) -> tuple[AiProviderRequest, bool]:
        redaction_applied = False
        system_prompt, sys_applied = redact_plain_text(request.system_prompt or "", mode=redaction_mode)
        message, msg_applied = redact_plain_text(request.message or "", mode=redaction_mode)
        redaction_applied = redaction_applied or sys_applied or msg_applied

        history = []
        for item in request.history or []:
            role = _text(item.get("role")).lower()
            content = _text(item.get("content"))
            if role in {"user", "assistant", "system"} and content:
                redacted_content, applied = redact_plain_text(content, mode=redaction_mode)
                redaction_applied = redaction_applied or applied
                history.append({"role": role, "content": redacted_content})

        redacted = request.model_copy(
            update={
                "system_prompt": system_prompt,
                "message": message,
                "history": history,
            }
        )
        return redacted, redaction_applied

    def _blocked_response(
        self,
        request: AiProviderRequest,
        egress: ProviderEgressDecision,
    ) -> AiProviderResponse:
        reason = egress.blocked_reason or "governance_blocked"
        return AiProviderResponse(
            text="",
            provider=request.provider,
            model=request.model,
            error=_sanitize_provider_error(reason),
            metadata={
                "governance_blocked": egress.governance_blocked,
                "blocked_reason": reason,
                "used_local_fallback": egress.used_local_fallback,
            },
        )

    async def complete(
        self,
        request: AiProviderRequest,
        *,
        governance: AiProviderGovernanceContext | None,
    ) -> tuple[AiProviderResponse, ProviderEgressDecision]:
        governance = self._require_governance(governance)
        egress = self._evaluate(governance, provider=request.provider, model=request.model)
        _audit_egress_decision(governance, egress, provider=request.provider, model=request.model)

        if egress.governance_blocked or (not egress.allowed and not egress.used_local_fallback):
            return self._blocked_response(request, egress), egress

        if egress.used_local_fallback and request.provider != AiProviderName.MOCK:
            fallback_request = request.model_copy(
                update={"provider": AiProviderName.MOCK, "model": "mock-text"}
            )
            return await self.complete(fallback_request, governance=governance)

        privacy = egress.privacy_decision
        redaction_mode = privacy.redaction_mode if privacy else "strict"
        redacted_request, redaction_applied = self._redact_request(
            request,
            redaction_mode=redaction_mode,
        )
        egress.redaction_applied = redaction_applied

        adapter = self._registry.get(request.provider)
        if adapter is None or not adapter.is_available():
            blocked = ProviderEgressDecision(
                allowed=False,
                blocked_reason="provider_unavailable",
                governance_blocked=True,
                provider_blocked=True,
            )
            return self._blocked_response(request, blocked), blocked

        try:
            response = await adapter.complete(redacted_request)
        except Exception as exc:
            logger.warning(
                "governed_egress_complete_failed provider=%s error_type=%s",
                request.provider.value,
                type(exc).__name__,
            )
            blocked = ProviderEgressDecision(
                allowed=False,
                blocked_reason=_sanitize_provider_error("provider_error", error_type=type(exc).__name__),
                privacy_decision=privacy,
                governance_blocked=False,
            )
            return self._blocked_response(request, blocked), blocked

        if response.error:
            response = response.model_copy(
                update={"error": _sanitize_provider_error(response.error, error_type=(response.metadata or {}).get("error_type"))}
            )

        if privacy and privacy.allowed and not response.error:
            usage = response.usage
            record_model_usage(
                feature=governance.feature,
                decision=privacy,
                provider_id=governance.provider_id,
                home_id=governance.home_id,
                user_id=governance.user_id,
                model=response.model,
                input_tokens=usage.input_tokens if usage else 0,
                output_tokens=usage.output_tokens if usage else 0,
                redaction_applied=redaction_applied,
                metadata={
                    "surface": governance.surface,
                    "route": governance.route,
                    "provider": response.provider.value,
                    "governed_egress": True,
                },
            )

        egress.allowed = not bool(response.error)
        return response, egress

    async def stream(
        self,
        request: AiProviderRequest,
        *,
        governance: AiProviderGovernanceContext | None,
    ) -> AsyncIterator[tuple[str, ProviderEgressDecision]]:
        governance = self._require_governance(governance)
        egress = self._evaluate(governance, provider=request.provider, model=request.model)
        _audit_egress_decision(governance, egress, provider=request.provider, model=request.model)

        if egress.governance_blocked or (not egress.allowed and not egress.used_local_fallback):
            yield "", egress
            return

        if egress.used_local_fallback and request.provider != AiProviderName.MOCK:
            fallback_request = request.model_copy(
                update={"provider": AiProviderName.MOCK, "model": "mock-text"}
            )
            async for delta, child_egress in self.stream(fallback_request, governance=governance):
                yield delta, child_egress
            return

        privacy = egress.privacy_decision
        redaction_mode = privacy.redaction_mode if privacy else "strict"
        redacted_request, redaction_applied = self._redact_request(
            request,
            redaction_mode=redaction_mode,
        )
        egress.redaction_applied = redaction_applied

        adapter = self._registry.get(request.provider)
        if adapter is None or not adapter.is_available():
            blocked = ProviderEgressDecision(
                allowed=False,
                blocked_reason="provider_unavailable",
                governance_blocked=True,
                provider_blocked=True,
            )
            yield "", blocked
            return

        emitted = False
        try:
            async for delta in adapter.stream(redacted_request):
                if delta:
                    emitted = True
                    yield delta, egress
        except Exception as exc:
            logger.warning(
                "governed_egress_stream_failed provider=%s error_type=%s",
                request.provider.value,
                type(exc).__name__,
            )
            egress.allowed = False
            egress.blocked_reason = _sanitize_provider_error("provider_error", error_type=type(exc).__name__)
            yield "", egress
            return

        if privacy and privacy.allowed and emitted:
            record_model_usage(
                feature=governance.feature,
                decision=privacy,
                provider_id=governance.provider_id,
                home_id=governance.home_id,
                user_id=governance.user_id,
                model=request.model,
                input_tokens=max(1, len(redacted_request.message) // 4),
                output_tokens=0,
                redaction_applied=redaction_applied,
                metadata={
                    "surface": governance.surface,
                    "route": governance.route,
                    "provider": request.provider.value,
                    "governed_egress": True,
                    "stream": True,
                },
            )


ai_governed_egress = AiGovernedEgress()
