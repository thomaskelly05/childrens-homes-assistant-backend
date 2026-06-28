"""Provider-agnostic governed AI egress layer (NR-1 Phase 1).

Every product AI request must pass through this layer before reaching any
external or local AI provider adapter. OpenAI is one adapter among many — not
the governance layer itself.
"""

from __future__ import annotations

import asyncio
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
from schemas.ai_realtime import (
    ALLOWED_REALTIME_FEATURES,
    AiRealtimeGovernanceContext,
    AiRealtimeSessionRequest,
    AiRealtimeSessionResponse,
    RealtimeProviderName,
)
from schemas.ai_tts import (
    FEATURE_ORB_PREMIUM_TTS,
    AiTtsGovernanceContext,
    AiTtsSynthesisRequest,
    AiTtsSynthesisResponse,
    TtsProviderName,
)
from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.ai_external_call_governance import (
    evaluate_external_call,
    record_model_usage,
    redact_plain_text,
)
from services.ai_provider_adapter_registry import ai_provider_adapter_registry
from services.ai_provider_registry import ai_provider_registry
from services.ai_realtime_provider_adapter_registry import ai_realtime_provider_adapter_registry
from services.ai_tts_provider_adapter_registry import ai_tts_provider_adapter_registry
from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)

logger = logging.getLogger("indicare.ai_governed_egress")

_REALTIME_MODEL_ALLOWLIST: dict[str, frozenset[str]] = {
    RealtimeProviderName.OPENAI.value: frozenset({"gpt-realtime", "gpt-4o-realtime-preview"}),
    RealtimeProviderName.MOCK.value: frozenset({"mock-realtime", "gpt-realtime"}),
}

_TTS_MODEL_ALLOWLIST: dict[str, frozenset[str]] = {
    TtsProviderName.OPENAI.value: frozenset({"tts-1", "tts-1-hd"}),
    TtsProviderName.ELEVENLABS.value: frozenset(
        {
            "eleven_multilingual_v2",
            "eleven_turbo_v2",
            "eleven_turbo_v2_5",
            "eleven_flash_v2",
            "eleven_flash_v2_5",
        }
    ),
    TtsProviderName.MOCK.value: frozenset({"mock-tts", "fake-test-tts"}),
}

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


@dataclass
class TtsEgressDecision(ProviderEgressDecision):
    provider_selected: str | None = None
    fallback_used: bool = False
    audio_bytes_len: int | None = None


@dataclass
class RealtimeEgressDecision(ProviderEgressDecision):
    provider_selected: str | None = None
    instructions_len: int | None = None
    purpose: str | None = None


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


def _audit_tts_egress_decision(
    governance: AiTtsGovernanceContext,
    egress: TtsEgressDecision,
    *,
    provider: TtsProviderName | None = None,
    model: str | None = None,
) -> None:
    try:
        from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

        indicare_ai_governance_event_service.record_event(
            {
                "surface": governance.surface,
                "event_type": "governed_egress_decision",
                "user_id": str(governance.user_id) if governance.user_id is not None else None,
                "home_id": governance.home_id,
                "model_provider": provider.value if provider else None,
                "model_name": model,
                "metadata": {
                    "feature": governance.feature,
                    "governance_surface": governance.surface,
                    "route": governance.route,
                    "source": governance.source,
                    "allowed": egress.allowed,
                    "blocked_reason": egress.blocked_reason,
                    "governance_blocked": egress.governance_blocked,
                    "redaction_applied": egress.redaction_applied,
                    "provider_selected": egress.provider_selected,
                    "audio_bytes_len": egress.audio_bytes_len,
                    "modality": "tts",
                },
            }
        )
    except Exception:
        logger.debug("governed tts egress audit event skipped", exc_info=True)


