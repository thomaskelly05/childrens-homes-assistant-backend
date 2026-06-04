from __future__ import annotations

"""ORB Residential voice API — browser STT/TTS primary; honest OpenAI Realtime / WebSocket hooks."""

import os

from fastapi import APIRouter, Depends, HTTPException, WebSocket, status
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_residential_dependencies import require_orb_residential_auth
from schemas.orb_voice_realtime import (
    OrbVoiceOpenAISession,
    OrbVoiceSessionRequest,
    OrbVoiceSessionResponse,
    VoiceProviderCapabilities,
)
from services.orb_realtime_provider_service import orb_realtime_provider_service
from services.orb_voice_profiles import (
    build_residential_voice_instructions,
    normalise_profile_id,
    resolve_openai_voice,
    resolve_voice_profile_for_session,
)
from services.orb_voice_realtime_config import (
    _openai_realtime_configured,
    _provider_has_stt_credentials,
    _provider_has_tts_credentials,
    resolve_voice_provider,
)

DEFAULT_OPENAI_REALTIME_MODEL = os.getenv("ORB_REALTIME_MODEL", "gpt-realtime").strip() or "gpt-realtime"
from services.orb_voice_provider_service import OrbVoiceSpeakRequest, orb_voice_provider_service
from services.orb_voice_realtime_session_store import orb_voice_realtime_session_store
from services.orb_voice_realtime_ws_handler import orb_voice_realtime_ws_handler
from services.orb_brain_metadata_service import attach_to_payload, build_brain_metadata

router = APIRouter(prefix="/orb/voice", tags=["ORB Residential Voice"])


def _voice_brain_metadata() -> dict:
    return build_brain_metadata(surface="orb_residential", feature="voice")


def _voice_status_payload(body: dict) -> dict:
    return attach_to_payload(body, surface="orb_residential", feature="voice")


class OrbVoiceTextRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str | None = Field(default=None, max_length=50_000)
    spoken_summary: str | None = Field(default=None, max_length=8_000)
    voice_id: str | None = Field(default=None, max_length=80)
    voice_profile: str | None = Field(default=None, max_length=80)
    expert_depth: str | None = Field(default=None, max_length=80)
    privacy_mode: bool = False
    low_sensory_mode: bool = False
    manual_speak: bool = False
    rate: float = Field(default=1.0, ge=0.5, le=2.0)


class OrbVoiceTranscribeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    text: str | None = Field(default=None, max_length=50_000)


def _user_id(current_user: dict) -> int | None:
    try:
        value = current_user.get("user_id") or current_user.get("id")
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _provider_id(current_user: dict) -> int | None:
    try:
        value = current_user.get("provider_id")
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _session_response_base(
    *,
    session_id: str,
    provider: str,
    session_status: str,
    payload: OrbVoiceSessionRequest,
    resolved: dict,
    capabilities: VoiceProviderCapabilities,
    message: str | None = None,
    fallback_reason: str | None = None,
    websocket_url: str | None = None,
    webrtc_offer_url: str | None = None,
    openai_session: OrbVoiceOpenAISession | None = None,
) -> OrbVoiceSessionResponse:
    profile_id = resolved["selected_voice_profile"]
    return OrbVoiceSessionResponse(
        session_id=session_id,
        provider=provider,  # type: ignore[arg-type]
        status=session_status,  # type: ignore[arg-type]
        mode=payload.mode,
        voice_id=profile_id,
        selected_voice_profile=profile_id,
        profile_label=resolved.get("profile_label"),
        provider_voice=resolved.get("provider_voice"),
        websocket_url=websocket_url,
        webrtc_offer_url=webrtc_offer_url,
        openai_session=openai_session,
        capabilities=capabilities,
        message=message,
        fallback_reason=fallback_reason,
        brain_metadata=_voice_brain_metadata(),
    )


@router.get("/session/status")
async def orb_voice_session_status(_current_user=Depends(require_orb_residential_auth)):
    """Honest realtime configuration probe — always 200, never 500 for missing env."""
    if _openai_realtime_configured():
        return _voice_status_payload(
            {
                "ok": True,
                "realtime_enabled": True,
                "provider": "openai",
                "model": DEFAULT_OPENAI_REALTIME_MODEL,
                "requires_client_secret": True,
                "reason": "configured",
            }
        )
    provider = os.getenv("ORB_VOICE_REALTIME_PROVIDER", "browser_fallback").strip().lower()
    if provider in {"websocket", "webrtc"}:
        _, session_status, _, fallback_reason = resolve_voice_provider(provider)  # type: ignore[arg-type]
        enabled = session_status == "ready" and provider != "browser_fallback"
        if enabled:
            return _voice_status_payload(
                {
                    "ok": True,
                    "realtime_enabled": True,
                    "provider": provider,
                    "model": None,
                    "requires_client_secret": provider == "openai",
                    "reason": "configured",
                }
            )
        return _voice_status_payload(
            {
                "ok": True,
                "realtime_enabled": False,
                "provider": None,
                "reason": "not_configured",
                "message": fallback_reason or "Realtime voice is not configured.",
            }
        )
    return _voice_status_payload(
        {
            "ok": True,
            "realtime_enabled": False,
            "provider": None,
            "reason": "not_configured",
        }
    )


