"""OpenAI Realtime ephemeral session adapter (NR-1 Phase 2C).

Low-level HTTP issuance for client_secrets / sessions fallback only.
Product routes must call AiGovernedEgress.issue_realtime_session() — not this module directly.
"""

from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timezone
from typing import Any

import httpx

from schemas.ai_realtime import (
    AiRealtimeSessionRequest,
    AiRealtimeSessionResponse,
    RealtimeProviderName,
)
from services.ai_providers.realtime_base import AiRealtimeProviderBase
from services.safe_logging import safe_log_dict

logger = logging.getLogger("indicare.ai_provider.openai_realtime")

OPENAI_REALTIME_CLIENT_SECRET_URL = os.getenv(
    "OPENAI_REALTIME_CLIENT_SECRET_URL",
    "https://api.openai.com/v1/realtime/client_secrets",
)
OPENAI_REALTIME_SESSION_URL = os.getenv(
    "OPENAI_REALTIME_SESSION_URL",
    "https://api.openai.com/v1/realtime/sessions",
)
DEFAULT_REALTIME_MODEL = os.getenv("ORB_REALTIME_MODEL") or os.getenv("INDICARE_REALTIME_MODEL", "gpt-realtime")

ALLOWED_SYNTHETIC_VOICES = frozenset(
    {
        "alloy",
        "ash",
        "ballad",
        "coral",
        "echo",
        "sage",
        "shimmer",
        "verse",
        "marin",
        "cedar",
        "nova",
        "onyx",
    }
)


def _enabled(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}


def _provider_voice(value: str | None) -> str:
    configured = os.getenv("ORB_DEFAULT_VOICE") or os.getenv("INDICARE_REALTIME_VOICE") or "shimmer"
    voice = str(value or configured).strip().lower()
    return voice if voice in ALLOWED_SYNTHETIC_VOICES else "shimmer"


def _turn_detection() -> dict[str, Any]:
    return {
        "type": "server_vad",
        "threshold": 0.48,
        "prefix_padding_ms": 280,
        "silence_duration_ms": 520,
        "create_response": False,
        "interrupt_response": True,
    }


