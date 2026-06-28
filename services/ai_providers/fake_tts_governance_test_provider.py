"""Test-only TTS provider adapter for governed egress tests."""

from __future__ import annotations

import time

from schemas.ai_tts import AiTtsSynthesisRequest, AiTtsSynthesisResponse, TtsProviderName
from services.ai_providers.tts_base import AiTtsProviderBase
from services.orb_voice_tts_profiles import content_type_for_format


class FakeTtsGovernanceTestProvider(AiTtsProviderBase):
    provider_name = "fake_tts_governance_test"

    def __init__(self) -> None:
        self.synthesis_calls: list[AiTtsSynthesisRequest] = []
        self.raise_on_synthesize: Exception | None = None
        self.return_audio: bytes = b"FAKEAUDIO"

    def is_available(self) -> bool:
        return True

    def synthesize_speech(self, request: AiTtsSynthesisRequest) -> AiTtsSynthesisResponse:
        self.synthesis_calls.append(request)
        if self.raise_on_synthesize:
            raise self.raise_on_synthesize
        started = time.perf_counter()
        audio_format = "m4a" if (request.audio_format or "mp3").lower() == "m4a" else "mp3"
        return AiTtsSynthesisResponse(
            audio_bytes=self.return_audio,
            content_type=content_type_for_format(audio_format),
            provider=TtsProviderName.MOCK,
            model=request.model,
            voice_id=request.voice_id,
            latency_ms=int((time.perf_counter() - started) * 1000),
            audio_bytes_len=len(self.return_audio),
            metadata={"fake_tts_provider": True},
        )


fake_tts_governance_test_provider = FakeTtsGovernanceTestProvider()
