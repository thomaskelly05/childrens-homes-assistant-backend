from __future__ import annotations

import logging
import os
import time
from collections import defaultdict
from typing import Any

from schemas.ai_realtime import AiRealtimeSessionRequest, RealtimeProviderName
from services.ai_providers.openai_realtime_session_provider import (
    ALLOWED_SYNTHETIC_VOICES,
    DEFAULT_REALTIME_MODEL,
    conversational_client_secret_body,
    conversational_session_body,
    openai_realtime_session_provider,
)
from services.orb_observability_service import orb_observability_service

logger = logging.getLogger("indicare.orb.realtime")


def _enabled(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}


def _provider_voice(value: str | None) -> str:
    configured = os.getenv("ORB_DEFAULT_VOICE") or os.getenv("INDICARE_REALTIME_VOICE") or "shimmer"
    voice = str(value or configured).strip().lower()
    return voice if voice in ALLOWED_SYNTHETIC_VOICES else "shimmer"


def _response_to_legacy_dict(response, *, conversational: bool) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "provider": "openai_realtime",
        "configured": response.configured,
        "model": response.model or DEFAULT_REALTIME_MODEL,
        "fallback_text_mode": response.fallback_text_mode,
    }
    if response.session is not None:
        payload["session"] = response.session
    if response.voice is not None:
        payload["voice"] = response.voice
    if response.issued_at:
        payload["issued_at"] = response.issued_at
    if response.expires_at is not None:
        payload["expires_at"] = response.expires_at
    if response.provider_latency_ms is not None:
        payload["provider_latency_ms"] = response.provider_latency_ms
    if response.provider_endpoint:
        payload["provider_endpoint"] = response.provider_endpoint
    if response.refresh_recommended_seconds is not None:
        payload["refresh_recommended_seconds"] = response.refresh_recommended_seconds
    if response.retryable:
        payload["retryable"] = True
    if response.retry_after_seconds is not None:
        payload["retry_after_seconds"] = response.retry_after_seconds
    if response.error_code:
        payload["error"] = response.error_code
    if response.status is not None:
        payload["status"] = response.status
    if response.unavailable_reason:
        payload["unavailable_reason"] = response.unavailable_reason
    if response.metadata.get("env_gated"):
        payload["env_gated"] = True
        if conversational:
            session_body = conversational_session_body(
                instructions="",
                voice=None,
                model=payload["model"],
            )
            payload["request_body"] = {key: value for key, value in session_body.items() if key != "instructions"}
        else:
            payload["request_body"] = {"model": payload["model"]}
    return payload


