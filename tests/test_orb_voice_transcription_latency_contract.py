"""Phase 5N.3 — Voice transcription latency contract."""

from pathlib import Path

from services.orb_voice_transcription_service import (
    VOICE_TRANSCRIPTION_MODEL_ENV,
    _resolve_voice_transcription_model,
)


def test_voice_transcription_model_resolver_prefers_voice_env():
    assert VOICE_TRANSCRIPTION_MODEL_ENV == "ORB_VOICE_TRANSCRIPTION_MODEL"
    assert _resolve_voice_transcription_model()


def test_voice_transcription_logs_safe_timing_fields_only():
    source = Path(__file__).resolve().parents[1].joinpath(
        "services", "orb_voice_transcription_service.py"
    ).read_text(encoding="utf-8")
    assert "provider_latency_ms" in source
    assert "total_duration_ms" in source
    assert "orb_voice_transcription received" in source
    assert "orb_voice_transcription finished" in source
