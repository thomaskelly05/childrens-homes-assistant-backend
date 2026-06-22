"""Phase 5N.2 — voice_fast latency and spoken/written reply contract."""

from pathlib import Path

from services.orb_voice_respond_service import (
    VOICE_RESPOND_FAST_MAX_OUTPUT_TOKENS,
    _tier_max_words,
)
from services.orb_voice_spoken_compression_service import (
    VOICE_FAST_MAX_WORDS,
    VOICE_SAFEGUARDING_MAX_WORDS,
    VOICE_SPECIALIST_MAX_WORDS,
    VOICE_TTS_CHAR_SOFT_CAP,
    compress_voice_reply_for_speech,
)


def test_voice_fast_word_caps():
    assert VOICE_FAST_MAX_WORDS == 40
    assert VOICE_SPECIALIST_MAX_WORDS == 55
    assert VOICE_SAFEGUARDING_MAX_WORDS == 65
    assert _tier_max_words("voice_fast") == 40


def test_voice_fast_output_token_cap_is_tight():
    assert VOICE_RESPOND_FAST_MAX_OUTPUT_TOKENS <= 96


def test_voice_fast_skips_heavy_routing_in_respond_service():
    source = Path(__file__).resolve().parents[1].joinpath(
        "services", "orb_voice_respond_service.py"
    ).read_text(encoding="utf-8")
    assert 'if route.brain_tier == "voice_fast"' in source
    assert "policy_lookup = False if route.brain_tier == \"voice_fast\"" in source
    assert "protocol_block = \"\" if route.brain_tier == \"voice_fast\"" in source
    assert "compact_history[-4:] if route.brain_tier == \"voice_fast\"" in source


def test_respond_service_returns_written_and_spoken_reply():
    source = Path(__file__).resolve().parents[1].joinpath(
        "services", "orb_voice_respond_service.py"
    ).read_text(encoding="utf-8")
    assert '"writtenReply": written_reply' in source
    assert '"spokenReply": spoken_reply' in source


def test_spoken_tts_soft_cap():
    long = (
        "It sounds like you are reflecting on a difficult evening. "
        "Think about what each young person said and how staff responded. "
        "What would you want recorded for the next handover?"
    )
    compressed = compress_voice_reply_for_speech(long, intent="general_reflection", tier="voice_fast")
    assert len(compressed) <= VOICE_TTS_CHAR_SOFT_CAP + 40
