from __future__ import annotations

"""ORB Residential voice API — browser STT/TTS primary; honest OpenAI Realtime / WebSocket hooks."""

import os
import shutil
import uuid
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, ConfigDict, Field

from auth.orb_product_bootstrap_dependency import require_orb_product_bootstrap_access
from auth.orb_residential_dependencies import (
    orb_residential_premium_dependency,
    require_orb_residential_auth,
)

require_orb_voice_premium = orb_residential_premium_dependency("voice_workflows")
from schemas.orb_voice_realtime import (
    OrbVoiceOpenAISession,
    OrbVoiceSessionRequest,
    OrbVoiceSessionResponse,
    VoiceProviderCapabilities,
)
from services.orb_ai_abuse_guard_service import enforce_daily_ai_call_budget, enforce_transcript_length
from services.orb_realtime_provider_service import orb_realtime_provider_service
from services.orb_voice_profiles import (
    build_residential_voice_instructions,
    normalise_profile_id,
    resolve_openai_voice,
    resolve_voice_profile_for_session,
)
from services.orb_voice_transcription_service import (
    OrbVoiceTranscriptionError,
    transcribe_voice_audio,
)
from services.orb_voice_respond_service import generate_voice_response
from services.orb_voice_tts_service import voice_runtime_tts_status_payload
from services.orb_voice_realtime_config import (
    _openai_realtime_configured,
    _provider_has_stt_credentials,
    _provider_has_tts_credentials,
    resolve_voice_provider,
)

DEFAULT_OPENAI_REALTIME_MODEL = os.getenv("ORB_REALTIME_MODEL", "gpt-realtime").strip() or "gpt-realtime"
from services.orb_voice_provider_service import OrbVoiceSpeakRequest, orb_voice_provider_service
from services.orb_voice_realtime_beta_service import (
    realtime_beta_status_payload,
    realtime_beta_token_payload,
)
from services.orb_voice_realtime_session_store import orb_voice_realtime_session_store
from services.orb_voice_realtime_ws_handler import orb_voice_realtime_ws_handler
from services.orb_brain_metadata_service import attach_to_payload, build_brain_metadata

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orb/voice", tags=["ORB Residential Voice"])

