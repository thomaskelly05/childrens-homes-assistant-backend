"""ORB Voice v2 TTS fallback marking when Katherine is requested."""

from __future__ import annotations

import os
import unittest
from unittest.mock import patch

from schemas.ai_tts import AiTtsSynthesisResponse, TtsProviderName
from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.ai_governed_egress import TtsEgressDecision
from services.orb_voice_tts_intent_service import build_tts_governance_context, gate_orb_voice_tts_request
from services.orb_voice_tts_service import ORBVoiceTTSResult, synthesize_spoken_reply


class OrbVoiceV2TtsFallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_katherine_with_forced_openai_marks_fallback_true(self) -> None:
        with patch(
            "services.orb_voice_tts_intent_service.evaluate_external_call",
            return_value=AIPrivacyDecision(
                allowed=True,
                reason="external_ai_allowed_with_governance",
                mode="external_redacted",
                redaction_mode="strict",
                classification=DataClassification.INTERNAL_OPERATIONAL,
            ),
        ):
            gate = gate_orb_voice_tts_request(
                source="manual_speak",
                text="I can help you think that through.",
                route="tests.fallback",
            )
        governance = build_tts_governance_context(
            gate=gate,
            provider_id=None,
            home_id=None,
            user_id=1,
            route="tests.fallback",
        )

        async def fake_egress(request, governance=None):
            return AiTtsSynthesisResponse(
                audio_bytes=b"audio",
                content_type="audio/mpeg",
                provider=TtsProviderName.OPENAI,
                model=request.model,
                voice_id=request.voice_id,
                latency_ms=1,
                audio_bytes_len=5,
            ), TtsEgressDecision(allowed=True)

        with patch.dict(
            os.environ,
            {
                "ORB_TTS_ENABLED": "true",
                "ORB_TTS_PROVIDER": "openai",
                "OPENAI_API_KEY": "test-key",
            },
            clear=False,
        ), patch(
            "services.orb_voice_tts_service.ai_governed_egress.synthesize_speech",
            side_effect=fake_egress,
        ), patch(
            "services.orb_voice_tts_service._provider_configured",
            return_value=True,
        ), patch(
            "services.orb_voice_tts_service.ORB_TTS_ENABLED",
            True,
        ):
            final = await synthesize_spoken_reply(
                text=gate.redacted_text,
                governance=governance,
                voice_id="katherine",
                context="live_voice",
            )

        self.assertTrue(final.fallback_used)
        self.assertEqual(final.fallback_reason, "provider_forced_openai")
        self.assertEqual(final.provider, "openai")


if __name__ == "__main__":
    unittest.main()
