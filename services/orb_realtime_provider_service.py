from __future__ import annotations

import logging
import os
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

import httpx

from services.orb_observability_service import orb_observability_service
from services.safe_logging import safe_log_dict

logger = logging.getLogger("indicare.orb.realtime")

OPENAI_REALTIME_SESSION_URL = "https://api.openai.com/v1/realtime/sessions"
DEFAULT_REALTIME_MODEL = os.getenv("ORB_REALTIME_MODEL") or os.getenv("INDICARE_REALTIME_MODEL", "gpt-4o-realtime-preview")
ALLOWED_SYNTHETIC_VOICES = {"alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"}


def _enabled(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "enabled"}


def _provider_voice(value: str | None) -> str:
    configured = os.getenv("ORB_DEFAULT_VOICE") or os.getenv("INDICARE_REALTIME_VOICE") or "shimmer"
    voice = str(value or configured).strip().lower()
    return voice if voice in ALLOWED_SYNTHETIC_VOICES else "shimmer"


def _public_openai_session_payload(payload: dict[str, Any]) -> dict[str, Any]:
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


class OrbRealtimeProviderService:
    """Server-side OpenAI realtime token issuer and safe provider health tracker."""

    def __init__(self) -> None:
        self._metrics: dict[str, int] = defaultdict(int)
        self._last_latency_ms: float | None = None
        self._last_failure: dict[str, Any] | None = None
        self._consecutive_failures = 0
        self._circuit_open_until = 0.0

    def configured(self) -> bool:
        return _enabled(os.getenv("ORB_REALTIME_ENABLED"), default=True) and bool(os.getenv("OPENAI_API_KEY"))

    def provider_available(self) -> bool:
        return time.time() >= self._circuit_open_until

    def session_body(self, *, instructions: str, voice: str | None = None) -> dict[str, Any]:
        return {
            "model": DEFAULT_REALTIME_MODEL,
            "voice": _provider_voice(voice),
            "instructions": instructions,
            "modalities": ["audio", "text"],
            "input_audio_transcription": {"model": "whisper-1"},
            "turn_detection": {
                "type": "server_vad",
                "threshold": 0.48,
                "prefix_padding_ms": 280,
                "silence_duration_ms": 520,
                "create_response": False,
                "interrupt_response": True,
            },
            "input_audio_noise_reduction": {"type": "near_field"},
        }

    async def create_ephemeral_session(
        self,
        *,
        instructions: str,
        voice: str | None = None,
        current_user: dict[str, Any] | None = None,
        orb_session_id: str | None = None,
    ) -> dict[str, Any]:
        body = self.session_body(instructions=instructions, voice=voice)
        api_key = os.getenv("OPENAI_API_KEY") if self.configured() else None
        issued_at = datetime.now(timezone.utc).isoformat()
        if not api_key:
            self._metrics["not_configured"] += 1
            orb_observability_service.record_provider_failure("not_configured", retryable=False)
            return {
                "provider": "openai_realtime",
                "configured": False,
                "env_gated": True,
                "fallback_text_mode": True,
                "unavailable_reason": "Realtime audio is not connected yet. Typed Orb remains available.",
                "request_body": {key: value for key, value in body.items() if key != "instructions"},
            }
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

        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=httpx.Timeout(20.0, connect=8.0)) as client:
                response = await client.post(
                    OPENAI_REALTIME_SESSION_URL,
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                        "OpenAI-Beta": "realtime=v1",
                    },
                    json=body,
                )
        except httpx.TimeoutException as exc:
            self._metrics["timeouts"] += 1
            self._last_failure = {"error": "provider_timeout", "message": str(exc)[:240], "at": issued_at}
            self._record_failure("provider_timeout", retryable=True)
            logger.warning("orb_realtime_provider_timeout session_id=%s user_id=%s", orb_session_id, (current_user or {}).get("id"))
            return {
                "provider": "openai_realtime",
                "configured": True,
                "error": "provider_timeout",
                "fallback_text_mode": True,
                "retryable": True,
                "unavailable_reason": "Realtime audio took too long to connect. Typed Orb remains available.",
            }
        except httpx.RequestError as exc:
            self._metrics["request_errors"] += 1
            self._last_failure = {"error": "provider_unreachable", "message": str(exc)[:240], "at": issued_at}
            self._record_failure("provider_unreachable", retryable=True)
            logger.warning("orb_realtime_provider_unreachable session_id=%s user_id=%s", orb_session_id, (current_user or {}).get("id"))
            return {
                "provider": "openai_realtime",
                "configured": True,
                "error": "provider_unreachable",
                "fallback_text_mode": True,
                "retryable": True,
                "unavailable_reason": "Realtime audio is temporarily unavailable. Typed Orb remains available.",
            }

        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        self._last_latency_ms = latency_ms
        if response.status_code >= 400:
            self._metrics[f"status_{response.status_code}"] += 1
            error_body = _safe_error_body(response)
            self._last_failure = {"error": "realtime_session_failed", "status": response.status_code, "at": issued_at}
            self._record_failure("realtime_session_failed", retryable=response.status_code in {408, 409, 425, 429, 500, 502, 503, 504}, status=response.status_code)
            logger.warning(
                "orb_realtime_provider_failed session_id=%s user_id=%s status=%s latency_ms=%s body=%s",
                orb_session_id,
                (current_user or {}).get("id"),
                response.status_code,
                latency_ms,
                error_body,
            )
            return {
                "provider": "openai_realtime",
                "configured": True,
                "error": "realtime_session_failed",
                "status": response.status_code,
                "fallback_text_mode": True,
                "retryable": response.status_code in {408, 409, 425, 429, 500, 502, 503, 504},
                "unavailable_reason": "Realtime audio could not be started just now. Typed Orb remains available.",
            }

        data = _public_openai_session_payload(response.json())
        client_secret = data.get("client_secret") if isinstance(data, dict) else None
        expires_at = client_secret.get("expires_at") if isinstance(client_secret, dict) else None
        self._metrics["sessions_created"] += 1
        self._consecutive_failures = 0
        orb_observability_service.record_provider_success(latency_ms)
        return {
            "provider": "openai_realtime",
            "configured": True,
            "session": data,
            "model": DEFAULT_REALTIME_MODEL,
            "voice": body["voice"],
            "issued_at": issued_at,
            "expires_at": expires_at,
            "refresh_recommended_seconds": 55,
            "provider_latency_ms": latency_ms,
            "fallback_text_mode": False,
        }

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