@router.post("/realtime/session", response_model=OrbVoiceSessionResponse)
async def orb_voice_realtime_session(
    payload: OrbVoiceSessionRequest,
    current_user=Depends(require_orb_residential_auth),
):
    """Create a conversational realtime voice session — no browser_fallback masking when unconfigured."""
    if not _openai_realtime_configured():
        return OrbVoiceSessionResponse(
            session_id=f"unconfigured_{os.urandom(6).hex()}",
            provider="browser_fallback",
            status="not_configured",
            mode=payload.mode,
            voice_id=normalise_profile_id(payload.voice_id),
            capabilities=VoiceProviderCapabilities(
                provider="browser",
                supportsStreamingStt=False,
                supportsStreamingTts=False,
                supportsBargeIn=False,
                supportsVad=False,
                supportsDuplex=False,
                supportsServerAudio=False,
                latencyClass="fallback",
            ),
            message="Live ORB Voice is not available yet. Configure realtime voice to use this.",
            fallback_reason="not_configured",
        )

    forced = payload.model_copy(update={"transport": "auto"})
    return await orb_voice_session(forced, current_user)


@router.post("/session", response_model=OrbVoiceSessionResponse)
async def orb_voice_session(
    payload: OrbVoiceSessionRequest,
    current_user=Depends(require_orb_residential_auth),
):
    profile_id = normalise_profile_id(payload.voice_id)
    resolved = resolve_voice_profile_for_session(profile_id)
    provider, session_status, capabilities, fallback_reason = resolve_voice_provider(payload.transport)

    if provider == "openai_realtime" and session_status == "ready":
        session_id = f"openai_{os.urandom(8).hex()}"
        instructions = build_residential_voice_instructions(profile_id=profile_id, mode=payload.mode)
        openai_voice = resolve_openai_voice(profile_id)
        provider_result = await orb_realtime_provider_service.create_ephemeral_session(
            instructions=instructions,
            voice=openai_voice,
            current_user=current_user,
            orb_session_id=session_id,
        )
        if provider_result.get("configured") and provider_result.get("session") and not provider_result.get("fallback_text_mode"):
            session_payload = provider_result.get("session") or {}
            client_secret = session_payload.get("client_secret")
            openai_session = OrbVoiceOpenAISession(
                model=provider_result.get("model"),
                client_secret=client_secret if isinstance(client_secret, dict) else None,
                voice=provider_result.get("voice") or openai_voice,
            )
            orb_voice_realtime_session_store.create(
                user_id=_user_id(current_user),
                provider="openai_realtime",
                status="ready",
                mode=payload.mode,
                voice_id=profile_id,
                capabilities=capabilities,
            )
            return _session_response_base(
                session_id=session_id,
                provider="openai_realtime",
                session_status="ready",
                payload=payload,
                resolved=resolved,
                capabilities=capabilities,
                openai_session=openai_session,
                message="OpenAI Realtime session ready. Connect via WebRTC using the ephemeral client secret.",
            )
        return _session_response_base(
            session_id=f"browser_{os.urandom(8).hex()}",
            provider="browser_fallback",
            session_status="ready",
            payload=payload,
            resolved=resolved,
            capabilities=VoiceProviderCapabilities(
                provider="browser",
                supportsStreamingStt=False,
                supportsStreamingTts=False,
                supportsBargeIn=True,
                supportsVad=True,
                supportsDuplex=False,
                supportsServerAudio=False,
                latencyClass="fallback",
            ),
            message="Realtime voice is temporarily unavailable. Use browser voice.",
            fallback_reason=provider_result.get("unavailable_reason")
            or "OpenAI Realtime could not be started.",
        )

    if provider == "browser_fallback":
        session_id = f"browser_{os.urandom(8).hex()}"
        return _session_response_base(
            session_id=session_id,
            provider="browser_fallback",
            session_status="ready",
            payload=payload,
            resolved=resolved,
            capabilities=capabilities,
            message="Use browser SpeechRecognition and SpeechSynthesis. Configure ORB_VOICE_REALTIME_PROVIDER=openai for server realtime.",
            fallback_reason=fallback_reason,
        )

    record = orb_voice_realtime_session_store.create(
        user_id=_user_id(current_user),
        provider=provider,
        status=session_status,
        mode=payload.mode,
        voice_id=profile_id,
        capabilities=capabilities,
    )

    if session_status != "ready":
        return _session_response_base(
            session_id=record.session_id,
            provider="browser_fallback",
            session_status="ready",
            payload=payload,
            resolved=resolved,
            capabilities=VoiceProviderCapabilities(
                provider=capabilities.provider,
                supportsStreamingStt=False,
                supportsStreamingTts=False,
                supportsBargeIn=True,
                supportsVad=True,
                supportsDuplex=False,
                supportsServerAudio=False,
                latencyClass="fallback",
            ),
            message="Realtime provider not fully configured. Use browser voice.",
            fallback_reason=fallback_reason or "Provider credentials missing.",
        )

    websocket_url = f"/orb/voice/ws/{record.session_id}" if provider == "websocket_realtime" else None
    webrtc_offer_url = f"/orb/voice/webrtc/offer/{record.session_id}" if provider == "webrtc_realtime" else None

    return _session_response_base(
        session_id=record.session_id,
        provider=provider,
        session_status=session_status,
        payload=payload,
        resolved=resolved,
        capabilities=capabilities,
        websocket_url=websocket_url,
        webrtc_offer_url=webrtc_offer_url,
    )