def _audit_realtime_egress_decision(
    governance: AiRealtimeGovernanceContext,
    egress: RealtimeEgressDecision,
    *,
    provider: RealtimeProviderName | None = None,
    model: str | None = None,
) -> None:
    try:
        from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

        indicare_ai_governance_event_service.record_event(
            {
                # AiGovernanceSurface allow-list; product surface stays in metadata.
                "surface": "standalone_orb",
                "event_type": "governed_egress_decision",
                "user_id": str(governance.user_id) if governance.user_id is not None else None,
                "home_id": governance.home_id,
                "model_provider": provider.value if provider else None,
                "model_name": model,
                "metadata": {
                    "feature": governance.feature,
                    "governance_surface": governance.surface,
                    "route": governance.route,
                    "purpose": governance.purpose,
                    "classification": "external_ai_realtime_session",
                    "allowed": egress.allowed,
                    "blocked_reason": egress.blocked_reason,
                    "governance_blocked": egress.governance_blocked,
                    "redaction_applied": egress.redaction_applied,
                    "provider_selected": egress.provider_selected,
                    "instructions_len": egress.instructions_len,
                    "orb_session_id": governance.orb_session_id,
                    "modality": "realtime_session",
                },
            }
        )
    except Exception:
        logger.debug("governed realtime egress audit event skipped", exc_info=True)


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

    def __init__(
        self,
        adapter_registry: Any | None = None,
        tts_adapter_registry: Any | None = None,
        realtime_adapter_registry: Any | None = None,
    ) -> None:
        self._registry = adapter_registry or ai_provider_adapter_registry
        self._tts_registry = tts_adapter_registry or ai_tts_provider_adapter_registry
        self._realtime_registry = realtime_adapter_registry or ai_realtime_provider_adapter_registry

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

    def _require_tts_governance(self, governance: AiTtsGovernanceContext | None) -> AiTtsGovernanceContext:
        if governance is None:
            raise ValueError("tts_governance_context_required")
        return governance

    def _evaluate_tts(
        self,
        governance: AiTtsGovernanceContext,
        *,
        provider: TtsProviderName,
        model: str,
    ) -> TtsEgressDecision:
        privacy = governance.privacy_decision
        if privacy is None or not privacy.allowed:
            return TtsEgressDecision(
                allowed=False,
                blocked_reason=(privacy.reason if privacy else "external_processing_blocked"),
                privacy_decision=privacy,
                governance_blocked=True,
                feature_blocked=bool(privacy and privacy.reason == "feature_not_allowlisted"),
            )

        if governance.feature != FEATURE_ORB_PREMIUM_TTS:
            return TtsEgressDecision(
                allowed=False,
                blocked_reason="tts_feature_invalid",
                privacy_decision=privacy,
                governance_blocked=True,
                feature_blocked=True,
            )

        if not _text(governance.source):
            return TtsEgressDecision(
                allowed=False,
                blocked_reason="tts_source_required",
                privacy_decision=privacy,
                governance_blocked=True,
            )

        allowed_models = _TTS_MODEL_ALLOWLIST.get(provider.value)
        if allowed_models is not None and model not in allowed_models and provider != TtsProviderName.MOCK:
            return TtsEgressDecision(
                allowed=False,
                blocked_reason="model_not_allowlisted",
                privacy_decision=privacy,
                governance_blocked=True,
                model_blocked=True,
            )

        adapter = self._tts_registry.get(provider)
        if adapter is None or not adapter.is_available():
            if provider == TtsProviderName.MOCK:
                pass
            else:
                return TtsEgressDecision(
                    allowed=False,
                    blocked_reason="provider_unavailable",
                    privacy_decision=privacy,
                    governance_blocked=True,
                    provider_blocked=True,
                )

        return TtsEgressDecision(
            allowed=True,
            privacy_decision=privacy,
            redaction_applied=governance.redaction_applied,
            provider_selected=provider.value,
            metadata={"source": governance.source},
        )

    def _blocked_tts_response(
        self,
        request: AiTtsSynthesisRequest,
        egress: TtsEgressDecision,
    ) -> AiTtsSynthesisResponse:
        reason = egress.blocked_reason or "governance_blocked"
        return AiTtsSynthesisResponse(
            audio_bytes=b"",
            content_type="audio/mpeg",
            provider=request.provider,
            model=request.model,
            voice_id=request.voice_id,
            latency_ms=0,
            audio_bytes_len=0,
            error=_sanitize_provider_error(reason),
            error_code=reason,
            metadata={
                "governance_blocked": egress.governance_blocked,
                "blocked_reason": reason,
            },
        )

    async def synthesize_speech(
        self,
        request: AiTtsSynthesisRequest,
        *,
        governance: AiTtsGovernanceContext | None,
    ) -> tuple[AiTtsSynthesisResponse, TtsEgressDecision]:
        """Governed TTS provider chokepoint (defence-in-depth after Phase 2A route gate)."""
        governance = self._require_tts_governance(governance)
        text = _text(request.text)
        text_len = len(text)
        if not text:
            blocked = TtsEgressDecision(
                allowed=False,
                blocked_reason="empty_text",
                governance_blocked=True,
            )
            return self._blocked_tts_response(request, blocked), blocked

        egress = self._evaluate_tts(governance, provider=request.provider, model=request.model)
        _audit_tts_egress_decision(governance, egress, provider=request.provider, model=request.model)

        if egress.governance_blocked or not egress.allowed:
            logger.info(
                "governed_tts_egress_blocked provider=%s source=%s route=%s reason=%s text_len=%s",
                request.provider.value,
                governance.source,
                governance.route,
                egress.blocked_reason,
                governance.text_len,
            )
            return self._blocked_tts_response(request, egress), egress

        adapter = self._tts_registry.get(request.provider)
        if adapter is None or not adapter.is_available():
            blocked = TtsEgressDecision(
                allowed=False,
                blocked_reason="provider_unavailable",
                governance_blocked=True,
                provider_blocked=True,
                privacy_decision=governance.privacy_decision,
            )
            return self._blocked_tts_response(request, blocked), blocked

        try:
            response = await asyncio.to_thread(adapter.synthesize_speech, request)
        except Exception as exc:
            logger.warning(
                "governed_tts_egress_failed provider=%s error_type=%s text_len=%s",
                request.provider.value,
                type(exc).__name__,
                text_len,
            )
            blocked = TtsEgressDecision(
                allowed=False,
                blocked_reason=_sanitize_provider_error("provider_error", error_type=type(exc).__name__),
                privacy_decision=governance.privacy_decision,
                governance_blocked=False,
                provider_selected=request.provider.value,
            )
            return self._blocked_tts_response(request, blocked), blocked

        if response.error:
            response = response.model_copy(
                update={
                    "error": _sanitize_provider_error(
                        response.error,
                        error_type=(response.metadata or {}).get("error_type"),
                    )
                }
            )
            egress.allowed = False
            egress.blocked_reason = response.error_code or "tts_provider_failed"
            egress.provider_selected = request.provider.value
            logger.info(
                "governed_tts_egress_provider_failed provider=%s code=%s text_len=%s",
                request.provider.value,
                response.error_code,
                text_len,
            )
            return response, egress

        egress.allowed = True
        egress.audio_bytes_len = response.audio_bytes_len
        egress.provider_selected = request.provider.value
        logger.info(
            "governed_tts_egress_ok provider=%s source=%s route=%s text_len=%s bytes=%s latency_ms=%s",
            request.provider.value,
            governance.source,
            governance.route,
            governance.text_len,
            response.audio_bytes_len,
            response.latency_ms,
        )
        return response, egress

    def _require_realtime_governance(
        self,
        governance: AiRealtimeGovernanceContext | None,
    ) -> AiRealtimeGovernanceContext:
        if governance is None:
            raise ValueError("realtime_governance_context_required")
        return governance

    def _evaluate_realtime(
        self,
        governance: AiRealtimeGovernanceContext,
        *,
        provider: RealtimeProviderName,
        model: str,
    ) -> RealtimeEgressDecision:
        if governance.feature not in ALLOWED_REALTIME_FEATURES:
            return RealtimeEgressDecision(
                allowed=False,
                blocked_reason="realtime_feature_invalid",
                governance_blocked=True,
                feature_blocked=True,
                purpose=governance.purpose,
                instructions_len=governance.instructions_len,
            )

        privacy = governance.privacy_decision
        if privacy is None:
            privacy = evaluate_external_call(
                feature=governance.feature,
                provider_id=governance.provider_id,
                home_id=governance.home_id,
                user_id=governance.user_id,
                data_classification=DataClassification.INTERNAL_OPERATIONAL,
                metadata={
                    **(governance.metadata or {}),
                    "feature": governance.feature,
                    "surface": governance.surface,
                    "route": governance.route,
                    "purpose": governance.purpose,
                    "classification": "external_ai_realtime_session",
                    "ai_provider": provider.value,
                    "ai_model": model,
                    "instructions_len": governance.instructions_len,
                },
                local_fallback_available=False,
            )

        if not privacy.allowed:
            return RealtimeEgressDecision(
                allowed=False,
                blocked_reason=privacy.reason,
                privacy_decision=privacy,
                governance_blocked=True,
                feature_blocked=privacy.reason == "feature_not_allowlisted",
                purpose=governance.purpose,
                instructions_len=governance.instructions_len,
            )

        settings = provider_data_intelligence_settings_service.get_effective_settings(
            provider_id=governance.provider_id,
            home_id=governance.home_id,
        )
        if not settings.realtime_voice_enabled:
            return RealtimeEgressDecision(
                allowed=False,
                blocked_reason="realtime_voice_disabled",
                privacy_decision=privacy,
                governance_blocked=True,
                feature_blocked=True,
                purpose=governance.purpose,
                instructions_len=governance.instructions_len,
            )

        allowed_models = _REALTIME_MODEL_ALLOWLIST.get(provider.value)
        if allowed_models is not None and model not in allowed_models and provider != RealtimeProviderName.MOCK:
            return RealtimeEgressDecision(
                allowed=False,
                blocked_reason="model_not_allowlisted",
                privacy_decision=privacy,
                governance_blocked=True,
                model_blocked=True,
                purpose=governance.purpose,
                instructions_len=governance.instructions_len,
            )

        adapter = self._realtime_registry.get(provider)
        if adapter is None or not adapter.is_available():
            if provider == RealtimeProviderName.MOCK:
                pass
            else:
                return RealtimeEgressDecision(
                    allowed=False,
                    blocked_reason="provider_unavailable",
                    privacy_decision=privacy,
                    governance_blocked=True,
                    provider_blocked=True,
                    purpose=governance.purpose,
                    instructions_len=governance.instructions_len,
                )

        return RealtimeEgressDecision(
            allowed=True,
            privacy_decision=privacy,
            provider_selected=provider.value,
            purpose=governance.purpose,
            instructions_len=governance.instructions_len,
        )

    def _blocked_realtime_response(
        self,
        request: AiRealtimeSessionRequest,
        egress: RealtimeEgressDecision,
    ) -> AiRealtimeSessionResponse:
        reason = egress.blocked_reason or "governance_blocked"
        return AiRealtimeSessionResponse(
            configured=False,
            provider=request.provider,
            model=request.model,
            fallback_text_mode=True,
            error=_sanitize_provider_error(reason),
            error_code=reason,
            unavailable_reason="Realtime session could not be started.",
            metadata={
                "governance_blocked": egress.governance_blocked,
                "blocked_reason": reason,
            },
        )

    async def issue_realtime_session(
        self,
        request: AiRealtimeSessionRequest,
        *,
        governance: AiRealtimeGovernanceContext | None,
    ) -> tuple[AiRealtimeSessionResponse, RealtimeEgressDecision]:
        """Governed realtime ephemeral session chokepoint (NR-1 Phase 2C)."""
        governance = self._require_realtime_governance(governance)
        instructions = _text(request.instructions)
        instructions_len = len(instructions)
        if instructions_len < 1:
            blocked = RealtimeEgressDecision(
                allowed=False,
                blocked_reason="instructions_required",
                governance_blocked=True,
                purpose=governance.purpose,
                instructions_len=0,
            )
            return self._blocked_realtime_response(request, blocked), blocked

        if governance.instructions_len != instructions_len:
            governance = governance.model_copy(update={"instructions_len": instructions_len})

        egress = self._evaluate_realtime(
            governance,
            provider=request.provider,
            model=request.model,
        )
        _audit_realtime_egress_decision(
            governance,
            egress,
            provider=request.provider,
            model=request.model,
        )

        if egress.governance_blocked or not egress.allowed:
            logger.info(
                "governed_realtime_egress_blocked provider=%s route=%s reason=%s instructions_len=%s",
                request.provider.value,
                governance.route,
                egress.blocked_reason,
                instructions_len,
            )
            return self._blocked_realtime_response(request, egress), egress

        privacy = egress.privacy_decision
        redaction_mode = privacy.redaction_mode if privacy else "strict"
        redacted_instructions, redaction_applied = redact_plain_text(
            instructions,
            mode=redaction_mode,
        )
        egress.redaction_applied = redaction_applied
        if not redacted_instructions.strip():
            blocked = RealtimeEgressDecision(
                allowed=False,
                blocked_reason="instructions_redacted_empty",
                privacy_decision=privacy,
                governance_blocked=True,
                purpose=governance.purpose,
                instructions_len=instructions_len,
                redaction_applied=redaction_applied,
            )
            return self._blocked_realtime_response(request, blocked), blocked

        adapter = self._realtime_registry.get(request.provider)
        if adapter is None or not adapter.is_available():
            blocked = RealtimeEgressDecision(
                allowed=False,
                blocked_reason="provider_unavailable",
                privacy_decision=privacy,
                governance_blocked=True,
                provider_blocked=True,
                purpose=governance.purpose,
                instructions_len=instructions_len,
            )
            return self._blocked_realtime_response(request, blocked), blocked

        provider_request = request.model_copy(update={"instructions": redacted_instructions})
        try:
            response = await adapter.issue_session(provider_request)
        except Exception as exc:
            logger.warning(
                "governed_realtime_egress_failed provider=%s error_type=%s instructions_len=%s",
                request.provider.value,
                type(exc).__name__,
                instructions_len,
            )
            blocked = RealtimeEgressDecision(
                allowed=False,
                blocked_reason=_sanitize_provider_error("provider_error", error_type=type(exc).__name__),
                privacy_decision=privacy,
                governance_blocked=False,
                provider_selected=request.provider.value,
                purpose=governance.purpose,
                instructions_len=instructions_len,
                redaction_applied=redaction_applied,
            )
            return self._blocked_realtime_response(request, blocked), blocked

        if response.error or response.error_code:
            response = response.model_copy(
                update={
                    "error": _sanitize_provider_error(
                        response.error or response.error_code,
                        error_type=response.error_code,
                    )
                }
            )
            egress.allowed = False
            egress.blocked_reason = response.error_code or "realtime_session_failed"
            return response, egress

        if privacy and privacy.allowed and response.configured and response.session:
            record_model_usage(
                feature=governance.feature,
                decision=privacy,
                provider_id=governance.provider_id,
                home_id=governance.home_id,
                user_id=governance.user_id,
                model=response.model or request.model,
                input_tokens=max(1, instructions_len // 4),
                output_tokens=0,
                redaction_applied=redaction_applied,
                metadata={
                    "surface": governance.surface,
                    "route": governance.route,
                    "provider": response.provider.value,
                    "governed_egress": True,
                    "modality": "realtime_session",
                    "purpose": governance.purpose,
                    "classification": "external_ai_realtime_session",
                    "instructions_len": instructions_len,
                },
            )

        egress.allowed = response.configured and bool(response.session) and not response.fallback_text_mode
        egress.provider_selected = response.provider.value
        logger.info(
            "governed_realtime_egress_ok provider=%s route=%s purpose=%s instructions_len=%s latency_ms=%s",
            response.provider.value,
            governance.route,
            governance.purpose,
            instructions_len,
            response.provider_latency_ms,
        )
        return response, egress


ai_governed_egress = AiGovernedEgress()
