"""ORB Dictate realtime session governance and governed egress (NR-1 Phase 2C)."""

from __future__ import annotations

import logging
import time
from typing import Any

from schemas.ai_realtime import (
    FEATURE_ORB_DICTATE_REALTIME_SESSION,
    AiRealtimeGovernanceContext,
    AiRealtimeSessionPurpose,
    AiRealtimeSessionRequest,
    AiRealtimeSessionResponse,
    RealtimeProviderName,
)
from services.ai_external_call_governance import governance_ids_from_user
from services.ai_governed_egress import ai_governed_egress
from services.ai_providers.openai_realtime_session_provider import DEFAULT_REALTIME_MODEL
from services.orb_realtime_provider_service import orb_realtime_provider_service

logger = logging.getLogger("indicare.orb_dictate_realtime_governance")

ORB_DICTATE_PRODUCT_AREA = "ORB Dictate / ORB Residential"
ORB_DICTATE_REALTIME_PRODUCT_ACCESS = "record_this_properly"


def _scope_id(current_user: dict[str, Any] | None, key: str) -> int | None:
    if not isinstance(current_user, dict):
        return None
    raw = current_user.get(key)
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def build_orb_dictate_realtime_governance_context(
    *,
    instructions: str,
    current_user: dict[str, Any] | None,
    orb_session_id: str | None = None,
    model: str | None = None,
    route: str = "POST /orb/dictate/realtime/session",
    product_access: str | None = ORB_DICTATE_REALTIME_PRODUCT_ACCESS,
) -> AiRealtimeGovernanceContext:
    """Build safe ORB Dictate realtime governance metadata (no raw instructions)."""
    ids = governance_ids_from_user(current_user)
    resolved_model = (model or DEFAULT_REALTIME_MODEL).strip() or DEFAULT_REALTIME_MODEL
    return AiRealtimeGovernanceContext(
        feature=FEATURE_ORB_DICTATE_REALTIME_SESSION,
        surface="standalone_orb",
        route=route,
        purpose=AiRealtimeSessionPurpose.ORB_DICTATE_TRANSCRIPTION.value,
        provider_id=ids["provider_id"],
        home_id=ids["home_id"],
        user_id=ids["user_id"],
        instructions_len=len(instructions or ""),
        orb_session_id=orb_session_id,
        metadata={
            "product_area": ORB_DICTATE_PRODUCT_AREA,
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
        payload["request_body"] = {"model": payload["model"]}
    return payload


def _circuit_open_legacy_dict() -> dict[str, Any]:
    return {
        "provider": "openai_realtime",
        "configured": True,
        "error": "provider_circuit_open",
        "fallback_text_mode": True,
        "unavailable_reason": "Realtime transcription is temporarily unavailable. Paste transcript or upload audio.",
    }


async def issue_orb_dictate_transcription_realtime_session(
    *,
    instructions: str,
    current_user: dict[str, Any] | None,
    orb_session_id: str | None,
    route: str = "POST /orb/dictate/realtime/session",
) -> dict[str, Any]:
    """Issue a governed transcription-only ORB Dictate realtime session."""
    if not orb_realtime_provider_service.provider_available():
        circuit_open_until = getattr(orb_realtime_provider_service, "_circuit_open_until", 0.0)
        if circuit_open_until > time.time():
            result = _circuit_open_legacy_dict()
            result["retry_after_seconds"] = max(1, int(circuit_open_until - time.time()))
            result["retryable"] = True
            return result
        return _circuit_open_legacy_dict()

    governance = build_orb_dictate_realtime_governance_context(
        instructions=instructions,
        current_user=current_user,
        orb_session_id=orb_session_id,
        route=route,
    )
    request = AiRealtimeSessionRequest(
        provider=RealtimeProviderName.OPENAI,
        model=DEFAULT_REALTIME_MODEL,
        instructions=instructions,
        purpose=AiRealtimeSessionPurpose.ORB_DICTATE_TRANSCRIPTION.value,
        transcription_only=True,
        orb_session_id=orb_session_id,
    )
    response, egress = await ai_governed_egress.issue_realtime_session(request, governance=governance)
    result = _governed_response_to_legacy_dict(response)
    if getattr(egress, "blocked_reason", None):
        logger.info(
            "orb_dictate_realtime_session_blocked route=%s reason=%s user_id=%s instructions_len=%s",
            route,
            egress.blocked_reason,
            _scope_id(current_user, "user_id") or _scope_id(current_user, "id"),
            len(instructions or ""),
        )
    elif response.error_code:
        logger.warning(
            "orb_dictate_realtime_session_failed route=%s session_id=%s user_id=%s error=%s",
            route,
            orb_session_id,
            _scope_id(current_user, "user_id") or _scope_id(current_user, "id"),
            response.error_code,
        )
    return result