def public_openai_session_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Return only client-safe ephemeral realtime fields."""

    session = dict(payload or {})
    for key in ("api_key", "OPENAI_API_KEY", "authorization", "Authorization"):
        session.pop(key, None)
    client_secret = session.get("client_secret")
    if isinstance(client_secret, dict):
        session["client_secret"] = {
            "value": client_secret.get("value"),
            "expires_at": client_secret.get("expires_at"),
        }
    return session


def _safe_error_body(response: httpx.Response) -> dict[str, Any]:
    try:
        parsed = response.json()
    except Exception:
        parsed = {"message": response.text[:500]}
    return safe_log_dict(parsed if isinstance(parsed, dict) else {"message": str(parsed)[:500]})


def _client_secret_value(payload: dict[str, Any]) -> str | None:
    client_secret = payload.get("client_secret")
    if isinstance(client_secret, dict):
        value = client_secret.get("value")
        return str(value) if value else None
    value = payload.get("value")
    return str(value) if value else None


def _client_secret_expires_at(payload: dict[str, Any]) -> Any:
    client_secret = payload.get("client_secret")
    if isinstance(client_secret, dict):
        return client_secret.get("expires_at")
    return payload.get("expires_at")


def conversational_session_body(*, instructions: str, voice: str | None, model: str) -> dict[str, Any]:
    return {
        "type": "realtime",
        "model": model,
        "voice": _provider_voice(voice),
        "instructions": instructions,
        "modalities": ["audio", "text"],
        "input_audio_transcription": {"model": os.getenv("ORB_REALTIME_TRANSCRIPTION_MODEL", "whisper-1")},
        "turn_detection": _turn_detection(),
        "input_audio_noise_reduction": {"type": "near_field"},
    }


def conversational_client_secret_body(*, instructions: str, voice: str | None, model: str) -> dict[str, Any]:
    provider_voice = _provider_voice(voice)
    return {
        "session": {
            "type": "realtime",
            "model": model,
            "instructions": instructions,
            "audio": {
                "input": {
                    "turn_detection": _turn_detection(),
                    "transcription": {"model": os.getenv("ORB_REALTIME_TRANSCRIPTION_MODEL", "whisper-1")},
                    "noise_reduction": {"type": "near_field"},
                },
                "output": {
                    "voice": provider_voice,
                },
            },
        }
    }


def transcription_session_body(*, instructions: str, model: str) -> dict[str, Any]:
    transcription_model = os.getenv("ORB_REALTIME_TRANSCRIPTION_MODEL", "whisper-1")
    return {
        "type": "realtime",
        "model": model,
        "instructions": instructions,
        "modalities": ["text"],
        "input_audio_transcription": {"model": transcription_model},
        "turn_detection": _turn_detection(),
        "input_audio_noise_reduction": {"type": "near_field"},
    }


def transcription_client_secret_body(*, instructions: str, model: str) -> dict[str, Any]:
    transcription_model = os.getenv("ORB_REALTIME_TRANSCRIPTION_MODEL", "whisper-1")
    return {
        "session": {
            "type": "realtime",
            "model": model,
            "instructions": instructions,
            "audio": {
                "input": {
                    "turn_detection": _turn_detection(),
                    "transcription": {"model": transcription_model},
                    "noise_reduction": {"type": "near_field"},
                },
            },
        }
    }


class OpenAiRealtimeSessionProvider(AiRealtimeProviderBase):
    provider_name = RealtimeProviderName.OPENAI.value

    def is_available(self) -> bool:
        return _enabled(os.getenv("ORB_REALTIME_ENABLED"), default=True) and bool(
            (os.getenv("OPENAI_API_KEY") or "").strip()
        )

    async def _post_openai(
        self,
        client: httpx.AsyncClient,
        *,
        url: str,
        body: dict[str, Any],
        api_key: str,
    ) -> httpx.Response:
        return await client.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=body,
        )

    async def issue_session(self, request: AiRealtimeSessionRequest) -> AiRealtimeSessionResponse:
        model = (request.model or DEFAULT_REALTIME_MODEL).strip() or DEFAULT_REALTIME_MODEL
        issued_at = datetime.now(timezone.utc).isoformat()
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip()

        if not api_key or not self.is_available():
            return AiRealtimeSessionResponse(
                configured=False,
                provider=RealtimeProviderName.OPENAI,
                model=model,
                fallback_text_mode=True,
                error_code="not_configured",
                unavailable_reason="Realtime audio is not connected yet. Typed Orb remains available.",
                metadata={"env_gated": True},
            )

        if request.transcription_only:
            session_body = transcription_session_body(instructions=request.instructions, model=model)
            client_secret_body = transcription_client_secret_body(instructions=request.instructions, model=model)
            session_prefix = "orb_dictate"
        else:
            session_body = conversational_session_body(
                instructions=request.instructions,
                voice=request.voice,
                model=model,
            )
            client_secret_body = conversational_client_secret_body(
                instructions=request.instructions,
                voice=request.voice,
                model=model,
            )
            session_prefix = "orb_realtime"

        start = time.perf_counter()
        response: httpx.Response | None = None
        endpoint_used = "client_secrets"
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=8.0)) as client:
                response = await self._post_openai(
                    client,
                    url=OPENAI_REALTIME_CLIENT_SECRET_URL,
                    body=client_secret_body,
                    api_key=api_key,
                )
                if response.status_code == 404:
                    endpoint_used = "sessions_fallback"
                    response = await self._post_openai(
                        client,
                        url=OPENAI_REALTIME_SESSION_URL,
                        body=session_body,
                        api_key=api_key,
                    )
        except httpx.TimeoutException:
            logger.warning(
                "openai_realtime_session_timeout session_id=%s purpose=%s",
                request.orb_session_id,
                request.purpose,
            )
            return AiRealtimeSessionResponse(
                configured=True,
                provider=RealtimeProviderName.OPENAI,
                model=model,
                fallback_text_mode=True,
                retryable=True,
                error_code="provider_timeout",
                unavailable_reason="Realtime audio took too long to connect. Typed Orb remains available.",
            )
        except httpx.RequestError:
            logger.warning(
                "openai_realtime_session_unreachable session_id=%s purpose=%s",
                request.orb_session_id,
                request.purpose,
            )
            return AiRealtimeSessionResponse(
                configured=True,
                provider=RealtimeProviderName.OPENAI,
                model=model,
                fallback_text_mode=True,
                retryable=True,
                error_code="provider_unreachable",
                unavailable_reason="Realtime audio is temporarily unavailable. Typed Orb remains available.",
            )

        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        if response is None or response.status_code >= 400:
            status_code = response.status_code if response is not None else 0
            error_body = _safe_error_body(response) if response is not None else {"message": "No provider response"}
            logger.warning(
                "openai_realtime_session_failed session_id=%s purpose=%s status=%s endpoint=%s latency_ms=%s body=%s",
                request.orb_session_id,
                request.purpose,
                status_code,
                endpoint_used,
                latency_ms,
                error_body,
            )
            return AiRealtimeSessionResponse(
                configured=True,
                provider=RealtimeProviderName.OPENAI,
                model=model,
                fallback_text_mode=True,
                retryable=status_code in {408, 409, 425, 429, 500, 502, 503, 504},
                error_code="realtime_session_failed",
                status=status_code,
                unavailable_reason="Realtime audio could not be started just now. Typed Orb remains available.",
                provider_latency_ms=latency_ms,
                provider_endpoint=endpoint_used,
            )

        raw = response.json()
        data = public_openai_session_payload(raw if isinstance(raw, dict) else {})
        secret_value = _client_secret_value(data)
        expires_at = _client_secret_expires_at(data)
        wrapped_session = data
        if endpoint_used == "client_secrets":
            wrapped: dict[str, Any] = {
                "id": data.get("id") or f"{session_prefix}_{int(time.time())}",
                "object": data.get("object") or "realtime.client_secret",
                "model": model,
                "client_secret": {"value": secret_value, "expires_at": expires_at},
            }
            if not request.transcription_only:
                wrapped["voice"] = session_body.get("voice") or _provider_voice(request.voice)
            wrapped_session = wrapped

        return AiRealtimeSessionResponse(
            configured=True,
            provider=RealtimeProviderName.OPENAI,
            model=model,
            session=wrapped_session,
            voice=session_body.get("voice") if not request.transcription_only else None,
            issued_at=issued_at,
            expires_at=expires_at,
            provider_latency_ms=latency_ms,
            provider_endpoint=endpoint_used,
            refresh_recommended_seconds=55 if not request.transcription_only else None,
            fallback_text_mode=False,
        )


openai_realtime_session_provider = OpenAiRealtimeSessionProvider()
