"""AST guard: ORB Voice TTS product service must not call providers directly (NR-1 Phase 2B)."""

from __future__ import annotations

import ast
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
TTS_SERVICE_PATH = REPO_ROOT / "services" / "orb_voice_tts_service.py"


def _tts_service_source() -> str:
    return TTS_SERVICE_PATH.read_text(encoding="utf-8")


def test_orb_voice_tts_service_does_not_call_openai_audio_speech_directly():
    source = _tts_service_source()
    assert "audio.speech.create" not in source


def test_orb_voice_tts_service_does_not_call_elevenlabs_host_directly():
    source = _tts_service_source()
    assert "api.elevenlabs.io" not in source


def test_orb_voice_tts_service_does_not_use_httpx_for_providers():
    source = _tts_service_source()
    assert "import httpx" not in source
    assert "httpx.Client" not in source


def test_orb_voice_tts_service_calls_governed_egress():
    source = _tts_service_source()
    assert "ai_governed_egress" in source
    assert "synthesize_speech" in source


def test_orb_voice_tts_service_has_no_direct_provider_synthesis_helpers():
    source = _tts_service_source()
    tree = ast.parse(source, filename=str(TTS_SERVICE_PATH))
    banned_defs = {
        "_synthesize_openai_sync",
        "_synthesize_elevenlabs_sync",
        "generate_speech",
    }
    found = {
        node.name
        for node in ast.walk(tree)
        if isinstance(node, ast.FunctionDef) and node.name in banned_defs
    }
    assert not found, f"Direct provider helpers must be removed: {sorted(found)}"
