from __future__ import annotations

"""ORB Residential voice — provider selection from environment (honest, no faked audio)."""

import os

from schemas.orb_voice_realtime import (
    VoiceLatencyClass,
    VoiceProviderCapabilities,
    VoiceProviderType,
    VoiceSessionStatus,
    VoiceTransportRequest,
)

def _env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, "").strip().lower() in {"1", "true", "yes", "on"}


def _realtime_provider() -> str:
    return os.getenv("ORB_VOICE_REALTIME_PROVIDER", "browser_fallback").strip().lower()


def _provider_name() -> str:
    return os.getenv("ORB_VOICE_PROVIDER_NAME", "none").strip().lower() or "none"


def _server_stt_enabled() -> bool:
    return _env_bool("ORB_VOICE_SERVER_STT")


def _server_tts_enabled() -> bool:
    return _env_bool("ORB_VOICE_SERVER_TTS")


def _dev_text_simulation() -> bool:
    return _env_bool("ORB_VOICE_DEV_TEXT_SIMULATION")


def _provider_has_stt_credentials() -> bool:
    if not _server_stt_enabled():
        return False
    provider = _provider_name()
    if provider == "openai":
        return bool(os.getenv("OPENAI_API_KEY", "").strip())
    if provider == "azure":
        return bool(os.getenv("AZURE_SPEECH_KEY", "").strip() and os.getenv("AZURE_SPEECH_REGION", "").strip())
    if provider == "deepgram":
        return bool(os.getenv("DEEPGRAM_API_KEY", "").strip())
    if provider in {"custom", "none"}:
        return _dev_text_simulation()
    return False


def _provider_has_tts_credentials() -> bool:
    if not _server_tts_enabled():
        return False
    provider = _provider_name()
    if provider == "openai":
        return bool(os.getenv("OPENAI_API_KEY", "").strip())
    if provider == "azure":
        return bool(os.getenv("AZURE_SPEECH_KEY", "").strip())
    if provider == "elevenlabs":
        return bool(os.getenv("ELEVENLABS_API_KEY", "").strip())
    if provider in {"custom", "none"}:
        return _dev_text_simulation()
    return False


def _webrtc_env_configured() -> bool:
    return _realtime_provider() == "webrtc" and (
        _provider_has_stt_credentials() or _provider_has_tts_credentials()
    )


def _websocket_env_configured() -> bool:
    return _realtime_provider() == "websocket" and (_server_stt_enabled() or _server_tts_enabled())


def build_capabilities(
    *,
    provider: VoiceProviderType,
    streaming_stt: bool,
    streaming_tts: bool,
) -> VoiceProviderCapabilities:
    if provider == "browser_fallback":
        return VoiceProviderCapabilities(
            provider=_provider_name(),
            supportsStreamingStt=False,
            supportsStreamingTts=False,
            supportsBargeIn=True,
            supportsVad=True,
            supportsDuplex=False,
            supportsServerAudio=False,
            latencyClass="fallback",
        )
    latency: VoiceLatencyClass = "realtime" if provider == "webrtc_realtime" else "standard"
    return VoiceProviderCapabilities(
        provider=_provider_name(),
        supportsStreamingStt=streaming_stt,
        supportsStreamingTts=streaming_tts,
        supportsBargeIn=True,
        supportsVad=streaming_stt,
        supportsDuplex=provider == "webrtc_realtime" and streaming_stt and streaming_tts,
        supportsServerAudio=streaming_tts,
        latencyClass=latency,
    )


def resolve_voice_provider(
    transport: VoiceTransportRequest = "auto",
) -> tuple[VoiceProviderType, VoiceSessionStatus, VoiceProviderCapabilities, str | None]:
    """Return provider, status, capabilities, and optional fallback_reason."""

    requested = transport
    if transport == "auto":
        if _webrtc_env_configured():
            requested = "webrtc"
        elif _websocket_env_configured():
            requested = "websocket"
        else:
            requested = "browser_fallback"

    if requested == "browser_fallback":
        return (
            "browser_fallback",
            "ready",
            build_capabilities(provider="browser_fallback", streaming_stt=False, streaming_tts=False),
            None,
        )

    if requested == "webrtc":
        if not _webrtc_env_configured():
            return (
                "browser_fallback",
                "ready",
                build_capabilities(provider="browser_fallback", streaming_stt=False, streaming_tts=False),
                "WebRTC realtime is not configured — using browser voice.",
            )
        stt = _provider_has_stt_credentials()
        tts = _provider_has_tts_credentials()
        status: VoiceSessionStatus = "ready" if (stt or tts) else "not_configured"
        return (
            "webrtc_realtime",
            status,
            build_capabilities(provider="webrtc_realtime", streaming_stt=stt, streaming_tts=tts),
            None if status == "ready" else "WebRTC provider env present but STT/TTS credentials missing.",
        )

    if requested == "websocket":
        if not _websocket_env_configured():
            return (
                "browser_fallback",
                "ready",
                build_capabilities(provider="browser_fallback", streaming_stt=False, streaming_tts=False),
                "WebSocket realtime is not configured — using browser voice.",
            )
        stt = _provider_has_stt_credentials()
        tts = _provider_has_tts_credentials()
        status = "ready" if (stt or tts or _dev_text_simulation()) else "not_configured"
        return (
            "websocket_realtime",
            status,
            build_capabilities(provider="websocket_realtime", streaming_stt=stt, streaming_tts=tts),
            None if status == "ready" else "WebSocket flags set but provider credentials missing.",
        )

    return (
        "browser_fallback",
        "ready",
        build_capabilities(provider="browser_fallback", streaming_stt=False, streaming_tts=False),
        f"Unknown transport '{transport}' — using browser voice.",
    )