class OrbRealtimeProviderService:
    """Server-side OpenAI realtime token issuer and safe provider health tracker."""

    def __init__(self) -> None:
        self._metrics: dict[str, int] = defaultdict(int)
        self._last_latency_ms: float | None = None
        self._last_failure: dict[str, Any] | None = None
        self._consecutive_failures = 0
        self._circuit_open_until = 0.0

    def configured(self) -> bool:
        return openai_realtime_session_provider.is_available()

    def provider_available(self) -> bool:
        return time.time() >= self._circuit_open_until

    def session_body(self, *, instructions: str, voice: str | None = None) -> dict[str, Any]:
        return conversational_session_body(instructions=instructions, voice=voice, model=DEFAULT_REALTIME_MODEL)

    def client_secret_session_body(self, *, instructions: str, voice: str | None = None) -> dict[str, Any]:
        return conversational_client_secret_body(
            instructions=instructions,
            voice=voice,
            model=DEFAULT_REALTIME_MODEL,
        )["session"]

    def client_secret_body(self, *, instructions: str, voice: str | None = None) -> dict[str, Any]:
        return conversational_client_secret_body(
            instructions=instructions,
            voice=voice,
            model=DEFAULT_REALTIME_MODEL,
        )

    def dictate_client_secret_body(self, *, instructions: str) -> dict[str, Any]:
        from services.ai_providers.openai_realtime_session_provider import transcription_client_secret_body

        return transcription_client_secret_body(instructions=instructions, model=DEFAULT_REALTIME_MODEL)

    async def create_ephemeral_session(
        self,
        *,
        instructions: str,
        voice: str | None = None,
        current_user: dict[str, Any] | None = None,
        orb_session_id: str | None = None,
    ) -> dict[str, Any]:
        if not self.configured():
            self._metrics["not_configured"] += 1
            orb_observability_service.record_provider_failure("not_configured", retryable=False)
            response = await openai_realtime_session_provider.issue_session(
                AiRealtimeSessionRequest(
                    provider=RealtimeProviderName.OPENAI,
                    model=DEFAULT_REALTIME_MODEL,
                    instructions=instructions,
                    purpose="orb_voice_conversational",
                    voice=voice,
                    transcription_only=False,
                    orb_session_id=orb_session_id,
                )
            )
            return _response_to_legacy_dict(response, conversational=True)

        if not self.provider_available():
            self._metrics["circuit_open"] += 1
            orb_observability_service.record_provider_failure("circuit_open", retryable=True)
            return {
                "provider": "openai_realtime",
                "configured": True,
                "error": "provider_circuit_open",
                "fallback_text_mode": True,
                "retryable": True,
                "retry_after_seconds": max(1, int(self._circuit_open_until - time.time())),
                "unavailable_reason": "Realtime audio is recovering. Typed Orb remains available.",
            }

        response = await openai_realtime_session_provider.issue_session(
            AiRealtimeSessionRequest(
                provider=RealtimeProviderName.OPENAI,
                model=DEFAULT_REALTIME_MODEL,
                instructions=instructions,
                purpose="orb_voice_conversational",
                voice=voice,
                transcription_only=False,
                orb_session_id=orb_session_id,
            )
        )
        result = _response_to_legacy_dict(response, conversational=True)
        self._record_adapter_outcome(response, metric_prefix="sessions")
        if response.error_code:
            logger.warning(
                "orb_realtime_provider_failed session_id=%s user_id=%s error=%s",
                orb_session_id,
                (current_user or {}).get("id"),
                response.error_code,
            )
        return result

    async def create_dictate_transcription_session(
        self,
        *,
        instructions: str,
        current_user: dict[str, Any] | None = None,
        orb_session_id: str | None = None,
    ) -> dict[str, Any]:
        if not self.configured():
            self._metrics["dictate_not_configured"] += 1
            response = await openai_realtime_session_provider.issue_session(
                AiRealtimeSessionRequest(
                    provider=RealtimeProviderName.OPENAI,
                    model=DEFAULT_REALTIME_MODEL,
                    instructions=instructions,
                    purpose="orb_dictate_transcription",
                    transcription_only=True,
                    orb_session_id=orb_session_id,
                )
            )
            return _response_to_legacy_dict(response, conversational=False)

        if not self.provider_available():
            return {
                "provider": "openai_realtime",
                "configured": True,
                "error": "provider_circuit_open",
                "fallback_text_mode": True,
                "unavailable_reason": "Realtime transcription is temporarily unavailable. Paste transcript or upload audio.",
            }

        response = await openai_realtime_session_provider.issue_session(
            AiRealtimeSessionRequest(
                provider=RealtimeProviderName.OPENAI,
                model=DEFAULT_REALTIME_MODEL,
                instructions=instructions,
                purpose="orb_dictate_transcription",
                transcription_only=True,
                orb_session_id=orb_session_id,
            )
        )
        result = _response_to_legacy_dict(response, conversational=False)
        self._record_adapter_outcome(response, metric_prefix="dictate_sessions")
        if not response.error_code:
            logger.info(
                "orb_dictate_realtime_session_created session_id=%s user_id=%s latency_ms=%s",
                orb_session_id,
                (current_user or {}).get("id"),
                response.provider_latency_ms,
            )
        return result

    def _record_adapter_outcome(self, response, *, metric_prefix: str) -> None:
        if response.provider_latency_ms is not None:
            self._last_latency_ms = response.provider_latency_ms
        if response.error_code:
            retryable = bool(response.retryable)
            self._last_failure = {
                "error": response.error_code,
                "status": response.status,
                "endpoint": response.provider_endpoint,
            }
            self._record_failure(response.error_code, retryable=retryable, status=response.status)
            if response.status is not None:
                self._metrics[f"status_{response.status}"] += 1
            return
        if response.configured and response.session:
            self._metrics[f"{metric_prefix}_created"] += 1
            if response.provider_endpoint:
                self._metrics[f"endpoint_{response.provider_endpoint}"] += 1
            self._consecutive_failures = 0
            if response.provider_latency_ms is not None:
                orb_observability_service.record_provider_success(response.provider_latency_ms)

    def health_metrics(self) -> dict[str, Any]:
        return {
            "provider": "openai_realtime",
            "configured": self.configured(),
            "model": DEFAULT_REALTIME_MODEL,
            "last_latency_ms": self._last_latency_ms,
            "last_failure": self._last_failure,
            "counters": dict(self._metrics),
            "raw_audio_logged": False,
            "prompts_logged": False,
            "provider_available": self.provider_available(),
            "consecutive_failures": self._consecutive_failures,
            "circuit_open_until": self._circuit_open_until or None,
        }

    def provider_status(self) -> dict[str, Any]:
        metrics = self.health_metrics()
        metrics["status"] = "healthy" if self.configured() and self.provider_available() else "degraded"
        metrics["fallback_modes"] = ["text_only", "mock_voice"]
        metrics["retry_backoff_seconds"] = [1, 2, 4, 8, 15]
        return metrics

    def _record_failure(self, reason: str, *, retryable: bool, status: int | None = None) -> None:
        self._consecutive_failures += 1
        orb_observability_service.record_provider_failure(reason, retryable=retryable, status=status)
        threshold = int(os.getenv("ORB_PROVIDER_FAILURE_THRESHOLD", "3"))
        if retryable and self._consecutive_failures >= threshold:
            self._circuit_open_until = time.time() + int(os.getenv("ORB_PROVIDER_CIRCUIT_SECONDS", "45"))


orb_realtime_provider_service = OrbRealtimeProviderService()

# Re-export adapter constants for legacy imports.
ALLOWED_SYNTHETIC_VOICES = ALLOWED_SYNTHETIC_VOICES
DEFAULT_REALTIME_MODEL = DEFAULT_REALTIME_MODEL