VOICE_UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "_tmp_voice_uploads"
)
os.makedirs(VOICE_UPLOAD_DIR, exist_ok=True)
VOICE_MAX_AUDIO_BYTES = 25 * 1024 * 1024
VOICE_ALLOWED_AUDIO_SUFFIXES = frozenset(
    {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".mp4", ".mpeg", ".flac", ".aac", ".opus"}
)
VOICE_BLOCKED_UPLOAD_SUFFIXES = frozenset(
    {".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".sh", ".bash", ".php", ".html", ".htm", ".js", ".jar"}
)

MIME_TO_SUFFIX = {
    "audio/webm": ".webm",
    "audio/webm;codecs=opus": ".webm",
    "audio/wav": ".wav",
    "audio/x-wav": ".wav",
    "audio/mp4": ".mp4",
    "audio/m4a": ".m4a",
    "audio/mpeg": ".mpeg",
    "audio/mp3": ".mp3",
    "audio/ogg": ".ogg",
    "audio/flac": ".flac",
    "audio/aac": ".aac",
}


def _resolve_voice_audio_suffix(filename: str | None, content_type: str | None) -> str:
    suffix = (os.path.splitext(filename or "")[1] or "").lower()
    if suffix in VOICE_ALLOWED_AUDIO_SUFFIXES:
        return suffix
    mime = (content_type or "").split(";")[0].strip().lower()
    mapped = MIME_TO_SUFFIX.get(mime) or MIME_TO_SUFFIX.get(content_type or "")
    if mapped:
        return mapped
    return ".webm"

VOICE_REALTIME_TRANSCRIPTION_INSTRUCTIONS = (
    "You are a silent transcription assistant for ORB Voice in residential childcare. "
    "Transcribe the user's speech accurately. Do not speak or generate responses."
)


def _voice_brain_metadata() -> dict:
    return build_brain_metadata(surface="orb_residential", feature="voice")


def _voice_status_payload(body: dict) -> dict:
    return attach_to_payload(body, surface="orb_residential", feature="voice")


def _voice_runtime_status_payload(body: dict) -> dict:
    runtime = {
        **voice_runtime_tts_status_payload(),
        "serverTranscriptionAvailable": _provider_has_stt_credentials(),
    }
    return _voice_status_payload({**body, **runtime})


def _user_id_from(current_user: dict) -> int | None:
    raw = current_user.get("user_id") or current_user.get("id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


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


class OrbVoiceHistoryTurn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role: str = Field(..., max_length=32)
    content: str = Field(..., max_length=8_000)


class OrbVoiceSessionTurn(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role: str = Field(..., max_length=32)
    text: str = Field(..., max_length=8_000)


class OrbVoiceRespondRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    mode: str | None = Field(default="conversational", max_length=80)
    transcript: str | None = Field(default=None, max_length=8_000)
    sessionTurns: list[OrbVoiceSessionTurn] | None = None
    session_memory: dict | None = None
    message: str | None = Field(default=None, max_length=8_000)
    history: list[OrbVoiceHistoryTurn] | None = None

    def resolved_transcript(self) -> str:
        return (self.transcript or self.message or "").strip()


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
async def orb_voice_session_status(_current_user=Depends(require_orb_product_bootstrap_access)):
    """Honest realtime configuration probe — always 200, never 500 for missing env."""
    if _openai_realtime_configured():
        return _voice_runtime_status_payload(
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
            return _voice_runtime_status_payload(
                {
                    "ok": True,
                    "realtime_enabled": True,
                    "provider": provider,
                    "model": None,
                    "requires_client_secret": provider == "openai",
                    "reason": "configured",
                }
            )
        return _voice_runtime_status_payload(
            {
                "ok": True,
                "realtime_enabled": False,
                "provider": None,
                "reason": "not_configured",
                "message": fallback_reason or "Realtime voice is not configured.",
            }
        )
    return _voice_runtime_status_payload(
        {
            "ok": True,
            "realtime_enabled": False,
            "provider": None,
            "reason": "not_configured",
        }
    )


@router.get("/realtime/status")
async def orb_voice_realtime_beta_status(
    _current_user=Depends(require_orb_product_bootstrap_access),
):
    """Realtime beta capability probe — safe flags only, voice v2 remains fallback."""
    return realtime_beta_status_payload()


@router.post("/realtime/token")
async def orb_voice_realtime_beta_token(current_user=Depends(require_orb_voice_premium)):
    """Realtime token scaffolding — never returns provider API secrets."""
    return realtime_beta_token_payload(user_id=_user_id(current_user))


@router.post("/realtime/session", response_model=OrbVoiceSessionResponse)
async def orb_voice_realtime_session(
    payload: OrbVoiceSessionRequest,
    current_user=Depends(require_orb_voice_premium),
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
    current_user=Depends(require_orb_voice_premium),
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
    _current_user=Depends(require_orb_voice_premium),
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
    _current_user=Depends(require_orb_voice_premium),
):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail={
            "status": "not_configured",
            "message": "WebRTC ICE handling is not implemented yet.",
            "session_id": session_id,
        },
    )


@router.post("/transcribe/realtime/session")
async def orb_voice_transcribe_realtime_session(
    _current_user=Depends(require_orb_voice_premium),
):
    """Ephemeral OpenAI Realtime session for Voice transcription only (no assistant audio)."""
    if not _openai_realtime_configured():
        return {
            "ok": True,
            "configured": False,
            "provider": None,
            "reason": "not_configured",
            "message": "Server transcription is not configured. Use Dictate or Chat instead.",
        }

    session_id = f"voice_tx_{uuid.uuid4().hex[:16]}"
    provider_result = await orb_realtime_provider_service.create_dictate_transcription_session(
        instructions=VOICE_REALTIME_TRANSCRIPTION_INSTRUCTIONS,
        current_user=_current_user,
        orb_session_id=session_id,
    )
    if not provider_result.get("configured") or provider_result.get("fallback_text_mode"):
        return {
            "ok": True,
            "configured": False,
            "provider": None,
            "reason": "not_configured",
            "message": provider_result.get("unavailable_reason")
            or "Server transcription is not configured. Use Dictate or Chat instead.",
        }

    session_payload = provider_result.get("session") or {}
    return {
        "ok": True,
        "configured": True,
        "session_id": session_id,
        "provider": "openai",
        "model": provider_result.get("model"),
        "openai_session": session_payload,
        "reason": "configured",
    }


@router.post("/transcribe/audio")
async def orb_voice_transcribe_audio(
    file: UploadFile = File(...),
    _current_user=Depends(require_orb_voice_premium),
):
    """Transient audio transcription for ORB Voice — audio is not stored after processing."""
    content_type = (file.content_type or "").strip() or None
    suffix = _resolve_voice_audio_suffix(file.filename, content_type)
    if suffix in VOICE_BLOCKED_UPLOAD_SUFFIXES or suffix not in VOICE_ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(status_code=400, detail="Unsupported audio file type.")
    path = os.path.join(VOICE_UPLOAD_DIR, f"{uuid.uuid4().hex}{suffix}")
    try:
        with open(path, "wb") as handle:
            shutil.copyfileobj(file.file, handle)
        file_size = os.path.getsize(path)
        if file_size <= 0:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "voice_transcription_empty",
                    "message": "No audio was captured. Check microphone permission and try again.",
                },
            )
        if file_size > VOICE_MAX_AUDIO_BYTES:
            raise HTTPException(status_code=400, detail="Audio file is too large.")
        result = await transcribe_voice_audio(path, mime_type=content_type)
        transcript = str(result.get("transcript") or "").strip()
        logger.info(
            "orb_voice_turn_trace stage=transcribe status=success transcript_chars=%s mime=%s bytes=%s",
            len(transcript),
            content_type or result.get("mime_type") or "unknown",
            file_size,
        )
        return {
            "success": True,
            "transcript": transcript,
            "provider": result.get("provider") or "openai",
            "source": result.get("source") or "server_transcription",
            "duration_ms": result.get("duration_ms"),
            "mime_type": result.get("mime_type") or content_type,
            "audio_stored": False,
            "data": {"transcript": transcript},
        }
    except OrbVoiceTranscriptionError as exc:
        raise HTTPException(
            status_code=exc.status_code,
            detail={"error": exc.error, "message": exc.message},
        ) from exc
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=503,
            detail={
                "error": "voice_transcription_unavailable",
                "message": "Voice transcription is not available right now. Type your reflection instead.",
            },
        )
    finally:
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass


@router.post("/respond")
async def orb_voice_respond(
    payload: OrbVoiceRespondRequest,
    current_user=Depends(require_orb_voice_premium),
):
    """Fast reflective voice reply — no deep standalone retrieval chain."""
    user_id = _user_id(current_user)
    transcript = payload.resolved_transcript()
    if not transcript:
        raise HTTPException(status_code=400, detail="transcript_required")
    enforce_daily_ai_call_budget(user_id)
    enforce_transcript_length(transcript, user_id=user_id)
    session_turns = payload.sessionTurns or []
    history = payload.history or []
    if session_turns:
        history_payload = [
            {
                "role": "user" if turn.role in {"adult", "user"} else "assistant",
                "content": turn.text,
            }
            for turn in session_turns
        ]
    else:
        history_payload = [turn.model_dump() for turn in history]
    try:
        result = generate_voice_response(
            message=transcript,
            mode=payload.mode,
            history=history_payload,
            session_memory=payload.session_memory,
            user_id=user_id,
            provider_id=_provider_id(current_user),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.warning("orb_voice_respond_failed error=%s", exc.__class__.__name__, exc_info=True)
        raise HTTPException(
            status_code=503,
            detail={
                "error": "voice_respond_unavailable",
                "message": "ORB Voice could not respond right now. Type your reflection instead.",
            },
        ) from exc

    reply = str(result.get("reply") or "").strip()
    logger.info(
        "orb_voice_turn_trace stage=respond status=success reply_chars=%s prompt_tier=%s",
        len(reply),
        result.get("prompt_tier") or "voice_fast",
    )
    return _voice_status_payload(
        {
            "ok": True,
            "reply": reply,
            "answer": reply,
            "mode": result.get("mode"),
            "safetyBoundaryApplied": bool(result.get("safetyBoundaryApplied")),
            "shouldEscalateToPolicyReminder": bool(result.get("shouldEscalateToPolicyReminder")),
            "prompt_tier": result.get("prompt_tier") or "voice_fast",
            "promptTier": result.get("prompt_tier") or "voice_fast",
            "embeddings_used": bool(result.get("embeddings_used")),
            "retrieval_used": bool(result.get("retrieval_used")),
            "context_used": {
                "prompt_tier": "voice_fast",
                "voice_fast_path": True,
                "embeddings_used": False,
                "retrieval_used": bool(result.get("retrieval_used")),
            },
        }
    )


@router.post("/transcribe")
async def orb_voice_transcribe(
    payload: OrbVoiceTranscribeRequest,
    _current_user=Depends(require_orb_voice_premium),
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
    current_user=Depends(require_orb_voice_premium),
):
    spoken = (payload.spoken_summary or payload.text or "").strip()
    user_id = _user_id_from(current_user)
    enforce_daily_ai_call_budget(user_id)
    enforce_transcript_length(spoken, user_id=user_id)
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
