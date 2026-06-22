from services.orb_voice_spoken_compression_service import (
    VOICE_FAST_MAX_WORDS,
    VOICE_SAFEGUARDING_MAX_WORDS,
    VOICE_SPECIALIST_MAX_WORDS,
    VOICE_TTS_CHAR_HARD_CAP,
    VOICE_TTS_CHAR_SOFT_CAP,
    compress_voice_reply_for_speech,
)


def test_voice_spoken_caps_constants():
    assert VOICE_FAST_MAX_WORDS == 40
    assert VOICE_SPECIALIST_MAX_WORDS == 55
    assert VOICE_SAFEGUARDING_MAX_WORDS == 65
    assert VOICE_TTS_CHAR_SOFT_CAP == 180
    assert VOICE_TTS_CHAR_HARD_CAP == 220


def test_supervision_reply_stays_concise():
    long = (
        "It sounds like you're preparing for supervision. Reflecting on the incident is important. "
        "Think about how it affected you, the child, and the team. "
        "What support do you think you need going forward?"
    )
    compressed = compress_voice_reply_for_speech(long, intent="supervision_prep", tier="voice_specialist")
    assert "supervision" in compressed.lower()
    assert len(compressed) <= VOICE_TTS_CHAR_HARD_CAP


def test_bullying_reply_practical():
    compressed = compress_voice_reply_for_speech(
        "Consider emotional well-being and holistic support for everyone involved.",
        intent="bullying_or_peer_conflict",
        tier="voice_specialist",
    )
    assert "young people safe" in compressed.lower() or "seen or heard" in compressed.lower()
