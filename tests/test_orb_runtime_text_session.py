from __future__ import annotations

from pathlib import Path

STATE = Path(__file__).resolve().parents[1] / "frontend-next" / "lib" / "orb" / "state.ts"


def test_send_text_uses_ensure_text_session_not_voice_start():
    text = STATE.read_text(encoding="utf-8")
    send_block = text.split("async sendText(", 1)[1].split("\n  async ", 1)[0]
    assert "ensureTextSession" in send_block
    assert "await this.start(" not in send_block


def test_connect_realtime_requires_explicit_voice_request():
    text = STATE.read_text(encoding="utf-8")
    assert "voiceRealtimeRequested" in text
    assert "if (!this.voiceRealtimeRequested) return" in text
    assert "async ensureTextSession" in text