@router.websocket("/ws/{session_id}")
async def orb_voice_realtime_ws(websocket: WebSocket, session_id: str) -> None:
    await orb_voice_realtime_ws_handler.handle(websocket, session_id)


@router.post("/webrtc/offer/{session_id}")
async def orb_voice_webrtc_offer(
    session_id: str,
    _current_user=Depends(require_orb_residential_auth),
):
    record = orb_voice_realtime_session_store.get(session_id)
    if not record or record.provider != "webrtc_realtime":
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail={
                "status": "not_configured",
                "message": "WebRTC realtime is not enabled for this session.",
            },
        )
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "status": "not_configured",
            "message": "WebRTC offer/answer exchange is not implemented yet. Use WebSocket or browser fallback.",
            "session_id": session_id,
        },
    )


@router.post("/webrtc/ice/{session_id}")
async def orb_voice_webrtc_ice(
    session_id: str,
    _current_user=Depends(require_orb_residential_auth),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "status": "not_configured",
            "message": "WebRTC ICE handling is not implemented yet.",
            "session_id": session_id,
        },
    )


@router.post("/transcribe")
async def orb_voice_transcribe(
    payload: OrbVoiceTranscribeRequest,
    _current_user=Depends(require_orb_residential_auth),
):
    if _provider_has_stt_credentials() and payload.text:
        return {
            "provider": "server",
            "status": "ok",
            "text": payload.text.strip(),
        }
    if payload.text and payload.text.strip():
        return {
            "provider": "browser_fallback",
            "status": "ok",
            "text": payload.text.strip(),
            "message": "Text fallback accepted. Configure ORB_VOICE_SERVER_STT and provider credentials for audio transcription.",
        }
    return {
        "provider": "browser_fallback",
        "status": "not_configured",
        "message": "Server STT is not configured. Use browser SpeechRecognition in ORB Voice.",
    }


@router.get("/provider-status")
async def orb_voice_provider_status(current_user=Depends(require_orb_residential_auth)):
    """Honest premium TTS availability — never exposes API keys."""
    body = orb_voice_provider_service.provider_status(
        provider_id=_provider_id(current_user),
        home_id=None,
    )
    return _voice_status_payload(body)


@router.post("/speak")
async def orb_voice_speak(
    payload: OrbVoiceTextRequest,
    current_user=Depends(require_orb_residential_auth),
):
    spoken = (payload.spoken_summary or payload.text or "").strip()
    if not spoken:
        raise HTTPException(status_code=400, detail="spoken_summary or text is required")

    profile_id = normalise_profile_id(payload.voice_profile or payload.voice_id)
    result = orb_voice_provider_service.speak(
        OrbVoiceSpeakRequest(
            spoken_summary=spoken,
            voice_profile=profile_id,
            expert_depth=payload.expert_depth,
            privacy_mode=payload.privacy_mode,
            low_sensory_mode=payload.low_sensory_mode,
            manual_speak=payload.manual_speak,
            rate=payload.rate,
            provider_id=_provider_id(current_user),
            home_id=None,
            user_id=_user_id(current_user),
        )
    )
    legacy_provider = result.get("provider")
    if legacy_provider == "browser_speech":
        result = {**result, "provider": "browser_fallback"}
    if "voice_id" not in result and "voice_profile" in result:
        result = {**result, "voice_id": result["voice_profile"]}
    return _voice_status_payload(result)
