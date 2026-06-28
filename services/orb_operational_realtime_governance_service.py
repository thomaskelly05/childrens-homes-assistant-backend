"""Operational ORB realtime session governance and governed egress (NR-1 Phase 2C)."""

from __future__ import annotations

import logging
import time
from typing import Any

from schemas.ai_realtime import (
    FEATURE_ORB_OPERATIONAL_REALTIME_SESSION,
    AiRealtimeGovernanceContext,
    AiRealtimeSessionPurpose,
    AiRealtimeSessionRequest,
    AiRealtimeSessionResponse,
    RealtimeProviderName,
)
from services.ai_external_call_governance import governance_ids_from_user
from services.ai_governed_egress import ai_governed_egress
from services.ai_providers.openai_realtime_session_provider import (
    DEFAULT_REALTIME_MODEL,
    conversational_session_body,
)
from services.orb_realtime_provider_service import orb_realtime_provider_service

logger = logging.getLogger("indicare.orb_operational_realtime_governance")

ORB_OPERATIONAL_PRODUCT_AREA = "ORB / ORB Residential"
ORB_OPERATIONAL_REALTIME_PRODUCT_ACCESS = "assistant:access"
ORB_OPERATIONAL_REALTIME_ROUTE = "POST /orb/realtime/session"


def _scope_id(current_user: dict[str, Any] | None, key: str) -> int | None:
    if not isinstance(current_user, dict):
        return None
    raw = current_user.get(key)
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def build_orb_operational_realtime_governance_context(
    *,
    instructions: str,
    current_user: dict[str, Any] | None,
    orb_session_id: str | None = None,
    model: str | None = None,
    route: str = ORB_OPERATIONAL_REALTIME_ROUTE,
    product_access: str | None = ORB_OPERATIONAL_REALTIME_PRODUCT_ACCESS,
) -> AiRealtimeGovernanceContext:
    """Build safe operational ORB realtime governance metadata (no raw instructions)."""
    ids = governance_ids_from_user(current_user)
    resolved_model = (model or DEFAULT_REALTIME_MODEL).strip() or DEFAULT_REALTIME_MODEL
    return AiRealtimeGovernanceContext(
        feature=FEATURE_ORB_OPERATIONAL_REALTIME_SESSION,
        surface="operational_orb",
        route=route,
        purpose=AiRealtimeSessionPurpose.ORB_OPERATIONAL_CONVERSATIONAL.value,
        provider_id=ids["provider_id"],
        home_id=ids["home_id"],
        user_id=ids["user_id"],
        instructions_len=len(instructions or ""),
        orb_session_id=orb_session_id,
        metadata={
            "product_area": ORB_OPERATIONAL_PRODUCT_AREA,
            "product_access": product_access,
            "ai_provider": RealtimeProviderName.OPENAI.value,
            "ai_model": resolved_model,
        },
    )


def _governed_response_to_legacy_dict(response: AiRealtimeSessionResponse) -> dict[str, Any]:
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
        session_body = conversational_session_body(
            instructions="",
            voice=None,
            model=payload["model"],
        )
        payload["request_body"] = {key: value for key, value in session_body.items() if key != "instructions"}
    return payload


def _circuit_open_legacy_dict() -> dict[str, Any]:
    circuit_open_until = getattr(orb_realtime_provider_service, "_circuit_open_until", 0.0)
    return {
        "provider": "openai_realtime",
        "configured": True,
        "error": "provider_circuit_open",
        "fallback_text_mode": True,
        "retryable": True,
        "retry_after_seconds": max(1, int(circuit_open_until - time.time())),
        "unavailable_reason": "Realtime audio is recovering. Typed Orb remains available.",
    }


async def issue_orb_operational_conversational_realtime_session(
    *,
    instructions: str,
    voice: str | None,
    current_user: dict[str, Any] | None,
    orb_session_id: str | None,
    route: str = ORB_OPERATIONAL_REALTIME_ROUTE,
) -> dict[str, Any]:
    """Issue a governed conversational operational ORB realtime session."""
    if not orb_realtime_provider_service.provider_available():
        return _circuit_open_legacy_dict()

    governance = build_orb_operational_realtime_governance_context(
        instructions=instructions,
        current_user=current_user,
        orb_session_id=orb_session_id,
        route=route,
    )
    request = AiRealtimeSessionRequest(
        provider=RealtimeProviderName.OPENAI,
        model=DEFAULT_REALTIME_MODEL,
        instructions=instructions,
        purpose=AiRealtimeSessionPurpose.ORB_OPERATIONAL_CONVERSATIONAL.value,
        voice=voice,
        transcription_only=False,
        orb_session_id=orb_session_id,
    )
    response, egress = await ai_governed_egress.issue_realtime_session(request, governance=governance)
    result = _governed_response_to_legacy_dict(response)
    if getattr(egress, "blocked_reason", None):
        logger.info(
            "orb_operational_realtime_session_blocked route=%s reason=%s user_id=%s instructions_len=%s",
            route,
            egress.blocked_reason,
            _scope_id(current_user, "user_id") or _scope_id(current_user, "id"),
            len(instructions or ""),
        )
    elif response.error_code:
        logger.warning(
            "orb_operational_realtime_session_failed route=%s session_id=%s user_id=%s error=%s",
            route,
            orb_session_id,
            _scope_id(current_user, "user_id") or _scope_id(current_user, "id"),
            response.error_code,
        )
    return result
